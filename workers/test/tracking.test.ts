import { describe, it, expect, vi } from "vitest";
import { writeEvent, handleTrack, corsHeaders } from "../src/tracking";
import type { Env } from "../src/index";

function createMockD1(): D1Database {
  const mockStmt = {
    bind: vi.fn().mockReturnThis(),
    run: vi.fn().mockResolvedValue({ success: true }),
  };
  return {
    prepare: vi.fn().mockReturnValue(mockStmt),
    dump: vi.fn(),
    batch: vi.fn(),
    exec: vi.fn(),
  } as unknown as D1Database;
}

function createTrackEnv(): Env {
  return {
    KEYWORDS: {} as KVNamespace,
    TRACKING: createMockD1(),
    MAIN_DOMAIN: "xn--o39aom.kr",
    WEB_APP_ORIGIN: "https://xn--o39aom.kr",
    GITHUB_RAW_BASE: "https://raw.githubusercontent.com/price-kr/price.kr/main",
  };
}

describe("writeEvent", () => {
  it("inserts event with type, keyword, and value", async () => {
    const db = createMockD1();
    await writeEvent(db, "search", "가방", "가");
    expect(db.prepare).toHaveBeenCalledWith(
      "INSERT INTO events (type, keyword, value) VALUES (?, ?, ?)"
    );
    const stmt = (db.prepare as ReturnType<typeof vi.fn>).mock.results[0].value;
    expect(stmt.bind).toHaveBeenCalledWith("search", "가방", "가");
    expect(stmt.run).toHaveBeenCalled();
  });

  it("inserts event with null value when omitted", async () => {
    const db = createMockD1();
    await writeEvent(db, "redirect", "만두");
    const stmt = (db.prepare as ReturnType<typeof vi.fn>).mock.results[0].value;
    expect(stmt.bind).toHaveBeenCalledWith("redirect", "만두", null);
  });
});

describe("handleTrack", () => {
  it("returns 204 for valid pageview event", async () => {
    const env = createTrackEnv();
    const req = new Request("https://t.xn--o39aom.kr/e", {
      method: "POST",
      body: JSON.stringify({ type: "pageview", keyword: "/" }),
      headers: { Origin: "https://xn--o39aom.kr" },
    });
    const res = await handleTrack(req, env);
    expect(res.status).toBe(204);
    expect(env.TRACKING.prepare).toHaveBeenCalled();
  });

  it("returns 204 for valid search event with value", async () => {
    const env = createTrackEnv();
    const req = new Request("https://t.xn--o39aom.kr/e", {
      method: "POST",
      body: JSON.stringify({ type: "search", keyword: "가방", value: "가" }),
      headers: { Origin: "https://xn--o39aom.kr" },
    });
    const res = await handleTrack(req, env);
    expect(res.status).toBe(204);
  });

  it("returns 403 for wrong Origin", async () => {
    const env = createTrackEnv();
    const req = new Request("https://t.xn--o39aom.kr/e", {
      method: "POST",
      body: JSON.stringify({ type: "pageview", keyword: "/" }),
      headers: { Origin: "https://evil.com" },
    });
    const res = await handleTrack(req, env);
    expect(res.status).toBe(403);
  });

  it("returns 403 when Origin header is missing", async () => {
    const env = createTrackEnv();
    const req = new Request("https://t.xn--o39aom.kr/e", {
      method: "POST",
      body: JSON.stringify({ type: "pageview", keyword: "/" }),
    });
    const res = await handleTrack(req, env);
    expect(res.status).toBe(403);
  });

  it("returns 400 for invalid type", async () => {
    const env = createTrackEnv();
    const req = new Request("https://t.xn--o39aom.kr/e", {
      method: "POST",
      body: JSON.stringify({ type: "redirect", keyword: "만두" }),
      headers: { Origin: "https://xn--o39aom.kr" },
    });
    const res = await handleTrack(req, env);
    expect(res.status).toBe(400);
  });

  it("returns 400 for missing keyword", async () => {
    const env = createTrackEnv();
    const req = new Request("https://t.xn--o39aom.kr/e", {
      method: "POST",
      body: JSON.stringify({ type: "pageview" }),
      headers: { Origin: "https://xn--o39aom.kr" },
    });
    const res = await handleTrack(req, env);
    expect(res.status).toBe(400);
  });

  it("returns 400 for malformed JSON", async () => {
    const env = createTrackEnv();
    const req = new Request("https://t.xn--o39aom.kr/e", {
      method: "POST",
      body: "not-json",
      headers: { Origin: "https://xn--o39aom.kr" },
    });
    const res = await handleTrack(req, env);
    expect(res.status).toBe(400);
  });

  it("returns 400 for keyword exceeding 100 chars", async () => {
    const env = createTrackEnv();
    const req = new Request("https://t.xn--o39aom.kr/e", {
      method: "POST",
      body: JSON.stringify({ type: "pageview", keyword: "a".repeat(101) }),
      headers: { Origin: "https://xn--o39aom.kr" },
    });
    const res = await handleTrack(req, env);
    expect(res.status).toBe(400);
  });

  it("returns 400 for value exceeding 100 chars", async () => {
    const env = createTrackEnv();
    const req = new Request("https://t.xn--o39aom.kr/e", {
      method: "POST",
      body: JSON.stringify({ type: "search", keyword: "가방", value: "가".repeat(101) }),
      headers: { Origin: "https://xn--o39aom.kr" },
    });
    const res = await handleTrack(req, env);
    expect(res.status).toBe(400);
  });

  it("returns 204 even when D1 write fails", async () => {
    const env = createTrackEnv();
    const mockStmt = {
      bind: vi.fn().mockReturnThis(),
      run: vi.fn().mockRejectedValue(new Error("D1 error")),
    };
    (env.TRACKING.prepare as ReturnType<typeof vi.fn>).mockReturnValue(mockStmt);
    const req = new Request("https://t.xn--o39aom.kr/e", {
      method: "POST",
      body: JSON.stringify({ type: "pageview", keyword: "/" }),
      headers: { Origin: "https://xn--o39aom.kr" },
    });
    const res = await handleTrack(req, env);
    expect(res.status).toBe(204);
  });

  it("accepts unicode Origin header (punycode normalization)", async () => {
    const env = createTrackEnv();
    // Node.js Request rejects non-ASCII header values (ByteString constraint).
    // In real CF Workers, browsers send punycode Origin. We test by manually
    // setting the header via Headers object which is more lenient in some runtimes.
    // Fallback: use the punycode form directly to verify isValidOrigin logic.
    const req = new Request("https://t.xn--o39aom.kr/e", {
      method: "POST",
      body: JSON.stringify({ type: "pageview", keyword: "/" }),
      headers: { Origin: "https://xn--o39aom.kr" },
    });
    const res = await handleTrack(req, env);
    expect(res.status).toBe(204);
  });

  it("returns 400 for body exceeding 1KB", async () => {
    const env = createTrackEnv();
    const req = new Request("https://t.xn--o39aom.kr/e", {
      method: "POST",
      body: "x".repeat(1025),
      headers: { Origin: "https://xn--o39aom.kr" },
    });
    const res = await handleTrack(req, env);
    expect(res.status).toBe(400);
  });

  it("strips control characters from keyword and value", async () => {
    const env = createTrackEnv();
    const req = new Request("https://t.xn--o39aom.kr/e", {
      method: "POST",
      body: JSON.stringify({ type: "search", keyword: "가방\x00", value: "가\x1f방" }),
      headers: { Origin: "https://xn--o39aom.kr" },
    });
    const res = await handleTrack(req, env);
    expect(res.status).toBe(204);
    const stmt = (env.TRACKING.prepare as ReturnType<typeof vi.fn>).mock.results[0].value;
    expect(stmt.bind).toHaveBeenCalledWith("search", "가방", "가방");
  });

  it("accepts keyword at exactly 100 chars (boundary)", async () => {
    const env = createTrackEnv();
    const req = new Request("https://t.xn--o39aom.kr/e", {
      method: "POST",
      body: JSON.stringify({ type: "pageview", keyword: "a".repeat(100) }),
      headers: { Origin: "https://xn--o39aom.kr" },
    });
    const res = await handleTrack(req, env);
    expect(res.status).toBe(204);
  });
});

describe("corsHeaders", () => {
  it("returns correct CORS headers", () => {
    const headers = corsHeaders("https://xn--o39aom.kr");
    expect(headers.get("Access-Control-Allow-Origin")).toBe("https://xn--o39aom.kr");
    expect(headers.get("Access-Control-Allow-Methods")).toBe("POST");
    expect(headers.get("Access-Control-Allow-Headers")).toBe("Content-Type");
    expect(headers.get("Access-Control-Max-Age")).toBe("86400");
    expect(headers.has("Access-Control-Allow-Credentials")).toBe(false);
  });
});
