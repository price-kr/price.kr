import { describe, it, expect } from "vitest";
import { normalizeKeyword, isBlockedKeyword, isAliasData, isCanonicalData } from "../validate-keyword.js";

describe("normalizeKeyword", () => {
  it("removes spaces and special characters", () => {
    expect(normalizeKeyword("쿠 팡")).toBe("쿠팡");
    expect(normalizeKeyword("쿠.팡")).toBe("쿠팡");
    expect(normalizeKeyword("쿠팡!")).toBe("쿠팡");
  });

  it("applies Unicode NFC normalization", () => {
    // ㅋ+ㅜ+ㅍ+ㅏ+ㅇ (decomposed) → 쿠팡 (composed)
    const decomposed = "\u110F\u116E\u1111\u1161\u11BC";
    expect(normalizeKeyword(decomposed)).toBe("쿠팡");
  });
});

describe("isBlockedKeyword", () => {
  const blocklist = ["쿠팡", "삼성", "네이버"];

  it("blocks exact matches", () => {
    expect(isBlockedKeyword("쿠팡", blocklist)).toBe(true);
  });

  it("blocks with spaces/special chars removed", () => {
    expect(isBlockedKeyword("쿠.팡", blocklist)).toBe(true);
    expect(isBlockedKeyword("쿠 팡", blocklist)).toBe(true);
  });

  it("blocks choseong-only abbreviations (e.g. ㅋㅍ for 쿠팡)", () => {
    expect(isBlockedKeyword("ㅋㅍ", blocklist)).toBe(true);
    expect(isBlockedKeyword("ㅅㅅ", blocklist)).toBe(true);
    expect(isBlockedKeyword("ㄴㅇㅂ", blocklist)).toBe(true);
  });

  it("allows non-blocked keywords", () => {
    expect(isBlockedKeyword("만두", blocklist)).toBe(false);
  });

  it("allows choseong that don't match blocklist", () => {
    expect(isBlockedKeyword("ㅁㄷ", blocklist)).toBe(false);
  });
});

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
