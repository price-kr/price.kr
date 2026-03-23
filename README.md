# 가격.kr — 커뮤니티 기반 한글 단축 URL 서비스

한글 키워드로 최저가를 찾아보세요. `만두.가격.kr` → 네이버 쇼핑 최저가 페이지로 바로 이동!

커뮤니티 투표로 각 키워드의 목적지 URL이 결정됩니다.

## 사용법

브라우저 주소창에 `{키워드}.가격.kr`을 입력하세요.

```
만두.가격.kr  → 만두 최저가 검색
가방.가격.kr  → 가방 최저가 검색
iphone.가격.kr → iPhone 최저가 검색
```

## 아키텍처

Cloudflare (리다이렉트) + Vercel (웹앱) 하이브리드 구조로 월 $0 운영됩니다.

```
사용자 → 만두.가격.kr
         ↓
  Cloudflare Workers (와일드카드 DNS)
    → Host 헤더에서 서브도메인 추출
    → Punycode 디코딩 (xn--hu1b07h → 만두)
    → KV 조회 → 302 리다이렉트
    → (KV 실패 시) GitHub Raw Content 폴백
    → (키워드 미등록 시) Vercel 웹앱으로 안내
```

## 프로젝트 구조

```
price.kr/
├── workers/          # Cloudflare Workers 리다이렉트 엔진
│   └── src/          #   subdomain.ts, fallback.ts, index.ts
├── web/              # Next.js 15 App Router (Vercel)
│   ├── app/          #   검색 UI, [keyword] 페이지, 개인정보처리방침
│   ├── components/   #   SearchBar (자동완성, 초성 검색)
│   └── lib/          #   hangul.ts, keywords.ts
├── scripts/          # 공유 유틸리티
│   ├── hangul-path.ts      # 초성 추출, 키워드→파일 경로 계산
│   ├── validate-keyword.ts # 키워드 검증 (블록리스트, 비속어, 자모 우회 탐지)
│   ├── sync-kv.ts          # JSON → Cloudflare KV 동기화
│   └── seed-data.ts        # TSV → 키워드 JSON 일괄 생성
├── data/             # 키워드 데이터 (3단계 디렉토리 구조)
│   ├── {초성}/{첫글자}/{keyword}.json  # 한글 키워드
│   ├── _en/{keyword}.json              # 영문 키워드
│   ├── _num/{keyword}.json             # 숫자 시작 키워드
│   ├── blocklist.json        # 상표명 블록리스트
│   ├── whitelist.json        # 허용 도메인 목록
│   └── profanity-blocklist.json  # 비속어 블록리스트
├── .github/
│   ├── workflows/
│   │   ├── validate-issue.yml  # Issue → 키워드/URL 검증 → 자동 PR
│   │   ├── sync-kv.yml         # main push → KV 동기화
│   │   └── auto-merge.yml      # 커뮤니티 투표 → 자동 병합
│   └── ISSUE_TEMPLATE/         # 제안/변경/삭제 양식
└── docs/
    ├── PRD.md              # 제품 요구사항 정의서
    ├── DEV_PROGRESS.md     # 개발 진행 상황
    └── DEV_LOG.md          # 기술적 결정 기록
```

## 키워드 등록 프로세스

1. GitHub Issue로 키워드 제안 (템플릿 제공)
2. 자동 검증: 블록리스트, 비속어, 자모 우회, Safe Browsing, 도메인 화이트리스트
3. 검증 통과 시 자동 PR 생성
4. 커뮤니티 투표 (👍 3개 이상, 변경은 5개 이상)
5. 투표 충족 + 24시간 대기 후 자동 병합
6. main push 시 Cloudflare KV 자동 동기화

`admin-approved` 라벨이 있는 PR은 투표/대기 없이 즉시 병합됩니다.

## 셋업 가이드

### 1. 사전 요구사항

- Node.js 20+
- [Cloudflare 계정](https://dash.cloudflare.com/) (Workers + KV 무료 플랜)
- [Vercel 계정](https://vercel.com/) (웹앱 배포용, 무료 플랜)
- 도메인 (`가격.kr` / `xn--o39aom.kr`) — Cloudflare DNS에 등록

### 2. 의존성 설치

```bash
git clone https://github.com/price-kr/price.kr.git
cd price.kr
npm install
```

### 3. Cloudflare 도메인 & DNS 설정

#### 도메인 등록

1. [Cloudflare 대시보드](https://dash.cloudflare.com/)에서 도메인 추가: `xn--o39aom.kr` (가격.kr의 punycode)
2. 도메인 등록기관(예: 가비아, 후이즈 등)에서 네임서버를 Cloudflare가 제공하는 NS로 변경

#### DNS 레코드 설정

Cloudflare DNS 탭에서 다음 레코드를 추가합니다:

| 타입 | 이름 | 값 | 프록시 | 용도 |
|------|------|-----|--------|------|
| A | `@` (루트) | `76.76.21.21` | OFF (DNS only) | bare domain → Vercel 웹앱 |
| CNAME | `www` | Vercel 대시보드에서 확인 | OFF (DNS only) | www → Vercel 웹앱 (bare domain으로 리다이렉트) |
| A | `*` (와일드카드) | `192.0.2.1` | ON (Proxied) | `*.가격.kr` → Cloudflare Workers |
| AAAA | `*` (와일드카드) | `100::` | ON (Proxied) | IPv6 와일드카드 → Cloudflare Workers |

> **핵심 구조:** `가격.kr` (bare domain)은 Vercel이 처리하고, `만두.가격.kr` 등 와일드카드 서브도메인은 Cloudflare Workers가 처리합니다.

- **루트 도메인 (`@`):** Vercel의 A 레코드 IP를 사용하며, Cloudflare 프록시를 끕니다 (회색 구름). Vercel이 직접 SSL과 라우팅을 처리합니다.
- **`www`:** Vercel 프로젝트별 CNAME 값(Vercel 대시보드 → Domains에서 확인, 형식: `<hash>.vercel-dns.com`)으로 연결하며, 프록시를 끕니다. Vercel이 자동으로 bare domain으로 리다이렉트합니다.
- **와일드카드 (`*`):** dummy IP를 사용하며, Cloudflare 프록시를 켭니다 (주황 구름). 실제 트래픽은 Workers route(`*.xn--o39aom.kr/*`)가 가로채서 처리합니다.

> `192.0.2.1`은 RFC 5737 문서용 IP이며, origin 서버가 필요 없는 Cloudflare Workers 설정에서 사용하는 표준 방식입니다. `100::`은 RFC 6666 discard prefix입니다. Cloudflare DNS는 구체적인 레코드(`@`, `www`)를 와일드카드(`*`)보다 우선 처리합니다.

#### SSL/TLS 설정

Cloudflare 대시보드 → SSL/TLS에서 **Full** 모드를 선택합니다.

> SSL/TLS 모드는 프록시된(주황 구름) 트래픽에만 적용됩니다. bare domain과 `www`는 DNS only(회색 구름)이므로 Vercel이 SSL 인증서를 직접 발급·관리합니다. 와일드카드 서브도메인은 Cloudflare Universal SSL(무료)이 자동으로 edge 인증서를 제공합니다.

### 4. Cloudflare Workers 설정

```bash
# Wrangler CLI 설치 (전역)
npm install -g wrangler

# Cloudflare 로그인
wrangler login

# KV 네임스페이스 생성
wrangler kv namespace create KEYWORDS
wrangler kv namespace create KEYWORDS --preview
```

생성된 ID를 `workers/wrangler.toml`에 반영:

```toml
[[kv_namespaces]]
binding = "KEYWORDS"
id = "<위에서 생성된 KV namespace ID>"
preview_id = "<위에서 생성된 preview ID>"
```

Workers route 설정 (`workers/wrangler.toml`에 이미 포함):

```toml
routes = [
  { pattern = "*.xn--o39aom.kr/*", zone_name = "xn--o39aom.kr" }
]
```

> 이 route는 와일드카드 서브도메인의 모든 경로를 Workers가 처리하도록 합니다. KV 조회 실패 시 GitHub Raw Content 폴백을 시도하고, 그마저도 키워드를 찾지 못하면 `WEB_APP_ORIGIN`을 통해 Vercel 웹앱의 키워드 페이지로 리다이렉트됩니다.

**(선택)** GitHub Raw Content 폴백의 rate limit을 확장하려면 (60 → 5,000 req/hr):

```bash
wrangler secret put GITHUB_TOKEN
# GitHub Personal Access Token 입력 (public repo read 권한)
```

### 5. GitHub Repository Secrets

GitHub repo → Settings → Secrets and variables → Actions에서 설정:

| Secret | 용도 | 필수 여부 |
|--------|------|----------|
| `CLOUDFLARE_API_TOKEN` | Wrangler가 KV에 write하기 위한 Cloudflare API 토큰 | **필수** |
| `CF_KV_NAMESPACE_ID` | 4단계에서 생성한 KV namespace ID | **필수** |
| `GOOGLE_SAFE_BROWSING_API_KEY` | Issue 등록 시 URL 안전성 검증 ([발급](https://developers.google.com/safe-browsing/v4/get-started)) | 선택 (없으면 검증 skip) |

**Cloudflare API 토큰 생성:**
1. [Cloudflare API Tokens](https://dash.cloudflare.com/profile/api-tokens) 페이지
2. "Create Token" → "Edit Cloudflare Workers" 템플릿 사용
3. 권한에 `Account - Workers KV Storage - Edit` 추가
4. 생성된 토큰을 `CLOUDFLARE_API_TOKEN` 시크릿에 저장

### 6. Vercel 배포

```bash
# Vercel CLI 설치 및 프로젝트 연결
npm install -g vercel
cd web
vercel link
```

Vercel 대시보드에서 설정:
- **Framework Preset:** Next.js
- **Root Directory:** `web`
- **Build Command:** (기본값 사용)

> Vercel 웹앱은 환경 변수가 필요 없습니다. 데이터는 빌드 시 파일시스템에서 직접 읽습니다.

#### 커스텀 도메인 연결

1. Vercel 대시보드 → 프로젝트 → Settings → Domains
2. `xn--o39aom.kr` (가격.kr) 도메인 추가
3. `www.xn--o39aom.kr` 도메인 추가 → Vercel이 기본 도메인을 묻는다면 `xn--o39aom.kr` (bare domain)을 선택하여 `www`가 bare domain으로 리다이렉트되도록 설정
4. Vercel이 안내하는 DNS 설정이 3단계에서 설정한 A 레코드(`76.76.21.21`) 및 `www` CNAME(Vercel 대시보드에 표시된 프로젝트별 값)과 일치하는지 확인
5. SSL 인증서가 자동 발급될 때까지 대기 (보통 수 분 이내)

> bare domain(`가격.kr`)과 `www.가격.kr`은 Vercel의 Next.js 웹앱이 응답하고, 서브도메인(`만두.가격.kr`)으로 접속하면 Cloudflare Workers가 리다이렉트를 처리합니다. `vercel.json`은 필요 없습니다.

### 7. 로컬 개발

```bash
# Workers 로컬 개발 (wrangler dev)
cd workers && npm run dev

# Web 로컬 개발 (Next.js dev server)
cd web && npm run dev

# 전체 테스트 (52 tests)
npm test
```

### 8. 배포

```bash
# Workers 배포
cd workers && npm run deploy

# Web은 git push 시 Vercel에서 자동 배포
# KV 동기화는 main push 시 GitHub Actions가 자동 실행
```

## 도메인 설정 트러블슈팅

| 증상 | 원인 | 해결 |
|------|------|------|
| `*.가격.kr` 접속 시 연결 거부 | 와일드카드 DNS 레코드의 프록시가 꺼져 있음 (회색 구름) | Cloudflare DNS에서 `*` 레코드를 Proxied (주황 구름)로 변경 |
| `가격.kr` 접속 시 SSL 오류 | 루트 도메인 DNS 프록시가 켜져 있음 (주황 구름) | `@` 레코드를 DNS only (회색 구름)로 변경하여 Vercel이 SSL 처리 |
| 설정 후 도메인이 동작하지 않음 | DNS 전파 지연 (네임서버 변경 후 최대 48시간) | `dig xn--o39aom.kr` 또는 `nslookup`으로 전파 상태 확인 후 대기 |
| `curl`로 테스트 시 리다이렉트 안 됨 | Host 헤더에 한글 대신 punycode 사용 필요 | `curl -I https://xn--hu1b07h.xn--o39aom.kr` (만두.가격.kr) |
| 새 키워드 등록 후 리다이렉트 안 됨 | KV 전파 지연 (최대 60초) 또는 Workers 엣지 캐시 (최대 1시간 TTL) | KV 확인: `wrangler kv key get`, 캐시 문제 시 Cloudflare 대시보드에서 Purge Cache 실행 |

## 기여하기

[기여 가이드](CONTRIBUTING.md)를 참고해 주세요.

## 기술 스택

| 영역 | 기술 |
|------|------|
| 리다이렉트 엔진 | Cloudflare Workers + KV + Cache API |
| 웹 앱 | Next.js 15 App Router (Vercel Free) |
| 자동화 | GitHub Actions (Issue 검증, KV 동기화, 자동 병합) |
| 데이터 | GitHub 저장소 (JSON 파일, 3단계 디렉토리 구조) |
| 테스트 | Vitest 2.x |
| 보안 | Open redirect 방지, Script injection 방지, Google Safe Browsing |

## 라이선스

MIT
