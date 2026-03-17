# Development Log

개발 과정에서의 주요 내용, 기술적 결정, 검토 사항을 시간순(최신이 위)으로 기록합니다.

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
