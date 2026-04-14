import { describe, it, expect, vi, beforeAll } from "vitest";
import { buildFallbackUrl, parseKeywordJson } from "../src/fallback";
import * as fallbackModule from "../src/fallback";

// Mock global caches for fallback.ts (only exists in Cloudflare Workers runtime)
beforeAll(() => {
  if (typeof globalThis.caches === "undefined") {
    const mockCache = {
      match: vi.fn(async () => null),
      put: vi.fn(async () => {}),
    };
    (globalThis as any).caches = {
      default: mockCache,
      open: vi.fn(async () => mockCache),
    };
  }
});

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
  it("extracts URL from valid canonical JSON", () => {
    const json = '{"keyword":"만두","url":"https://example.com","created":"2026-01-01"}';
    expect(parseKeywordJson(json)).toEqual({
      keyword: "만두",
      url: "https://example.com",
      alias_of: undefined,
    });
  });

  it("extracts alias_of from valid alias JSON", () => {
    const json = '{"keyword":"금","alias_of":"금값","created":"2026-04-14"}';
    expect(parseKeywordJson(json)).toEqual({
      keyword: "금",
      url: undefined,
      alias_of: "금값",
    });
  });

  it("returns null for JSON missing keyword", () => {
    const json = '{"url":"https://example.com"}';
    expect(parseKeywordJson(json)).toBeNull();
  });

  it("returns null for invalid JSON", () => {
    expect(parseKeywordJson("not json")).toBeNull();
  });
});

describe("fetchFallback alias resolution", () => {
  const base = "https://raw.githubusercontent.com/laeyoung/price.kr/main";

  it("resolves alias to canonical url via fetch", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn(async (url: string) => {
      if (url.includes("%EA%B8%88.json")) { // 금.json
        return new Response(JSON.stringify({ keyword: "금", alias_of: "금값" }));
      }
      if (url.includes("%EA%B8%88%EA%B0%92.json")) { // 금값.json
        return new Response(JSON.stringify({ keyword: "금값", url: "https://gold.com" }));
      }
      return new Response("Not found", { status: 404 });
    });

    try {
      const url = await fallbackModule.fetchFallback("금", base);
      expect(url).toBe("https://gold.com");
      expect(globalThis.fetch).toHaveBeenCalledTimes(2);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("prevents deep alias chains", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn(async (url: string) => {
      if (url.includes("a.json")) {
        return new Response(JSON.stringify({ keyword: "a", alias_of: "b" }));
      }
      if (url.includes("b.json")) {
        return new Response(JSON.stringify({ keyword: "b", alias_of: "c" }));
      }
      if (url.includes("c.json")) {
        return new Response(JSON.stringify({ keyword: "c", url: "https://c.com" }));
      }
      return new Response("Not found", { status: 404 });
    });

    try {
      const url = await fallbackModule.fetchFallback("a", base);
      expect(url).toBeNull();
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
