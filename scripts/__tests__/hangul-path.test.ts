import { describe, it, expect } from "vitest";
import { getKeywordPath, getChoseong } from "../hangul-path.js";

describe("getChoseong", () => {
  it("extracts choseong from Korean character", () => {
    expect(getChoseong("가")).toBe("ㄱ");
    expect(getChoseong("만")).toBe("ㅁ");
    expect(getChoseong("힘")).toBe("ㅎ");
  });

  it("extracts choseong for double consonants (쌍자음)", () => {
    expect(getChoseong("까")).toBe("ㄲ");
    expect(getChoseong("따")).toBe("ㄸ");
    expect(getChoseong("빠")).toBe("ㅃ");
    expect(getChoseong("싸")).toBe("ㅆ");
    expect(getChoseong("짜")).toBe("ㅉ");
  });

  it("returns null for non-Korean character", () => {
    expect(getChoseong("a")).toBeNull();
    expect(getChoseong("1")).toBeNull();
  });
});

describe("getKeywordPath", () => {
  it("returns correct path for Korean keyword", () => {
    expect(getKeywordPath("만두")).toBe("data/ㅁ/만/만두.json");
    expect(getKeywordPath("가방")).toBe("data/ㄱ/가/가방.json");
  });

  it("handles double-consonant keywords", () => {
    expect(getKeywordPath("까치")).toBe("data/ㄲ/까/까치.json");
    expect(getKeywordPath("빵")).toBe("data/ㅃ/빵/빵.json");
  });

  it("returns _en path for English keyword", () => {
    expect(getKeywordPath("iphone")).toBe("data/_en/iphone.json");
  });

  it("returns _num path for numeric-starting keyword", () => {
    expect(getKeywordPath("3M")).toBe("data/_num/3M.json");
  });

  it("throws on empty string", () => {
    expect(() => getKeywordPath("")).toThrow("keyword must not be empty");
  });

  it("routes jamo-starting keywords to _en (not valid composed syllables)", () => {
    expect(getKeywordPath("ㅋㅍ")).toBe("data/_en/ㅋㅍ.json");
  });
});
