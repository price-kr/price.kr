import { describe, it, expect, afterEach } from "vitest";
import { loadAllKeywords } from "@/lib/keywords";
import { writeFileSync, mkdirSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

const tmpDirs: string[] = [];

function createTmpDir(): string {
  const tmp = join(tmpdir(), `test-data-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  tmpDirs.push(tmp);
  return tmp;
}

afterEach(() => {
  for (const dir of tmpDirs) {
    rmSync(dir, { recursive: true, force: true });
  }
  tmpDirs.length = 0;
});

describe("loadAllKeywords", () => {
  it("loads keywords from data directory", async () => {
    const tmp = createTmpDir();
    mkdirSync(join(tmp, "ㅁ", "만"), { recursive: true });
    writeFileSync(
      join(tmp, "ㅁ", "만", "만두.json"),
      JSON.stringify({
        keyword: "만두",
        url: "https://example.com/mandu",
        created: "2026-01-01",
      })
    );

    const keywords = await loadAllKeywords(tmp);
    expect(keywords).toHaveLength(1);
    expect(keywords[0].keyword).toBe("만두");
    expect(keywords[0].url).toBe("https://example.com/mandu");
  });

  it("excludes blocklist, whitelist, and profanity-blocklist files", async () => {
    const tmp = createTmpDir();
    mkdirSync(join(tmp, "ㅁ", "만"), { recursive: true });
    writeFileSync(
      join(tmp, "ㅁ", "만", "만두.json"),
      JSON.stringify({ keyword: "만두", url: "https://example.com/mandu", created: "2026-01-01" })
    );
    // These should be excluded
    writeFileSync(join(tmp, "blocklist.json"), JSON.stringify(["삼성", "애플"]));
    writeFileSync(join(tmp, "whitelist.json"), JSON.stringify(["naver.com"]));
    writeFileSync(join(tmp, "profanity-blocklist.json"), JSON.stringify(["bad"]));

    const keywords = await loadAllKeywords(tmp);
    expect(keywords).toHaveLength(1);
    expect(keywords[0].keyword).toBe("만두");
  });

  it("skips malformed JSON files", async () => {
    const tmp = createTmpDir();
    mkdirSync(join(tmp, "_en"), { recursive: true });
    writeFileSync(join(tmp, "_en", "good.json"), JSON.stringify({ keyword: "good", url: "https://example.com", created: "2026-01-01" }));
    writeFileSync(join(tmp, "_en", "bad.json"), "not valid json {{{");

    const keywords = await loadAllKeywords(tmp);
    expect(keywords).toHaveLength(1);
    expect(keywords[0].keyword).toBe("good");
  });

  it("skips JSON files missing keyword or url fields", async () => {
    const tmp = createTmpDir();
    mkdirSync(join(tmp, "_en"), { recursive: true });
    writeFileSync(join(tmp, "_en", "valid.json"), JSON.stringify({ keyword: "valid", url: "https://example.com", created: "2026-01-01" }));
    writeFileSync(join(tmp, "_en", "no-url.json"), JSON.stringify({ keyword: "nourl" }));
    writeFileSync(join(tmp, "_en", "no-keyword.json"), JSON.stringify({ url: "https://example.com" }));
    writeFileSync(join(tmp, "_en", "wrong-types.json"), JSON.stringify({ keyword: 123, url: true }));

    const keywords = await loadAllKeywords(tmp);
    expect(keywords).toHaveLength(1);
    expect(keywords[0].keyword).toBe("valid");
  });
});
