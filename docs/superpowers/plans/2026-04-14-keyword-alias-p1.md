# Keyword Alias P1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add alias JSON file support so `금.가격.kr` redirects to the same URL as `금값.가격.kr` via sync-time resolution with no changes to Workers.

**Architecture:** Alias files use `alias_of` instead of `url`. `buildKvEntries` gains a 2-pass approach (collect canonicals → resolve aliases to final URLs). `incrementalKvEntries` detects alias files and back-propagates canonical URL changes to all dependent aliases. `validate-keyword.ts` gains pure type guards (`isAliasData`, `isCanonicalData`) used by sync-kv.ts.

**Tech Stack:** TypeScript, Vitest 2.x, Node.js `fs/promises`, `execFileSync` for git operations

> **Note on scope:** This plan covers P1 (data model + redirect engine) only. P2 (GitHub Actions issue automation) is an independent subsystem and should be a separate plan.

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `data/ㄱ/금/금값.json` | Sample canonical keyword file |
| Create | `data/ㄱ/금/금.json` | Sample alias keyword file |
| Modify | `scripts/validate-keyword.ts` | Add `AliasData`, `CanonicalData` interfaces + `isAliasData`, `isCanonicalData` type guards |
| Modify | `scripts/sync-kv.ts` | Import type guards; replace `buildKvEntries` with 2-pass version; add `findAliasesOf` export; update `incrementalKvEntries` with alias awareness |
| Modify | `scripts/__tests__/validate-keyword.test.ts` | Tests for `isAliasData` and `isCanonicalData` |
| Modify | `scripts/__tests__/sync-kv.test.ts` | Tests for alias resolution in `buildKvEntries`, `findAliasesOf`, and alias-aware `incrementalKvEntries` |

---

## Task 1: Sample alias data files

**Files:**
- Create: `data/ㄱ/금/금값.json`
- Create: `data/ㄱ/금/금.json`

- [ ] **Step 1: Create the canonical file `data/ㄱ/금/금값.json`**

```json
{
  "keyword": "금값",
  "url": "https://finance.naver.com/goldprice/",
  "created": "2026-04-14"
}
```

- [ ] **Step 2: Create the alias file `data/ㄱ/금/금.json`**

```json
{
  "keyword": "금",
  "alias_of": "금값",
  "created": "2026-04-14"
}
```

- [ ] **Step 3: Confirm existing tests still pass (alias file is currently silently skipped)**

Run: `cd scripts && npx vitest run __tests__/sync-kv.test.ts`
Expected: all existing tests pass — the alias file has no `url` field so `buildKvEntries` skips it

- [ ] **Step 4: Commit**

```bash
git add data/ㄱ/금/금값.json data/ㄱ/금/금.json
git commit -m "data: add sample alias files for 금 → 금값"
```

---

## Task 2: Type guards in validate-keyword.ts

**Files:**
- Modify: `scripts/validate-keyword.ts`
- Modify: `scripts/__tests__/validate-keyword.test.ts`

- [ ] **Step 1: Write the failing tests — append to `scripts/__tests__/validate-keyword.test.ts`**

```typescript
import { isAliasData, isCanonicalData } from "../validate-keyword.js";

describe("isAliasData", () => {
  it("returns true for valid alias objects", () => {
    expect(isAliasData({ keyword: "금", alias_of: "금값", created: "2026-04-14" })).toBe(true);
  });

  it("returns false for canonical objects", () => {
    expect(isAliasData({ keyword: "금값", url: "https://example.com", created: "2026-04-14" })).toBe(false);
  });

  it("returns false for objects with both url and alias_of", () => {
    expect(isAliasData({ keyword: "금", url: "https://example.com", alias_of: "금값" })).toBe(false);
  });

  it("returns false for non-objects", () => {
    expect(isAliasData(null)).toBe(false);
    expect(isAliasData("string")).toBe(false);
    expect(isAliasData(42)).toBe(false);
  });

  it("returns false when keyword or alias_of is not a string", () => {
    expect(isAliasData({ keyword: 123, alias_of: "금값" })).toBe(false);
    expect(isAliasData({ keyword: "금", alias_of: 123 })).toBe(false);
  });
});

describe("isCanonicalData", () => {
  it("returns true for valid canonical objects", () => {
    expect(isCanonicalData({ keyword: "금값", url: "https://example.com", created: "2026-04-14" })).toBe(true);
  });

  it("returns false for alias objects", () => {
    expect(isCanonicalData({ keyword: "금", alias_of: "금값", created: "2026-04-14" })).toBe(false);
  });

  it("returns false for objects with both url and alias_of", () => {
    expect(isCanonicalData({ keyword: "금값", url: "https://example.com", alias_of: "금" })).toBe(false);
  });

  it("returns false when keyword or url is not a string", () => {
    expect(isCanonicalData({ keyword: 123, url: "https://example.com" })).toBe(false);
    expect(isCanonicalData({ keyword: "금값", url: 123 })).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

Run: `cd scripts && npx vitest run __tests__/validate-keyword.test.ts`
Expected: FAIL — `isAliasData is not a function` (not yet exported)

- [ ] **Step 3: Add interfaces and type guards — append to end of `scripts/validate-keyword.ts`**

```typescript
export interface AliasData {
  keyword: string;
  alias_of: string;
}

export interface CanonicalData {
  keyword: string;
  url: string;
}

export function isAliasData(data: unknown): data is AliasData {
  if (typeof data !== "object" || data === null) return false;
  const d = data as Record<string, unknown>;
  return (
    typeof d.keyword === "string" &&
    typeof d.alias_of === "string" &&
    typeof d.url === "undefined"
  );
}

export function isCanonicalData(data: unknown): data is CanonicalData {
  if (typeof data !== "object" || data === null) return false;
  const d = data as Record<string, unknown>;
  return (
    typeof d.keyword === "string" &&
    typeof d.url === "string" &&
    typeof d.alias_of === "undefined"
  );
}
```

- [ ] **Step 4: Run tests to confirm they pass**

Run: `cd scripts && npx vitest run __tests__/validate-keyword.test.ts`
Expected: all tests pass

- [ ] **Step 5: Commit**

```bash
git add scripts/validate-keyword.ts scripts/__tests__/validate-keyword.test.ts
git commit -m "feat(validate-keyword): add isAliasData and isCanonicalData type guards"
```

---

## Task 3: 2-pass alias resolution in buildKvEntries

**Files:**
- Modify: `scripts/sync-kv.ts`
- Modify: `scripts/__tests__/sync-kv.test.ts`

- [ ] **Step 1: Write the failing tests — add new describe block in `scripts/__tests__/sync-kv.test.ts` after the existing `buildKvEntries` describe block**

```typescript
describe("buildKvEntries alias resolution", () => {
  it("resolves alias to canonical url", async () => {
    const tmp = createTmpDir();
    mkdirSync(join(tmp, "ㄱ", "금"), { recursive: true });
    writeFileSync(
      join(tmp, "ㄱ", "금", "금값.json"),
      JSON.stringify({ keyword: "금값", url: "https://finance.naver.com/goldprice/", created: "2026-04-14" })
    );
    writeFileSync(
      join(tmp, "ㄱ", "금", "금.json"),
      JSON.stringify({ keyword: "금", alias_of: "금값", created: "2026-04-14" })
    );

    const entries = await buildKvEntries(tmp);
    const gold = entries.find(e => e.key === "금");
    const goldprice = entries.find(e => e.key === "금값");
    expect(goldprice).toEqual({ key: "금값", value: "https://finance.naver.com/goldprice/" });
    expect(gold).toEqual({ key: "금", value: "https://finance.naver.com/goldprice/" });
    expect(entries).toHaveLength(2);
  });

  it("skips alias when canonical does not exist", async () => {
    const tmp = createTmpDir();
    mkdirSync(join(tmp, "_en"), { recursive: true });
    writeFileSync(
      join(tmp, "_en", "orphan.json"),
      JSON.stringify({ keyword: "orphan", alias_of: "nonexistent", created: "2026-04-14" })
    );

    const entries = await buildKvEntries(tmp);
    expect(entries).toHaveLength(0);
  });

  it("skips alias when target is also an alias (chain forbidden)", async () => {
    const tmp = createTmpDir();
    mkdirSync(join(tmp, "_en"), { recursive: true });
    writeFileSync(
      join(tmp, "_en", "a.json"),
      JSON.stringify({ keyword: "a", alias_of: "b", created: "2026-04-14" })
    );
    writeFileSync(
      join(tmp, "_en", "b.json"),
      JSON.stringify({ keyword: "b", alias_of: "c", created: "2026-04-14" })
    );

    const entries = await buildKvEntries(tmp);
    expect(entries).toHaveLength(0);
  });

  it("handles multiple aliases for same canonical", async () => {
    const tmp = createTmpDir();
    mkdirSync(join(tmp, "_en"), { recursive: true });
    const url = "https://example.com/gold";
    writeFileSync(join(tmp, "_en", "gold.json"), JSON.stringify({ keyword: "gold", url, created: "2026-04-14" }));
    writeFileSync(join(tmp, "_en", "golden.json"), JSON.stringify({ keyword: "golden", alias_of: "gold", created: "2026-04-14" }));
    writeFileSync(join(tmp, "_en", "gilded.json"), JSON.stringify({ keyword: "gilded", alias_of: "gold", created: "2026-04-14" }));

    const entries = await buildKvEntries(tmp);
    expect(entries).toHaveLength(3);
    expect(entries.find(e => e.key === "golden")).toEqual({ key: "golden", value: url });
    expect(entries.find(e => e.key === "gilded")).toEqual({ key: "gilded", value: url });
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

Run: `cd scripts && npx vitest run __tests__/sync-kv.test.ts -t "buildKvEntries alias"`
Expected: FAIL — alias files are currently skipped since they have no `url` field

- [ ] **Step 3: Add import to top of `scripts/sync-kv.ts`**

After the existing imports, add:

```typescript
import { isAliasData, isCanonicalData } from "./validate-keyword.js";
```

- [ ] **Step 4: Replace `buildKvEntries` in `scripts/sync-kv.ts`**

Replace the entire `buildKvEntries` function (lines 170–187 in the original) with:

```typescript
export async function buildKvEntries(dataDir: string): Promise<KvEntry[]> {
  const files = await findJsonFiles(dataDir);
  const canonicalMap = new Map<string, string>(); // keyword → url
  const pendingAliases: Array<{ keyword: string; alias_of: string }> = [];

  // 1st pass: collect canonicals and separate aliases
  for (const file of files) {
    try {
      const content = await readFile(file, "utf-8");
      const data = JSON.parse(content);
      if (isCanonicalData(data)) {
        canonicalMap.set(data.keyword, data.url);
      } else if (isAliasData(data)) {
        pendingAliases.push({ keyword: data.keyword, alias_of: data.alias_of });
      }
    } catch {
      console.warn(`Skipping malformed JSON: ${file}`);
    }
  }

  const entries: KvEntry[] = [];

  // Add all canonicals
  for (const [keyword, url] of canonicalMap) {
    entries.push({ key: keyword, value: url });
  }

  // 2nd pass: resolve aliases to canonical URLs
  for (const { keyword, alias_of } of pendingAliases) {
    const url = canonicalMap.get(alias_of);
    if (url === undefined) {
      console.warn(`Skipping alias "${keyword}": canonical "${alias_of}" not found or is itself an alias`);
      continue;
    }
    entries.push({ key: keyword, value: url });
  }

  return entries;
}
```

- [ ] **Step 5: Run all sync-kv tests**

Run: `cd scripts && npx vitest run __tests__/sync-kv.test.ts`
Expected: all tests pass (including original `buildKvEntries` tests)

- [ ] **Step 6: Commit**

```bash
git add scripts/sync-kv.ts scripts/__tests__/sync-kv.test.ts
git commit -m "feat(sync-kv): 2-pass alias resolution in buildKvEntries"
```

---

## Task 4: Alias-aware incrementalKvEntries + findAliasesOf helper

**Files:**
- Modify: `scripts/sync-kv.ts`
- Modify: `scripts/__tests__/sync-kv.test.ts`

When a canonical's URL changes, all aliases pointing to it must also be re-upserted in KV. When a canonical is deleted, all its aliases must also be deleted from KV.

- [ ] **Step 1: Write the failing tests — add new describe blocks in `scripts/__tests__/sync-kv.test.ts` after the `incrementalKvEntries` describe block**

```typescript
describe("findAliasesOf", () => {
  it("returns alias keywords pointing to the given canonical", async () => {
    const tmp = createTmpDir();
    mkdirSync(join(tmp, "_en"), { recursive: true });
    writeFileSync(join(tmp, "_en", "gold.json"), JSON.stringify({ keyword: "gold", url: "https://example.com/gold", created: "2026-04-14" }));
    writeFileSync(join(tmp, "_en", "golden.json"), JSON.stringify({ keyword: "golden", alias_of: "gold", created: "2026-04-14" }));
    writeFileSync(join(tmp, "_en", "gilded.json"), JSON.stringify({ keyword: "gilded", alias_of: "gold", created: "2026-04-14" }));
    writeFileSync(join(tmp, "_en", "other.json"), JSON.stringify({ keyword: "other", alias_of: "silver", created: "2026-04-14" }));

    const aliases = await findAliasesOf("gold", tmp);
    expect(aliases.sort()).toEqual(["gilded", "golden"]);
  });

  it("returns empty array when canonical has no aliases", async () => {
    const tmp = createTmpDir();
    mkdirSync(join(tmp, "_en"), { recursive: true });
    writeFileSync(join(tmp, "_en", "gold.json"), JSON.stringify({ keyword: "gold", url: "https://example.com/gold", created: "2026-04-14" }));

    const aliases = await findAliasesOf("gold", tmp);
    expect(aliases).toEqual([]);
  });
});

describe("incrementalKvEntries alias awareness", () => {
  it("alias file added: upserts alias with canonical url", async () => {
    const { dir, commitSha } = createTempGitRepo({
      "data/_en/gold.json": { keyword: "gold", url: "https://example.com/gold", created: "2026-04-14" },
    });
    const filePath = join(dir, "data/_en/golden.json");
    writeFileSync(filePath, JSON.stringify({ keyword: "golden", alias_of: "gold", created: "2026-04-14" }));
    git(["add", "."], dir);
    git(["commit", "-m", "add alias golden"], dir);

    const result = await incrementalKvEntries(dir, commitSha);
    expect(result.upsert).toEqual([{ key: "golden", value: "https://example.com/gold" }]);
    expect(result.delete).toEqual([]);
  });

  it("canonical modified: upserts canonical and all aliases with new url", async () => {
    const { dir, commitSha } = createTempGitRepo({
      "data/_en/gold.json": { keyword: "gold", url: "https://old.com/gold", created: "2026-04-14" },
      "data/_en/golden.json": { keyword: "golden", alias_of: "gold", created: "2026-04-14" },
    });
    writeFileSync(join(dir, "data/_en/gold.json"), JSON.stringify({ keyword: "gold", url: "https://new.com/gold", created: "2026-04-14" }));
    git(["add", "."], dir);
    git(["commit", "-m", "update gold url"], dir);

    const result = await incrementalKvEntries(dir, commitSha);
    expect(result.upsert.find(e => e.key === "gold")).toEqual({ key: "gold", value: "https://new.com/gold" });
    expect(result.upsert.find(e => e.key === "golden")).toEqual({ key: "golden", value: "https://new.com/gold" });
    expect(result.delete).toEqual([]);
  });

  it("alias file deleted: deletes alias key only", async () => {
    const { dir, commitSha } = createTempGitRepo({
      "data/_en/gold.json": { keyword: "gold", url: "https://example.com/gold", created: "2026-04-14" },
      "data/_en/golden.json": { keyword: "golden", alias_of: "gold", created: "2026-04-14" },
    });
    const { unlinkSync } = await import("fs");
    unlinkSync(join(dir, "data/_en/golden.json"));
    git(["add", "."], dir);
    git(["commit", "-m", "delete alias golden"], dir);

    const result = await incrementalKvEntries(dir, commitSha);
    expect(result.upsert).toEqual([]);
    expect(result.delete).toEqual(["golden"]);
  });

  it("canonical deleted: deletes canonical key and all alias keys", async () => {
    const { dir, commitSha } = createTempGitRepo({
      "data/_en/gold.json": { keyword: "gold", url: "https://example.com/gold", created: "2026-04-14" },
      "data/_en/golden.json": { keyword: "golden", alias_of: "gold", created: "2026-04-14" },
    });
    const { unlinkSync } = await import("fs");
    unlinkSync(join(dir, "data/_en/gold.json"));
    git(["add", "."], dir);
    git(["commit", "-m", "delete canonical gold"], dir);

    const result = await incrementalKvEntries(dir, commitSha);
    expect(result.upsert).toEqual([]);
    expect(result.delete.sort()).toEqual(["gold", "golden"]);
  });
});
```

- [ ] **Step 2: Add `findAliasesOf` to the import in the test file**

In `scripts/__tests__/sync-kv.test.ts`, add `findAliasesOf` to the existing import:

```typescript
import {
  buildKvEntries,
  parseGitDiffNameStatus,
  chunk,
  incrementalKvEntries,
  writeDiffJsonl,
  readSyncCommit,
  buildBulkPutArgs,
  buildBulkDeleteArgs,
  findAliasesOf,
} from "../sync-kv.js";
```

- [ ] **Step 3: Run tests to confirm they fail**

Run: `cd scripts && npx vitest run __tests__/sync-kv.test.ts -t "findAliasesOf|alias awareness"`
Expected: FAIL — `findAliasesOf` not exported; incremental sync ignores `alias_of` field

- [ ] **Step 4: Add `findAliasesOf` helper to `scripts/sync-kv.ts` — insert after `findJsonFiles`**

```typescript
export async function findAliasesOf(canonicalKeyword: string, dataDir: string): Promise<string[]> {
  const files = await findJsonFiles(dataDir);
  const aliases: string[] = [];
  for (const file of files) {
    try {
      const content = await readFile(file, "utf-8");
      const data = JSON.parse(content);
      if (isAliasData(data) && data.alias_of === canonicalKeyword) {
        aliases.push(data.keyword);
      }
    } catch {
      // skip malformed
    }
  }
  return aliases;
}
```

- [ ] **Step 5: Replace `incrementalKvEntries` in `scripts/sync-kv.ts`**

Replace the entire `incrementalKvEntries` function with:

```typescript
export async function incrementalKvEntries(
  repoDir: string,
  lastCommit: string
): Promise<IncrementalResult> {
  execFileSync("git", ["config", "core.quotepath", "false"], { cwd: repoDir });

  const diffOutput = execFileSync(
    "git",
    ["diff", "--name-status", `${lastCommit}..HEAD`, "--", "data/"],
    { cwd: repoDir, encoding: "utf-8" }
  );

  const changes = parseGitDiffNameStatus(diffOutput);
  const upsert: KvEntry[] = [];
  const deleteKeys: string[] = [];
  const dataDir = join(repoDir, "data");

  for (const change of changes) {
    if (change.status === "A" || change.status === "M") {
      const fullPath = join(repoDir, change.file);
      if (!existsSync(fullPath)) continue;
      try {
        const content = await readFile(fullPath, "utf-8");
        const data = JSON.parse(content);
        if (isCanonicalData(data)) {
          upsert.push({ key: data.keyword, value: data.url });
          // Back-propagate new URL to all aliases of this canonical
          const aliases = await findAliasesOf(data.keyword, dataDir);
          for (const aliasKeyword of aliases) {
            upsert.push({ key: aliasKeyword, value: data.url });
          }
        } else if (isAliasData(data)) {
          // Resolve canonical URL from data directory
          const allFiles = await findJsonFiles(dataDir);
          for (const f of allFiles) {
            try {
              const c = JSON.parse(await readFile(f, "utf-8"));
              if (isCanonicalData(c) && c.keyword === data.alias_of) {
                upsert.push({ key: data.keyword, value: c.url });
                break;
              }
            } catch { /* skip */ }
          }
        }
      } catch {
        console.warn(`Skipping malformed JSON: ${change.file}`);
      }
    } else if (change.status === "D") {
      try {
        const oldContent = execFileSync(
          "git", ["show", `${lastCommit}:${change.file}`],
          { cwd: repoDir, encoding: "utf-8" }
        );
        const data = JSON.parse(oldContent);
        if (isCanonicalData(data)) {
          deleteKeys.push(data.keyword);
          // Also delete all aliases still pointing to this canonical
          const aliases = await findAliasesOf(data.keyword, dataDir);
          deleteKeys.push(...aliases);
        } else if (isAliasData(data)) {
          deleteKeys.push(data.keyword);
        }
      } catch {
        console.warn(`Cannot read deleted file from git: ${change.file}`);
      }
    } else if (change.status === "R") {
      if (change.oldFile) {
        try {
          const oldContent = execFileSync(
            "git", ["show", `${lastCommit}:${change.oldFile}`],
            { cwd: repoDir, encoding: "utf-8" }
          );
          const data = JSON.parse(oldContent);
          if (typeof data.keyword === "string") {
            deleteKeys.push(data.keyword);
          }
        } catch {
          console.warn(`Cannot read renamed-from file from git: ${change.oldFile}`);
        }
      }
      const fullPath = join(repoDir, change.file);
      if (existsSync(fullPath)) {
        try {
          const content = await readFile(fullPath, "utf-8");
          const data = JSON.parse(content);
          if (isCanonicalData(data)) {
            upsert.push({ key: data.keyword, value: data.url });
          } else if (isAliasData(data)) {
            const allFiles = await findJsonFiles(dataDir);
            for (const f of allFiles) {
              try {
                const c = JSON.parse(await readFile(f, "utf-8"));
                if (isCanonicalData(c) && c.keyword === data.alias_of) {
                  upsert.push({ key: data.keyword, value: c.url });
                  break;
                }
              } catch { /* skip */ }
            }
          }
        } catch {
          console.warn(`Skipping malformed JSON: ${change.file}`);
        }
      }
    }
  }

  const upsertKeys = new Set(upsert.map((entry) => entry.key));
  const filteredDeleteKeys = [...new Set(deleteKeys.filter((key) => !upsertKeys.has(key)))];

  return { upsert, delete: filteredDeleteKeys };
}
```

- [ ] **Step 6: Run all tests**

Run: `cd scripts && npx vitest run`
Expected: all tests pass

- [ ] **Step 7: Commit**

```bash
git add scripts/sync-kv.ts scripts/__tests__/sync-kv.test.ts
git commit -m "feat(sync-kv): alias-aware incrementalKvEntries with findAliasesOf helper"
```

---

## Task 5: Full test suite verification

**Files:** none

- [ ] **Step 1: Run the full monorepo test suite**

Run: `npm test` (from monorepo root `/Users/minhoryang/PROJECTS/LAEYOUNG-price.kr/price.kr`)
Expected: all tests pass across all workspaces

- [ ] **Step 2: Dry-run full sync to verify alias data appears in output**

Run: `cd scripts && CF_KV_NAMESPACE_ID=abc123 npx tsx sync-kv.ts --dry-run full`
Expected output includes:
```
Dry run (full): wrote N puts to .../scripts/diff.jsonl
```

Check `scripts/diff.jsonl` contains both entries with the same URL:
```json
{"action":"put","key":"금값","value":"https://finance.naver.com/goldprice/"}
{"action":"put","key":"금","value":"https://finance.naver.com/goldprice/"}
```

- [ ] **Step 3: Commit (if any adjustments were needed)**

```bash
git add -A
git commit -m "chore: verify alias P1 integration end-to-end"
```

---

## Self-Review

**Spec coverage:**
- ✅ Alias JSON schema (`alias_of` field, no `url`) — Task 1
- ✅ Canonical JSON unchanged — Task 1
- ✅ `isAliasData` / `isCanonicalData` type guards (판별 규칙) — Task 2
- ✅ `buildKvEntries` 2-pass alias resolution — Task 3
- ✅ Alias skipped when canonical missing or when target is itself an alias (chain forbidden) — Task 3
- ✅ Multiple aliases for same canonical all resolved — Task 3 test
- ✅ `incrementalKvEntries`: alias added → upsert with canonical URL — Task 4
- ✅ `incrementalKvEntries`: canonical modified → upsert canonical + all aliases — Task 4
- ✅ `incrementalKvEntries`: alias deleted → delete alias key — Task 4
- ✅ `incrementalKvEntries`: canonical deleted → delete canonical + all alias keys — Task 4
- ✅ Workers 변경 없음 — no `workers/` files touched in this plan
- ✅ `findAliasesOf` helper exported — Task 4
- ⬜ P2 Issue automation — separate plan (GitHub Actions is an independent subsystem)

**Type consistency:**
- `isAliasData` → `data is AliasData { keyword: string; alias_of: string }` — consistent in Tasks 3, 4
- `isCanonicalData` → `data is CanonicalData { keyword: string; url: string }` — consistent in Tasks 3, 4
- `findAliasesOf(canonicalKeyword: string, dataDir: string): Promise<string[]>` — exported and tested in Task 4
- `KvEntry`, `IncrementalResult`, `DiffEntry` interfaces unchanged
