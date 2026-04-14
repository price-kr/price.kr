import { describe, it, expect, afterEach } from "vitest";
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
import { writeFileSync, mkdirSync, rmSync, readFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { execFileSync } from "child_process";

const tmpDirs: string[] = [];

function createTmpDir(): string {
  const tmp = join(tmpdir(), `test-kv-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  tmpDirs.push(tmp);
  return tmp;
}

afterEach(() => {
  for (const dir of tmpDirs) {
    rmSync(dir, { recursive: true, force: true });
  }
  tmpDirs.length = 0;
});

const GIT = "/usr/bin/git";

function git(args: string[], cwd: string, encoding?: "utf-8"): string {
  return execFileSync(GIT, args, { cwd, encoding: encoding || "utf-8" }).toString().trim();
}

function createTempGitRepo(files: Record<string, object>): { dir: string; commitSha: string } {
  const tmp = createTmpDir();
  mkdirSync(tmp, { recursive: true });
  git(["init"], tmp);
  git(["config", "user.email", "test@test.com"], tmp);
  git(["config", "user.name", "Test"], tmp);
  git(["config", "core.quotepath", "false"], tmp);

  for (const [path, content] of Object.entries(files)) {
    const fullPath = join(tmp, path);
    mkdirSync(join(fullPath, ".."), { recursive: true });
    writeFileSync(fullPath, JSON.stringify(content));
  }

  git(["add", "."], tmp);
  git(["commit", "-m", "initial", "--allow-empty"], tmp);
  const sha = git(["rev-parse", "HEAD"], tmp);
  return { dir: tmp, commitSha: sha };
}

describe("buildKvEntries", () => {
  it("reads JSON files and returns KV key-value pairs", async () => {
    const tmp = createTmpDir();
    mkdirSync(join(tmp, "ㅁ", "만"), { recursive: true });
    writeFileSync(
      join(tmp, "ㅁ", "만", "만두.json"),
      JSON.stringify({ keyword: "만두", url: "https://example.com/mandu", created: "2026-01-01" })
    );

    const entries = await buildKvEntries(tmp);
    expect(entries).toEqual([{ key: "만두", value: "https://example.com/mandu" }]);
  });

  it("excludes blocklist, whitelist, and profanity-blocklist files", async () => {
    const tmp = createTmpDir();
    mkdirSync(join(tmp, "ㅁ", "만"), { recursive: true });
    writeFileSync(
      join(tmp, "ㅁ", "만", "만두.json"),
      JSON.stringify({ keyword: "만두", url: "https://example.com/mandu", created: "2026-01-01" })
    );
    writeFileSync(join(tmp, "blocklist.json"), JSON.stringify(["삼성", "애플"]));
    writeFileSync(join(tmp, "whitelist.json"), JSON.stringify(["naver.com"]));
    writeFileSync(join(tmp, "profanity-blocklist.json"), JSON.stringify(["bad"]));

    const entries = await buildKvEntries(tmp);
    expect(entries).toHaveLength(1);
    expect(entries[0]).toEqual({ key: "만두", value: "https://example.com/mandu" });
  });

  it("skips malformed JSON files", async () => {
    const tmp = createTmpDir();
    mkdirSync(join(tmp, "_en"), { recursive: true });
    writeFileSync(join(tmp, "_en", "good.json"), JSON.stringify({ keyword: "good", url: "https://example.com", created: "2026-01-01" }));
    writeFileSync(join(tmp, "_en", "bad.json"), "not valid json");

    const entries = await buildKvEntries(tmp);
    expect(entries).toHaveLength(1);
    expect(entries[0]).toEqual({ key: "good", value: "https://example.com" });
  });

  it("skips files missing keyword or url fields", async () => {
    const tmp = createTmpDir();
    mkdirSync(join(tmp, "_en"), { recursive: true });
    writeFileSync(join(tmp, "_en", "valid.json"), JSON.stringify({ keyword: "valid", url: "https://example.com", created: "2026-01-01" }));
    writeFileSync(join(tmp, "_en", "no-url.json"), JSON.stringify({ keyword: "nourl" }));
    writeFileSync(join(tmp, "_en", "array.json"), JSON.stringify(["not", "a", "keyword"]));

    const entries = await buildKvEntries(tmp);
    expect(entries).toHaveLength(1);
    expect(entries[0]).toEqual({ key: "valid", value: "https://example.com" });
  });
});

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

describe("incrementalKvEntries", () => {
  it("classifies added files as upserts", async () => {
    const { dir, commitSha } = createTempGitRepo({});
    const filePath = join(dir, "data/ㅁ/만/만두.json");
    mkdirSync(join(filePath, ".."), { recursive: true });
    writeFileSync(filePath, JSON.stringify({ keyword: "만두", url: "https://example.com/mandu", created: "2026-01-01" }));
    git(["add", "."], dir);
    git(["commit", "-m", "add mandu"], dir);

    const result = await incrementalKvEntries(dir, commitSha);
    expect(result.upsert).toEqual([{ key: "만두", value: "https://example.com/mandu" }]);
    expect(result.delete).toEqual([]);
  });

  it("classifies modified files as upserts with new value", async () => {
    const { dir, commitSha } = createTempGitRepo({
      "data/_en/iphone.json": { keyword: "iphone", url: "https://old.com", created: "2026-01-01" },
    });
    writeFileSync(join(dir, "data/_en/iphone.json"), JSON.stringify({ keyword: "iphone", url: "https://new.com", created: "2026-01-01" }));
    git(["add", "."], dir);
    git(["commit", "-m", "update iphone"], dir);

    const result = await incrementalKvEntries(dir, commitSha);
    expect(result.upsert).toEqual([{ key: "iphone", value: "https://new.com" }]);
    expect(result.delete).toEqual([]);
  });

  it("classifies deleted files using git show for keyword extraction", async () => {
    const { dir, commitSha } = createTempGitRepo({
      "data/ㄱ/가/가방.json": { keyword: "가방", url: "https://example.com/bag", created: "2026-01-01" },
    });
    const { unlinkSync } = await import("fs");
    unlinkSync(join(dir, "data/ㄱ/가/가방.json"));
    git(["add", "."], dir);
    git(["commit", "-m", "delete gabang"], dir);

    const result = await incrementalKvEntries(dir, commitSha);
    expect(result.upsert).toEqual([]);
    expect(result.delete).toEqual(["가방"]);
  });

  it("handles renames as delete-old + upsert-new", async () => {
    const { dir, commitSha } = createTempGitRepo({
      "data/ㅁ/만/만두.json": { keyword: "만두", url: "https://example.com/mandu", created: "2026-01-01" },
    });
    const { renameSync } = await import("fs");
    renameSync(join(dir, "data/ㅁ/만/만두.json"), join(dir, "data/ㅁ/만/만둣국.json"));
    writeFileSync(join(dir, "data/ㅁ/만/만둣국.json"), JSON.stringify({ keyword: "만둣국", url: "https://example.com/manduguk", created: "2026-01-01" }));
    git(["add", "."], dir);
    git(["commit", "-m", "rename mandu to manduguk"], dir);

    const result = await incrementalKvEntries(dir, commitSha);
    expect(result.upsert).toEqual([{ key: "만둣국", value: "https://example.com/manduguk" }]);
    expect(result.delete).toEqual(["만두"]);
  });

  it("does not delete a key when a rename keeps the same keyword", async () => {
    const { dir, commitSha } = createTempGitRepo({
      "data/_en/same.json": { keyword: "same", url: "https://example.com/same", created: "2026-01-01" },
    });
    const { renameSync } = await import("fs");
    mkdirSync(join(dir, "data/ㅅ/사"), { recursive: true });
    renameSync(join(dir, "data/_en/same.json"), join(dir, "data/ㅅ/사/same.json"));
    writeFileSync(
      join(dir, "data/ㅅ/사/same.json"),
      JSON.stringify({ keyword: "same", url: "https://example.com/same", created: "2026-01-01" })
    );
    git(["add", "."], dir);
    git(["commit", "-m", "move same without keyword change"], dir);

    const result = await incrementalKvEntries(dir, commitSha);
    expect(result.upsert).toEqual([{ key: "same", value: "https://example.com/same" }]);
    expect(result.delete).toEqual([]);
  });

  it("returns empty arrays when no data files changed", async () => {
    const { dir, commitSha } = createTempGitRepo({
      "README.md": { note: "not a keyword" },
    });
    writeFileSync(join(dir, "README.md"), "updated");
    git(["add", "."], dir);
    git(["commit", "-m", "update readme"], dir);

    const result = await incrementalKvEntries(dir, commitSha);
    expect(result.upsert).toEqual([]);
    expect(result.delete).toEqual([]);
  });

  it("skips files with missing keyword or url fields", async () => {
    const { dir, commitSha } = createTempGitRepo({});
    const filePath = join(dir, "data/_en/bad.json");
    mkdirSync(join(filePath, ".."), { recursive: true });
    writeFileSync(filePath, JSON.stringify({ keyword: "bad" }));
    git(["add", "."], dir);
    git(["commit", "-m", "add bad"], dir);

    const result = await incrementalKvEntries(dir, commitSha);
    expect(result.upsert).toEqual([]);
    expect(result.delete).toEqual([]);
  });
});

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

describe("wrangler helpers", () => {
  const NAMESPACE_ID = "abc123def456";

  it("readSyncCommit returns null when wrangler is unavailable", () => {
    const result = readSyncCommit("nonexistent-namespace");
    expect(result).toBeNull();
  });

  it("buildBulkPutArgs returns correct wrangler arguments", () => {
    const args = buildBulkPutArgs(NAMESPACE_ID, "/tmp/test.json");
    expect(args).toEqual([
      "wrangler", "kv", "bulk", "put",
      "--remote", `--namespace-id=${NAMESPACE_ID}`, "/tmp/test.json",
    ]);
  });

  it("buildBulkDeleteArgs returns correct wrangler arguments", () => {
    const args = buildBulkDeleteArgs(NAMESPACE_ID, "/tmp/test.json");
    expect(args).toEqual([
      "wrangler", "kv", "bulk", "delete",
      "--remote", `--namespace-id=${NAMESPACE_ID}`, "/tmp/test.json",
    ]);
  });
});

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
