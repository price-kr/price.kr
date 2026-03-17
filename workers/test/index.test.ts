import { describe, it, expect, vi, beforeAll } from "vitest";
import worker from "../src/index";
import type { Env } from "../src/index";

// Mock global caches for fallback.ts (only exists in Cloudflare Workers runtime)
beforeAll(() => {
  if (typeof globalThis.caches === "undefined") {
    (globalThis as any).caches = {
      default: {
        match: vi.fn(async () => null),
        put: vi.fn(async () => {}),
      },
    };
  }
});

function createMockKV(data: Record<string, string>): KVNamespace {
  return {
    get: vi.fn(async (key: string) => {
      return data[key] ?? null;
    }),
    put: vi.fn(),
    delete: vi.fn(),
    list: vi.fn(),
    getWithMetadata: vi.fn(),
  } as unknown as KVNamespace;
}

function createEnv(kvData: Record<string, string> = {}): Env {
  return {
    KEYWORDS: createMockKV(kvData),
    MAIN_DOMAIN: "xn--o39a88s.kr",
    WEB_APP_ORIGIN: "https://xn--o39a88s.kr",
    GITHUB_RAW_BASE: "https://raw.githubusercontent.com/laeyoung/price.kr/main",
  };
}

function createRequest(url: string, host: string): Request {
  return new Request(url, {
    headers: { Host: host },
  });
}

describe("Worker redirect handler", () => {
  it("redirects known Korean keyword", async () => {
    // Use URL-encoded query to avoid Node.js ByteString header restriction
    // (Cloudflare Workers runtime handles non-ASCII headers, but Node.js doesn't)
    const targetUrl = "https://search.shopping.naver.com/search?query=%EB%A7%8C%EB%91%90";
    const env = createEnv({ "만두": targetUrl });
    // xn--hu1b07h = 만두 in punycode
    const req = createRequest(
      "https://xn--hu1b07h.xn--o39a88s.kr/",
      "xn--hu1b07h.xn--o39a88s.kr"
    );
    const res = await worker.fetch(req, env);
    expect(res.status).toBe(302);
    expect(res.headers.get("Location")).toBe(targetUrl);
    expect(res.headers.get("Cache-Control")).toBe("private, no-store");
  });

  it("redirects known ASCII keyword", async () => {
    const env = createEnv({
      "iphone": "https://search.shopping.naver.com/search?query=iphone",
    });
    const req = createRequest(
      "https://iphone.xn--o39a88s.kr/",
      "iphone.xn--o39a88s.kr"
    );
    const res = await worker.fetch(req, env);
    expect(res.status).toBe(302);
    expect(res.headers.get("Location")).toBe(
      "https://search.shopping.naver.com/search?query=iphone"
    );
  });

  it("redirects unknown keyword to web app", async () => {
    const env = createEnv();
    const req = createRequest(
      "https://unknownword.xn--o39a88s.kr/",
      "unknownword.xn--o39a88s.kr"
    );
    const res = await worker.fetch(req, env);
    expect(res.status).toBe(302);
    expect(res.headers.get("Location")).toBe(
      "https://xn--o39a88s.kr/unknownword"
    );
  });

  it("returns 404 for bare domain requests", async () => {
    const env = createEnv();
    const req = createRequest(
      "https://xn--o39a88s.kr/",
      "xn--o39a88s.kr"
    );
    const res = await worker.fetch(req, env);
    expect(res.status).toBe(404);
  });

  it("returns error page when KV throws", async () => {
    const env = createEnv();
    (env.KEYWORDS.get as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("KV unavailable")
    );
    const req = createRequest(
      "https://iphone.xn--o39a88s.kr/",
      "iphone.xn--o39a88s.kr"
    );
    const res = await worker.fetch(req, env);
    // Falls through to fallback, which also fails (no real fetch) → error page
    expect(res.status).toBe(503);
    const html = await res.text();
    expect(html).toContain("일시적인 오류가 발생했습니다");
  });
});
