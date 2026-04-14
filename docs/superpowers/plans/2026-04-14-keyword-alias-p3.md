# Keyword Alias P3 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Surface alias relationships in the web UI — show "금은 금값의 다른 이름입니다" on the `가격.kr/금` page, show aliases on the canonical's page, and include alias keywords in the search bar.

**Architecture:** Extend `web/lib/keywords.ts` with alias-aware loading functions. Update `web/app/[keyword]/page.tsx` to detect alias/canonical status and render relationship UI. Pass alias keywords to the search index so users can discover them by typing. Workers redirect logic is unchanged (P1 handles that).

**Tech Stack:** Next.js 15 App Router, TypeScript, Vitest, Node.js `fs/promises`

> **Note:** This plan covers the three concrete UI features. Pattern-based alias suggestions, canonical promotion, and alias count limits are deferred as P3+.
>
> **URL context:** `금.가격.kr` → Workers 302 redirect (P1). `가격.kr/금` → Next.js page (this plan). Both paths are valid entry points.

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Modify | `web/lib/keywords.ts` | Add `AliasEntry`, `loadAllAliases()`, `findAliasesOf()`, `loadKeywordFile()` |
| Modify | `web/__tests__/keywords.test.ts` | Tests for new alias loading functions |
| Modify | `web/app/[keyword]/page.tsx` | Detect alias/canonical, render alias notice or alias list |
| Modify | `web/app/page.tsx` | Pass alias keywords into SearchBar alongside canonicals |

---

## Task 1: Alias loading functions in web/lib/keywords.ts

**Files:**
- Modify: `web/lib/keywords.ts`
- Modify: `web/__tests__/keywords.test.ts`

- [ ] **Step 1: Write failing tests — append to `web/__tests__/keywords.test.ts`**

Add these imports at the top (next to existing `loadAllKeywords` import):
```typescript
import { loadAllKeywords, loadAllAliases, findAliasesOf, loadKeywordFile } from "@/lib/keywords";
```

Append these describe blocks:

```typescript
describe("loadAllAliases", () => {
  it("returns alias entries with keyword and alias_of", async () => {
    const tmp = createTmpDir();
    mkdirSync(join(tmp, "ㄱ", "금"), { recursive: true });
    writeFileSync(
      join(tmp, "ㄱ", "금", "금값.json"),
      JSON.stringify({ keyword: "금값", url: "https://example.com/gold", created: "2026-04-14" })
    );
    writeFileSync(
      join(tmp, "ㄱ", "금", "금.json"),
      JSON.stringify({ keyword: "금", alias_of: "금값", created: "2026-04-14" })
    );

    const aliases = await loadAllAliases(tmp);
    expect(aliases).toHaveLength(1);
    expect(aliases[0]).toEqual({ keyword: "금", alias_of: "금값", created: "2026-04-14" });
  });

  it("excludes canonical entries (those with url)", async () => {
    const tmp = createTmpDir();
    mkdirSync(join(tmp, "_en"), { recursive: true });
    writeFileSync(join(tmp, "_en", "gold.json"), JSON.stringify({ keyword: "gold", url: "https://example.com", created: "2026-04-14" }));

    const aliases = await loadAllAliases(tmp);
    expect(aliases).toHaveLength(0);
  });

  it("excludes non-keyword files", async () => {
    const tmp = createTmpDir();
    mkdirSync(join(tmp, "_en"), { recursive: true });
    writeFileSync(join(tmp, "_en", "golden.json"), JSON.stringify({ keyword: "golden", alias_of: "gold", created: "2026-04-14" }));
    writeFileSync(join(tmp, "blocklist.json"), JSON.stringify(["bad"]));

    const aliases = await loadAllAliases(tmp);
    expect(aliases).toHaveLength(1);
  });
});

describe("findAliasesOf", () => {
  it("returns keywords of alias entries pointing to the canonical", async () => {
    const tmp = createTmpDir();
    mkdirSync(join(tmp, "_en"), { recursive: true });
    writeFileSync(join(tmp, "_en", "gold.json"), JSON.stringify({ keyword: "gold", url: "https://example.com", created: "2026-04-14" }));
    writeFileSync(join(tmp, "_en", "golden.json"), JSON.stringify({ keyword: "golden", alias_of: "gold", created: "2026-04-14" }));
    writeFileSync(join(tmp, "_en", "gilded.json"), JSON.stringify({ keyword: "gilded", alias_of: "gold", created: "2026-04-14" }));
    writeFileSync(join(tmp, "_en", "other.json"), JSON.stringify({ keyword: "other", alias_of: "silver", created: "2026-04-14" }));

    const aliases = await findAliasesOf("gold", tmp);
    expect(aliases.sort()).toEqual(["gilded", "golden"]);
  });

  it("returns empty array when canonical has no aliases", async () => {
    const tmp = createTmpDir();
    mkdirSync(join(tmp, "_en"), { recursive: true });
    writeFileSync(join(tmp, "_en", "gold.json"), JSON.stringify({ keyword: "gold", url: "https://example.com", created: "2026-04-14" }));

    const aliases = await findAliasesOf("gold", tmp);
    expect(aliases).toEqual([]);
  });
});

describe("loadKeywordFile", () => {
  it("returns canonical data for a canonical keyword", async () => {
    const tmp = createTmpDir();
    mkdirSync(join(tmp, "ㄱ", "금"), { recursive: true });
    writeFileSync(join(tmp, "ㄱ", "금", "금값.json"), JSON.stringify({ keyword: "금값", url: "https://example.com", created: "2026-04-14" }));

    const result = await loadKeywordFile("금값", tmp);
    expect(result).toEqual({ keyword: "금값", url: "https://example.com", created: "2026-04-14" });
  });

  it("returns alias data for an alias keyword", async () => {
    const tmp = createTmpDir();
    mkdirSync(join(tmp, "ㄱ", "금"), { recursive: true });
    writeFileSync(join(tmp, "ㄱ", "금", "금.json"), JSON.stringify({ keyword: "금", alias_of: "금값", created: "2026-04-14" }));

    const result = await loadKeywordFile("금", tmp);
    expect(result).toEqual({ keyword: "금", alias_of: "금값", created: "2026-04-14" });
  });

  it("returns null for an unregistered keyword", async () => {
    const tmp = createTmpDir();
    const result = await loadKeywordFile("없는키워드", tmp);
    expect(result).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

Run: `cd web && npx vitest run __tests__/keywords.test.ts`
Expected: FAIL — `loadAllAliases`, `findAliasesOf`, `loadKeywordFile` not exported

- [ ] **Step 3: Implement new functions in `web/lib/keywords.ts`**

Add after the existing `KeywordEntry` interface:

```typescript
export interface AliasEntry {
  keyword: string;
  alias_of: string;
  created: string;
}

/** Compute data file path for a keyword (Korean/English/Numeric) */
function keywordFilePath(keyword: string): string {
  const CHOSEONG = ["ㄱ","ㄲ","ㄴ","ㄷ","ㄸ","ㄹ","ㅁ","ㅂ","ㅃ","ㅅ","ㅆ","ㅇ","ㅈ","ㅉ","ㅊ","ㅋ","ㅌ","ㅍ","ㅎ"];
  const first = keyword[0];
  const code = first?.charCodeAt(0) ?? 0;
  if (code >= 0xAC00 && code <= 0xD7A3) {
    const cho = CHOSEONG[Math.floor((code - 0xAC00) / 588)];
    return join(cho, first, `${keyword}.json`);
  } else if (/\d/.test(first)) {
    return join("_num", `${keyword}.json`);
  }
  return join("_en", `${keyword.toLowerCase()}.json`);
}

/** Load all alias entries from dataDir (files with alias_of, no url) */
export async function loadAllAliases(dataDir: string): Promise<AliasEntry[]> {
  const files = await findJsonFiles(dataDir);
  const entries: AliasEntry[] = [];
  for (const file of files) {
    try {
      const content = await readFile(file, "utf-8");
      const parsed = JSON.parse(content);
      if (
        parsed &&
        typeof parsed.keyword === "string" &&
        typeof parsed.alias_of === "string" &&
        typeof parsed.url === "undefined"
      ) {
        entries.push(parsed as AliasEntry);
      }
    } catch {
      // skip malformed
    }
  }
  return entries;
}

/** Return keywords of alias files that point to the given canonical */
export async function findAliasesOf(canonicalKeyword: string, dataDir: string): Promise<string[]> {
  const aliases = await loadAllAliases(dataDir);
  return aliases.filter((a) => a.alias_of === canonicalKeyword).map((a) => a.keyword);
}

/** Load raw JSON data for a single keyword (canonical or alias). Returns null if not found. */
export async function loadKeywordFile(
  keyword: string,
  dataDir: string
): Promise<Record<string, unknown> | null> {
  const relPath = keywordFilePath(keyword);
  const fullPath = join(dataDir, relPath);
  try {
    const content = await readFile(fullPath, "utf-8");
    return JSON.parse(content);
  } catch {
    return null;
  }
}
```

- [ ] **Step 4: Run tests to confirm they pass**

Run: `cd web && npx vitest run __tests__/keywords.test.ts`
Expected: all tests pass

- [ ] **Step 5: Commit**

```bash
git add web/lib/keywords.ts web/__tests__/keywords.test.ts
git commit -m "feat(web/keywords): add loadAllAliases, findAliasesOf, loadKeywordFile"
```

---

## Task 2: Alias/canonical UI in [keyword]/page.tsx

**Files:**
- Modify: `web/app/[keyword]/page.tsx`

The page currently only shows the "unregistered keyword" view. We extend it to show:
- **Alias view**: "금은 금값의 다른 이름입니다. 금.가격.kr 방문 시 금값과 동일한 목적지로 이동됩니다."
- **Canonical view**: existing keyword info + "다른 이름: 금, 골드" if aliases exist
- **Unregistered view**: existing behavior (unchanged)

This task has no separate test file (Next.js page components are not unit-tested here — verify visually in browser).

- [ ] **Step 1: Add imports to `web/app/[keyword]/page.tsx`**

Add to the existing imports:
```typescript
import { loadAllKeywords, getDataDir, loadKeywordFile, findAliasesOf } from "@/lib/keywords";
```

- [ ] **Step 2: Replace `KeywordPage` implementation in `web/app/[keyword]/page.tsx`**

Replace the entire `KeywordPage` function (lines 36–88) with:

```typescript
export default async function KeywordPage({ params }: Props) {
  const { keyword } = await params;
  const decoded = safeDecodeURIComponent(keyword);
  const dataDir = getDataDir();

  // Determine keyword status: alias, canonical, or unregistered
  const keywordData = await loadKeywordFile(decoded, dataDir);
  const isAlias = keywordData !== null && typeof (keywordData as any).alias_of === "string";
  const isCanonical = keywordData !== null && typeof (keywordData as any).url === "string";

  // For canonical: find its aliases
  const aliases = isCanonical ? await findAliasesOf(decoded, dataDir) : [];

  // For unregistered: find similar keywords
  const allKeywords = await loadAllKeywords(dataDir).catch(() => []);
  const keywordList = allKeywords.map((k) => k.keyword);
  const similar = !isAlias && !isCanonical
    ? searchKeywords(decoded.slice(0, 1), keywordList).filter((k) => k !== decoded).slice(0, 5)
    : [];

  const issueUrl = `https://github.com/price-kr/price.kr/issues/new?template=new-keyword.yml&title=${encodeURIComponent(`[키워드 제안] ${decoded}`)}`;
  const canonicalKeyword = isAlias ? (keywordData as any).alias_of as string : null;

  // --- Alias view ---
  if (isAlias && canonicalKeyword) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-8">
        <h1 className="text-3xl font-bold mb-4">
          <span className="text-blue-600">{decoded}</span>은(는){" "}
          <a href={`https://${canonicalKeyword}.가격.kr`} className="text-blue-500 underline">
            {canonicalKeyword}
          </a>
          의 다른 이름입니다
        </h1>
        <p className="text-gray-600 mb-6 text-center">
          <a href={`https://${decoded}.가격.kr`} className="font-mono text-blue-600">
            {decoded}.가격.kr
          </a>{" "}
          방문 시{" "}
          <a href={`https://${canonicalKeyword}.가격.kr`} className="font-mono text-blue-600">
            {canonicalKeyword}.가격.kr
          </a>
          과 동일한 목적지로 이동됩니다.
        </p>
        <a
          href={`https://${canonicalKeyword}.가격.kr`}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          {canonicalKeyword}.가격.kr 바로가기
        </a>
        <Link href="/" className="mt-4 text-gray-500 hover:text-gray-700">
          ← 메인으로 돌아가기
        </Link>
      </main>
    );
  }

  // --- Canonical view (keyword is registered) ---
  if (isCanonical) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-8">
        <h1 className="text-3xl font-bold mb-4">
          <span className="text-blue-600">{decoded}</span>.가격.kr
        </h1>
        <p className="text-gray-600 mb-6">
          이 키워드는 등록되어 있습니다.{" "}
          <a href={`https://${decoded}.가격.kr`} className="text-blue-500 underline">
            {decoded}.가격.kr
          </a>
          로 접속하면 바로 이동됩니다.
        </p>
        {aliases.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-2">다른 이름</h2>
            <ul className="flex gap-2 flex-wrap justify-center">
              {aliases.map((alias) => (
                <li key={alias}>
                  <a
                    href={`https://${alias}.가격.kr`}
                    className="px-3 py-1 bg-gray-100 rounded-full text-blue-600 hover:bg-gray-200 transition"
                  >
                    {alias}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
        <Link href="/" className="mt-4 text-gray-500 hover:text-gray-700">
          ← 메인으로 돌아가기
        </Link>
      </main>
    );
  }

  // --- Unregistered view (existing behavior) ---
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      <h1 className="text-3xl font-bold mb-4">
        <span className="text-blue-600">{decoded}</span> 키워드가 아직
        등록되지 않았습니다
      </h1>

      {similar.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-2">유사한 키워드</h2>
          <ul className="space-y-1">
            {similar.map((kw) => (
              <li key={kw}>
                <a
                  href={`https://${kw}.가격.kr`}
                  className="text-blue-500 hover:underline"
                >
                  {kw}.가격.kr
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      <a
        href={issueUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
      >
        이 단어 제안하기
      </a>

      <Link href="/" className="mt-4 text-gray-500 hover:text-gray-700">
        ← 메인으로 돌아가기
      </Link>
    </main>
  );
}
```

- [ ] **Step 3: Run type-check**

Run: `cd web && npx tsc --noEmit`
Expected: no errors

- [ ] **Step 4: Start dev server and verify manually**

Run: `cd web && npm run dev`

Visit in browser:
- `http://localhost:3000/%EA%B8%88` (= `/금`) — should show alias view pointing to `금값`
- `http://localhost:3000/%EA%B8%88%EA%B0%92` (= `/금값`) — should show canonical view with "다른 이름: 금"
- `http://localhost:3000/없는단어` — should show existing unregistered view

- [ ] **Step 5: Commit**

```bash
git add web/app/[keyword]/page.tsx
git commit -m "feat(web): show alias/canonical relationship on keyword page"
```

---

## Task 3: Include alias keywords in search index

**Files:**
- Modify: `web/app/page.tsx`

The `SearchBar` receives a `keywords: string[]`. Currently only canonical keywords are passed. We extend this to include alias keywords so users can type "금" and find it in suggestions.

Aliases redirect to the same URL as their canonical (via KV), so including them in the search list is correct — clicking a suggestion navigates to `alias.가격.kr` which Workers redirects to the canonical destination.

- [ ] **Step 1: Update `web/app/page.tsx` to load and merge alias keywords**

Replace the `HomePage` function:

```typescript
import { loadAllKeywords, loadAllAliases, getDataDir } from "@/lib/keywords";
import { SearchBar } from "@/components/SearchBar";

export default async function HomePage() {
  const dataDir = getDataDir();
  const [keywords, aliases] = await Promise.all([
    loadAllKeywords(dataDir).catch(() => []),
    loadAllAliases(dataDir).catch(() => []),
  ]);

  // Merge: canonical keywords first, then alias keywords
  const keywordList = [
    ...keywords.map((k) => k.keyword),
    ...aliases.map((a) => a.keyword),
  ];

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      <h1 className="text-4xl font-bold mb-2">가격.kr</h1>
      <p className="text-gray-600 mb-8 text-center">
        한글 키워드로 최저가를 찾아보세요
      </p>
      <SearchBar keywords={keywordList} />
      <p className="mt-12 text-sm text-gray-400">
        커뮤니티가 만들어가는{" "}
        <a
          href="https://github.com/price-kr/price.kr"
          className="underline hover:text-gray-600 transition-colors"
          target="_blank"
          rel="noopener noreferrer"
        >
          오픈소스
        </a>{" "}
        단축 URL 서비스
      </p>
    </main>
  );
}
```

- [ ] **Step 2: Run type-check**

Run: `cd web && npx tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Start dev server and verify**

Run: `cd web && npm run dev`

Visit `http://localhost:3000`, type "금" in the search bar.
Expected: both "금" and "금값" appear in suggestions (금 from alias list, 금값 from canonical list).

- [ ] **Step 4: Run full test suite**

Run from monorepo root: `npm test`
Expected: all tests pass (96+)

- [ ] **Step 5: Commit**

```bash
git add web/app/page.tsx
git commit -m "feat(web): include alias keywords in search bar suggestions"
```

---

## Self-Review

**Spec coverage:**
- ✅ `가격.kr/금` 방문 시 alias 안내 UI ("금은 금값의 다른 이름입니다") — Task 2
- ✅ `가격.kr/금값` 방문 시 역방향 표시 ("다른 이름: 금") — Task 2
- ✅ 검색 UI에서 alias 포함 결과 — Task 3
- ⬜ 새 키워드 제안 시 기존 유사 키워드 자동 제안 — P3+ (deferred)
- ⬜ Canonical 승격 제안 — P3+ (deferred, requires traffic analytics)
- ⬜ 패턴 기반 자동 alias 제안 — P3+ (deferred)
- ⬜ Alias 개수 제한 정책 — P3+ (deferred, needs policy decision)

**Type consistency:**
- `AliasEntry { keyword: string; alias_of: string; created: string }` — used in `loadAllAliases` return and `findAliasesOf`
- `loadKeywordFile` returns `Record<string, unknown> | null` — page casts with `as any` for `alias_of` / `url` checks; acceptable since we're just reading string fields
- `keywordFilePath(keyword)` is private to `keywords.ts` — not exported, used only by `loadKeywordFile`

**generateStaticParams note:** `[keyword]/page.tsx` pre-generates pages for all canonical keywords. Alias keywords are not pre-generated (they'd need `loadAllAliases` added). They still render correctly via `dynamicParams = true` — just not pre-built at deploy time. This is acceptable for P3; pre-generating aliases can be added in P3+.
