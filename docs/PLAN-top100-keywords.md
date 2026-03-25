# Plan: Top 100 Korean Keywords Seeding

> **상태**: 검토 완료 (2026-03-24 에이전트 2차 리뷰 반영)
> **작성일**: 2026-03-24
> **목표**: 한국인이 많이 검색하는 키워드 100개를 사전 등록하여 서비스 초기 콘텐츠 확보

---

## 1. 배경

가격.kr에 현재 키워드가 **3개**(만두, 가방, iphone)뿐이다.
한국인이 자주 검색하는 Top 100 키워드를 미리 등록해서 서비스를 활성화하려 한다.

### 결정 사항

| 항목 | 결정 | 이유 |
|------|------|------|
| **키워드 선정 방식** | 웹 검색으로 실제 한국 검색 트렌드 데이터 조사 후 선정 | 데이터 기반으로 실제 수요가 높은 키워드 선별 |
| **Target URL 전략** | 카테고리별 혼합 | 쇼핑 키워드는 네이버 쇼핑, 정보성은 나무위키/네이버 서비스 등 적합한 곳으로 |

---

## 2. 카테고리 & URL 매핑 규칙

| 카테고리 | Target URL 패턴 | 예시 키워드 |
|---------|----------------|------------|
| 식품/생활용품/전자/패션/뷰티 등 **쇼핑** | `search.shopping.naver.com/search/all?query={encoded_kw}` | 노트북, 라면, 운동화 |
| 지역/도시 | `namu.wiki/w/{encoded_kw}` | 서울, 부산, 제주도 |
| 날씨 | `weather.naver.com` (고정 URL) | 날씨 |
| 뉴스/시사 | `search.naver.com/search.naver?where=news&query={encoded_kw}` | 뉴스 |
| 맛집/음식점 | `map.naver.com/p/search/{encoded_kw}` | 맛집 |
| 영화/드라마/연예 | `search.naver.com/search.naver?query={encoded_kw}` | 영화 |
| 금융/주식 | `search.naver.com/search.naver?query={encoded_kw}` | 주식, 환율, 비트코인 |
| 스포츠 | `search.naver.com/search.naver?query={encoded_kw}` | 야구, 축구 |
| 여행/관광 | `namu.wiki/w/{encoded_kw}` 또는 `search.naver.com` | 제주도, 호텔 |
| 부동산 | `search.naver.com/search.naver?query={encoded_kw}` | 아파트, 전세 |
| 교통 | `map.naver.com/p/search/{encoded_kw}` | 지하철 |
| 기타 정보성/위키 | `namu.wiki/w/{encoded_kw}` | 한국, 김치 (문화) |

### URL 인코딩 규칙

- **모든 URL**: `encodeURIComponent(keyword)` 사용 → 퍼센트 인코딩
  - query parameter (`?query=`) 뿐만 아니라 path segment (`/w/`) 에도 적용
  - HTTP `Location` 헤더는 RFC 7230에 의해 ASCII만 허용하므로, raw Korean은 Cloudflare Workers redirect에서 실패할 수 있음
  - 브라우저는 퍼센트 인코딩된 URL을 주소창에서 자동으로 디코딩하여 표시함
- **맛집 카테고리**: 키워드 자체가 `맛집`이면 `맛집` 접미사를 붙이지 않음 (이중 적용 방지)

---

## 3. 사전 준비 (Step 0)

### whitelist 도메인 추가

`weather.naver.com`과 `map.naver.com`이 현재 `data/whitelist.json`에 **없다**.
seed 스크립트로 직접 커밋하면 KV에는 정상 등록되지만, 이후 커뮤니티 이슈 워크플로우로 해당 키워드를 수정할 때 "도메인이 허용 목록에 없습니다" 에러가 발생한다.

**필수 조치**: 실행 전에 `data/whitelist.json`에 다음 2개 도메인 추가:
```json
"weather.naver.com",
"map.naver.com"
```

---

## 4. 실행 단계

### Step 1: 웹 검색으로 한국 인기 검색어 트렌드 조사

다음 키워드로 웹 검색 수행:
- "2025 2026 한국 인기 검색어 순위"
- "네이버 인기 검색어 카테고리별"
- "한국 쇼핑 인기 키워드 2025"

조사 결과에서 **100개 키워드 후보**를 카테고리별로 정리.

**카테고리 배분 가이드** (트렌드 조사 결과에 따라 유동적):
- 쇼핑 (식품/전자/패션/뷰티/생활/주방/유아/스포츠/반려동물): ~60개
- 정보성 (금융/스포츠/연예/여행/부동산/교통/건강): ~25개
- 지역/도시: ~10개
- 기타 (날씨/뉴스/맛집/영화): ~5개

### Step 2: 키워드 100개 확정 & blocklist 검증

- **blocklist 충돌 확인** — 차단된 브랜드: 쿠팡, 삼성, 네이버, 카카오, 라인, 당근마켓, 배달의민족, 토스
- **profanity-blocklist 충돌 확인** — 비속어 8개
- **주의**: `라인`은 blocklist에 있으므로 단독 키워드로 사용 불가 (`라인프렌즈` 등 복합어는 가능)
- **기존 키워드 제외** — 만두, 가방, iphone은 TSV에 포함하지 않음 (`seed-data.ts`가 `writeFileSync`로 무조건 덮어쓰므로 `created` 날짜가 변경됨)

### Step 3: TSV 생성 스크립트 작성

**생성 파일**: `scripts/generate-top100-tsv.ts`

```typescript
// 키워드 배열 (기존 만두/가방/iphone 제외)
const EXISTING_KEYWORDS = new Set(["만두", "가방", "iphone"]);

const keywords: Array<{ keyword: string; category: string }> = [
  { keyword: "노트북", category: "shopping" },
  { keyword: "날씨", category: "weather" },
  { keyword: "서울", category: "place" },
  { keyword: "주식", category: "finance" },
  { keyword: "야구", category: "sports" },
  // ... 총 ~97개 (기존 3개 제외)
];

function getTargetUrl(keyword: string, category: string): string {
  const encoded = encodeURIComponent(keyword);
  switch (category) {
    case "shopping":
      return `https://search.shopping.naver.com/search/all?query=${encoded}`;
    case "weather":
      return "https://weather.naver.com";
    case "place":
    case "wiki":
      return `https://namu.wiki/w/${encoded}`;  // percent-encoded (HTTP Location 헤더 호환)
    case "news":
      return `https://search.naver.com/search.naver?where=news&query=${encoded}`;
    case "food_map":
      // 키워드 자체가 "맛집"이면 접미사 붙이지 않음
      const mapQuery = keyword === "맛집" ? keyword : keyword + "맛집";
      return `https://map.naver.com/p/search/${encodeURIComponent(mapQuery)}`;
    case "finance":
    case "sports":
    case "entertainment":
    case "realestate":
    case "info":
      return `https://search.naver.com/search.naver?query=${encoded}`;
    default:
      return `https://search.naver.com/search.naver?query=${encoded}`;
  }
}

// TSV 출력 (헤더 없음 — seed-data.ts가 헤더를 스킵하지 않으므로)
for (const { keyword, category } of keywords) {
  if (EXISTING_KEYWORDS.has(keyword)) {
    console.error(`SKIP: ${keyword} (already exists)`);
    continue;
  }
  console.log(`${keyword}\t${getTargetUrl(keyword, category)}`);
}
```

**핵심 수정 사항** (1차 + 2차 리뷰 반영):
1. **모든 URL에 `encodeURIComponent` 적용** — namu.wiki path 포함 (HTTP Location 헤더는 ASCII만 허용, RFC 7230)
2. 기존 키워드 `EXISTING_KEYWORDS` Set으로 명시적 제외
3. TSV **헤더 없음** (`seed-data.ts`가 모든 줄을 키워드로 처리하므로)
4. 실제 `console.log` 출력 루프 포함 (코드 스케치에 누락되어 있었음)
5. `맛집` 이중 적용 방지 로직 추가
6. **blocklist 검증 로직을 이 스크립트에 통합** (아래 Step 4 참조)

### Step 4: blocklist 검증 (generator 스크립트에 통합)

`generate-top100-tsv.ts`에 blocklist 검증 로직을 직접 통합한다.
(`npx tsx -e "..."` 에서 상대 경로 `.js` import가 불안정하므로 별도 인라인 스크립트 대신 통합)

```typescript
// generate-top100-tsv.ts 상단에 추가
import { readFileSync } from "fs";
import { isBlockedKeyword } from "./validate-keyword.js";

const blocklist = JSON.parse(readFileSync("../data/blocklist.json", "utf-8"));
const profanity = JSON.parse(readFileSync("../data/profanity-blocklist.json", "utf-8"));
const allBlocked = [...blocklist, ...profanity];

// Phase 1: 전체 검증 (출력 전에 모든 키워드 검증 완료)
const outputLines: string[] = [];
for (const { keyword, category } of keywords) {
  if (EXISTING_KEYWORDS.has(keyword)) {
    console.error(`SKIP: ${keyword} (already exists)`);
    continue;
  }
  if (isBlockedKeyword(keyword, allBlocked)) {
    console.error(`BLOCKED: ${keyword} — TSV 생성 중단`);
    process.exit(1);  // 아직 stdout에 아무것도 출력하지 않았으므로 partial TSV 없음
  }
  outputLines.push(`${keyword}\t${getTargetUrl(keyword, category)}`);
}

// Phase 2: 검증 통과 후 한번에 출력 (partial TSV 방지)
console.log(outputLines.join("\n"));
```

이 방식의 장점:
- `npx tsx -e` 의 상대 import 불안정 문제 회피
- **Validate-first, output-later**: 모든 키워드 검증을 먼저 완료한 뒤 stdout에 출력 → partial TSV 생성 불가
- 차단 키워드 발견 시 `process.exit(1)` 호출 전에 stdout에 아무것도 쓰지 않으므로 파일이 비어있음

### Step 5: seed-data.ts로 데이터 파일 생성

```bash
cd scripts  # 반드시 scripts/ 디렉토리에서 실행 (입력 파일 경로가 CWD 기준)
npx tsx generate-top100-tsv.ts > top100-keywords.tsv && npx tsx seed-data.ts top100-keywords.tsv ../data
```

> `&&` 체이닝: generator가 blocklist 검증 실패로 `exit(1)` 하면 seed-data.ts가 실행되지 않음

- 기존 `seed-data.ts`는 **수정 없이** 그대로 사용
- 기존 키워드는 Step 3에서 이미 TSV에서 제외됨
- 각 키워드마다 `data/{초성}/{첫글자}/{keyword}.json` 파일 자동 생성

### Step 6: 검증

1. **파일 수 확인** — `data/` 내 keyword JSON 약 100개 (기존 3 + 신규 ~97)
2. **JSON 스키마 검증** — 모든 파일이 `{ keyword, url, created }` 형태인지 확인
3. **경로 구조 확인** — 초성/첫글자 디렉토리 정상 생성 (쌍자음 ㄲ, ㅃ, ㅆ 등 포함)
4. **URL 형식 확인** — 모든 URL이 percent-encoded인지 확인 (namu.wiki path 포함)
5. **테스트 실행** — `npm test` → 기존 52개 테스트 전부 통과 확인
   - 기존 테스트는 `tmpdir()` 기반 격리 환경이므로 data/ 변경에 영향 없음

### Step 7: KV 동기화 (중요)

100개 파일을 한번에 push하면 incremental sync가 100번의 `wrangler kv key put`을 실행하여 Cloudflare KV free tier 일일 한도(1,000 writes/day)의 10%를 소진한다.

**권장 방법**: push 후 `sync-kv.yml`을 `workflow_dispatch`로 수동 트리거 → full-sync 모드(`wrangler kv bulk put`)로 1회 bulk write 실행.

또는: incremental sync ~97회도 한도(1,000/day) 내이므로 자동 트리거에 맡길 수 있으나, 순차 실행으로 **15-25분 CI 시간**이 소요됨. 자동 트리거가 시작되면 취소 후 `workflow_dispatch` full-sync를 권장.

### Step 8: docs 업데이트

- `docs/DEV_PROGRESS.md` — 태스크 완료 표시
- `docs/DEV_LOG.md` — 키워드 선정 기준, URL 매핑 전략, 리뷰에서 발견된 이슈와 해결 방법 기록

---

## 5. 파일 변경 요약

| 파일 | 동작 | 설명 |
|------|------|------|
| `data/whitelist.json` | **UPDATE** | `weather.naver.com`, `map.naver.com` 추가 |
| `scripts/generate-top100-tsv.ts` | **CREATE** | 키워드 + 카테고리별 URL 생성 스크립트 |
| `scripts/top100-keywords.tsv` | **CREATE** | 생성된 TSV 파일 (keyword \t url, 헤더 없음) |
| `data/{초성}/{첫글자}/{keyword}.json` × ~97 | **CREATE** | 새 키워드 JSON 파일들 |
| `docs/DEV_PROGRESS.md` | **UPDATE** | 태스크 완료 표시 |
| `docs/DEV_LOG.md` | **UPDATE** | 개발 로그 추가 |

## 6. 기존 핵심 파일 (수정 불필요)

| 파일 | 역할 |
|------|------|
| `scripts/seed-data.ts` | TSV → JSON 변환 (그대로 사용) |
| `scripts/hangul-path.ts` | 초성/경로 계산 로직 |
| `scripts/validate-keyword.ts` | blocklist 검증 로직 |
| `data/blocklist.json` | 차단 키워드 8개 |
| `data/profanity-blocklist.json` | 비속어 8개 |

---

## 7. 리뷰에서 발견된 이슈 & 해결

> 2026-03-24 에이전트 팀 리뷰 — 1차 (architecture + validation + code-review) + 2차 (architecture + code-review)

### 1차 리뷰 발견 (8건)

| # | 이슈 | 심각도 | 해결 |
|---|------|--------|------|
| 1 | `seed-data.ts`가 `writeFileSync`로 기존 파일 무조건 덮어씀 → `created` 날짜 손실 | Critical | TSV에서 기존 키워드(만두/가방/iphone) 제외 + `EXISTING_KEYWORDS` Set으로 명시적 가드 |
| 2 | TSV 생성 코드 스케치에 출력 루프 없음 → 빈 TSV 생성 | Critical | `console.log` 출력 루프 추가 |
| 3 | TSV 헤더 라인을 `seed-data.ts`가 키워드로 처리 → 가짜 파일 생성 | Medium | TSV 헤더 생략 (명시적으로 문서화) |
| 4 | `weather.naver.com`, `map.naver.com` whitelist 미등록 | Medium | Step 0에서 whitelist 사전 업데이트 |
| 5 | namu.wiki URL에 `encodeURIComponent` 불필요 | Low | ~~raw Korean으로 변경~~ → 2차 리뷰에서 번복 (#9) |
| 6 | `맛집` 키워드에 `맛집` 접미사 → `맛집맛집` | Low | 키워드가 이미 `맛집`이면 접미사 생략 |
| 7 | 100개 incremental KV write → free tier 한도 소진 위험 | Medium | `workflow_dispatch` full-sync 권장 |
| 8 | 카테고리 부족 (금융/스포츠/연예/여행/부동산 등) | Low | 카테고리 & URL 매핑 표에 추가 |

### 2차 리뷰 발견 (3건)

| # | 이슈 | 심각도 | 해결 |
|---|------|--------|------|
| 9 | namu.wiki raw Korean → HTTP `Location` 헤더는 ASCII만 허용 (RFC 7230), Workers redirect 실패 가능 | Medium | 모든 URL에 `encodeURIComponent` 적용으로 되돌림 (#5 번복) |
| 10 | `npx tsx -e "..."` 에서 상대 경로 `.js` import가 불안정 | Medium | blocklist 검증을 `generate-top100-tsv.ts`에 통합 |
| 11 | Step 5 실행 시 CWD가 `scripts/`여야 한다는 명시 부족 | Low | `cd scripts` 주석에 주의사항 추가 |

### 3차 리뷰 발견 (1건)

| # | 이슈 | 심각도 | 해결 |
|---|------|--------|------|
| 12 | `process.exit(1)` 시 stdout 버퍼 flush → partial TSV 생성 + `&&` 미사용으로 seed-data.ts 그대로 실행 | High | Validate-first/output-later 패턴 적용 + `&&` 체이닝 |

### 4차 리뷰 발견 (1건)

| # | 이슈 | 심각도 | 해결 |
|---|------|--------|------|
| 13 | Step 7 incremental sync 자동 실행 시 15-25분 CI 소요 → "무방" 표현이 부정확 | Low | CI 시간 명시 + 자동 트리거 취소 후 full-sync 권장으로 수정 |

---

## 8. 검토 포인트 (피드백 요청)

- [ ] 카테고리 & URL 매핑 규칙이 적절한가?
- [ ] 기존 만두/가방/iphone을 TSV에서 제외하는 것이 맞는가?
- [ ] 100개 외에 특별히 포함시키고 싶은 키워드가 있는가?
- [ ] KV 동기화 방식: incremental(자동) vs full-sync(수동 트리거)?
