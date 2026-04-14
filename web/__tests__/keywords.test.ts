import { describe, it, expect, afterEach } from "vitest";
import { loadAllKeywords, loadAllAliases, findAliasesOf, loadKeywordFile } from "@/lib/keywords";
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

  it("resolves aliases to canonical URLs", async () => {
    const tmp = createTmpDir();
    mkdirSync(join(tmp, "ㄱ", "금"), { recursive: true });
    writeFileSync(
      join(tmp, "ㄱ", "금", "금값.json"),
      JSON.stringify({ keyword: "금값", url: "https://gold.com", created: "2026-04-14" })
    );
    writeFileSync(
      join(tmp, "ㄱ", "금", "금.json"),
      JSON.stringify({ keyword: "금", alias_of: "금값", created: "2026-04-14" })
    );

    const keywords = await loadAllKeywords(tmp);
    expect(keywords).toHaveLength(2);

    const gold = keywords.find(k => k.keyword === "금");
    const goldPrice = keywords.find(k => k.keyword === "금값");

    expect(goldPrice?.url).toBe("https://gold.com");
    expect(gold?.url).toBe("https://gold.com");
  });
});

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
