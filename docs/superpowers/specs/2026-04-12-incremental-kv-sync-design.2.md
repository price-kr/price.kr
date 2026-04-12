# Design: Incremental KV Sync (commit-based diff) v2

## 목표
`sync-kv`가 마지막으로 Cloudflare KV에 반영한 커밋 이후의 변경 사항(추가, 수정, 삭제, 이름 변경)만 추출하여 증분 동기화한다. 이를 통해 KV 쓰기 비용을 최소화하고, 대규모 데이터셋에서도 빠른 CI 배포 속도를 보장한다.

## 배경 및 개선 사항 (v2)
기존의 Full Sync 방식은 데이터가 늘어날수록 API 호출 횟수와 시간이 선형적으로 증가하며, 현재의 워크플로우 기반 증분 방식은 병렬 처리가 되지 않아 비효율적이다. v2에서는 다음 사항을 개선한다.

1.  **커밋 기반 추적**: KV 내부에 `__sync_commit__` 키를 저장하여 동기화 성공 지점을 명확히 관리한다.
2.  **정교한 변경 감지**: `git diff --name-status`를 사용하여 추가(A), 수정(M), 삭제(D), 이름 변경(R) 상태를 정확히 구분한다.
3.  **안전한 데이터 추출**: 삭제된 파일의 경우, 단순히 파일명에 의존하지 않고 `git show` 명령을 통해 이전 커밋의 JSON 내용에서 실제 `keyword` 필드를 추출하여 삭제한다.
4.  **대규모 처리 지원 (Chunking)**: Cloudflare Bulk API의 요청 당 10,000개 제한을 준수하기 위해 데이터를 자동으로 분할 전송한다.
5.  **디버깅 지원 (Dry-run)**: `--dry-run` 플래그를 통해 실제 반영 전 변경 내역을 `diff.jsonl` 파일로 생성하여 검증할 수 있게 한다.
6.  **다국어 지원**: 한글 파일명이 Git 출력에서 깨지지 않도록 `core.quotepath false` 설정을 보장한다.

---

## 데이터 구조

### KV 메타 데이터
- **Key**: `__sync_commit__`
- **Value**: 마지막으로 성공한 동기화의 Full Commit SHA (40자)

### Dry-run 출력 (diff.jsonl)
각 라인은 JSON 객체로 구성되며, 처리할 액션을 명시한다.
- `{"action": "put", "key": "키워드", "value": "URL"}`
- `{"action": "delete", "key": "키워드"}`

---

## 동작 프로세스

1.  **초기화**: `git config core.quotepath false`를 실행하여 한글 경로 처리 준비를 마친다.
2.  **마커 확인**: KV에서 `__sync_commit__` 값을 읽어온다. 값이 없거나 유효하지 않은 SHA일 경우 Full Sync로 전환한다.
3.  **변경분 계산**: `git diff --name-status <LAST_COMMIT>..HEAD` 명령으로 변경된 파일 목록을 가져온다.
4.  **항목 분류**:
    - **A (Added) / M (Modified)**: 현재 파일 시스템에서 JSON을 읽어 `upsert` 목록에 추가한다.
    - **D (Deleted)**: `git show`를 사용해 이전 커밋의 파일 내용을 읽고 `keyword`를 추출하여 `delete` 목록에 추가한다.
    - **R (Renamed)**: 원본 파일 경로는 `delete` 목록에(이전 커밋 기준), 대상 파일 경로는 `upsert` 목록에(현재 커밋 기준) 추가한다.
5.  **검증 및 필터링**: `blocklist` 등 동기화에서 제외해야 할 특수 파일들을 필터링한다.
6.  **실행 (또는 Dry-run)**:
    - `dry-run` 모드일 경우 `diff.jsonl`을 생성하고 종료한다.
    - 일반 모드일 경우 `upsert`와 `delete` 목록을 각각 10,000개 단위로 쪼개어 `wrangler kv bulk` 명령을 실행한다.
7.  **마커 업데이트**: 모든 벌크 작업이 성공하면 현재의 `HEAD` SHA를 KV의 `__sync_commit__`에 저장한다.

---

## 예외 상황 대응 (Edge Cases)

- **Force Push**: 로컬의 `__sync_commit__`이 현재 Git 히스토리에 존재하지 않을 경우 안전을 위해 전체 동기화(Full Sync)를 수행한다.
- **네트워크 오류**: 벌크 작업 중 일부가 실패할 경우 커밋 마커를 업데이트하지 않는다. 다음 실행 시 멱등성(Idempotency)에 의해 동일한 작업이 재시도된다.
- **대규모 삭제**: 폴더 구조 변경 등으로 수만 개의 파일이 삭제될 때도 `git show`를 통한 개별 키 추출 및 벌크 삭제 로직이 안정적으로 작동해야 한다.

---

## 영향 범위
- **스크립트**: `scripts/sync-kv.ts` 로직 통합 및 인자 확장
- **워크플로우**: `.github/workflows/sync-kv.yml`에서 증분 동기화 결과물(JSONL) 보관 및 실행 모드 제어
- **테스트**: 이름 변경 및 삭제 시나리오에 대한 단위 테스트 추가
