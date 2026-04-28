# User Action Tracking — Design Spec

**Date:** 2026-04-12
**Status:** Approved (reviewed & revised, 2nd pass complete)
**Branch:** feature/tracking-user-action

## Overview

가격.kr에 유저 액션 트래킹을 추가한다. 페이지뷰, 검색 쿼리, 키워드별 302 redirect 횟수를 Cloudflare D1에 기록한다.

## Requirements

- **트래킹 대상:** 페이지뷰, 검색 쿼리(원문), 키워드별 redirect 횟수
- **비용:** 무료 (Cloudflare/Vercel free tier 내)
- **프라이버시:** 키워드 + 타임스탬프만 수집, PII 없음
- **정밀도:** redirect/pageview는 대략적 집계, 검색 쿼리는 원문 보존
- **활용:** 데이터 수집 우선, 대시보드는 나중에

## Architecture

```
┌─────────────────────────────────────┐
│  Web App (Vercel)                   │
│  - 페이지뷰: page load 시 beacon    │
│  - 검색: 키워드 선택 시 beacon       │
└───────────┬─────────────────────────┘
            │ sendBeacon (text/plain, JSON body)
            │ POST https://t.가격.kr/e
            ▼
┌─────────────────────────────────────┐
│  Cloudflare Workers                 │
│                                     │
│  /e (POST, Host=t only) → D1 write  │
│  그 외 → 기존 redirect 로직         │
│    └─ 302 redirect 시 ctx.waitUntil │
│       로 D1에 redirect 이벤트 기록   │
│       (캐시 히트 시에도, 10% 샘플링)  │
└───────────┬─────────────────────────┘
            │
            ▼
┌─────────────────────────────────────┐
│  Cloudflare D1 (SQLite)             │
│  events 테이블                       │
└─────────────────────────────────────┘
```

**핵심 결정:**
- Workers가 모든 tracking write를 D1에 수행 (단일 진입점)
- Web → Workers 통신은 `t.가격.kr/e`로 cross-origin beacon
- `*.가격.kr` 와일드카드 라우트가 이미 Workers에 매핑되어 있으므로 추가 DNS 설정 불필요
- **`text/plain` Content-Type 사용** — CORS simple request로 분류되어 preflight(OPTIONS) 없음. Workers에서 `JSON.parse(await request.text())`로 파싱. 이 결정으로 beacon당 Workers 요청이 2→1로 절감됨.
- Workers에서 `/e` 경로 분기 조건: **`subdomain === 't' && pathname === '/e' && method === 'POST'`** — 다른 서브도메인의 `/e` 경로는 기존 redirect 로직을 따름. 캐시 로직 및 키워드 추출 전에 배치.
- redirect 이벤트는 `ctx.waitUntil()`로 비동기 기록 → 응답 지연 없음
- **캐시 히트 시에도** redirect 이벤트를 기록함 — 단, `response.status === 302` (실제 redirect)인 경우에만. 404, 503, web app redirect 등은 제외.
- **Redirect 이벤트 10% 샘플링:** 캐시 히트/미스 모두 `Math.random() < 0.1`일 때만 D1 write 수행 (통일된 샘플링률). 캐시 히트 경로에서 매 요청마다 D1 write를 하면 대량 GET 요청으로 D1 writes/day를 소진시킬 수 있으므로, 샘플링으로 write 수를 1/10로 제한. 집계 시 단순 ×10 보정. 캐시 미스/히트 구분 없이 동일 샘플링률이므로 보정이 단순하고 정확.
- 엔드포인트 경로명은 `/e` 사용 (`/_track` 등은 ad blocker 필터 리스트에 매칭될 확률이 높음)

**키워드 예약:** `t` 서브도메인을 트래킹용으로 사용하므로, `t`를 키워드 blocklist에 추가하여 등록을 차단한다.

## D1 Schema

```sql
CREATE TABLE events (
  id INTEGER PRIMARY KEY,   -- AUTOINCREMENT 미사용 (sqlite_sequence write 오버헤드 방지)
  type TEXT NOT NULL,        -- 'redirect' | 'pageview' | 'search'
  keyword TEXT,              -- redirect: 키워드, pageview: 페이지 경로
  value TEXT,                -- search: 검색 쿼리 원문 (나머지는 NULL)
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
  -- NOTE: datetime('now')는 UTC를 반환함
);

CREATE INDEX idx_events_type_created ON events(type, created_at);
CREATE INDEX idx_events_keyword ON events(keyword);
```

**AUTOINCREMENT 미사용 이유:** SQLite의 `INTEGER PRIMARY KEY`만으로 rowid 자동 증가가 보장된다. `AUTOINCREMENT`는 매 INSERT마다 `sqlite_sequence` 테이블에 추가 write를 유발하여 D1 writes를 사실상 2배로 소비한다. Free tier 100K writes/day 한도에서 이는 무시할 수 없는 차이다.

**예시 데이터 (모든 시각은 UTC):**

| type | keyword | value | created_at |
|------|---------|-------|------------|
| redirect | 만두 | NULL | 2026-04-12 01:30:00 |
| pageview | / | NULL | 2026-04-12 01:31:00 |
| pageview | /만두 | NULL | 2026-04-12 01:31:05 |
| search | 가방 | 가 | 2026-04-12 01:32:00 |

## Tracking Endpoint

### `POST /e`

```
POST https://t.가격.kr/e
Content-Type: text/plain

{"type":"pageview","keyword":"/"}
{"type":"search","keyword":"가방","value":"가"}
```

`sendBeacon(url, jsonString)`은 Content-Type을 `text/plain;charset=UTF-8`으로 자동 설정. CORS simple request로 분류되어 preflight 없음. Workers에서 `JSON.parse(await request.text())`로 파싱한다. `JSON.parse` 실패(잘못된 JSON) 시 try-catch로 잡아서 400 반환.

**Response:** 204 No Content

**Validation:**
- `type`은 `pageview | search`만 허용 — 엄격한 `===` 비교 (redirect는 외부 POST 불가, Workers 내부에서만 기록)
- `keyword` 필수, 100자 이내
- `value` 선택, 100자 이내
- 제어 문자(control characters), null bytes 제거
- 검증 실패 시 400 Bad Request

**모든 D1 write는 parameterized query (`.prepare().bind()`)를 사용한다.** `writeEvent()` 함수 포함. SQL injection 방지.

**CORS (simple request이므로 preflight 불필요):**
- 응답에 `Access-Control-Allow-Origin: <WEB_APP_ORIGIN>` 헤더 포함
- OPTIONS 핸들러도 방어적으로 포함 (비표준 클라이언트 대비)
- OPTIONS 응답 시 `Access-Control-Max-Age: 86400` 설정 (preflight 캐싱)
- `Access-Control-Allow-Credentials`는 포함하지 않음

**서버사이드 Origin 검증:** CORS는 브라우저 전용 메커니즘이므로, Workers에서 `Origin` 헤더를 서버사이드에서도 검증한다. `Origin`이 `WEB_APP_ORIGIN`과 일치하지 않으면 403 반환. (curl 등 Origin 헤더 위조는 가능하지만, 자동화 스크립트의 난이도를 높임)

**Origin punycode 정규화:** 브라우저마다 Origin 헤더를 punycode(`https://xn--o39aom.kr`) 또는 유니코드(`https://가격.kr`)로 보낼 수 있다. 비교 시 **`new URL(origin).hostname`으로 양쪽 모두 정규화 후 비교**한다. Workers V8 런타임에서 `new URL().hostname`은 punycode를 반환하므로, `env.MAIN_DOMAIN`(punycode)과 직접 비교 가능.

### Workers fetch() 분기

```
fetch(request, env, ctx)
  ├─ subdomain === 't' && pathname === '/e' && POST
  │    → parseBody(try-catch JSON.parse) → validate Origin(punycode 정규화)
  │    → validate body → D1 insert → 204 (D1 실패 시에도 204 + console.error)
  ├─ subdomain === 't' && pathname === '/e' && OPTIONS
  │    → CORS preflight (방어적) → 204
  └─ 기존 로직:
       ├─ cache.match() 히트 시:
       │    ├─ extractSubdomain → keyword 추출 → .toLowerCase()
       │    ├─ response.status === 302 확인 (실제 redirect만)
       │    ├─ Math.random() < 0.1 ? ctx.waitUntil(writeEvent) : skip (10% 통일 샘플링)
       │    └─ return cached response
       └─ cache.match() 미스 시:
            └─ _fetch_keyword() → redirect 성공 시:
                 if (Math.random() < 0.1) ctx.waitUntil(writeEvent(...))  // 10% 샘플링, 별도 호출
                 ctx.waitUntil(cache.put(...))   // 기존 캐시 저장 (별도 호출, writeEvent 실패에 영향 없음)
```

**중요:**
- `/e` 분기는 반드시 `cache.match()` **이전에** 배치한다. 현재 `fetch()` 메서드의 전체 흐름을 재구성해야 한다.
- `/e` 분기 조건에 **Host 서브도메인이 `t`인지** 반드시 확인. `만두.가격.kr/e`로 POST가 와도 tracking으로 처리하면 안 됨.
- 캐시 히트 경로에서 keyword 추출 시 `extractSubdomain()` → `.toLowerCase()` 적용 필요 (`_fetch_keyword()` 내부와 동일하게).
- `t.가격.kr`에 대한 GET 요청(비 `/e` 경로)은 기존 redirect 로직을 따름 (KV에 `t` 없으므로 web app으로 redirect).

## Abuse Prevention

**위협 1:** `curl`이나 스크립트로 `/e` 엔드포인트에 대량 POST → D1 100K writes/day 소진 가능.
**위협 2:** 대량 GET 요청으로 redirect 경로의 D1 write 소진 (캐시 히트에도 D1 write 발생).

**`/e` 엔드포인트 방어 (3계층):**
1. **서버사이드 Origin 헤더 검증** — `Origin !== WEB_APP_ORIGIN`이면 403 (Workers 코드, punycode 정규화)
2. **Cloudflare WAF Rate Limiting Rule** (무료 5개 중 1개 사용) — Expression: `http.request.uri.path eq "/e" and http.request.method eq "POST"`, IP당 60 req/min, Action: **Block**. Cloudflare Dashboard > Security > WAF > Rate limiting rules에서 설정.
3. **요청 body 크기 제한** — `Content-Length` 헤더가 있으면 먼저 체크, 없으면 `request.text()` 후 체크. 1KB 초과 시 400 반환.

**Redirect 경로 방어:**
- **10% 통일 샘플링**으로 D1 write 수를 1/10로 제한 (캐시 히트/미스 모두 동일). 집계 시 ×10 보정.
- Cloudflare 기본 DDoS 보호에 의존. 필요 시 WAF rule 1개 추가 가능 (무료 5개 중 2개 사용).

**한계:** Origin 헤더 위조, IP 분산 공격은 방어 불가. 그러나 트래킹은 best-effort이므로, 비정상 데이터가 일부 유입되더라도 집계 시 이상치 필터링으로 대응 가능. D1 writes 소진이 redirect 기능에는 영향 없음 (redirect 자체는 KV + Cache 기반). 단, D1 writes가 소진되면 `/e`의 pageview/search 기록도 함께 중단됨.

## Workers File Changes

### New files

- `workers/src/tracking.ts` — tracking 로직 모듈
  - `writeEvent(db: D1Database, type: string, keyword: string, value?: string)` — D1 parameterized INSERT
  - `handleTrack(request: Request, env: Env)` — body 파싱(`request.text()` → `JSON.parse`) + Origin 검증 + 필드 검증 + writeEvent
  - `corsHeaders(origin: string)` — CORS 응답 헤더 생성
- `workers/migrations/0001_create_events.sql` — D1 테이블 생성 SQL (migrations 디렉토리 사용)

### Modified files

- `workers/src/index.ts` — fetch() 핸들러 재구성:
  1. `/e` 분기를 캐시 로직 전에 추가
  2. 캐시 히트 경로에 redirect 이벤트 기록 추가
  3. `Env` 인터페이스에 `TRACKING: D1Database` 추가
- `workers/wrangler.toml` — D1 바인딩 추가:
  ```toml
  [[d1_databases]]
  binding = "TRACKING"
  database_name = "price-kr-tracking"
  database_id = "<wrangler d1 create 후 출력되는 ID>"
  migrations_dir = "migrations"
  ```
- `data/blocklist.json` — `t`를 예약 키워드로 추가 (시스템 예약이지만 blocklist에 추가하여 GitHub Actions의 `validate-issue.yml`과도 일관성 유지)

## Web Client Changes

### New files

- `web/lib/track.ts` — 경량 beacon 전송 유틸리티
  - `track(type: 'pageview' | 'search', keyword: string, value?: string)`
  - `navigator.sendBeacon(url, body)` 사용 — body는 **plain string** (JSON 문자열)
  - 실패 시 무시 (best-effort, try-catch 없이 sendBeacon 반환값 무시)
  - 엔드포인트 URL 하드코딩: `https://t.xn--o39aom.kr/e`
  - **로컬 개발 모드**: `process.env.NODE_ENV === 'development'`일 때 `console.debug('[track]', ...)`로 폴백 (beacon 미전송). Next.js가 빌드 타임에 자동 인라인하므로 hostname 체크보다 정확. Vercel preview 배포에서는 `production`으로 빌드되어 트래킹 활성화됨 (Workers의 Origin 검증에서 403이 반환되나 best-effort이므로 무시).

- `web/components/PageTracker.tsx` — **"use client" 트래킹 전용 컴포넌트**
  - Server Component 내부에 삽입하여 pageview를 기록
  - `useRef` 가드로 React StrictMode 이중 발화 방지:
    ```tsx
    "use client";
    const sent = useRef(false);
    useEffect(() => {
      if (sent.current) return;
      sent.current = true;
      track('pageview', page);
    }, [page]);
    ```
  - **이 패턴이 필요한 이유:** `page.tsx`와 `[keyword]/page.tsx`는 모두 `async` Server Component로, `generateStaticParams()`, `generateMetadata()`, 파일시스템 접근을 사용한다. 페이지 전체를 Client Component로 전환하면 이 기능들이 모두 깨진다.

### Modified files

- `web/app/page.tsx` — Server Component JSX 내에 `<PageTracker page="/" />` 삽입
- `web/app/[keyword]/page.tsx` — Server Component에서 디코딩된 keyword를 prop으로 전달:
  ```tsx
  <PageTracker page={`/${decoded}`} />
  ```
- `web/components/SearchBar.tsx`:
  - `handleSelect()` 내에서 `track('search', keyword, query)` 호출 (navigation 직전)
  - `query`를 closure로 캡처하는 방식 사용 (호출부 수정 불필요):
    ```tsx
    const handleSelect = useCallback((keyword: string) => {
      track('search', keyword, query);  // query를 closure로 캡처
      if (/^[가-힣ㄱ-ㅎa-zA-Z0-9]+$/.test(keyword)) {
        window.location.href = `https://${keyword}.가격.kr`;
      }
    }, [query]);  // dependency에 query 추가
    ```
  - 이 방식은 `query` 변경 시 `handleSelect`가 재생성되지만, `SearchBar`는 이미 `query` 변경 시 리렌더링되므로 성능 영향 없음. 호출부 3곳(Enter 키, onClick, 기타)을 수정할 필요 없어 더 안전함.
- `web/app/privacy/page.tsx` — **기존 통계 정보 섹션 수정 + 트래킹 고지 추가** (기존 "IP 주소 익명화 저장" 문구가 새 트래킹 정책(IP 미수집)과 불일치하므로 함께 수정. 검색 쿼리 수집 사실 포함.)

### Tracking trigger points

| 이벤트 | 위치 | 트리거 |
|--------|------|--------|
| pageview | `web/app/page.tsx` | `<PageTracker page="/" />` — 홈 페이지 로드 |
| pageview | `web/app/[keyword]/page.tsx` | `<PageTracker page={...} />` — 키워드 페이지 로드 |
| search | `web/components/SearchBar.tsx` | `handleSelect()` — 키워드 선택 시 |

**privacy 페이지(`/privacy`)는 트래킹하지 않음.**

## D1 Write Failure Handling

- **Best-effort, no retry 정책.** 트래킹 데이터 특성상 일부 유실은 허용한다. 이는 의식적 설계 결정임.
- redirect 시: `ctx.waitUntil()` 내에서 실행, 실패 시 `console.error()` 로그. redirect 응답에 영향 없음.
- `/e` 엔드포인트: D1 write 실패 시에도 **204 반환** + `console.error()` 로그. (500 반환은 Cloudflare Error Analytics에 노이즈를 만들고, 공격자에게 "D1 write에 도달했다"는 시그널을 제공하므로 회피.)
- **모니터링 한계:** Workers의 `console.error`는 `wrangler tail`이나 Logpush 설정 없이는 확인 불가. 초기에는 수용하되, 향후 모니터링 수단 검토.

## Ad Blocker 영향

- `/_track`, `/beacon`, `/analytics` 등의 경로명은 uBlock Origin, AdGuard 등에서 차단될 확률이 높음
- `/e`는 상대적으로 중립적이지만 완벽하지 않음
- `sendBeacon` 호출 자체가 차단될 수 있음
- **예상 데이터 누락률: 실제 pageview의 20-40%** — best-effort 정책이므로 수용
- 향후 정확도가 중요해지면 서버사이드 트래킹 (Workers에서 redirect 시 자체 기록)이 더 신뢰할 수 있음. redirect 이벤트는 이미 서버사이드이므로 ad blocker 영향 없음.

## Privacy

- **수집 데이터:** 이벤트 타입, 키워드/경로, 검색 쿼리 원문, UTC 타임스탬프
- **미수집:** IP 주소, User-Agent, 쿠키, 기타 PII
- **검색 쿼리 내 우발적 PII 유입 가능성:** 사용자가 검색창에 개인정보(전화번호, 이름 등)를 입력할 수 있음. 향후 대시보드 구현 시 출력 인코딩(XSS 방지) 필수.
- **개인정보보호법 준수:** `/privacy` 페이지에 트래킹 항목(페이지뷰, 검색 쿼리 수집)을 고지한다.

## Testing

| 대상 | 테스트 방식 |
|------|------------|
| `tracking.ts` — writeEvent, handleTrack, Origin 검증, CORS | vitest 단위 테스트, D1 mock |
| `index.ts` — `/e` 분기, 캐시 히트 시 tracking | 기존 테스트에 tracking 경로 케이스 추가 |
| `index.ts` — 기존 테스트 수정 | `createEnv()`에 `TRACKING: D1Database` mock 추가 |
| `web/lib/track.ts` — beacon 전송, dev 모드 폴백 | vitest, sendBeacon mock |
| `web/components/PageTracker.tsx` — useRef 가드 | vitest + testing-library |

## Deployment

1. `wrangler d1 create price-kr-tracking` — D1 데이터베이스 생성
2. `wrangler.toml`에 출력된 database_id + `migrations_dir = "migrations"` 반영
3. `wrangler d1 migrations apply --database-name=price-kr-tracking` — 마이그레이션 적용 (이력 추적 가능)
4. Cloudflare Dashboard > Security > WAF > Rate limiting rules에서 `/e` 경로 rate limit 설정 (IP당 60 req/min)
5. Workers 배포 (`wrangler deploy`)
6. Web 배포 (Vercel — push 시 자동)

## Free Tier Limits

| Resource | Free Limit | Expected Usage | 비고 |
|----------|-----------|----------------|------|
| D1 writes | 100K/day | Redirect(10% 샘플) + pageview + search 합산 | AUTOINCREMENT 미사용, redirect 샘플링으로 write 절감 |
| D1 reads | 5M/day | 향후 대시보드용 | |
| D1 storage | 5GB | 이벤트 로우 ~100 bytes | |
| Workers requests | 100K/day | 기존 redirect + tracking beacon 합산 | text/plain 사용으로 preflight 없음 (beacon당 1 request) |

**주의:** D1 free tier 수치는 2025.05 기준. 배포 전 [Cloudflare D1 pricing 페이지](https://developers.cloudflare.com/d1/platform/pricing/)에서 최신 수치 재확인 필요.

## Out of Scope (Future)

- Admin 대시보드 페이지
- 일별/주별 집계 테이블 + Cron rollup
- 데이터 export API
- 오래된 raw 데이터 정리 (retention policy)
- D1 write 실패 모니터링 (Logpush 등)
- Stored XSS 방지 대시보드 출력 인코딩

## Review History

**2026-04-12 — 2차 4-agent review 완료. 추가 수정 사항:**
- `/e` 분기에 Host 조건 추가: `subdomain === 't'` 필수 (다른 서브도메인의 `/e` 요청은 redirect 로직)
- 캐시 히트 시 `response.status === 302` 조건 추가 (non-redirect 응답 tracking 방지)
- Redirect 이벤트 10% 샘플링 도입 (D1 write 소진 공격 방어 + free tier 절약)
- D1 write 실패 시 500 → 204 변경 (Error Analytics 노이즈, 보안 시그널 방지)
- Origin 비교 시 punycode 정규화 명시
- handleSelect: 시그니처 변경 대신 closure 방식 (호출부 수정 불필요, 더 안전)
- 로컬 감지: `location.hostname` → `process.env.NODE_ENV` (더 정확)
- Deployment: `wrangler d1 execute --file` → `wrangler d1 migrations apply` (이력 추적)
- wrangler.toml에 `migrations_dir` 추가
- blocklist 위치 명확화: `data/blocklist.json`
- Privacy 페이지: "추가"에서 "기존 문구 수정 + 추가"로 확대
- 캐시 히트 keyword 추출 시 `.toLowerCase()` 적용 명시

**2026-04-12 — 1차 4-agent review 완료. 주요 수정 사항:**
- sendBeacon 전략: `application/json` → `text/plain` (CORS preflight 제거, Workers 요청 절감)
- Server Component 호환: 별도 `<PageTracker />` client component 패턴 명시
- AUTOINCREMENT 제거 (D1 write 오버헤드 방지)
- 캐시 히트 시에도 redirect 이벤트 기록 (과소 집계 방지)
- Abuse prevention 섹션 추가 (Origin 검증 + WAF rate limiting)
- 엔드포인트 경로 `/_track` → `/e` (ad blocker 회피)
- `t` 키워드 blocklist 추가
- Privacy 페이지 업데이트 스코프 포함
- schema.sql → `workers/migrations/` 이동
- 로컬 개발 모드 폴백, StrictMode 가드 패턴 명시
