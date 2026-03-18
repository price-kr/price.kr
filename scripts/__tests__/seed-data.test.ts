import { describe, it, expect, afterEach } from "vitest";
import { buildKeywordEntry, writeKeywordFile } from "../seed-data.js";
import { readFileSync, existsSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

const tmpDirs: string[] = [];

function createTmpDir(suffix: string): string {
  const tmp = join(tmpdir(), `test-seed-${suffix}-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  tmpDirs.push(tmp);
  return tmp;
}

afterEach(() => {
  for (const dir of tmpDirs) {
    rmSync(dir, { recursive: true, force: true });
  }
  tmpDirs.length = 0;
});

describe("buildKeywordEntry", () => {
  it("creates a valid keyword entry", () => {
    const entry = buildKeywordEntry("만두", "https://search.shopping.naver.com/search/all?query=만두");
    expect(entry.keyword).toBe("만두");
    expect(entry.url).toContain("만두");
    expect(entry.created).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("writeKeywordFile", () => {
  it("writes keyword JSON to correct path", () => {
    const tmp = createTmpDir("ko");
    writeKeywordFile(tmp, "만두", "https://example.com/mandu");
    const filePath = join(tmp, "ㅁ", "만", "만두.json");
    expect(existsSync(filePath)).toBe(true);
    const data = JSON.parse(readFileSync(filePath, "utf-8"));
    expect(data.keyword).toBe("만두");
  });

  it("writes English keyword to _en folder", () => {
    const tmp = createTmpDir("en");
    writeKeywordFile(tmp, "iphone", "https://example.com/iphone");
    const filePath = join(tmp, "_en", "iphone.json");
    expect(existsSync(filePath)).toBe(true);
  });
});
