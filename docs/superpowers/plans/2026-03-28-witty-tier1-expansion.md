# Tier 1 "가격" 재해석 키워드 확장 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand TIER1_KEYWORDS in generate-top1000-tsv.ts from ~80 to ~150 witty "가격" reinterpretation entries, with verified URLs.

**Architecture:** Add new keyword-URL pairs directly to the `TIER1_KEYWORDS` Record in `scripts/generate-top1000-tsv.ts`. Run the existing pipeline (without `--force`) to generate only new keyword JSON files. Update `data/whitelist.json` with required new domains.

**Tech Stack:** TypeScript (tsx), existing seed-data.ts pipeline, Cloudflare KV (via sync-kv.yml)

---

### Task 1: Add new whitelist domains

**Files:**
- Modify: `data/whitelist.json`

- [ ] **Step 1: Add 8 new domains to whitelist.json**

Add these domains at the end of the array, before the closing `]`:

```json
  "www.ets.org",
  "www.minimumwage.go.kr",
  "www.mma.go.kr",
  "www.assembly.go.kr",
  "www.efine.go.kr",
  "kream.co.kr",
  "www.saramin.co.kr",
  "work.go.kr",
  "www.ftc.go.kr"
]
```

Note: Replace the existing last line `"www.ets.org"` (no trailing comma) with `"www.ets.org",` and add the 8 new entries.

- [ ] **Step 2: Verify the JSON is valid**

Run: `python3 -c "import json; json.load(open('data/whitelist.json')); print('Valid JSON')"`
Expected: `Valid JSON`

- [ ] **Step 3: Commit**

```bash
git add data/whitelist.json
git commit -m "chore: add 8 new whitelist domains for witty keyword expansion"
```

---

### Task 2: Add life event keywords to TIER1_KEYWORDS

**Files:**
- Modify: `scripts/generate-top1000-tsv.ts` (add entries inside `TIER1_KEYWORDS` Record)

- [ ] **Step 1: Add life event keywords after the Insurance section (~line 183)**

Insert after the `// Insurance` block, before `// Digital services`:

```typescript
  // Life events — 인생 이벤트 비용
  "결혼": "https://www.weddingbook.com/",
  "출산": "https://www.mohw.go.kr/",
  "장례": `https://search.naver.com/search.naver?query=${enc("장례비용")}`,
  "이혼": `https://search.naver.com/search.naver?query=${enc("이혼 비용 위자료")}`,
  "입양": `https://search.naver.com/search.naver?query=${enc("입양 절차 비용")}`,

  // Medical/cosmetic procedures — 시술비
  "교정": `https://search.naver.com/search.naver?query=${enc("치아교정 비용")}`,
  "라식": `https://search.naver.com/search.naver?query=${enc("라식 가격 비교")}`,
  "성형": `https://search.naver.com/search.naver?query=${enc("성형 비용")}`,
  "타투": `https://search.naver.com/search.naver?query=${enc("타투 가격")}`,
  "필러": `https://search.naver.com/search.naver?query=${enc("필러 가격")}`,
  "보톡스": `https://search.naver.com/search.naver?query=${enc("보톡스 가격")}`,
  "임플란트": "https://www.hira.or.kr/",
  "탈모치료": `https://search.naver.com/search.naver?query=${enc("탈모치료 비용")}`,
```

- [ ] **Step 2: Verify no blocklist conflicts**

Run: `npx tsx scripts/generate-top1000-tsv.ts 2>&1 | grep -E "BLOCKED|DUPLICATE"`
Expected: No output (no conflicts)

- [ ] **Step 3: Commit**

```bash
git add scripts/generate-top1000-tsv.ts
git commit -m "feat: add life event and medical cost witty keywords"
```

---

### Task 3: Add career/salary and public service keywords

**Files:**
- Modify: `scripts/generate-top1000-tsv.ts`

- [ ] **Step 1: Add career/salary and public service keywords**

Insert after the life events block added in Task 2:

```typescript
  // Career salaries — 직업 연봉 시리즈
  "의사": "https://www.saramin.co.kr/zf_user/jobs/industry-salary",
  "변호사": "https://www.saramin.co.kr/zf_user/jobs/industry-salary",
  "판사": "https://www.saramin.co.kr/zf_user/jobs/industry-salary",
  "교사": "https://www.saramin.co.kr/zf_user/jobs/industry-salary",
  "소방관": "https://www.saramin.co.kr/zf_user/jobs/industry-salary",
  "경찰": "https://www.saramin.co.kr/zf_user/jobs/industry-salary",
  "파일럿": "https://www.saramin.co.kr/zf_user/jobs/industry-salary",
  "약사": "https://www.saramin.co.kr/zf_user/jobs/industry-salary",
  "간호사": "https://www.saramin.co.kr/zf_user/jobs/industry-salary",
  "회계사": "https://www.saramin.co.kr/zf_user/jobs/industry-salary",

  // Public fees — 공공요금/벌금
  "군대": "https://www.mma.go.kr/",
  "국회의원": "https://www.assembly.go.kr/",
  "과태료": "https://www.efine.go.kr/",
  "주차위반": "https://www.efine.go.kr/",
  "음주운전": "https://www.efine.go.kr/",

  // Exam/license fees — 응시료
  "한국사": `https://search.naver.com/search.naver?query=${enc("한국사능력검정시험 응시료")}`,
  "공인중개사": `https://search.naver.com/search.naver?query=${enc("공인중개사 시험 응시료")}`,
```

- [ ] **Step 2: Verify no blocklist conflicts**

Run: `npx tsx scripts/generate-top1000-tsv.ts 2>&1 | grep -E "BLOCKED|DUPLICATE"`
Expected: No output

- [ ] **Step 3: Commit**

```bash
git add scripts/generate-top1000-tsv.ts
git commit -m "feat: add career salary and public service witty keywords"
```

---

### Task 4: Add abstract concept and Korean culture keywords

**Files:**
- Modify: `scripts/generate-top1000-tsv.ts`

- [ ] **Step 1: Add abstract/culture keywords**

Insert after the block added in Task 3:

```typescript
  // Time/labor — 시간과 노동의 가격
  "시간": "https://www.minimumwage.go.kr/",
  "야근": `https://search.naver.com/search.naver?query=${enc("야근수당 계산기")}`,
  "알바": `https://search.naver.com/search.naver?query=${enc("알바 시급 검색")}`,
  "퇴직": `https://search.naver.com/search.naver?query=${enc("퇴직금 계산기")}`,

  // Legal consequences — 법적 대가
  "실수": "https://www.efine.go.kr/",
  "명예훼손": `https://search.naver.com/search.naver?query=${enc("명예훼손 벌금")}`,

  // Korean culture — 한국 문화 시세
  "세뱃돈": `https://search.naver.com/search.naver?query=${enc("세뱃돈 시세")}`,
  "추석선물": `https://search.shopping.naver.com/search/all?query=${enc("추석선물세트")}`,
  "축의금": `https://search.naver.com/search.naver?query=${enc("축의금 시세")}`,

  // Misc witty — 기타 위트
  "명품": "https://kream.co.kr/",
  "행복": `https://search.naver.com/search.naver?query=${enc("세계 행복 지수 순위")}`,
  "치킨집창업": "https://www.ftc.go.kr/",
  "강아지입양": `https://search.naver.com/search.naver?query=${enc("강아지 입양 비용")}`,
  "고양이입양": `https://search.naver.com/search.naver?query=${enc("고양이 입양 비용")}`,
  "동물병원": `https://search.naver.com/search.naver?query=${enc("동물병원 진료비")}`,
```

- [ ] **Step 2: Verify no blocklist/duplicate conflicts**

Run: `npx tsx scripts/generate-top1000-tsv.ts 2>&1 | grep -E "BLOCKED|DUPLICATE"`
Expected: No output

- [ ] **Step 3: Commit**

```bash
git add scripts/generate-top1000-tsv.ts
git commit -m "feat: add abstract concept and Korean culture witty keywords"
```

---

### Task 5: Run pipeline and generate JSON files

**Files:**
- Create: `data/**/*.json` (new keyword files)
- Modify: `scripts/top1000-keywords.tsv`

- [ ] **Step 1: Check how many new keywords will be generated**

Run: `npx tsx scripts/generate-top1000-tsv.ts 2>&1 | tail -3`
Expected output similar to:
```
Total defined: ~1050
Already existing: ~1001
New entries generated: ~50
```

- [ ] **Step 2: Generate new keyword JSON files (no --force!)**

```bash
npx tsx scripts/generate-top1000-tsv.ts > /tmp/new-keywords.tsv
npx tsx scripts/seed-data.ts /tmp/new-keywords.tsv ./data
```

Expected: `Generated ~50 keyword files in ./data`

- [ ] **Step 3: Regenerate full TSV archive**

```bash
npx tsx scripts/generate-top1000-tsv.ts --force > scripts/top1000-keywords.tsv
```

- [ ] **Step 4: Verify total keyword count**

Run: `find data -name '*.json' ! -name 'blocklist.json' ! -name 'whitelist.json' ! -name 'profanity-blocklist.json' | wc -l`
Expected: ~1050 (previous 1001 + new ~50)

- [ ] **Step 5: Spot-check a few new files**

```bash
cat data/ㄱ/결/결혼.json
cat data/ㅇ/의/의사.json
cat data/ㅅ/시/시간.json
cat data/ㅁ/명/명품.json
```

Verify each has: `{ "keyword": "...", "url": "...", "created": "2026-03-28" }`

- [ ] **Step 6: Run all tests**

Run: `npm test`
Expected: 52 tests pass (19 workers + 10 web + 23 scripts)

- [ ] **Step 7: Commit all new data files and updated TSV**

```bash
git add data/ scripts/top1000-keywords.tsv
git commit -m "feat: generate ~50 new witty keyword JSON files"
```

---

### Task 6: Update dev tracking docs

**Files:**
- Modify: `docs/DEV_PROGRESS.md`
- Modify: `docs/DEV_LOG.md`

- [ ] **Step 1: Add Phase 3 Task 2 to DEV_PROGRESS.md**

Add a new row to the Phase 3 table:

```markdown
| 2 | Witty Tier 1 Keyword Expansion | ✅ 완료 | ~80→~150개 Tier 1 위트형 키워드 확장, 직업/연봉 시리즈 추가 |
```

- [ ] **Step 2: Add dev log entry to DEV_LOG.md**

Add at the top (newest first), after the `---` separator:

```markdown
## 2026-03-28 ~12:00 — Witty Tier 1 Keyword Expansion

**작업 내용:**
Tier 1 위트형 "가격" 재해석 키워드를 ~80개에서 ~150개로 확장.

**추가 카테고리:**
- 인생 이벤트 비용: 결혼, 출산, 장례, 이혼, 입양
- 의료/미용 시술비: 교정, 라식, 성형, 타투, 필러, 보톡스, 임플란트, 탈모치료
- 직업/연봉 시리즈: 의사, 변호사, 판사, 교사, 소방관, 경찰, 파일럿, 약사, 간호사, 회계사
- 공공요금/벌금: 군대, 국회의원, 과태료, 주차위반, 음주운전
- 시간/노동: 시간, 야근, 알바, 퇴직
- 한국 문화: 세뱃돈, 추석선물, 축의금
- 기타 위트: 명품→KREAM, 행복→세계행복지수, 치킨집창업→공정위

**기술적 결정:**
- TIER1_KEYWORDS Record에 직접 추가 (기존 구조 유지)
- whitelist.json에 8개 신규 도메인 추가 (정부 6 + 민간 2)
- --force 없이 파이프라인 실행하여 새 키워드만 JSON 생성 (기존 created 날짜 보존)
- URL 선정: 정부/공공기관 > 전문비교사이트 > 네이버 검색 폴백

---
```

- [ ] **Step 3: Commit**

```bash
git add docs/DEV_PROGRESS.md docs/DEV_LOG.md
git commit -m "docs: update dev tracking for witty keyword expansion"
```
