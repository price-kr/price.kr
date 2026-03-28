# Development Log

개발 과정에서의 주요 내용, 기술적 결정, 검토 사항을 시간순(최신이 위)으로 기록합니다.

---

## 2026-03-28 ~00:10 — Keyword Expansion: 100 → 1000

**작업 내용:**
Preset 키워드를 101개에서 1002개로 확장. `generate-top100-tsv.ts`를 `generate-top1000-tsv.ts`로 교체하고 카테고리 기반 아키텍처로 리팩터링.

**아키텍처 결정:**
- `CategoryDef` 인터페이스 도입: `{ name, defaultUrl, keywords[], overrides? }` — 카테고리별 기본 URL 함수 + 예외 매핑
- Tier 1 (위트형 ~80개): `TIER1_KEYWORDS: Record<string, string>`으로 수동 URL 유지
- Tier 2-3 (카테고리형 ~920개): 23개 `CategoryDef`로 키워드 배열 + URL 자동 생성
- `EXISTING_KEYWORDS`를 하드코딩(3개) → `data/` 디렉토리 동적 스캔으로 교체하여 `created` 날짜 보존 자동화
- 중복 키워드 자동 감지 및 스킵 (7개 중복 발견/처리)

**신규 URL 헬퍼 8개 추가:**
`encar`, `yes24`, `petFriends`, `goodChoice`, `siksinhot`, `coupang`, `naverMap`, `oliveyoung`

**whitelist.json 확장:**
47개 → 78개 도메인 (encar, yes24, oliveyoung, interpark, dominos, steam, spotify 등)

**23개 카테고리:**
식품, 가전, 패션, 뷰티, 가구, 지역, 육아, 반려동물, 건강, 스포츠, 자동차, 도서, 여행, 금융, 엔터테인먼트, 사무, 원예, 결혼, 디지털서비스, 외식, 공공서비스, 부동산상세, 라이프스타일

**변경 파일:**
- `scripts/generate-top1000-tsv.ts` (신규)
- `scripts/top1000-keywords.tsv` (생성된 TSV)
- `data/whitelist.json` (도메인 추가)
- `data/**/*.json` (901개 신규 키워드 JSON)
- `scripts/generate-top100-tsv.ts`, `scripts/top100-keywords.tsv` (삭제)

**변경 불필요 확인:** seed-data.ts, sync-kv.ts, web 앱, Workers, GitHub Actions 모두 호환성 확인됨.

**검증:** 52개 테스트 ALL PASS (workers 19 + web 10 + scripts 23)

---

## 2026-03-26 ~23:30 — Witty URL Mapping: "가격" 테마 URL 전면 교체

**작업 내용:**
97개 키워드의 target URL을 "○○.가격.kr = ○○의 가격을 가장 잘 보여주는 곳" 테마에 맞게 전면 교체.

**3-tier 전략:**
- **Tier 1 (위트 ~30개):** "가격"을 재미있게 재해석 — 공무원→봉급표(mpm.go.kr), 영화→CGV, 야구→스탯티즈 연봉, 커피→스타벅스 메뉴, 부동산→호갱노노
- **Tier 2 (가격비교 ~44개):** 전문 가격비교 사이트 — 가전→다나와, 패션→무신사, 뷰티→화해, 가구→오늘의집, 반려동물→펫프렌즈
- **Tier 3 (유지 ~23개):** 식품→네이버 쇼핑(대안 없음), 지역→네이버 부동산("동네의 가격=집값" 재해석)

**기술적 결정:**
- `generate-top100-tsv.ts` 전면 리팩터링: 카테고리 기반 switch문 → `KEYWORD_URLS: Record<string, string>` 키워드별 직접 매핑
- 헬퍼 함수로 사이트별 URL 패턴 추상화: `danawa()`, `musinsa()`, `hwahae()`, `ohou()`, `naverLand()`, `naverShopping()`
- `data/whitelist.json`에 32개 신규 도메인 추가 (13→45개)
- validate-first/output-later 패턴 및 blocklist 검증 로직 유지

**웹 조사 결과 (미확정 키워드):**
- 축구 → K리그 공식(kleague.com), 골프 → 티스캐너(teescanner.com), 헬스 → 다짐(da-gym.co.kr)
- 날씨/뉴스/다이어트/농구/여행: 적절한 "가격" 해석 없어 현행 유지

---

## 2026-03-26 ~08:30 — Top 100 Korean Keywords Seeding

**작업 내용:**
한국인이 많이 검색하는 키워드 100개를 사전 등록하여 서비스 초기 콘텐츠를 확보했다.

**수행 단계:**
1. `data/whitelist.json`에 `weather.naver.com`, `map.naver.com` 도메인 추가
2. 웹 검색으로 2025-2026 한국 검색 트렌드 조사 (Google Year in Search, 네이버 쇼핑 트렌드)
3. 97개 신규 키워드 선정 (기존 만두/가방/iphone 제외)
4. `scripts/generate-top100-tsv.ts` 생성 — 카테고리별 URL 매핑 + blocklist 검증
5. `seed-data.ts`로 97개 JSON 파일 생성
6. 전체 52개 테스트 통과 확인

**키워드 선정 기준:**
- 카테고리: 쇼핑 57개, 정보성 25개, 지역 10개, 기타 5개
- 쇼핑 키워드는 네이버 쇼핑 검색으로 연결, 지역은 나무위키, 날씨는 weather.naver.com 등 적합한 서비스로 매핑
- blocklist(브랜드 8개) + profanity-blocklist(비속어 8개) 검증 통과

**기술적 결정:**
- **Validate-first, output-later 패턴**: 모든 키워드 검증을 완료한 뒤 TSV 출력 → partial TSV 방지
- **모든 URL에 `encodeURIComponent` 적용**: namu.wiki path 포함 (HTTP Location 헤더는 ASCII만 허용, RFC 7230)
- **맛집 이중 적용 방지**: keyword === "맛집"이면 접미사 생략
- **기존 키워드 보호**: `EXISTING_KEYWORDS` Set으로 기존 3개 키워드를 TSV에서 제외 → created 날짜 보존

**KV 동기화:**
`workflow_dispatch`로 `sync-kv.yml` full-sync 수동 트리거 권장 (incremental은 ~97회 개별 write로 15-25분 CI 소요).

**3-agent 코드 리뷰 후 수정 (5회 반복 검토):**
- **호텔**: `shopping` → `info` — 네이버 쇼핑에서 호텔 상품이 아닌 예약/정보 검색이 사용자 의도
- **택시**: `info` → `transport` — 일반 검색보다 네이버 지도에서 택시 찾기가 적합
- **캠핑**: `shopping` → `info` — "Travel" 코멘트 블록에 있으면서 shopping 카테고리였던 모순 해소
- **에어팟** → **무선이어폰**: Apple 상표권 리스크 회피를 위해 일반 용어로 교체
- **이태원**: `place`(나무위키) → `transport`(네이버 지도) — 나무위키 문서가 2022 이태원 참사 내용 위주로 구성되어 지도 검색이 더 적절

---

## 2026-03-18 ~11:00 — Phase 1 코드 리뷰 3차 (최종) 및 수정

**작업 내용:**
3차 fresh-eyes 리뷰 에이전트 3개 배치. Critical 1건, Important 다수 발견 및 수정.

**수정된 Critical 이슈:**

### 1. validate-issue.yml: keyword-change 파싱 불일치
- **문제:** 변경 요청 이슈 템플릿의 필드 라벨이 "변경할 키워드"인데, 파싱 regex는 "### 키워드"만 매칭 → 모든 keyword-change 이슈가 파싱 실패하여 자동 close됨.
- **수정:** `body.match(/### (?:키워드|변경할 키워드)\s*\n\s*(.+)/)` — 두 라벨 모두 매칭.

**수정된 Important 이슈:**

### 2. Unicode dot separator 우회 (workers/src/subdomain.ts)
- **문제:** `sub.includes(".")` 검사가 punycode decode 전에 실행되어 Unicode dot(U+3002 등)을 검출 불가.
- **수정:** dot 검사를 `punycode.toUnicode()` 이후로 이동.

### 3. cache.put 실패 시 fallback 전체 실패 (workers/src/fallback.ts)
- **문제:** GitHub에서 URL을 성공적으로 가져왔지만 Cache API write가 실패하면 전체 fallback이 throw → 유효 URL을 버리고 웹앱으로 리다이렉트.
- **수정:** `cache.put`을 try/catch로 감싸 — 캐시 실패는 비치명적 처리.

### 4. SearchBar blurTimeout 메모리 릭 (web/components/SearchBar.tsx)
- **문제:** 컴포넌트 unmount 시 setTimeout 미정리 → stale closure 실행 가능.
- **수정:** `useEffect` cleanup에서 `clearTimeout` 호출.

### 5. activeIndex 범위 검사 (web/components/SearchBar.tsx)
- **수정:** Enter 키 핸들러에 `activeIndex < suggestions.length` 상한 검사 추가.

### 6. getDataDir 중복 제거 (web)
- **문제:** `page.tsx`와 `[keyword]/page.tsx`에서 각각 `join(process.cwd(), "..", "data")` 인라인 사용.
- **수정:** `lib/keywords.ts`에 `getDataDir()` 함수로 통합, 양쪽 페이지에서 import.

### 7. sync-kv.yml jq null 필터 누락
- **문제:** full sync의 jq 파이프라인이 `keyword`/`url` null인 항목을 걸러내지 않음.
- **수정:** `jq -s '[.[] | select(.keyword != null and .url != null) | ...]'` 추가.

### 8. 기타
- fallback.test.ts: "3M" → "3m"으로 변경 (실제 프로덕션에서는 항상 소문자 전달)
- seed-data.test.ts: temp 디렉토리 cleanup 추가
- .gitignore: `.DS_Store`, `.claude/`, `coverage/` 추가

**테스트 결과:** 52 tests, 11 files, ALL PASS

---

## 2026-03-18 ~09:30 — Phase 1 전체 코드 리뷰 및 수정

**작업 내용:**
5개 전문 리뷰 에이전트(Workers, Web, Scripts, Actions, Data/Config)를 병렬 배치하여 Phase 1 전체 코드를 상세 검토.
Critical 5건, Important 10+건, Suggestion 10+건 발견. Critical과 주요 Important 이슈를 즉시 수정.

**수정된 Critical 이슈:**

### 1. Open Redirect 취약점 방지 (workers/src/index.ts)
- **문제:** KV/fallback에서 가져온 URL에 대한 검증 없이 302 리다이렉트. `javascript:`, `data:` 등 위험한 스키마로 리다이렉트 가능.
- **수정:** `isSafeRedirectUrl()` 함수 추가 — `http:`/`https:` 프로토콜만 허용. 위험한 URL은 503 에러 페이지 반환.

### 2. Fallback 로직 오류 수정 (workers/src/index.ts)
- **문제:** GitHub Raw Content fallback이 KV 예외(throw) 시에만 시도됨. KV가 `null` 반환(키 미존재) 시 fallback 미시도 → PRD 8.2 가용성 요구사항 미충족.
- **수정:** KV miss(`null`)와 KV error 모두에서 fallback 시도하도록 제어 흐름 재구성.
- **영향:** 기존 테스트 1개 업데이트 + 새 테스트 4개 추가 (fallback 성공, unsafe URL 거부, 소문자 정규화).

### 3. 영문 키워드 소문자 정규화 (workers/src/index.ts)
- **문제:** `extractSubdomain` 결과를 그대로 KV lookup에 사용. DNS가 대소문자 보존 시 `iPhone` ≠ `iphone` 불일치.
- **수정:** KV lookup 전 `.toLowerCase()` 적용. 한글은 영향 없음(no-op).

### 4. blocklist/whitelist JSON 파일 혼입 (web + scripts)
- **문제:** `findJsonFiles()`가 `data/` 내 모든 `.json` 파일을 재귀 수집. `blocklist.json`, `whitelist.json`, `profanity-blocklist.json`은 배열 형태로 KeywordEntry 스키마와 불일치 → `undefined` 키워드 생성, KV에 garbage 데이터 write.
- **수정:** `NON_KEYWORD_FILES` Set으로 제외 + JSON 파싱 시 `keyword`/`url` 필드 존재 여부 검증. malformed JSON은 skip.

### 5. validate-issue.yml null body 가드 (GitHub Actions)
- **문제:** `context.payload.issue.body`가 API로 빈 본문 Issue 생성 시 `null` → `.match()` 호출에서 TypeError.
- **수정:** `const body = context.payload.issue.body || '';`

**수정된 Important 이슈:**
- `[keyword]/page.tsx`: `generateMetadata` 추가 (SEO — 키워드별 고유 title/description)
- `privacy/page.tsx`: 메타데이터 export 추가
- `SearchBar.tsx`: onBlur 핸들러, 키보드 내비게이션(ArrowUp/Down, Enter, Escape), ARIA combobox 패턴 적용, URL 구성 전 키워드 정규식 검증

**테스트 결과:** 46 tests, 11 files, ALL PASS (Workers 19 + Web 7 + Scripts 20)

**미수정 잔여 이슈 (Phase 2 고려):**
- 코드 중복: choseong/path 로직이 5곳에 독립 구현 (shared 패키지 추출 고려)
- `sync-kv.yml` full sync가 additive-only (stale KV entry 미삭제)
- `keyword-delete` 이슈 라벨에 대한 워크플로우 미구현
- `web/tsconfig.json`이 `tsconfig.base.json` 미확장
- blocklist 확대 필요 (현재 8개 브랜드명)
- `_num/` 디렉토리 샘플 데이터 미존재

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
