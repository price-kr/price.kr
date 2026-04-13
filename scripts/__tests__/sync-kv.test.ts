import { describe, it, expect, afterEach } from "vitest";
import { buildKvEntries, parseGitDiffNameStatus } from "../sync-kv.js";
import { writeFileSync, mkdirSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

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

