# Witty URL Mapping Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace all 97 keyword target URLs with creative "price"-themed destinations that match 가격.kr's identity.

**Architecture:** Rewrite `scripts/generate-top100-tsv.ts` to use a keyword-level URL map (`KEYWORD_URLS`) with helper functions for site-specific URL patterns. Add ~29 new domains to `data/whitelist.json`. Regenerate all 97 keyword JSON files via existing `seed-data.ts`.

**Tech Stack:** TypeScript (tsx), existing seed-data.ts pipeline, vitest for tests.

**Spec:** `docs/superpowers/specs/2026-03-26-witty-url-mapping-design.md`

---

### Task 1: Research undecided URLs

Web search to finalize URLs for keywords marked "조사 필요" in the spec.

**Files:**
- Modify: `docs/superpowers/specs/2026-03-26-witty-url-mapping-design.md` (update undecided entries)

- [ ] **Step 1: Web search for undecided keywords**

Search for the best "price"-themed URLs for these keywords:
- 축구: K리그 선수 연봉 순위 사이트
- 골프: 그린피 비교 사이트
- 헬스: 헬스장 가격비교 사이트
- 날씨: 창의적 "가격" 해석 가능한지 판단 (없으면 weather.naver.com 유지)
- 뉴스: 창의적 "가격" 해석 가능한지 판단 (없으면 현행 유지)
- 다이어트: 다이어트 식품 가격비교 사이트 (없으면 네이버 쇼핑 유지)
- 농구: KBL 선수 연봉 사이트 (없으면 네이버 검색 유지)
- 여행: 가격 관련 사이트 (투어비스, 인터파크투어 등)

Also verify these specific URLs are accessible and find exact paths:
- 치킨: https://www.kyochon.com/ 메뉴 페이지 경로
- 펫프렌즈: https://www.pet-friends.co.kr/ 검색 URL 패턴
- 네이버 부동산: https://land.naver.com/ 검색 URL 패턴
- 식신: https://www.siksinhot.com/ 접속 가능 여부
- 서울교통공사: https://smrt.co.kr/ 요금 페이지 경로
- 카카오모빌리티: https://kakaomobility.com/ 요금 안내 경로
- 고캠핑: https://www.gocamping.or.kr/ 접속 가능 여부

- [ ] **Step 2: Update spec with finalized URLs**

Update the spec document: replace all "조사 필요" and "구현 시 결정" entries with confirmed URLs.

- [ ] **Step 3: Commit**

```bash
git add docs/superpowers/specs/2026-03-26-witty-url-mapping-design.md
git commit -m "📝 docs: finalize undecided URLs in witty mapping spec"
```

---

### Task 2: Update whitelist.json

Add all new domains needed for the witty URLs.

**Files:**
- Modify: `data/whitelist.json`

- [ ] **Step 1: Add new domains to whitelist**

Replace content of `data/whitelist.json` with all required domains. The exact list depends on Task 1 research results. Starting set (add/remove based on Task 1):

```json
[
  "search.shopping.naver.com",
  "shopping.naver.com",
  "www.coupang.com",
  "www.11st.co.kr",
  "www.gmarket.co.kr",
  "www.auction.co.kr",
  "ko.wikipedia.org",
  "namu.wiki",
  "www.google.com",
  "search.naver.com",
  "search.daum.net",
  "weather.naver.com",
  "map.naver.com",
  "finance.naver.com",
  "land.naver.com",
  "comic.naver.com",
  "dhlottery.co.kr",
  "search.danawa.com",
  "www.musinsa.com",
  "www.hwahae.co.kr",
  "ohou.se",
  "www.cgv.co.kr",
  "www.starbucks.co.kr",
  "www.skyscanner.co.kr",
  "www.goodchoice.kr",
  "upbit.com",
  "statiz.co.kr",
  "www.mpm.go.kr",
  "hogangnono.com",
  "www.hira.or.kr",
  "kbland.kr",
  "www.pet-friends.co.kr",
  "parcel.epost.go.kr",
  "www.toeic.co.kr",
  "www.ebs.co.kr",
  "www.melon.com",
  "www.netflix.com",
  "www.siksinhot.com",
  "www.gocamping.or.kr",
  "kakaomobility.com",
  "smrt.co.kr",
  "www.kyochon.com"
]
```

- [ ] **Step 2: Verify whitelist is valid JSON**

```bash
node -e "JSON.parse(require('fs').readFileSync('data/whitelist.json','utf-8')); console.log('Valid JSON')"
```

Expected: `Valid JSON`

- [ ] **Step 3: Commit**

```bash
git add data/whitelist.json
git commit -m "🔧 chore: add witty URL domains to whitelist"
```

---

### Task 3: Rewrite generate-top100-tsv.ts

Replace the category-based URL mapping with keyword-level custom URLs.

**Files:**
- Modify: `scripts/generate-top100-tsv.ts`

- [ ] **Step 1: Rewrite the script**

Replace the entire content of `scripts/generate-top100-tsv.ts`. Key structural changes:

1. Replace `keywords` array (with `{ keyword, category }` objects) with a flat `KEYWORD_URLS: Record<string, string>` mapping each keyword directly to its final URL
2. Remove the `getTargetUrl()` switch function — replace with helper functions: `naverShopping(kw)`, `danawa(kw)`, `musinsa(kw)`, `hwahae(kw)`, `ohou(kw)`, `naverLand(kw)` that handle `encodeURIComponent` internally
3. Keep the blocklist validation (validate-first, output-later pattern)
4. Keep the `EXISTING_KEYWORDS` exclusion set

The `KEYWORD_URLS` record should contain all 97 keywords with their final URLs. The "TBD" placeholders from the spec MUST be replaced with actual URLs from Task 1 research before writing this file.

Tier 1 (witty) keywords use hardcoded URLs (e.g., `"공무원": "https://www.mpm.go.kr/mpm/info/resultPay/bizSalary/2026/"`).

Tier 2 (price comparison) keywords use helper functions (e.g., `"노트북": danawa("노트북")`).

Tier 3 food keywords use `naverShopping()` helper. Region keywords use `naverLand()` helper.

- [ ] **Step 2: Verify script runs without errors**

```bash
cd /Users/laeyoung/Documents/dev/a21i/price.kr/scripts
npx tsx generate-top100-tsv.ts > /dev/null
```

Expected: stderr shows `Generated 97 keyword entries`, exit code 0.

- [ ] **Step 3: Verify keyword count is exactly 97**

```bash
npx tsx generate-top100-tsv.ts | wc -l
```

Expected: `97`

- [ ] **Step 4: Spot-check witty URLs in TSV output**

```bash
npx tsx generate-top100-tsv.ts | grep -E "^(공무원|부동산|영화|노트북|운동화|서울)"
```

Expected:
- 공무원 → mpm.go.kr (not search.naver.com)
- 부동산 → hogangnono.com (not search.naver.com)
- 영화 → cgv.co.kr (not search.naver.com)
- 노트북 → danawa.com (not search.shopping.naver.com)
- 운동화 → musinsa.com (not search.shopping.naver.com)
- 서울 → land.naver.com (not namu.wiki)

- [ ] **Step 5: Commit**

```bash
git add scripts/generate-top100-tsv.ts
git commit -m "✨ feat: rewrite URL mapping with witty price-themed destinations"
```

---

### Task 4: Regenerate TSV and data files

Run the pipeline to generate the new TSV and keyword JSON files.

**Files:**
- Regenerate: `scripts/top100-keywords.tsv`
- Regenerate: `data/{초성}/{첫글자}/{keyword}.json` x 97

- [ ] **Step 1: Generate TSV and seed data**

```bash
cd /Users/laeyoung/Documents/dev/a21i/price.kr/scripts
npx tsx generate-top100-tsv.ts > top100-keywords.tsv && npx tsx seed-data.ts top100-keywords.tsv ../data
```

Expected: `Generated 97 keyword entries` then `Generated 97 keyword files in ../data`

- [ ] **Step 2: Verify file count is still 100**

```bash
cd /Users/laeyoung/Documents/dev/a21i/price.kr
find data -name "*.json" ! -name "blocklist.json" ! -name "whitelist.json" ! -name "profanity-blocklist.json" | wc -l
```

Expected: `100` (97 new + 3 existing)

- [ ] **Step 3: Verify existing keywords preserved**

```bash
cat data/ㅁ/만/만두.json | grep created
cat data/ㄱ/가/가방.json | grep created
cat data/_en/iphone.json | grep created
```

Expected: All show `"created": "2026-03-17"` (not overwritten)

- [ ] **Step 4: Spot-check witty URL JSON files**

```bash
cat data/ㄱ/공/공무원.json
cat data/ㅂ/부/부동산.json
cat data/ㄴ/노/노트북.json
cat data/ㅅ/서/서울.json
```

Expected:
- 공무원 url → mpm.go.kr 봉급표
- 부동산 url → hogangnono.com
- 노트북 url → search.danawa.com
- 서울 url → land.naver.com

- [ ] **Step 5: Commit**

```bash
git add scripts/top100-keywords.tsv data/
git commit -m "🔄 chore: regenerate keyword data with witty URLs"
```

---

### Task 5: Run tests and verify

Ensure no regressions from the URL changes.

**Files:**
- None (verification only)

- [ ] **Step 1: Run all tests**

```bash
cd /Users/laeyoung/Documents/dev/a21i/price.kr
npm test
```

Expected: All 52 tests pass (19 workers + 10 web + 23 scripts).

- [ ] **Step 2: Verify all URLs use whitelisted domains**

Write and run a one-off verification script:

```bash
cd /Users/laeyoung/Documents/dev/a21i/price.kr
node -e "
const fs = require('fs');
const whitelist = JSON.parse(fs.readFileSync('data/whitelist.json','utf-8'));
const files = fs.readdirSync('data', {recursive:true}).filter(f => f.endsWith('.json') && !['blocklist.json','whitelist.json','profanity-blocklist.json'].includes(require('path').basename(f)));
const domains = new Set();
for (const f of files) {
  try { const d = JSON.parse(fs.readFileSync('data/'+f,'utf-8')); if (d.url) domains.add(new URL(d.url).hostname); } catch {}
}
const missing = [...domains].filter(d => !whitelist.includes(d));
if (missing.length) { console.error('MISSING:', missing); process.exit(1); }
console.log('All ' + domains.size + ' domains whitelisted');
"
```

Expected: `All N domains whitelisted`

- [ ] **Step 3: Verify no blocklist conflicts**

```bash
cd /Users/laeyoung/Documents/dev/a21i/price.kr/scripts
npx tsx generate-top100-tsv.ts > /dev/null 2>&1; echo "Exit: $?"
```

Expected: `Exit: 0`

---

### Task 6: Update documentation

Update DEV_PROGRESS.md and DEV_LOG.md per CLAUDE.md requirements.

**Files:**
- Modify: `docs/DEV_PROGRESS.md`
- Modify: `docs/DEV_LOG.md`

- [ ] **Step 1: Update DEV_PROGRESS.md**

Add under Phase 2 table:

```markdown
| 2 | Witty URL Mapping — "가격" 테마 URL 전면 교체 | ✅ 완료 | 97개 키워드를 위트있는 가격 테마 URL로 교체 |
```

- [ ] **Step 2: Update DEV_LOG.md**

Add a new dated entry at the top describing:
- 3-tier URL 전략 (위트/가격비교/유지)
- 기술적 결정: 카테고리 switch문 → 키워드별 URL 맵으로 구조 변경
- whitelist에 ~29개 도메인 추가
- 52개 테스트 통과 확인

- [ ] **Step 3: Commit**

```bash
git add docs/DEV_PROGRESS.md docs/DEV_LOG.md
git commit -m "📝 docs: update progress and log for witty URL mapping"
```

---

### Task 7: Code review

Run multi-agent review to catch any issues.

- [ ] **Step 1: Dispatch 2-3 review agents in parallel**

Focus areas:
1. **URL correctness** — all URLs accessible, domains whitelisted, no broken links
2. **Data integrity** — 100 files, no orphans, existing keywords preserved, no TBD remaining
3. **Script quality** — helpers used correctly, blocklist validation intact, no regressions

- [ ] **Step 2: Fix any issues found by reviewers**

- [ ] **Step 3: Commit fixes if needed**

```bash
git add -A && git commit -m "🩹 fix: address code review findings for witty URLs"
```
