import { describe, it, expect } from "vitest";
import { normalizeKeyword, isBlockedKeyword } from "../validate-keyword.js";

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
