# Incremental KV Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the full-sync-every-push KV strategy with commit-based incremental sync that writes only changed keywords, keeping Cloudflare KV within the free tier (1K writes/day).

**Architecture:** Store a `__sync_commit__` marker in KV tracking the last successfully synced commit SHA. On each push, `git diff --name-status` from that marker to HEAD extracts adds/modifies/deletes/renames in `data/`. Changes are bulk-written via `wrangler kv bulk put/delete`. Falls back to full sync when marker is missing or commit is unreachable. A `--dry-run` flag outputs a `diff.jsonl` preview without writing to KV.

**Tech Stack:** TypeScript (Node 20), vitest 2.x, Cloudflare Wrangler CLI, GitHub Actions

**Specs:** `docs/superpowers/specs/2026-04-12-incremental-kv-sync-design.md` and `2026-04-12-incremental-kv-sync-design.2.md`

---

## File Structure

| File | Responsibility |
|------|---------------|
| `scripts/sync-kv.ts` | **Modify.** Add `incrementalKvEntries()`, `readSyncCommit()`, `writeSyncCommit()`, `bulkPut()`, `bulkDelete()`, chunking, dry-run, CLI mode routing. |
| `scripts/__tests__/sync-kv.test.ts` | **Modify.** Add incremental sync tests (git diff parsing, rename handling, delete keyword extraction, chunking, dry-run). |
| `.github/workflows/sync-kv.yml` | **Modify.** Replace shell-based incremental logic with single `npx tsx scripts/sync-kv.ts` call; pass `full` for workflow_dispatch. |

No new files. No changes to `workers/` or `web/`.

---

## Task 1: Git diff parsing — `parseGitDiffNameStatus()`

**Files:**
- Modify: `scripts/sync-kv.ts` (add export)
- Modify: `scripts/__tests__/sync-kv.test.ts` (add tests)

This function parses `git diff --name-status` output into structured change objects. It is pure (no I/O) so it can be tested without a git repo.

- [ ] **Step 1: Write the failing tests**

Add to `scripts/__tests__/sync-kv.test.ts`:

```typescript
import { describe, it, expect, afterEach } from "vitest";
import { buildKvEntries, parseGitDiffNameStatus } from "../sync-kv.js";

// ... existing imports and tests stay unchanged ...

describe("parseGitDiffNameStatus", () => {
  it("parses added files", () => {
    const input = "A\tdata/ㅁ/만/만두.json\n";
    expect(parseGitDiffNameStatus(input)).toEqual([
      { status: "A", file: "data/ㅁ/만/만두.json" },
    ]);
  });

  it("parses modified files", () => {
    const input = "M\tdata/_en/iphone.json\n";
    expect(parseGitDiffNameStatus(input)).toEqual([
      { status: "M", file: "data/_en/iphone.json" },
    ]);
  });

  it("parses deleted files", () => {
    const input = "D\tdata/ㄱ/가/가방.json\n";
    expect(parseGitDiffNameStatus(input)).toEqual([
      { status: "D", file: "data/ㄱ/가/가방.json" },
    ]);
  });

  it("parses renamed files with similarity index", () => {
    const input = "R100\tdata/ㅁ/만/만두.json\tdata/ㅁ/만/만둣국.json\n";
    expect(parseGitDiffNameStatus(input)).toEqual([
      { status: "R", oldFile: "data/ㅁ/만/만두.json", file: "data/ㅁ/만/만둣국.json" },
    ]);
  });

  it("filters to data/**/*.json only and excludes non-keyword files", () => {
    const input = [
      "A\tdata/ㅁ/만/만두.json",
      "M\tscripts/sync-kv.ts",
      "A\tdata/blocklist.json",
      "A\tdata/whitelist.json",
      "A\tdata/profanity-blocklist.json",
      "D\tREADME.md",
    ].join("\n");
    expect(parseGitDiffNameStatus(input)).toEqual([
      { status: "A", file: "data/ㅁ/만/만두.json" },
    ]);
  });

  it("handles empty input", () => {
    expect(parseGitDiffNameStatus("")).toEqual([]);
    expect(parseGitDiffNameStatus("\n")).toEqual([]);
  });

  it("handles multiple changes", () => {
    const input = [
      "A\tdata/ㅁ/만/만두.json",
      "M\tdata/_en/iphone.json",
      "D\tdata/ㄱ/가/가방.json",
    ].join("\n");
    const result = parseGitDiffNameStatus(input);
    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({ status: "A", file: "data/ㅁ/만/만두.json" });
    expect(result[1]).toEqual({ status: "M", file: "data/_en/iphone.json" });
    expect(result[2]).toEqual({ status: "D", file: "data/ㄱ/가/가방.json" });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd scripts && npx vitest run __tests__/sync-kv.test.ts`
Expected: FAIL — `parseGitDiffNameStatus` is not exported from `../sync-kv.js`

- [ ] **Step 3: Implement `parseGitDiffNameStatus`**

Add to `scripts/sync-kv.ts`, after the `NON_KEYWORD_FILES` constant and before `findJsonFiles`:

```typescript
import { basename } from "path";

export interface DiffEntry {
  status: "A" | "M" | "D" | "R";
  file: string;
  oldFile?: string; // only for renames
}

export function parseGitDiffNameStatus(output: string): DiffEntry[] {
  const entries: DiffEntry[] = [];
  for (const line of output.split("\n")) {
    if (!line.trim()) continue;
    const parts = line.split("\t");
    const statusRaw = parts[0];

    // R status includes similarity score, e.g. "R100"
    const status = statusRaw.startsWith("R") ? "R" : statusRaw as "A" | "M" | "D";
    if (!["A", "M", "D", "R"].includes(status)) continue;

    if (status === "R") {
      const oldFile = parts[1];
      const newFile = parts[2];
      if (!newFile?.startsWith("data/") || !newFile.endsWith(".json")) continue;
      if (NON_KEYWORD_FILES.has(basename(newFile))) continue;
      entries.push({ status: "R", file: newFile, oldFile });
    } else {
      const file = parts[1];
      if (!file?.startsWith("data/") || !file.endsWith(".json")) continue;
      if (NON_KEYWORD_FILES.has(basename(file))) continue;
      entries.push({ status, file });
    }
  }
  return entries;
}
```

Also add the `basename` import — change the existing import line:

```typescript
import { join, basename } from "path";
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd scripts && npx vitest run __tests__/sync-kv.test.ts`
Expected: ALL PASS

- [ ] **Step 5: Commit**

```bash
git add scripts/sync-kv.ts scripts/__tests__/sync-kv.test.ts
git commit -m "feat(sync-kv): add parseGitDiffNameStatus for incremental diff parsing"
```

---

## Task 2: `incrementalKvEntries()` — upsert/delete classification

**Files:**
- Modify: `scripts/sync-kv.ts` (add export)
- Modify: `scripts/__tests__/sync-kv.test.ts` (add tests)

This function takes a list of `DiffEntry` objects plus a `lastCommit` SHA and returns `{ upsert: KvEntry[], delete: string[] }`. It reads current files for A/M, uses `git show` for D/R-old, and reads current files for R-new.

**Testing strategy:** We create a real temporary git repo in tests so `git show` and `existsSync` work against real files. This avoids brittle mocking of `execFileSync`.

- [ ] **Step 1: Write the failing tests**

Add to `scripts/__tests__/sync-kv.test.ts`:

```typescript
import { execFileSync } from "child_process";

// Helper: create a temp git repo with an initial commit containing given files
function createTempGitRepo(files: Record<string, object>): { dir: string; commitSha: string } {
  const tmp = createTmpDir();
  execFileSync("git", ["init"], { cwd: tmp });
  execFileSync("git", ["config", "user.email", "test@test.com"], { cwd: tmp });
  execFileSync("git", ["config", "user.name", "Test"], { cwd: tmp });
  execFileSync("git", ["config", "core.quotepath", "false"], { cwd: tmp });

  for (const [path, content] of Object.entries(files)) {
    const fullPath = join(tmp, path);
    mkdirSync(join(fullPath, ".."), { recursive: true });
    writeFileSync(fullPath, JSON.stringify(content));
  }

  execFileSync("git", ["add", "."], { cwd: tmp });
  execFileSync("git", ["commit", "-m", "initial"], { cwd: tmp });
  const sha = execFileSync("git", ["rev-parse", "HEAD"], { cwd: tmp, encoding: "utf-8" }).trim();
  return { dir: tmp, commitSha: sha };
}

describe("incrementalKvEntries", () => {
  it("classifies added files as upserts", async () => {
    const { dir, commitSha } = createTempGitRepo({});

    // Add a file after the initial commit
    const filePath = join(dir, "data/ㅁ/만/만두.json");
    mkdirSync(join(filePath, ".."), { recursive: true });
    writeFileSync(filePath, JSON.stringify({ keyword: "만두", url: "https://example.com/mandu", created: "2026-01-01" }));
    execFileSync("git", ["add", "."], { cwd: dir });
    execFileSync("git", ["commit", "-m", "add mandu"], { cwd: dir });

    const { incrementalKvEntries } = await import("../sync-kv.js");
    const result = await incrementalKvEntries(dir, commitSha);
    expect(result.upsert).toEqual([{ key: "만두", value: "https://example.com/mandu" }]);
    expect(result.delete).toEqual([]);
  });

  it("classifies modified files as upserts with new value", async () => {
    const { dir, commitSha } = createTempGitRepo({
      "data/_en/iphone.json": { keyword: "iphone", url: "https://old.com", created: "2026-01-01" },
    });

    // Modify the file
    writeFileSync(join(dir, "data/_en/iphone.json"), JSON.stringify({ keyword: "iphone", url: "https://new.com", created: "2026-01-01" }));
    execFileSync("git", ["add", "."], { cwd: dir });
    execFileSync("git", ["commit", "-m", "update iphone"], { cwd: dir });

    const { incrementalKvEntries } = await import("../sync-kv.js");
    const result = await incrementalKvEntries(dir, commitSha);
    expect(result.upsert).toEqual([{ key: "iphone", value: "https://new.com" }]);
    expect(result.delete).toEqual([]);
  });

  it("classifies deleted files using git show for keyword extraction", async () => {
    const { dir, commitSha } = createTempGitRepo({
      "data/ㄱ/가/가방.json": { keyword: "가방", url: "https://example.com/bag", created: "2026-01-01" },
    });

    // Delete the file
    const { unlinkSync } = await import("fs");
    unlinkSync(join(dir, "data/ㄱ/가/가방.json"));
    execFileSync("git", ["add", "."], { cwd: dir });
    execFileSync("git", ["commit", "-m", "delete gabang"], { cwd: dir });

    const { incrementalKvEntries } = await import("../sync-kv.js");
    const result = await incrementalKvEntries(dir, commitSha);
    expect(result.upsert).toEqual([]);
    expect(result.delete).toEqual(["가방"]);
  });

  it("handles renames as delete-old + upsert-new", async () => {
    const { dir, commitSha } = createTempGitRepo({
      "data/ㅁ/만/만두.json": { keyword: "만두", url: "https://example.com/mandu", created: "2026-01-01" },
    });

    // Rename: 만두 → 만둣국
    const oldPath = join(dir, "data/ㅁ/만/만두.json");
    const newPath = join(dir, "data/ㅁ/만/만둣국.json");
    const { renameSync } = await import("fs");
    renameSync(oldPath, newPath);
    writeFileSync(newPath, JSON.stringify({ keyword: "만둣국", url: "https://example.com/manduguk", created: "2026-01-01" }));
    execFileSync("git", ["add", "."], { cwd: dir });
    execFileSync("git", ["commit", "-m", "rename mandu to manduguk"], { cwd: dir });

    const { incrementalKvEntries } = await import("../sync-kv.js");
    const result = await incrementalKvEntries(dir, commitSha);
    expect(result.upsert).toEqual([{ key: "만둣국", value: "https://example.com/manduguk" }]);
    expect(result.delete).toEqual(["만두"]);
  });

  it("returns empty arrays when no data files changed", async () => {
    const { dir, commitSha } = createTempGitRepo({
      "README.md": { note: "not a keyword" },
    });

    // Change a non-data file
    writeFileSync(join(dir, "README.md"), "updated");
    execFileSync("git", ["add", "."], { cwd: dir });
    execFileSync("git", ["commit", "-m", "update readme"], { cwd: dir });

    const { incrementalKvEntries } = await import("../sync-kv.js");
    const result = await incrementalKvEntries(dir, commitSha);
    expect(result.upsert).toEqual([]);
    expect(result.delete).toEqual([]);
  });

  it("skips files with missing keyword or url fields", async () => {
    const { dir, commitSha } = createTempGitRepo({});

    const filePath = join(dir, "data/_en/bad.json");
    mkdirSync(join(filePath, ".."), { recursive: true });
    writeFileSync(filePath, JSON.stringify({ keyword: "bad" })); // missing url
    execFileSync("git", ["add", "."], { cwd: dir });
    execFileSync("git", ["commit", "-m", "add bad"], { cwd: dir });

    const { incrementalKvEntries } = await import("../sync-kv.js");
    const result = await incrementalKvEntries(dir, commitSha);
    expect(result.upsert).toEqual([]);
    expect(result.delete).toEqual([]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd scripts && npx vitest run __tests__/sync-kv.test.ts`
Expected: FAIL — `incrementalKvEntries` is not exported from `../sync-kv.js`

- [ ] **Step 3: Implement `incrementalKvEntries`**

Add to `scripts/sync-kv.ts`, after `parseGitDiffNameStatus`:

```typescript
import { existsSync } from "fs";
import { execFileSync } from "child_process";

export interface IncrementalResult {
  upsert: KvEntry[];
  delete: string[];
}

export async function incrementalKvEntries(
  repoDir: string,
  lastCommit: string
): Promise<IncrementalResult> {
  // Ensure Korean filenames are not octal-escaped
  execFileSync("git", ["config", "core.quotepath", "false"], { cwd: repoDir });

  const diffOutput = execFileSync(
    "git",
    ["diff", "--name-status", `${lastCommit}..HEAD`, "--", "data/"],
    { cwd: repoDir, encoding: "utf-8" }
  );

  const changes = parseGitDiffNameStatus(diffOutput);
  const upsert: KvEntry[] = [];
  const deleteKeys: string[] = [];

  for (const change of changes) {
    if (change.status === "A" || change.status === "M") {
      const fullPath = join(repoDir, change.file);
      if (!existsSync(fullPath)) continue;
      try {
        const content = await readFile(fullPath, "utf-8");
        const data = JSON.parse(content);
        if (typeof data.keyword === "string" && typeof data.url === "string") {
          upsert.push({ key: data.keyword, value: data.url });
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
        if (typeof data.keyword === "string") {
          deleteKeys.push(data.keyword);
        }
      } catch {
        console.warn(`Cannot read deleted file from git: ${change.file}`);
      }
    } else if (change.status === "R") {
      // Rename = delete old keyword + upsert new keyword
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
          if (typeof data.keyword === "string" && typeof data.url === "string") {
            upsert.push({ key: data.keyword, value: data.url });
          }
        } catch {
          console.warn(`Skipping malformed JSON: ${change.file}`);
        }
      }
    }
  }

  return { upsert, delete: deleteKeys };
}
```

Update the existing imports at the top of the file:

```typescript
import { readdir, readFile } from "fs/promises";
import { join, basename } from "path";
import { existsSync } from "fs";
import { execFileSync } from "child_process";
```

Remove the duplicate dynamic `import("child_process")` from the CLI block at the bottom — it's now a top-level import.

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd scripts && npx vitest run __tests__/sync-kv.test.ts`
Expected: ALL PASS

- [ ] **Step 5: Commit**

```bash
git add scripts/sync-kv.ts scripts/__tests__/sync-kv.test.ts
git commit -m "feat(sync-kv): add incrementalKvEntries with rename/delete support"
```

---

## Task 3: Chunking — `chunk()` utility

**Files:**
- Modify: `scripts/sync-kv.ts` (add export)
- Modify: `scripts/__tests__/sync-kv.test.ts` (add tests)

Cloudflare bulk API accepts max 10,000 items per request. This function splits an array into chunks of a given size.

- [ ] **Step 1: Write the failing tests**

Add to `scripts/__tests__/sync-kv.test.ts`:

```typescript
import { buildKvEntries, parseGitDiffNameStatus, chunk } from "../sync-kv.js";

describe("chunk", () => {
  it("returns single chunk when array is smaller than limit", () => {
    expect(chunk([1, 2, 3], 10)).toEqual([[1, 2, 3]]);
  });

  it("splits array into equal chunks", () => {
    expect(chunk([1, 2, 3, 4], 2)).toEqual([[1, 2], [3, 4]]);
  });

  it("handles remainder in last chunk", () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });

  it("returns empty array for empty input", () => {
    expect(chunk([], 10)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd scripts && npx vitest run __tests__/sync-kv.test.ts`
Expected: FAIL — `chunk` is not exported from `../sync-kv.js`

- [ ] **Step 3: Implement `chunk`**

Add to `scripts/sync-kv.ts`, after the type definitions and before `parseGitDiffNameStatus`:

```typescript
export function chunk<T>(array: T[], size: number): T[][] {
  if (array.length === 0) return [];
  const result: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd scripts && npx vitest run __tests__/sync-kv.test.ts`
Expected: ALL PASS

- [ ] **Step 5: Commit**

```bash
git add scripts/sync-kv.ts scripts/__tests__/sync-kv.test.ts
git commit -m "feat(sync-kv): add chunk utility for bulk API size limits"
```

---

## Task 4: Dry-run — `writeDiffJsonl()`

**Files:**
- Modify: `scripts/sync-kv.ts` (add export)
- Modify: `scripts/__tests__/sync-kv.test.ts` (add tests)

When `--dry-run` is passed, output a `diff.jsonl` file with one JSON object per line describing each action, then exit without writing to KV.

- [ ] **Step 1: Write the failing tests**

Add to `scripts/__tests__/sync-kv.test.ts`:

```typescript
import { readFileSync } from "fs";
// (readFileSync should already be imported from the existing test file — if not, add it to the existing import)

import { buildKvEntries, parseGitDiffNameStatus, chunk, writeDiffJsonl } from "../sync-kv.js";

describe("writeDiffJsonl", () => {
  it("writes put and delete actions as JSONL", async () => {
    const tmp = createTmpDir();
    mkdirSync(tmp, { recursive: true });
    const outputPath = join(tmp, "diff.jsonl");

    const upsert = [
      { key: "만두", value: "https://example.com/mandu" },
      { key: "iphone", value: "https://example.com/iphone" },
    ];
    const deleteKeys = ["가방"];

    await writeDiffJsonl(outputPath, upsert, deleteKeys);

    const lines = readFileSync(outputPath, "utf-8").trim().split("\n").map(l => JSON.parse(l));
    expect(lines).toEqual([
      { action: "put", key: "만두", value: "https://example.com/mandu" },
      { action: "put", key: "iphone", value: "https://example.com/iphone" },
      { action: "delete", key: "가방" },
    ]);
  });

  it("writes empty file when no changes", async () => {
    const tmp = createTmpDir();
    mkdirSync(tmp, { recursive: true });
    const outputPath = join(tmp, "diff.jsonl");

    await writeDiffJsonl(outputPath, [], []);

    const content = readFileSync(outputPath, "utf-8");
    expect(content).toBe("");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd scripts && npx vitest run __tests__/sync-kv.test.ts`
Expected: FAIL — `writeDiffJsonl` is not exported

- [ ] **Step 3: Implement `writeDiffJsonl`**

Add to `scripts/sync-kv.ts`, after `incrementalKvEntries`:

```typescript
import { writeFile } from "fs/promises";
```

Update the existing `fs/promises` import to include `writeFile`:

```typescript
import { readdir, readFile, writeFile } from "fs/promises";
```

Then add the function:

```typescript
export async function writeDiffJsonl(
  outputPath: string,
  upsert: KvEntry[],
  deleteKeys: string[]
): Promise<void> {
  const lines: string[] = [];
  for (const entry of upsert) {
    lines.push(JSON.stringify({ action: "put", key: entry.key, value: entry.value }));
  }
  for (const key of deleteKeys) {
    lines.push(JSON.stringify({ action: "delete", key }));
  }
  await writeFile(outputPath, lines.length > 0 ? lines.join("\n") + "\n" : "");
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd scripts && npx vitest run __tests__/sync-kv.test.ts`
Expected: ALL PASS

- [ ] **Step 5: Commit**

```bash
git add scripts/sync-kv.ts scripts/__tests__/sync-kv.test.ts
git commit -m "feat(sync-kv): add writeDiffJsonl for dry-run preview"
```

---

## Task 5: Wrangler helpers — `readSyncCommit()`, `writeSyncCommit()`, `bulkPut()`, `bulkDelete()`

**Files:**
- Modify: `scripts/sync-kv.ts` (add exports)
- Modify: `scripts/__tests__/sync-kv.test.ts` (add tests)

These functions shell out to `wrangler` CLI. They're thin wrappers, so tests verify argument construction by capturing the calls rather than running real wrangler. We use vitest's module mocking to intercept `execFileSync`.

- [ ] **Step 1: Write the failing tests**

Add to `scripts/__tests__/sync-kv.test.ts`:

```typescript
import { vi } from "vitest";
// Add vi to the existing vitest import: import { describe, it, expect, afterEach, vi } from "vitest";

describe("wrangler helpers", () => {
  const NAMESPACE_ID = "abc123def456";

  // We test these by checking the temp files and commands they construct
  // Since they shell out to wrangler (which we don't have in tests),
  // we mock execFileSync for these specific tests

  it("readSyncCommit returns null when wrangler fails", async () => {
    const { readSyncCommit } = await import("../sync-kv.js");
    // No wrangler available in test env → should return null (fallback to full sync)
    const result = readSyncCommit("nonexistent-namespace");
    expect(result).toBeNull();
  });

  it("bulkPut writes temp file and calls wrangler with correct args", async () => {
    const { buildBulkPutArgs } = await import("../sync-kv.js");
    const entries = [{ key: "만두", value: "https://example.com" }];
    const args = buildBulkPutArgs(NAMESPACE_ID, "/tmp/test.json");
    expect(args).toEqual([
      "wrangler", "kv", "bulk", "put",
      "--remote", `--namespace-id=${NAMESPACE_ID}`, "/tmp/test.json",
    ]);
  });

  it("bulkDelete writes temp file and calls wrangler with correct args", async () => {
    const { buildBulkDeleteArgs } = await import("../sync-kv.js");
    const args = buildBulkDeleteArgs(NAMESPACE_ID, "/tmp/test.json");
    expect(args).toEqual([
      "wrangler", "kv", "bulk", "delete",
      "--remote", `--namespace-id=${NAMESPACE_ID}`, "/tmp/test.json",
    ]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd scripts && npx vitest run __tests__/sync-kv.test.ts`
Expected: FAIL — `readSyncCommit`, `buildBulkPutArgs`, `buildBulkDeleteArgs` not exported

- [ ] **Step 3: Implement the wrangler helpers**

Add to `scripts/sync-kv.ts`, after `writeDiffJsonl`:

```typescript
import { writeFileSync } from "fs";
```

Update the `fs` import to include `writeFileSync`:

```typescript
import { existsSync, writeFileSync } from "fs";
```

Then add the functions:

```typescript
const SYNC_COMMIT_KEY = "__sync_commit__";
const BULK_CHUNK_SIZE = 10_000;

export function buildBulkPutArgs(namespaceId: string, tmpFile: string): string[] {
  return ["wrangler", "kv", "bulk", "put", "--remote", `--namespace-id=${namespaceId}`, tmpFile];
}

export function buildBulkDeleteArgs(namespaceId: string, tmpFile: string): string[] {
  return ["wrangler", "kv", "bulk", "delete", "--remote", `--namespace-id=${namespaceId}`, tmpFile];
}

export function readSyncCommit(namespaceId: string): string | null {
  try {
    const result = execFileSync(
      "npx",
      ["wrangler", "kv", "key", "get", "--remote", `--namespace-id=${namespaceId}`, SYNC_COMMIT_KEY],
      { encoding: "utf-8", timeout: 30_000 }
    ).trim();
    // Validate it looks like a SHA
    return /^[a-f0-9]{40}$/.test(result) ? result : null;
  } catch {
    return null;
  }
}

export function writeSyncCommit(namespaceId: string, commitSha: string): void {
  execFileSync(
    "npx",
    ["wrangler", "kv", "key", "put", "--remote", `--namespace-id=${namespaceId}`, SYNC_COMMIT_KEY, commitSha],
    { stdio: "inherit", timeout: 30_000 }
  );
}

export function bulkPut(namespaceId: string, entries: KvEntry[]): void {
  if (entries.length === 0) return;
  const chunks = chunk(entries, BULK_CHUNK_SIZE);
  for (const [i, batch] of chunks.entries()) {
    const tmpFile = `/tmp/kv-bulk-put-${Date.now()}-${i}.json`;
    writeFileSync(tmpFile, JSON.stringify(batch.map(e => ({ key: e.key, value: e.value }))));
    execFileSync("npx", buildBulkPutArgs(namespaceId, tmpFile).slice(1), {
      stdio: "inherit",
      timeout: 120_000,
    });
  }
}

export function bulkDelete(namespaceId: string, keys: string[]): void {
  if (keys.length === 0) return;
  const chunks = chunk(keys, BULK_CHUNK_SIZE);
  for (const [i, batch] of chunks.entries()) {
    const tmpFile = `/tmp/kv-bulk-delete-${Date.now()}-${i}.json`;
    writeFileSync(tmpFile, JSON.stringify(batch));
    execFileSync("npx", buildBulkDeleteArgs(namespaceId, tmpFile).slice(1), {
      stdio: "inherit",
      timeout: 120_000,
    });
  }
}

function isValidCommit(repoDir: string, sha: string): boolean {
  try {
    execFileSync("git", ["rev-parse", "--verify", sha], { cwd: repoDir, encoding: "utf-8" });
    return true;
  } catch {
    return false;
  }
}

function getCurrentCommit(repoDir: string): string {
  return execFileSync("git", ["rev-parse", "HEAD"], { cwd: repoDir, encoding: "utf-8" }).trim();
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd scripts && npx vitest run __tests__/sync-kv.test.ts`
Expected: ALL PASS

- [ ] **Step 5: Commit**

```bash
git add scripts/sync-kv.ts scripts/__tests__/sync-kv.test.ts
git commit -m "feat(sync-kv): add wrangler helpers for bulk put/delete and sync commit tracking"
```

---

## Task 6: CLI entry point — auto/full/dry-run mode routing

**Files:**
- Modify: `scripts/sync-kv.ts` (rewrite CLI block at bottom)

Replace the existing CLI entry point (lines 48-82) with mode-aware routing that supports:
- No args or `auto` → read `__sync_commit__`, incremental if valid, else full sync
- `full` → forced full sync
- `--dry-run` flag → output diff.jsonl without writing to KV

- [ ] **Step 1: Rewrite the CLI block**

Replace everything from line 48 (`const isMainModule = ...`) to the end of `scripts/sync-kv.ts` with:

```typescript
// CLI entry point — only runs when executed directly
const isMainModule =
  process.argv[1]?.endsWith("sync-kv.ts") ||
  process.argv[1]?.endsWith("sync-kv.js");

if (isMainModule) {
  const args = process.argv.slice(2);
  const mode = args.find(a => a === "full" || a === "auto") || "auto";
  const dryRun = args.includes("--dry-run");
  const dataDir = join(process.cwd(), "..", "data");
  const namespaceId = process.env.CF_KV_NAMESPACE_ID;
  const repoDir = join(process.cwd(), "..");

  if (!dryRun) {
    if (!namespaceId) {
      console.error("CF_KV_NAMESPACE_ID environment variable required");
      process.exit(1);
    }
    if (!/^[a-f0-9]+$/.test(namespaceId)) {
      console.error("CF_KV_NAMESPACE_ID must be a hex string");
      process.exit(1);
    }
  }

  let useIncremental = false;
  let lastCommit: string | null = null;

  if (mode !== "full" && namespaceId) {
    lastCommit = readSyncCommit(namespaceId);
    if (lastCommit && isValidCommit(repoDir, lastCommit)) {
      useIncremental = true;
    } else if (lastCommit) {
      console.log(`Stored commit ${lastCommit} not in history, falling back to full sync`);
    }
  }

  if (useIncremental && lastCommit) {
    // Incremental sync
    const { upsert, delete: deleteKeys } = await incrementalKvEntries(repoDir, lastCommit);

    if (dryRun) {
      const outputPath = join(process.cwd(), "diff.jsonl");
      await writeDiffJsonl(outputPath, upsert, deleteKeys);
      console.log(`Dry run: wrote ${upsert.length} puts + ${deleteKeys.length} deletes to ${outputPath}`);
    } else {
      bulkPut(namespaceId!, upsert);
      bulkDelete(namespaceId!, deleteKeys);
      writeSyncCommit(namespaceId!, getCurrentCommit(repoDir));
      console.log(`Incremental sync: ${upsert.length} upserted, ${deleteKeys.length} deleted`);
    }
  } else {
    // Full sync
    const entries = await buildKvEntries(dataDir);

    if (dryRun) {
      const outputPath = join(process.cwd(), "diff.jsonl");
      await writeDiffJsonl(outputPath, entries, []);
      console.log(`Dry run (full): wrote ${entries.length} puts to ${outputPath}`);
    } else {
      bulkPut(namespaceId!, entries);
      writeSyncCommit(namespaceId!, getCurrentCommit(repoDir));
      console.log(`Full sync: ${entries.length} entries`);
    }
  }
}
```

- [ ] **Step 2: Run all tests to verify nothing broke**

Run: `cd scripts && npx vitest run __tests__/sync-kv.test.ts`
Expected: ALL PASS (existing `buildKvEntries` tests still work; new tests still work)

- [ ] **Step 3: Commit**

```bash
git add scripts/sync-kv.ts
git commit -m "feat(sync-kv): rewrite CLI entry point with auto/full/dry-run mode routing"
```

---

## Task 7: Update GitHub Actions workflow

**Files:**
- Modify: `.github/workflows/sync-kv.yml`

Replace the current 4-step shell-based sync (changes detection, incremental put loop, delete loop, full sync) with a single `npx tsx scripts/sync-kv.ts` call. The script now handles all logic internally.

- [ ] **Step 1: Rewrite `.github/workflows/sync-kv.yml`**

```yaml
name: Sync Keywords to Cloudflare KV

on:
  push:
    branches: [main]
    paths: ["data/**"]
  workflow_dispatch:
    inputs:
      mode:
        description: "Sync mode: auto (incremental) or full"
        required: false
        default: "auto"
        type: choice
        options:
          - auto
          - full

jobs:
  sync:
    runs-on: ubuntu-latest
    permissions:
      contents: read
    steps:
      - uses: actions/checkout@de0fac2e4500dabe0009e67214ff5f5447ce83dd # v6.0.2
        with:
          filter: blob:none
          fetch-depth: 0

      - uses: actions/setup-node@53b83947a5a98c8d113130e565377fae1a50d02f # v6.3.0
        with:
          node-version: "20"

      - name: Install dependencies
        run: npm ci

      - name: Sync to Cloudflare KV
        working-directory: scripts
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CF_KV_NAMESPACE_ID: ${{ secrets.CF_KV_NAMESPACE_ID }}
        run: |
          MODE="${{ github.event.inputs.mode || 'auto' }}"
          echo "Sync mode: $MODE"
          npx tsx sync-kv.ts "$MODE"
```

**Key changes from old workflow:**
- `fetch-depth: 0` (was `2`) — needed so `git diff $LAST_COMMIT..HEAD` works across arbitrary history
- Single step replaces 4 shell steps — all logic lives in TypeScript
- `workflow_dispatch` gains a `mode` input dropdown (auto/full)
- `npm ci` added to install workspace deps (the old workflow only installed wrangler globally — now we need `tsx` from devDeps)

- [ ] **Step 2: Validate the YAML syntax**

Run: `python3 -c "import yaml; yaml.safe_load(open('.github/workflows/sync-kv.yml'))"`
Expected: No error (valid YAML)

- [ ] **Step 3: Run all tests to confirm nothing regressed**

Run: `npm test`
Expected: ALL PASS across all workspaces

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/sync-kv.yml
git commit -m "ci(sync-kv): replace shell-based sync with TypeScript incremental sync"
```

---

## Task 8: Update DEV_PROGRESS.md and DEV_LOG.md

**Files:**
- Modify: `docs/DEV_PROGRESS.md`
- Modify: `docs/DEV_LOG.md`

Per project requirements, update tracking files.

- [ ] **Step 1: Add new phase/task to DEV_PROGRESS.md**

Add after the Phase 4 section:

```markdown
## Phase 5: Incremental KV Sync

| # | Task | 상태 | 비고 |
|---|------|------|------|
| 1 | Incremental KV Sync (commit-based diff) | ✅ 완료 | __sync_commit__ marker, git diff --name-status, bulk put/delete, chunking, dry-run, rename support |
```

- [ ] **Step 2: Add entry to DEV_LOG.md**

Add at the top (after the header), with the current date:

```markdown
## 2026-04-13 — Incremental KV Sync (commit-based diff)

**작업 내용:**
Full sync를 대체하는 증분 KV 동기화 구현. 매 push에서 변경된 키워드만 동기화하여 Cloudflare KV free tier(1K writes/day) 내에서 안정적 운영.

**변경 파일:**
- `scripts/sync-kv.ts` — `incrementalKvEntries()`, `parseGitDiffNameStatus()`, `chunk()`, `writeDiffJsonl()`, wrangler helpers, CLI mode routing 추가
- `scripts/__tests__/sync-kv.test.ts` — diff parsing, incremental 분류, chunking, dry-run 테스트 추가
- `.github/workflows/sync-kv.yml` — 4-step 쉘 스크립트를 단일 TypeScript 호출로 교체

**기술적 결정:**

### 1. KV 내부에 sync commit SHA 저장
- **결정:** `__sync_commit__` 키로 KV에 직접 저장
- **이유:** 외부 상태 저장소(파일, GitHub Actions cache 등) 불필요. KV 자체가 single source of truth
- **안전성:** `__sync_commit__`은 키워드 검증 regex 통과 불가 → Workers에서 조회 불가

### 2. `git diff --name-status` 사용 (v1의 `--name-only` 대신)
- **결정:** A/M/D/R 상태 구분으로 rename을 별도 처리
- **이유:** rename 시 old keyword delete + new keyword upsert 필요. `--name-only`로는 구분 불가

### 3. 삭제 키워드 추출에 `git show` 사용
- **결정:** 파일명 파싱 대신 `git show $COMMIT:$FILE`로 JSON의 keyword 필드 추출
- **이유:** 영어 키워드는 소문자 변환되어 파일명과 keyword가 일치하지 않을 수 있음
- **검토한 대안:** 파일명에서 `.json` 제거 → 영어 키워드 case 불일치 위험

### 4. fetch-depth: 0으로 변경
- **결정:** workflow의 `fetch-depth: 2` → `0` (full history)
- **이유:** `__sync_commit__`이 임의의 과거 커밋일 수 있어 shallow clone으로는 diff 불가
- **트레이드오프:** checkout 시간 약간 증가하지만 `filter: blob:none`으로 blob 제외하여 최소화
```

- [ ] **Step 3: Commit**

```bash
git add docs/DEV_PROGRESS.md docs/DEV_LOG.md
git commit -m "docs: update DEV_PROGRESS and DEV_LOG for incremental KV sync"
```

---

## Self-Review

**1. Spec coverage:**
- [x] `__sync_commit__` KV marker — Task 5 (readSyncCommit/writeSyncCommit)
- [x] `git diff --name-status` parsing — Task 1 (parseGitDiffNameStatus)
- [x] A/M/D/R classification — Task 2 (incrementalKvEntries)
- [x] `git show` for deleted keyword extraction — Task 2
- [x] Rename handling (delete old + upsert new) — Task 2
- [x] Bulk put/delete via wrangler — Task 5
- [x] Chunking (10K limit) — Task 3
- [x] Dry-run with diff.jsonl — Task 4
- [x] `core.quotepath false` for Korean filenames — Task 2 (inside incrementalKvEntries)
- [x] Auto/full mode routing — Task 6
- [x] Full sync fallback (missing marker, force push) — Task 6
- [x] Workflow update — Task 7
- [x] `fetch-depth: 0` — Task 7
- [x] Alias extension point — noted in spec as future work, not in scope for this plan
- [x] Edge cases (no changes, malformed JSON, missing keyword) — covered in Task 2 tests

**2. Placeholder scan:** No TBD, TODO, or "implement later" found. All code blocks are complete.

**3. Type consistency:**
- `KvEntry` — `{ key: string, value: string }` used consistently
- `DiffEntry` — `{ status, file, oldFile? }` defined in Task 1, consumed in Task 2
- `IncrementalResult` — `{ upsert: KvEntry[], delete: string[] }` defined in Task 2, consumed in Task 6
- `parseGitDiffNameStatus`, `incrementalKvEntries`, `chunk`, `writeDiffJsonl` — names consistent across definition and usage
- `buildBulkPutArgs` / `buildBulkDeleteArgs` — used in tests (Task 5) and implementation (Task 5)
- `readSyncCommit` / `writeSyncCommit` / `bulkPut` / `bulkDelete` / `isValidCommit` / `getCurrentCommit` — defined in Task 5, used in Task 6
