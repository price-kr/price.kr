import { describe, it, expect } from "vitest";
import { buildKeywordEntry, writeKeywordFile } from "../seed-data.js";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

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
    const tmp = join(tmpdir(), `test-seed-${Date.now()}`);
    writeKeywordFile(tmp, "만두", "https://example.com/mandu");
    const filePath = join(tmp, "ㅁ", "만", "만두.json");
    expect(existsSync(filePath)).toBe(true);
    const data = JSON.parse(readFileSync(filePath, "utf-8"));
    expect(data.keyword).toBe("만두");
  });

  it("writes English keyword to _en folder", () => {
    const tmp = join(tmpdir(), `test-seed-en-${Date.now()}`);
    writeKeywordFile(tmp, "iphone", "https://example.com/iphone");
    const filePath = join(tmp, "_en", "iphone.json");
    expect(existsSync(filePath)).toBe(true);
  });
});
