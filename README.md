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

## 로컬 개발

```bash
# 의존성 설치
npm install

# Workers 로컬 개발
cd workers && npm run dev

# Web 로컬 개발
cd web && npm run dev

# 전체 테스트 (52 tests)
npm test
```

**요구사항:** Node.js 20+

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
