# Design: 키워드 유사어(Alias) 기능

## 목표

`금.가격.kr` → `금값.가격.kr`과 동일한 최종 URL로 리다이렉트되도록 키워드 간 유사어(alias) 관계를 지원한다. 사용자가 자연스럽게 떠올리는 다양한 표현으로 같은 목적지에 도달할 수 있게 한다.

## 핵심 원칙

- **1회 리다이렉트로 완결** — 이중 리다이렉트 없이, KV에 최종 URL이 저장되어 Workers가 단일 302 redirect
- **Workers 변경 없음** — alias 해소를 sync 시점에 완료하여 Workers 코드 변경 불필요
- **기존 구조 최소 변경** — 키워드당 1파일 원칙 유지
- **단계적 적용** — P1(데이터+리다이렉트) → P2(Issue 자동화) → P3(Web UI, Future)

**선행 Spec:** `2026-04-12-incremental-kv-sync-design.md` (commit-based diff incremental sync)

---

## 접근법: Sync-time 해소

sync-kv.ts에서 alias를 해소하여 KV에 최종 URL을 직접 저장한다. Workers는 alias 존재를 모른다.

```
data/ㄱ/금/금.json:   { "keyword": "금", "alias_of": "금값" }
data/ㄱ/금/금값.json: { "keyword": "금값", "url": "https://finance.naver.com/goldprice/" }

↓ sync-kv.ts가 alias 해소 ↓

KV: "금"   → "https://finance.naver.com/goldprice/"   (alias 해소됨)
KV: "금값" → "https://finance.naver.com/goldprice/"   (canonical 그대로)
```

Incremental sync에서의 alias 일관성은 incremental sync spec의 Step 5 확장점에 alias 인식 로직을 추가하여 구현한다.

### 고려했으나 채택하지 않은 방식: Workers-time 해소

KV에 alias 참조(`alias:금값`)를 저장하고 Workers가 요청 시 2차 KV lookup으로 해소하는 방식.

**장점:** incremental sync 일관성이 자동 해결됨, KV에서 alias 관계가 보여 디버깅 용이
**채택하지 않은 이유:** alias 요청마다 KV read 2회 발생. 데이터 규모가 커질수록 누적 비용이 증가하고, sync 시 ~2초 추가는 고정 비용인 반면 KV read x2는 요청 비례 영구 비용.

---

## 데이터 모델

### Alias JSON 파일

기존 "키워드당 1파일" 원칙 유지. alias 파일은 `url` 대신 `alias_of` 필드를 가진다:

```json
// data/ㄱ/금/금.json — alias 파일
{
  "keyword": "금",
  "alias_of": "금값",
  "created": "2026-04-12"
}
```

```json
// data/ㄱ/금/금값.json — canonical 파일 (기존 구조 그대로)
{
  "keyword": "금값",
  "url": "https://finance.naver.com/goldprice/",
  "created": "2026-03-24"
}
```

### 판별 규칙

| 필드 조합 | 유형 |
|-----------|------|
| `keyword` + `url` | canonical (기존) |
| `keyword` + `alias_of` | alias (신규) |
| 둘 다 없거나 형식 불일치 | malformed → skip |

---

## sync-kv.ts alias 확장

### buildKvEntries (full sync)

- 1st pass: canonical 수집 (`keyword` + `url`) + alias 분리 (`keyword` + `alias_of`)
- 2nd pass: alias의 `alias_of` → canonical URL Map에서 조회 → KV entry에 최종 URL로 추가
- canonical이 없는 alias는 warn 로그 + skip

### incrementalKvEntries (incremental sync)

incremental sync spec의 확장점(Step 5)에 alias 인식 로직 추가:

- canonical 파일 변경 시: `data/` 전체에서 `alias_of === canonical`인 파일 탐색 → upsert 목록에 추가
- canonical 파일 삭제 시: 같은 탐색 → delete 목록에 추가
- alias 파일 추가/수정 시: canonical URL 조회 → upsert 목록에 추가
- alias 파일 삭제 시: delete 목록에 추가

---

## Workers 변경

**없음.** KV에 최종 URL이 저장되므로 기존 로직 그대로 동작.

---

## 검증 규칙 (validate-keyword.ts 확장)

| 규칙 | 설명 |
|------|------|
| Canonical 존재 | `alias_of` 대상이 실제 canonical 파일(url 필드 보유)로 존재해야 함 |
| Chain 금지 | `alias_of` 대상이 또 다른 alias이면 거부 (depth=1 강제) |
| Circular 금지 | A→B→A 순환 참조 방지 |
| 기존 키워드 충돌 | alias로 등록하려는 keyword가 이미 독립 키워드(url 보유)이면 거부 |
| Blocklist/profanity | alias 키워드도 기존 blocklist + profanity 검증 적용 |
| 문자 규칙 | 기존과 동일: `/^[가-힣ㄱ-ㅎa-zA-Z0-9]+$/` |

---

## Issue 자동화

### 신규 Issue 템플릿

#### 1. `register-alias.yml` — 유사어 등록

```yaml
name: "유사어 등록 요청"
description: "기존 키워드의 유사어(다른 이름)를 등록합니다"
labels: ["keyword-alias"]
body:
  - type: input
    id: alias_keyword
    attributes:
      label: "유사어 키워드"
      description: "등록할 유사어 (예: 금)"
    validations:
      required: true
  - type: input
    id: canonical_keyword
    attributes:
      label: "연결할 기존 키워드"
      description: "이미 등록된 키워드 (예: 금값)"
    validations:
      required: true
  - type: textarea
    id: reason
    attributes:
      label: "등록 이유"
    validations:
      required: false
```

#### 2. `detach-alias.yml` — 유사어 해제

```yaml
name: "유사어 해제 요청"
description: "유사어 연결을 해제하고 독립 키워드로 전환합니다"
labels: ["keyword-alias-detach"]
body:
  - type: input
    id: alias_keyword
    attributes:
      label: "해제할 유사어 키워드"
      description: "현재 유사어로 등록된 키워드 (예: 금)"
    validations:
      required: true
  - type: input
    id: new_url
    attributes:
      label: "새로운 목적지 URL"
      description: "독립 키워드로 전환 시 연결할 URL"
    validations:
      required: true
  - type: textarea
    id: reason
    attributes:
      label: "해제 이유"
    validations:
      required: true
```

### validate-issue.yml 확장 동작

#### 유사어 등록 (`keyword-alias` label)

1. alias 키워드 blocklist/profanity 검증
2. canonical 키워드 존재 확인 (url 필드가 있는 파일)
3. canonical이 alias가 아닌지 확인 (chain 방지)
4. alias 키워드가 이미 등록된 키워드/alias가 아닌지 확인
5. 통과 시 alias JSON 파일 생성하는 PR 자동 생성
6. Issue에 정보 코멘트: `✅ "금"을 "금값"의 유사어로 등록하는 PR을 생성했습니다: #N`

#### 기존 변경 요청에서 대상이 alias인 경우 (`keyword-change` label)

대상 키워드가 alias이면, **canonical의 URL을 변경하는 PR을 생성**한다:

1. 대상 키워드의 JSON 파일을 읽어 `alias_of` 감지
2. canonical 키워드의 파일 경로 계산
3. canonical의 URL을 새 URL로 변경하는 PR 생성
4. Issue에 정보 코멘트:
   ```
   ℹ️ "금"은 "금값"의 유사어입니다.
   "금값"의 URL을 변경하는 PR을 생성했습니다: #N
   이 변경은 "금값"에 연결된 모든 유사어에 자동 반영됩니다.
   ```

#### 유사어 해제 (`keyword-alias-detach` label)

1. 대상 키워드가 실제로 alias인지 확인
2. 새 URL 검증 (whitelist, Safe Browsing)
3. alias JSON을 독립 keyword JSON으로 교체하는 PR 생성
4. Issue에 정보 코멘트: `✅ "금"의 "금값" 유사어 연결을 해제하고 독립 키워드로 전환하는 PR을 생성했습니다: #N`

#### Canonical 삭제 시 alias cascading (`keyword-delete` label)

대상이 canonical이고 alias가 존재하면, **alias 파일도 함께 삭제하는 PR을 생성**한다:

1. 삭제 대상 키워드의 alias 목록을 data/ 디렉토리에서 탐색 (모든 JSON 파일 중 `alias_of === keyword`인 것)
2. canonical + 모든 alias 파일을 삭제하는 PR 생성
3. Issue에 정보 코멘트:
   ```
   ⚠️ "금값"에 연결된 유사어가 있습니다: 금, 골드
   원본 키워드와 함께 모든 유사어도 삭제하는 PR을 생성했습니다: #N
   ```

대상이 alias이면 alias 파일만 삭제 (canonical은 유지):
- Issue에 정보 코멘트: `✅ 유사어 "금" (→ "금값")를 삭제하는 PR을 생성했습니다: #N. 원본 키워드 "금값"은 유지됩니다.`

---

## 동일 Canonical 대상 동시 Issue 처리

동일 canonical 키워드에 대한 여러 요청이 동시에 열리면, **차단하지 않고 상호 알림**한다. 커뮤니티 투표로 경쟁시킨다.

### 동작

validate-issue.yml에서 PR 생성 시 동일 canonical 대상의 열린 Issue/PR을 검색하여 코멘트:

```
ℹ️ 이 키워드에 대한 다른 진행 중인 요청이 있습니다: #123 (키워드 변경)
두 요청 모두 커뮤니티 투표로 진행됩니다.
```

경쟁 PR이 동시에 투표 통과 시, 먼저 merge되는 쪽이 반영되고 나머지는 merge conflict로 자연스럽게 실패한다.

### Canonical 결정 로직

Issue에서 대상 keyword를 추출한 뒤, 해당 keyword가 alias이면 `alias_of`를 따라가 canonical을 결정한다. 이를 통해 `금`(alias)에 대한 변경 요청과 `금값`(canonical)에 대한 변경 요청이 동일 대상임을 인식한다.

### 예외

긴급 삭제(`admin-approved` + 피싱/악성)는 기존대로 관리자 단독 승인으로 즉시 처리. 경쟁 투표 대상 아님.

---

## Phase 구분

### P1: 데이터 모델 + 리다이렉트 엔진

선행: incremental KV sync spec 구현 완료

| # | 작업 | 변경 파일 |
|---|------|----------|
| 1 | Alias JSON 스키마 정의 및 샘플 데이터 | `data/` (수동 테스트용 1~2개) |
| 2 | `validate-keyword.ts` — alias 검증 함수 | `scripts/validate-keyword.ts` |
| 3 | `sync-kv.ts` — buildKvEntries 2-pass alias 해소 | `scripts/sync-kv.ts` |
| 4 | `sync-kv.ts` — incrementalKvEntries 확장점에 alias 인식 로직 추가 | `scripts/sync-kv.ts` |
| 5 | 테스트 추가 | `scripts/__tests__/` |

**P1 완료 후:** alias JSON 수동 커밋으로 리다이렉트 작동. Workers 변경 없음.

### P2: Issue 자동화

| # | 작업 | 변경 파일 |
|---|------|----------|
| 1 | `register-alias.yml` Issue 템플릿 | `.github/ISSUE_TEMPLATE/` |
| 2 | `detach-alias.yml` Issue 템플릿 | `.github/ISSUE_TEMPLATE/` |
| 3 | `validate-issue.yml` — alias 등록 처리 | `.github/workflows/` |
| 4 | `validate-issue.yml` — alias 대상 변경 → canonical 변경 | `.github/workflows/` |
| 5 | `validate-issue.yml` — canonical 삭제 시 alias cascading | `.github/workflows/` |
| 6 | `validate-issue.yml` — 동일 canonical 동시 Issue 알림 | `.github/workflows/` |
| 7 | Issue 정보 코멘트 (alias 관계 안내) | `.github/workflows/` |

**P2 완료 후:** 커뮤니티가 Issue로 alias 등록/해제/삭제를 요청하고, 자동 PR 생성 + 투표 + 병합 파이프라인이 작동.

### P3: Web UI + 고도화 (Future)

- `가격.kr/금` 방문 시 alias 안내 UI ("금은 금값의 다른 이름입니다")
- `가격.kr/금값` 방문 시 역방향 표시 ("다른 이름: 금, 골드")
- 검색 UI에서 alias 포함 결과
- 새 키워드 제안 시 기존 유사 키워드 자동 제안
- Canonical 승격 제안 (alias 트래픽 > canonical 트래픽 시)
- 패턴 기반 자동 alias 제안 (~값, ~가격, ~비용 접미사)
- Alias 개수 제한 정책 (canonical당 5~10개)

---

## 영향 범위 요약

| 컴포넌트 | P1 변경 | P2 변경 |
|----------|---------|---------|
| `workers/` | **없음** | 없음 |
| `scripts/sync-kv.ts` | 2-pass alias 해소 + incremental alias 인식 | 없음 |
| `scripts/validate-keyword.ts` | alias 검증 함수 추가 | 없음 |
| `scripts/__tests__/` | alias 테스트 | 없음 |
| `data/` | alias JSON 샘플 | 없음 |
| `.github/ISSUE_TEMPLATE/` | 없음 | 2개 신규 템플릿 |
| `.github/workflows/validate-issue.yml` | 없음 | alias 처리 + 동시 Issue 알림 |
| `web/` | 없음 | 없음 (P3) |
