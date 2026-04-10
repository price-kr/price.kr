# 오픈소스 공개 준비 설계서

## 목표

가격.kr을 커뮤니티 참여 중심의 오픈소스 프로젝트로 공개한다. 위키피디아처럼 누구나 키워드를 제안하고 투표로 결정하는 모델이 핵심이며, 비개발자(키워드 제안)와 개발자(코드 기여) 모두의 진입 경로를 명확하게 만든다.

## 접근법

접근법 B (커뮤니티 중심 준비) — 법적/기술적 필수 사항 + 커뮤니티 참여 문서/장치 강화. 브랜딩/홍보 요소(CHANGELOG, FUNDING, contributors bot 등)는 커뮤니티 형성 후 추가한다.

## 변경 사항

### 1. LICENSE 파일 생성

- 루트에 `LICENSE` 파일 추가 (MIT License 전문)
- Copyright: `Copyright (c) 2026 Laeyoung Chang, Minho Ryang`
- 현재 README에 "MIT"라고만 적혀 있으나 실제 파일이 없어서 법적으로 "All Rights Reserved" 상태 — 이 파일이 가장 우선순위 높음
- README의 라이선스 섹션을 `[MIT](LICENSE)` 링크로 변경
- 도메인(`가격.kr`) 소유권 및 서비스 인프라는 MIT 라이선스의 범위에 포함되지 않음을 README에 명시 (포크 시 혼동 방지)

### 2. package.json 메타데이터 보강

루트 `package.json`에 다음 필드 추가:

```json
{
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/price-kr/price.kr.git"
  },
  "homepage": "https://가격.kr",
  "description": "커뮤니티 기반 한글 단축 URL 서비스",
  "author": "Laeyoung Chang",
  "contributors": ["Minho Ryang"],
  "keywords": ["korean", "url-shortener", "community", "cloudflare-workers", "nextjs"]
}
```

`private: true`는 유지 (npm 퍼블리시 의도 아님). 하위 workspace package.json은 변경하지 않음.

### 3. CODE_OF_CONDUCT.md

한국어로 작성. Contributor Covenant 기반, 이 프로젝트에 맞게 간결하게 (A4 1장 이내):

- **핵심 원칙**: 존중, 배려, 건설적 참여
- **기대 행동**: 건설적인 피드백, 다양한 의견 존중
- **금지 행동**: 비하/차별 발언, 스팸성 키워드 남용, 상업적 목적의 키워드 독점 시도, 개인정보 노출
- **신고 방법**: 메인테이너 이메일(`vibevista.cc@gmail.com`)로 직접 연락. 보안 취약점 신고는 SECURITY.md의 별도 채널 사용 안내
- **조치 단계**: 경고 → 임시 차단 → 영구 차단

### 4. CONTRIBUTING.md 보강

비개발자 → 개발자 순으로 진입 장벽이 낮은 것부터 배치. 상단에 첫 기여자 환영 문구 추가 ("GitHub 계정만 있으면 누구나 참여할 수 있습니다"):

1. **키워드 제안하기** — Issue 템플릿으로 새 키워드 제안 (기존 내용 보강)
2. **키워드 변경/삭제 요청** — 기존 Issue 템플릿 사용법 안내 (신규). 삭제 요청은 자동화 파이프라인 없이 관리자가 수동 검토하는 점 명시
3. **투표로 참여하기** — PR에 👍 반응 다는 방법 (신규, 가장 쉬운 기여)
4. **버그 리포트 / 기능 제안** — 일반 Issue 작성 안내 (신규)
5. **코드 기여** — 포크 → 브랜치 → PR 흐름, 로컬 개발 환경, 테스트 실행 필수 (보강). Hangul 파일명 표시를 위해 `git config core.quotePath false` 설정 안내 포함. 현재 상단 설치 섹션에 있는 sparse checkout 설명을 이 섹션으로 이동 (비개발자 섹션에서는 불필요)
6. **행동 강령** — CODE_OF_CONDUCT.md 링크 (기존 한 줄 설명 대체)
7. **기여 라이선스 동의 (inbound=outbound)** — "이 프로젝트에 코드를 기여하면, 해당 코드가 MIT 라이선스로 제공되는 것에 동의하는 것으로 간주됩니다." 문구 추가. 이는 DCO(Developer Certificate of Origin)가 아닌 inbound=outbound 모델로, `Signed-off-by` 서명을 요구하지 않음

### 5. PR 템플릿

`.github/PULL_REQUEST_TEMPLATE.md` 추가. 수동 코드 기여 PR용:

- 변경 내용 요약
- `npm test` 통과 여부
- 로컬에서 동작 테스트 완료 여부
- 관련 Issue 번호 (있다면)
- 한국어, 4~5줄 체크리스트 수준

자동 생성 PR (키워드 추가/변경/삭제)은 GitHub Actions가 만들므로 템플릿 적용 안 됨.

### 6. Issue 템플릿 보강

기존 3종 (제안/변경/삭제)은 유지하고 다음을 추가:

- **`config.yml`** 추가 — `blank_issues_enabled: false`로 설정하여, 템플릿 없는 빈 Issue 생성을 차단
- **`bug-report.yml`** — 버그 리포트 템플릿 (한국어). 재현 단계, 기대 동작, 실제 동작, 환경 정보
- **`feature-request.yml`** — 기능 제안 템플릿 (한국어). 제안 내용, 이유, 기대 효과

**주의:** `config.yml`, `bug-report.yml`, `feature-request.yml`은 반드시 같은 커밋에 배포해야 함. `config.yml`만 먼저 배포되면 버그 리포트/기능 제안을 위한 경로가 차단됨

### 7. README 구조 조정

현재 셋업 가이드 중심 → 커뮤니티 참여 중심으로 재구성:

1. **영문 부제 추가** — 한국어 제목 아래에 1~2줄 영문 설명 추가 (GitHub 검색 discoverability 용). 예: `Community-driven Korean subdomain URL shortener`
2. **헤더 배지 추가** — License, Node 버전, 테스트 상태, contributions-welcome, 한국어 배지
3. **"참여하기" 섹션 상단 배치** — 키워드 제안 / 투표 / 코드 기여 3가지 경로를 눈에 띄게. 기존 하단의 "기여하기" 섹션(CONTRIBUTING.md 링크)은 이 섹션으로 통합하여 제거
4. **셋업 가이드 + 트러블슈팅을 함께 접기(`<details>`) 처리** — 포크 운영자만 필요한 내용. 접어서 README 길이 축소
5. **키워드 등록 프로세스 시각화 보강** — 기존 6단계 텍스트 리스트를 ASCII 흐름도로 대체 (중복 추가가 아닌 기존 내용 대체)
6. **라이선스 섹션 보강** — `[MIT](LICENSE)` 링크 + 도메인/인프라는 라이선스 범위 밖 명시
7. **프로젝트 구조 다이어그램 수정** — 현재 다이어그램이 실제 파일 구조와 불일치. 누락: `docs/OPERATIONS.md`, `docs/superpowers/`, `docs/PLAN-top100-keywords.md`. 또한 이번에 새로 추가되는 루트 파일들(`LICENSE`, `CODE_OF_CONDUCT.md`)과 `.github/` 하위 파일(`PULL_REQUEST_TEMPLATE.md`, 새 Issue 템플릿)도 반영. README 구조 조정 시 함께 현행화

변경하지 않는 것:
- 전체 영문 README / 번역 추가 안 함 (영문 부제만 추가)
- 로드맵 섹션 추가 안 함 (커뮤니티 형성 전이라 시기상조)

### 8. 내부 문서 정리

- `PRD.md` → `docs/PRD.md`로 이동. 루트에는 커뮤니티 표준 파일만 남김. (참고: README의 프로젝트 구조 다이어그램이 이미 `docs/PRD.md`로 표기하고 있으나, 이는 현재 실제 위치가 아닌 미래 상태를 보여주는 것임. 파일 이동 후 다이어그램이 정확해짐)
- `docs/DEV_LOG.md`, `docs/DEV_PROGRESS.md`, `docs/OPERATIONS.md` — 그대로 유지 (투명성 측면에서 장점)
- `CLAUDE.md` — 그대로 유지 (민감 정보 없음 확인 완료)

### 9. Git 정리

- `package-lock.json` — 현재 삭제(D) 상태. monorepo workspace 구조에서 lockfile은 재현 가능한 빌드(`npm ci`)를 위해 필수. `npm install`로 복원하고 커밋. (`.gitignore`에 추가하는 것은 CI 안정성을 해치므로 지양)

## 범위 밖 (의도적으로 제외)

- CHANGELOG.md — 커뮤니티 형성 후 추가
- .github/FUNDING.yml — 커뮤니티 형성 후 추가
- 기여자 인정 체계 (all-contributors bot 등) — 커뮤니티 형성 후 추가
- 아키텍처 시각 다이어그램 — 현재 텍스트 기반으로 충분
- GitHub Topics/Social Preview — 별도 작업
- 문서 사이트 분리 (Wiki, Docusaurus 등) — 규모 대비 과투자
- 웹 UI 키워드 제안 (GitHub 계정 없이) — 현행 파이프라인 유지. 다만 GitHub 계정 미보유자에 대한 가입 안내를 CONTRIBUTING에 포함
- 기존 자동화 파이프라인 변경 — 현행 유지
- 전체 영문 번역 — 한국인 대상 프로젝트 (영문 부제만 추가)
- GitHub Discussions — 커뮤니티 형성 후 카테고리 구성하여 추가 검토 (공지사항, 키워드 아이디어, Q&A, 자유 게시판 등)
- SECURITY.md 한국어 번역 — 보안 보고는 영어가 국제 표준이므로 현행 유지
- 비속어 블록리스트 확장 — 오픈소스 준비 Spec 범위 밖이지만 **공개 전 반드시 별도 태스크로 진행 필요** (현재 8개는 공개 서비스에 부족)
- 코드 포매터 설정 (.prettierrc, .editorconfig) — 별도 태스크

## 기존 잘 갖춰진 것 (변경 불필요)

- SECURITY.md — 이미 전문적으로 작성됨
- .github/CODEOWNERS — 적절히 설정됨
- .github/ISSUE_TEMPLATE/ 기존 3종 (제안/변경/삭제) — 잘 구성됨
- .gitignore — .env, node_modules 등 적절히 제외
- 시크릿 관리 — 하드코딩된 키 없음
- GitHub Actions 3종 — 검증, 동기화, 자동 머지 파이프라인 구축 완료
- 의존성 라이선스 — 전부 MIT/Apache-2.0 등 허용적 라이선스
- Unicode NFC 정규화 — 한글 키워드 처리 적절
