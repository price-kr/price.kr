import { describe, it, expect } from "vitest";
import { getChoseong, searchKeywords, pickParticle } from "@/lib/hangul";

describe("getChoseong", () => {
  it("extracts choseong from Korean text", () => {
    expect(getChoseong("만두")).toBe("ㅁㄷ");
    expect(getChoseong("가방")).toBe("ㄱㅂ");
  });
});

describe("searchKeywords", () => {
  const keywords = ["만두", "만년필", "마늘", "가방", "가구"];

  it("matches by prefix", () => {
    expect(searchKeywords("만", keywords)).toEqual(["만두", "만년필"]);
  });

  it("matches by choseong", () => {
    expect(searchKeywords("ㅁㄷ", keywords)).toEqual(["만두"]);
  });
});

describe("pickParticle", () => {
  it("picks 은 for words ending in 받침", () => {
    expect(pickParticle("아이폰", "topic")).toBe("은");
    expect(pickParticle("책상", "topic")).toBe("은");
  });

  it("picks 는 for words ending without 받침", () => {
    expect(pickParticle("만두", "topic")).toBe("는");
    expect(pickParticle("커피", "topic")).toBe("는");
  });

  it("picks 이/가 for subject particle", () => {
    expect(pickParticle("아이폰", "subject")).toBe("이");
    expect(pickParticle("만두", "subject")).toBe("가");
  });

  it("falls back to bracketed form for non-Hangul endings", () => {
    expect(pickParticle("iphone", "topic")).toBe("은(는)");
    expect(pickParticle("123", "subject")).toBe("이(가)");
  });
});
