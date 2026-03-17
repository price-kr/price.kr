import { describe, it, expect } from "vitest";
import { getChoseong, searchKeywords } from "@/lib/hangul";

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
