import { describe, it, expect } from "vitest";
import { buildFallbackUrl, parseKeywordJson } from "../src/fallback";

describe("buildFallbackUrl", () => {
  const base = "https://raw.githubusercontent.com/laeyoung/price.kr/main";

  it("builds correct URL-encoded URL for Korean keyword", () => {
    const url = buildFallbackUrl("만두", base);
    // Path segments are URL-encoded for non-ASCII characters
    expect(url).toBe(
      `${base}/${encodeURIComponent("data")}/${encodeURIComponent("ㅁ")}/${encodeURIComponent("만")}/${encodeURIComponent("만두.json")}`
    );
    // Verify it contains encoded Korean
    expect(url).toContain("%");
  });

  it("builds correct URL for English keyword", () => {
    const url = buildFallbackUrl("iphone", base);
    expect(url).toBe(`${base}/data/_en/iphone.json`);
  });

  it("builds correct URL for numeric keyword", () => {
    // In production, index.ts lowercases keywords before calling fallback
    const url = buildFallbackUrl("3m", base);
    expect(url).toBe(`${base}/data/_num/3m.json`);
  });
});

describe("parseKeywordJson", () => {
  it("extracts URL from valid JSON", () => {
    const json = '{"keyword":"만두","url":"https://example.com","created":"2026-01-01"}';
    expect(parseKeywordJson(json)).toBe("https://example.com");
  });

  it("returns null for invalid JSON", () => {
    expect(parseKeywordJson("not json")).toBeNull();
  });
});
