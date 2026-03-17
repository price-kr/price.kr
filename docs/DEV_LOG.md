# Development Log

개발 과정에서의 주요 내용, 기술적 결정, 검토 사항을 시간순(최신이 위)으로 기록합니다.

---

## 2026-03-17 ~16:00 — Tasks 9-16: GitHub Actions, Seed Data, Docs 일괄 완료

**작업 내용:**
- Task 9: `validate-issue.yml` — Issue 파싱 → 키워드/URL 유효성 검증 (blocklist+jamo, whitelist, Safe Browsing) → 자동 PR 생성
- Task 10: `sync-kv.yml` — main push 시 incremental/full KV 동기화 + 삭제 처리
- Task 11: `auto-merge.yml` — 6시간마다 투표 확인, admin-approved 즉시 병합, PR 생성자 투표 제외
- Task 12: Task 4에서 이미 완료 (layout.tsx Korean OG meta + next.config.ts)
- Task 13: `seed-data.ts` — TSV 입력으로 키워드 JSON 파일 일괄 생성 + 3개 테스트
- Task 14: 전체 스모크 테스트 — **43 tests, 11 files, ALL PASS**
- Task 15: `delete-keyword.yml` 삭제 요청 템플릿 + `.github/CODEOWNERS`
- Task 16: `CONTRIBUTING.md` (sparse checkout 가이드 포함) + `README.md` 업데이트

**기술적 결정:** 없음 — 플랜대로 실행. GitHub Actions workflow는 YAML 파일이므로 유닛 테스트 불가, 실제 리포 배포 후 검증 필요.

---

## 2026-03-17 ~15:55 — Tasks 5-8: 데이터/설정 태스크 일괄 완료

**작업 내용:**
- Task 5: 샘플 키워드 데이터 (만두, 가방, iphone) JSON 파일 생성
- Task 6: `sync-kv.ts` — JSON → Cloudflare KV 동기화 스크립트 + `buildKvEntries` 테스트
- Task 7: GitHub Issue 템플릿 3종 (새 단어 제안, 변경 요청, 삭제 요청)
- Task 8: `blocklist.json` (상표명 8개), `whitelist.json` (11개 도메인), `profanity-blocklist.json` (비속어 8개)

**기술적 결정:** 없음 (플랜대로 실행). 데이터/설정 파일이므로 별도 에이전트 리뷰 생략.

---

## 2026-03-17 ~15:50 — Task 4: Next.js Web App 완료

**작업 내용:**
- `web/` 워크스페이스 수동 생성 (create-next-app 대신 — interactive prompt 회피)
- Next.js 15 App Router: layout.tsx (Korean OG meta), page.tsx (검색 UI), [keyword]/page.tsx, privacy/page.tsx
- SearchBar 클라이언트 컴포넌트 (자동완성, 초성 검색)
- lib/hangul.ts (웹용 초성 추출/검색), lib/keywords.ts (JSON 데이터 로더, server-only)
- vitest.config.ts + jsdom 환경, @testing-library/react
- 7개 테스트 전부 통과

**기술적 결정:**

### 1. create-next-app 대신 수동 프로젝트 구성
- **결정:** `create-next-app`의 interactive prompt(React Compiler 질문)를 피하기 위해 수동으로 package.json, tsconfig.json 등 생성
- **이유:** CI/sandbox 환경에서 interactive prompt가 hang됨

### 2. `outputFileTracingIncludes`로 data/ 디렉토리 명시적 포함
- **결정:** `next.config.ts`에 `outputFileTracingIncludes: { "/*": ["../data/**/*"] }` 추가
- **이유:** `outputFileTracingRoot`만으로는 `data/` 파일이 Vercel serverless 번들에 포함되지 않음. Vercel에서 `process.cwd()`는 `/var/task`를 반환하므로 `../data`가 존재해야 함
- **검토:** data/를 web/ 안에 이동하는 것도 고려했으나, workers/와 scripts/에서도 참조하므로 monorepo 루트에 유지

### 3. `getDataDir()` 함수화
- **결정:** `[keyword]/page.tsx`에서 `dataDir`를 모듈 스코프 상수에서 함수 호출로 변경
- **이유:** 모듈 스코프의 `process.cwd()` 호출은 import 시점에 평가되어 빌드/edge 환경에서 예상과 다를 수 있음

---

## 2026-03-17 ~15:45 — Task 3: Cloudflare Workers Redirect Engine 완료

**작업 내용:**
- `workers/` 워크스페이스 설정 (package.json, wrangler.toml, tsconfig.json)
- `subdomain.ts`: Host 헤더에서 서브도메인 추출 + punycode 디코딩
- `fallback.ts`: KV 장애 시 GitHub Raw Content 폴백 (Cache API 활용)
- `index.ts`: 메인 핸들러 — KV 조회 → 302 리다이렉트, 실패 시 폴백, 에러 페이지
- 16개 테스트 전부 통과 (unit test 방식, mock KV)

**기술적 결정:**

### 1. `punycode` import 경로: trailing slash 제거
- **결정:** `import punycode from "punycode"` (slash 없이)
- **이유:** Cloudflare Workers는 Node.js 런타임이 아님. trailing slash(`punycode/`)는 Node.js에서 npm 패키지를 명시적으로 로드하는 트릭이지만, Wrangler의 esbuild 번들러는 `punycode`만으로도 npm 패키지를 올바르게 resolve
- **검토:** `node_compat = true` 없이도 esbuild가 npm 의존성을 번들에 포함시킴

### 2. 테스트 환경: `@cloudflare/vitest-pool-workers` 대신 일반 vitest
- **결정:** Workers 전용 vitest pool 대신 표준 vitest + mock KV 사용
- **이유:** 현 환경(Linux arm64)에서 vitest-pool-workers 실행 시 segfault 발생. esbuild postinstall도 일부 실패
- **영향:** `caches.default`, KVNamespace 등 CF Workers API는 수동 mock. 프로덕션 동작 검증은 `wrangler dev`로 별도 수행 필요

### 3. Korean URL in Location 헤더: Node.js ByteString 제약
- **결정:** 테스트에서 KV 값에 URL-encoded 쿼리 파라미터 사용
- **이유:** Node.js의 `Response` 구현은 HTTP 헤더에 non-ASCII 문자(ByteString 범위 초과) 허용 안 함. CF Workers 런타임은 허용하므로 프로덕션에서는 문제없음
- **검토:** 실제 KV 데이터에는 URL-encoded 값을 저장하면 양쪽 모두 호환

### 4. Fallback URL 경로 인코딩
- **결정:** `buildFallbackUrl`에서 경로 세그먼트별 `encodeURIComponent` 적용
- **이유:** 한글 디렉토리명(`ㅁ/만/만두.json`)이 raw URL로 전달되면 `fetch()` 동작이 런타임에 따라 다를 수 있음

---

## 2026-03-17 ~15:30 — Task 2: Hangul Utilities 완료

**작업 내용:**
- `scripts/` 워크스페이스 설정 (package.json, tsconfig.json, vitest.config.ts)
- `hangul-path.ts`: 초성 추출(`getChoseong`) + 키워드→파일 경로 계산(`getKeywordPath`)
- `validate-keyword.ts`: NFC 정규화, 금지어 검사, 자모(ㅋㅍ) 우회 탐지
- 16개 테스트 전부 통과

**기술적 결정:**

### 1. vitest 3.x → 2.x 다운그레이드
- **결정:** vitest `^2.1.8` 사용 (플랜은 `^3.0.0` 명시)
- **이유:** vitest 3.x가 현 환경(Linux arm64)에서 Segmentation fault 발생. 2.x는 정상 동작
- **영향:** Workers 워크스페이스도 `@cloudflare/vitest-pool-workers`와 vitest 2.x 사용 예정이므로 버전 일관성 확보

### 2. 빈 문자열 방어 추가
- **결정:** `getKeywordPath("")` 호출 시 `throw Error` (플랜에는 없었음)
- **이유:** 리뷰에서 발견 — `keyword[0]`이 `undefined`가 되어 `charCodeAt` 호출 시 TypeError 발생
- **검토:** 빈 문자열은 상위 레이어(Workers의 `extractSubdomain`, Actions의 regex)에서 걸러지지만, 방어적 프로그래밍으로 추가

### 3. 자모(ㅋㅍ) 키워드의 파일 경로 라우팅
- **결정:** 호환성 자모(U+3131-U+314E)로 시작하는 키워드는 `_en` 디렉토리로 라우팅
- **이유:** `getChoseong`은 조합형 음절(U+AC00-U+D7A3)만 인식. 독립 자모는 조합형 범위 밖이므로 한글로 분류 불가
- **검토 대안:** 자모 전용 디렉토리(`_jamo/`) 추가 고려 → 실사용 시나리오가 거의 없으므로 과잉 설계로 판단

---

## 2026-03-17 ~14:40 — Task 1: Project Scaffolding 완료

**작업 내용:**
- npm workspaces 기반 모노레포 구조 설정 (`workers`, `web`, `scripts`)
- 공유 TypeScript 설정 (`tsconfig.base.json`)
- `.gitignore`, `.nvmrc` (Node 20) 생성

**기술적 결정:** 없음 (플랜대로 실행)

---

## 2026-03-17 ~14:00 — Phase 1 MVP 플랜 5차 리뷰 완료

**작업 내용:**
5개 전문 에이전트 팀(Workers, Next.js, GitHub Actions, Data Architecture, PRD Coverage)이 5라운드에 걸쳐 플랜을 검토하고 수정.

**주요 기술적 결정:**

### 1. KV 기반 Rate Limiter 제거
- **결정:** Phase 1에서 자체 rate limiter를 구현하지 않고 Cloudflare 기본 DDoS 방어에 의존
- **이유:** Cloudflare KV 무료 티어가 일일 1,000 쓰기로 제한. 매 요청마다 KV write하는 rate limiter는 수 분 내에 일일 할당량 초과
- **검토 대안:** Cloudflare Rate Limiting Rules (대시보드 설정), Workers 인메모리 카운터 (isolate 간 공유 불가)
- **Phase 2 계획:** Cloudflare Rate Limiting Rules로 전환

### 2. Punycode 직접 구현 → npm 패키지 전환
- **결정:** RFC 3492 직접 구현 대신 `punycode/` npm 패키지 사용
- **이유:** 직접 구현 시 integer overflow 위험, 엣지 케이스 누락 가능. 검증된 라이브러리가 안전
- **참고:** `punycode/` (trailing slash)는 npm 패키지를 명시적으로 지정 — Node.js deprecated built-in과 구분

### 3. GitHub Actions Script Injection 방지
- **결정:** 모든 사용자 입력을 `env:` 블록으로 전달, `${{ }}` 직접 삽입 금지
- **이유:** Issue 본문에서 추출한 keyword/url을 `${{ steps.parse.outputs.keyword }}`로 JS 코드에 직접 넣으면 `'; process.exit(1); '` 형태의 injection 가능
- **적용:** validate-issue.yml의 Validate, Create PR 스텝 모두 `env:` → `process.env` 패턴 사용

### 4. Vercel에서 `data/` 디렉토리 접근
- **결정:** `outputFileTracingRoot`를 모노레포 루트로 설정 + `process.cwd()` 기반 경로
- **이유:** `data/`가 `web/` 밖에 있어 Vercel 배포 시 기본 포함 안 됨. `__dirname`은 Next.js 빌드 후 `.next/server/app/` 내부를 가리켜 불안정
- **검토 대안:** `__dirname` + 상대경로 (빌드 후 경로 불일치로 실패), `data/`를 `web/` 안으로 복사 (DRY 위반)

### 5. 영문 키워드 소문자 정규화
- **결정:** JSON `keyword` 필드와 파일명 모두 lowercase 강제
- **이유:** `getKeywordPath`가 파일명을 소문자로 생성하지만, JSON의 `keyword` 필드는 원본 케이스 유지 시 KV key와 파일명 불일치 발생. 삭제 동기화 시 `basename`으로 추출한 파일명과 KV key가 달라 삭제 실패

### 6. GitHub Raw Content Fallback 추가
- **결정:** KV 장애 시 GitHub Raw Content URL에서 개별 키워드 JSON을 fetch + Cache API로 5분 캐싱
- **이유:** PRD 8.2 가용성 요구사항. KV 전면 장애 시에도 서비스 유지 필요
- **검토:** GitHub 비인증 시 60req/hr 제한 → `GITHUB_TOKEN` 환경변수로 5,000req/hr 확장 가능

---

## 2026-03-17 ~13:00 — PRD 작성 및 Phase 1 MVP 플랜 초안

**작업 내용:**
- PRD.md 작성: Cloudflare+Vercel 하이브리드 아키텍처, 커뮤니티 파이프라인
- Phase 1 MVP 구현 플랜 16개 태스크로 분해

**기술적 결정:**

### 하이브리드 아키텍처 (Cloudflare + Vercel)
- **결정:** 리다이렉트는 Cloudflare Workers, 웹앱은 Vercel Free
- **이유:** Vercel Free 플랜이 와일드카드 도메인 미지원 (Pro 이상 필요). Cloudflare는 무료로 와일드카드 DNS + SSL + Workers + KV 모두 제공
- **비용:** $0/월 (도메인 비용 제외)
