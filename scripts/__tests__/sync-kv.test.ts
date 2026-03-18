import { describe, it, expect, afterEach } from "vitest";
import { buildKvEntries } from "../sync-kv.js";
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
