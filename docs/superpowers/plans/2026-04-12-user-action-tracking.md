# User Action Tracking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Track page views, search queries, and per-keyword 302 redirect counts using Cloudflare D1.

**Architecture:** Web app sends `sendBeacon(text/plain)` to `t.가격.kr/e` → Workers validates + writes to D1. Workers also records redirect events via `ctx.waitUntil()` with 10% sampling. All data stored in a single `events` table.

**Tech Stack:** Cloudflare Workers + D1 (SQLite), Next.js 15 App Router, vitest

**Spec:** `docs/superpowers/specs/2026-04-12-user-action-tracking-design.md`

---

## File Map

### New files
| File | Responsibility |
|------|---------------|
| `workers/migrations/0001_create_events.sql` | D1 schema: events table + indexes |
| `workers/src/tracking.ts` | `writeEvent()`, `handleTrack()`, `corsHeaders()` |
| `workers/test/tracking.test.ts` | Unit tests for tracking module |
| `web/lib/track.ts` | Client-side `track()` beacon utility |
| `web/components/PageTracker.tsx` | "use client" pageview component |
| `web/__tests__/track.test.ts` | Unit tests for track utility |

### Modified files
| File | Change |
|------|--------|
| `workers/wrangler.toml` | Add `[[d1_databases]]` binding with `migrations_dir` |
| `workers/src/index.ts` | Add `TRACKING` to Env, restructure `fetch()` with `/e` branch + cache hit tracking |
| `workers/test/index.test.ts` | Add `TRACKING` mock to `createEnv()`, add tracking test cases |
| `data/blocklist.json` | Add `"t"` as reserved keyword |
| `web/components/SearchBar.tsx` | Add `track()` call in `handleSelect`, add `query` to deps |
| `web/app/page.tsx` | Insert `<PageTracker page="/" />` |
| `web/app/[keyword]/page.tsx` | Insert `<PageTracker page={...} />` |
| `web/app/privacy/page.tsx` | Update stats section + add tracking disclosure |

---

### Task 1: D1 Migration SQL + Blocklist

**Files:**
- Create: `workers/migrations/0001_create_events.sql`
- Modify: `data/blocklist.json`

- [ ] **Step 1: Create migrations directory and SQL file**

```sql
-- workers/migrations/0001_create_events.sql
CREATE TABLE events (
  id INTEGER PRIMARY KEY,
  type TEXT NOT NULL,
  keyword TEXT,
  value TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_events_type_created ON events(type, created_at);
CREATE INDEX idx_events_keyword ON events(keyword);
```

- [ ] **Step 2: Add `t` to blocklist**

In `data/blocklist.json`, add `"t"` to the array:

```json
[
  "쿠팡",
  "삼성",
  "네이버",
  "카카오",
  "라인",
  "당근마켓",
  "배달의민족",
  "토스",
  "t"
]
```

- [ ] **Step 3: Commit**

```bash
git add workers/migrations/0001_create_events.sql data/blocklist.json
git commit -m "feat(tracking): add D1 migration SQL and reserve 't' keyword"
```

---

### Task 2: Workers tracking module — writeEvent + tests

**Files:**
- Create: `workers/src/tracking.ts`
- Create: `workers/test/tracking.test.ts`

- [ ] **Step 1: Write failing tests for `writeEvent`**

```ts
// workers/test/tracking.test.ts
import { describe, it, expect, vi } from "vitest";
import { writeEvent } from "../src/tracking";

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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd workers && npx vitest run test/tracking.test.ts`
Expected: FAIL — `writeEvent` not found

- [ ] **Step 3: Implement writeEvent**

```ts
// workers/src/tracking.ts

export async function writeEvent(
  db: D1Database,
  type: string,
  keyword: string,
  value?: string
): Promise<void> {
  await db
    .prepare("INSERT INTO events (type, keyword, value) VALUES (?, ?, ?)")
    .bind(type, keyword, value ?? null)
    .run();
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd workers && npx vitest run test/tracking.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add workers/src/tracking.ts workers/test/tracking.test.ts
git commit -m "feat(tracking): add writeEvent with D1 parameterized insert"
```

---

### Task 3: Workers tracking module — handleTrack + corsHeaders + tests

**Files:**
- Modify: `workers/src/tracking.ts`
- Modify: `workers/test/tracking.test.ts`

- [ ] **Step 1: Write failing tests for handleTrack and corsHeaders**

Append to `workers/test/tracking.test.ts`:

```ts
import { handleTrack, corsHeaders } from "../src/tracking";
import type { Env } from "../src/index";

function createTrackEnv(): Env {
  return {
    KEYWORDS: {} as KVNamespace,
    TRACKING: createMockD1(),
    MAIN_DOMAIN: "xn--o39aom.kr",
    WEB_APP_ORIGIN: "https://xn--o39aom.kr",
    GITHUB_RAW_BASE: "https://raw.githubusercontent.com/price-kr/price.kr/main",
  };
}

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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd workers && npx vitest run test/tracking.test.ts`
Expected: FAIL — `handleTrack`, `corsHeaders` not exported

- [ ] **Step 3: Implement handleTrack and corsHeaders**

Add to `workers/src/tracking.ts`:

```ts
import type { Env } from "./index";

function stripControlChars(str: string): string {
  return str.replace(/[\x00-\x1f\x7f]/g, "");
}

function isValidOrigin(origin: string | null, env: Env): boolean {
  if (!origin) return false;
  try {
    const hostname = new URL(origin).hostname;
    return hostname === env.MAIN_DOMAIN;
  } catch {
    return false;
  }
}

export async function handleTrack(
  request: Request,
  env: Env
): Promise<Response> {
  // Origin validation (punycode normalization)
  const origin = request.headers.get("Origin");
  if (!isValidOrigin(origin, env)) {
    return new Response(null, { status: 403 });
  }

  // Body size check
  const contentLength = request.headers.get("Content-Length");
  if (contentLength && parseInt(contentLength, 10) > 1024) {
    return new Response(null, { status: 400 });
  }

  // Parse body
  let body: string;
  try {
    body = await request.text();
  } catch {
    return new Response(null, { status: 400 });
  }

  if (body.length > 1024) {
    return new Response(null, { status: 400 });
  }

  let data: { type?: string; keyword?: string; value?: string };
  try {
    data = JSON.parse(body);
  } catch {
    return new Response(null, { status: 400 });
  }

  // Validate type
  if (data.type !== "pageview" && data.type !== "search") {
    return new Response(null, { status: 400 });
  }

  // Validate keyword
  if (typeof data.keyword !== "string" || data.keyword.length === 0 || data.keyword.length > 100) {
    return new Response(null, { status: 400 });
  }

  // Validate value
  if (data.value !== undefined && data.value !== null) {
    if (typeof data.value !== "string" || data.value.length > 100) {
      return new Response(null, { status: 400 });
    }
  }

  // Sanitize
  const keyword = stripControlChars(data.keyword);
  const value = data.value ? stripControlChars(data.value) : undefined;

  // Write to D1 (best-effort — return 204 even on failure)
  try {
    await writeEvent(env.TRACKING, data.type, keyword, value);
  } catch (e) {
    console.error("D1 write failed:", e);
  }

  return new Response(null, {
    status: 204,
    headers: corsHeaders(env.WEB_APP_ORIGIN),
  });
}

export function corsHeaders(origin: string): Headers {
  const headers = new Headers();
  headers.set("Access-Control-Allow-Origin", origin);
  headers.set("Access-Control-Allow-Methods", "POST");
  headers.set("Access-Control-Allow-Headers", "Content-Type");
  headers.set("Access-Control-Max-Age", "86400");
  return headers;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd workers && npx vitest run test/tracking.test.ts`
Expected: ALL PASS

- [ ] **Step 5: Commit**

```bash
git add workers/src/tracking.ts workers/test/tracking.test.ts
git commit -m "feat(tracking): add handleTrack with Origin validation, body parsing, CORS"
```

---

### Task 4: Workers index.ts — restructure fetch() + wrangler.toml

**Files:**
- Modify: `workers/src/index.ts`
- Modify: `workers/wrangler.toml`
- Modify: `workers/test/index.test.ts`

- [ ] **Step 1: Add TRACKING to Env interface and update wrangler.toml**

In `workers/src/index.ts`, add `TRACKING` to the `Env` interface:

```ts
export interface Env {
  KEYWORDS: KVNamespace;
  TRACKING: D1Database;
  MAIN_DOMAIN: string;
  WEB_APP_ORIGIN: string;
  GITHUB_RAW_BASE: string;
  GITHUB_TOKEN?: string;
}
```

In `workers/wrangler.toml`, append:

```toml

# D1 database for tracking events
[[d1_databases]]
binding = "TRACKING"
database_name = "price-kr-tracking"
database_id = "placeholder-tracking-db-id"
migrations_dir = "migrations"
```

- [ ] **Step 2: Update createEnv() in existing tests**

In `workers/test/index.test.ts`, update `createEnv()` to include `TRACKING`:

```ts
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

function createEnv(kvData: Record<string, string> = {}): Env {
  return {
    KEYWORDS: createMockKV(kvData),
    TRACKING: createMockD1(),
    MAIN_DOMAIN: "xn--o39aom.kr",
    WEB_APP_ORIGIN: "https://xn--o39aom.kr",
    GITHUB_RAW_BASE: "https://raw.githubusercontent.com/laeyoung/price.kr/main",
  };
}
```

- [ ] **Step 3: Run existing tests to verify they still pass**

Run: `cd workers && npx vitest run test/index.test.ts`
Expected: ALL PASS (existing tests unaffected)

- [ ] **Step 4: Restructure fetch() handler**

Replace the `fetch()` method in `workers/src/index.ts`:

```ts
import { extractSubdomain } from "./subdomain";
import { fetchFallback } from "./fallback";
import { handleTrack, writeEvent, corsHeaders } from "./tracking";

// ... Env, isSafeRedirectUrl, redirect302, errorPage unchanged ...

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const host = request.headers.get("Host") ?? url.hostname;
    const subdomain = extractSubdomain(host, env.MAIN_DOMAIN);

    // --- Tracking endpoint: only on subdomain 't', path '/e' ---
    if (subdomain === "t" && url.pathname === "/e") {
      if (request.method === "POST") {
        return handleTrack(request, env);
      }
      if (request.method === "OPTIONS") {
        return new Response(null, {
          status: 204,
          headers: corsHeaders(env.WEB_APP_ORIGIN),
        });
      }
    }

    // --- Existing redirect logic with cache ---
    // @ts-ignore - Cloudflare Workers runtime provides `caches` globally
    const cache = caches.default;
    const cacheUrl = new URL(request.url);
    cacheUrl.search = "";
    cacheUrl.hash = "";
    const cacheKey = cacheUrl.toString();

    let response = await cache.match(cacheKey);
    if (response) {
      // Cache hit — track redirect if it's an actual 302
      if (subdomain && response.status === 302 && Math.random() < 0.1) {
        const keyword = subdomain.toLowerCase();
        ctx.waitUntil(
          writeEvent(env.TRACKING, "redirect", keyword).catch((e) =>
            console.error("Tracking write failed:", e)
          )
        );
      }
      return response;
    }

    response = await this._fetch_keyword(request, env);

    // Track redirect on cache miss (10% sampling)
    if (subdomain && response.status === 302 && Math.random() < 0.1) {
      const keyword = subdomain.toLowerCase();
      ctx.waitUntil(
        writeEvent(env.TRACKING, "redirect", keyword).catch((e) =>
          console.error("Tracking write failed:", e)
        )
      );
    }

    ctx.waitUntil(
      cache.put(cacheKey, response.clone()).catch(() => {/* noop */})
    );

    return response;
  },

  // _fetch_keyword unchanged
  async _fetch_keyword(request: Request, env: Env): Promise<Response> {
    // ... existing implementation ...
  },
};
```

- [ ] **Step 5: Add tracking-specific tests to index.test.ts**

Append to `workers/test/index.test.ts`:

```ts
describe("Tracking endpoint /e", () => {
  it("handles POST /e on t subdomain", async () => {
    const env = createEnv();
    const req = new Request("https://t.xn--o39aom.kr/e", {
      method: "POST",
      body: JSON.stringify({ type: "pageview", keyword: "/" }),
      headers: {
        Host: "t.xn--o39aom.kr",
        Origin: "https://xn--o39aom.kr",
      },
    });
    const res = await worker.fetch(req, env, createCtx());
    expect(res.status).toBe(204);
  });

  it("handles OPTIONS /e on t subdomain (CORS preflight)", async () => {
    const env = createEnv();
    const req = new Request("https://t.xn--o39aom.kr/e", {
      method: "OPTIONS",
      headers: { Host: "t.xn--o39aom.kr" },
    });
    const res = await worker.fetch(req, env, createCtx());
    expect(res.status).toBe(204);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("https://xn--o39aom.kr");
  });

  it("does NOT treat /e on other subdomains as tracking", async () => {
    const env = createEnv();
    const req = new Request("https://xn--hu1b07h.xn--o39aom.kr/e", {
      method: "POST",
      body: JSON.stringify({ type: "pageview", keyword: "/" }),
      headers: {
        Host: "xn--hu1b07h.xn--o39aom.kr",
        Origin: "https://xn--o39aom.kr",
      },
    });
    const res = await worker.fetch(req, env, createCtx());
    // Should fall through to redirect logic, not return 204
    expect(res.status).not.toBe(204);
  });
});
```

- [ ] **Step 6: Run all workers tests**

Run: `cd workers && npx vitest run`
Expected: ALL PASS

- [ ] **Step 7: Commit**

```bash
git add workers/src/index.ts workers/wrangler.toml workers/test/index.test.ts
git commit -m "feat(tracking): restructure fetch() with /e endpoint and redirect sampling"
```

---

### Task 5: Web — track utility + tests

**Files:**
- Create: `web/lib/track.ts`
- Create: `web/__tests__/track.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// web/__tests__/track.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("track", () => {
  const originalEnv = process.env.NODE_ENV;
  let sendBeaconMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    sendBeaconMock = vi.fn().mockReturnValue(true);
    Object.defineProperty(globalThis, "navigator", {
      value: { sendBeacon: sendBeaconMock },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.resetModules();
    process.env.NODE_ENV = originalEnv;
  });

  it("sends beacon with correct JSON for pageview", async () => {
    process.env.NODE_ENV = "production";
    const { track } = await import("../lib/track");
    track("pageview", "/");

    expect(sendBeaconMock).toHaveBeenCalledWith(
      "https://t.xn--o39aom.kr/e",
      '{"type":"pageview","keyword":"/"}'
    );
  });

  it("sends beacon with value for search", async () => {
    process.env.NODE_ENV = "production";
    const { track } = await import("../lib/track");
    track("search", "가방", "가");

    expect(sendBeaconMock).toHaveBeenCalledWith(
      "https://t.xn--o39aom.kr/e",
      '{"type":"search","keyword":"가방","value":"가"}'
    );
  });

  it("logs to console in development mode instead of sending beacon", async () => {
    process.env.NODE_ENV = "development";
    const consoleSpy = vi.spyOn(console, "debug").mockImplementation(() => {});
    const { track } = await import("../lib/track");
    track("pageview", "/");

    expect(sendBeaconMock).not.toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalledWith("[track]", "pageview", "/", undefined);
    consoleSpy.mockRestore();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd web && npx vitest run __tests__/track.test.ts`
Expected: FAIL — `track` not found

- [ ] **Step 3: Implement track utility**

```ts
// web/lib/track.ts

const TRACK_URL = "https://t.xn--o39aom.kr/e";

export function track(
  type: "pageview" | "search",
  keyword: string,
  value?: string
): void {
  if (process.env.NODE_ENV === "development") {
    console.debug("[track]", type, keyword, value);
    return;
  }

  const payload: { type: string; keyword: string; value?: string } = {
    type,
    keyword,
  };
  if (value !== undefined) {
    payload.value = value;
  }

  navigator.sendBeacon(TRACK_URL, JSON.stringify(payload));
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd web && npx vitest run __tests__/track.test.ts`
Expected: ALL PASS

- [ ] **Step 5: Commit**

```bash
git add web/lib/track.ts web/__tests__/track.test.ts
git commit -m "feat(tracking): add client-side track() beacon utility"
```

---

### Task 6: Web — PageTracker component

**Files:**
- Create: `web/components/PageTracker.tsx`
- Modify: `web/app/page.tsx`
- Modify: `web/app/[keyword]/page.tsx`

- [ ] **Step 1: Create PageTracker component**

```tsx
// web/components/PageTracker.tsx
"use client";

import { useEffect, useRef } from "react";
import { track } from "@/lib/track";

export function PageTracker({ page }: { page: string }) {
  const sent = useRef(false);

  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    track("pageview", page);
  }, [page]);

  return null;
}
```

- [ ] **Step 2: Add PageTracker to home page**

In `web/app/page.tsx`, add import and insert component:

```tsx
import { PageTracker } from "@/components/PageTracker";
```

Inside the JSX, after the opening `<main>` tag:

```tsx
<PageTracker page="/" />
```

- [ ] **Step 3: Add PageTracker to keyword page**

In `web/app/[keyword]/page.tsx`, add import:

```tsx
import { PageTracker } from "@/components/PageTracker";
```

Inside the `KeywordPage` function's JSX, after the opening `<main>` tag:

```tsx
<PageTracker page={`/${decoded}`} />
```

- [ ] **Step 4: Run existing web tests to verify no regressions**

Run: `cd web && npx vitest run`
Expected: ALL PASS

- [ ] **Step 5: Commit**

```bash
git add web/components/PageTracker.tsx web/app/page.tsx web/app/[keyword]/page.tsx
git commit -m "feat(tracking): add PageTracker component to home and keyword pages"
```

---

### Task 7: Web — SearchBar tracking + privacy page update

**Files:**
- Modify: `web/components/SearchBar.tsx`
- Modify: `web/app/privacy/page.tsx`

- [ ] **Step 1: Add track() to SearchBar handleSelect**

In `web/components/SearchBar.tsx`:

1. Add import at top:
```tsx
import { track } from "@/lib/track";
```

2. Replace the `handleSelect` callback (line 23-27):
```tsx
  const handleSelect = useCallback((keyword: string) => {
    track("search", keyword, query);
    if (/^[가-힣ㄱ-ㅎa-zA-Z0-9]+$/.test(keyword)) {
      window.location.href = `https://${keyword}.가격.kr`;
    }
  }, [query]);
```

- [ ] **Step 2: Update privacy page**

Replace the "2. 통계 정보" section in `web/app/privacy/page.tsx` (lines 25-29):

```tsx
        <h2 className="text-xl font-semibold mt-6">2. 통계 정보</h2>
        <p>
          서비스 개선을 위해 다음의 익명화된 데이터를 수집합니다:
        </p>
        <ul className="list-disc pl-6 space-y-1">
          <li>페이지 방문 기록 (방문한 페이지 경로, 시각)</li>
          <li>검색 쿼리 (검색창에 입력한 키워드 원문, 시각)</li>
          <li>리다이렉트 횟수 (키워드별 접속 빈도, 시각)</li>
        </ul>
        <p className="mt-2">
          IP 주소, 브라우저 정보, 쿠키 등 개인 식별 정보(PII)는 수집하지
          않습니다. 수집된 데이터는 Cloudflare D1에 저장되며, 키워드와
          UTC 타임스탬프만 포함합니다.
        </p>
```

- [ ] **Step 3: Run all web tests**

Run: `cd web && npx vitest run`
Expected: ALL PASS

- [ ] **Step 4: Commit**

```bash
git add web/components/SearchBar.tsx web/app/privacy/page.tsx
git commit -m "feat(tracking): add search tracking to SearchBar and update privacy page"
```

---

### Task 8: Full test suite + lint

**Files:** None (verification only)

- [ ] **Step 1: Run all tests across workspaces**

Run: `npm test`
Expected: ALL PASS across workers, web, scripts

- [ ] **Step 2: Run lint**

Run: `npm run lint`
Expected: No errors

- [ ] **Step 3: Commit any lint fixes (if needed)**

```bash
git add -A
git commit -m "chore: fix lint issues from tracking implementation"
```

---

### Task 9: Update DEV_PROGRESS.md and DEV_LOG.md

**Files:**
- Modify: `docs/DEV_PROGRESS.md`
- Modify: `docs/DEV_LOG.md`

- [ ] **Step 1: Update DEV_PROGRESS.md**

Add tracking task entry with ✅ 완료 status.

- [ ] **Step 2: Update DEV_LOG.md**

Add a new entry at the top with date/time, covering:
- User action tracking feature implemented
- D1-based storage with 10% redirect sampling
- text/plain sendBeacon strategy (CORS preflight avoidance)
- PageTracker client component pattern for Server Component pages
- 5 rounds of 4-agent review resolving 46+ issues

- [ ] **Step 3: Commit**

```bash
git add docs/DEV_PROGRESS.md docs/DEV_LOG.md
git commit -m "docs: update dev tracking for user action tracking feature"
```

---

## Deployment Checklist (Post-Implementation)

These steps require Cloudflare dashboard access and are done manually after code is merged:

1. `wrangler d1 create price-kr-tracking` → copy database_id
2. Update `workers/wrangler.toml` with real database_id
3. `wrangler d1 migrations apply price-kr-tracking`
4. Cloudflare Dashboard > Security > WAF > Rate limiting rules:
   - Expression: `http.request.uri.path eq "/e" and http.request.method eq "POST"`
   - Threshold: 60 requests per minute per IP
   - Action: Block
5. `cd workers && wrangler deploy`
6. Push to main → Vercel auto-deploys web
7. Verify: `curl -X POST https://t.xn--o39aom.kr/e -d '{"type":"pageview","keyword":"/"}' -H "Origin: https://xn--o39aom.kr"` → should return 204

---

## Amendments (4-Agent Review 반영)

> **구현자 필독:** 아래 수정사항은 위 원본 태스크보다 우선합니다. 각 태스크 실행 전에 해당 Amendment를 확인하세요.

### A1. Task 순서 변경 — Env + wrangler.toml을 Task 3 이전으로

**문제:** Task 3에서 `import type { Env } from "./index"`를 사용하는데, Task 3 시점에 `Env`에 `TRACKING: D1Database`가 없어 TypeScript 컴파일 에러 발생.

**수정:** Task 4의 Step 1-3 (Env 수정 + wrangler.toml + createEnv 업데이트)을 **Task 3 이전에 먼저 실행**한다.

실행 순서: Task 1 → Task 2 → **Task 4 Step 1-3** → Task 3 → Task 4 Step 4-7 → Task 5-9

### A2. Task 2-3 파일 조립 — complete file 제공

**문제:** Task 3에서 "Append to tracking.ts / tracking.test.ts"라고 했으나, ESM은 import문이 반드시 파일 최상단이어야 하므로 append하면 컴파일 에러.

**수정:** Task 3에서는 `tracking.ts`와 `tracking.test.ts`의 **전체 내용**을 제공한다. Task 2에서 생성한 파일을 **덮어쓴다**.

**`workers/src/tracking.ts` (Task 3 완료 시 전체 파일):**

```ts
import type { Env } from "./index";

export async function writeEvent(
  db: D1Database,
  type: string,
  keyword: string,
  value?: string
): Promise<void> {
  await db
    .prepare("INSERT INTO events (type, keyword, value) VALUES (?, ?, ?)")
    .bind(type, keyword, value ?? null)
    .run();
}

function stripControlChars(str: string): string {
  return str.replace(/[\x00-\x1f\x7f]/g, "");
}

function isValidOrigin(origin: string | null, env: Env): boolean {
  if (!origin) return false;
  try {
    const hostname = new URL(origin).hostname;
    return hostname === env.MAIN_DOMAIN;
  } catch {
    return false;
  }
}

export async function handleTrack(
  request: Request,
  env: Env
): Promise<Response> {
  const origin = request.headers.get("Origin");
  if (!isValidOrigin(origin, env)) {
    return new Response(null, { status: 403 });
  }

  const contentLength = request.headers.get("Content-Length");
  if (contentLength && parseInt(contentLength, 10) > 1024) {
    return new Response(null, { status: 400 });
  }

  let body: string;
  try {
    body = await request.text();
  } catch {
    return new Response(null, { status: 400 });
  }

  if (body.length > 1024) {
    return new Response(null, { status: 400 });
  }

  let data: { type?: string; keyword?: string; value?: string };
  try {
    data = JSON.parse(body);
  } catch {
    return new Response(null, { status: 400 });
  }

  if (data.type !== "pageview" && data.type !== "search") {
    return new Response(null, { status: 400 });
  }

  if (typeof data.keyword !== "string" || data.keyword.length === 0 || data.keyword.length > 100) {
    return new Response(null, { status: 400 });
  }

  if (data.value !== undefined && data.value !== null) {
    if (typeof data.value !== "string" || data.value.length > 100) {
      return new Response(null, { status: 400 });
    }
  }

  const keyword = stripControlChars(data.keyword);
  const value = data.value ? stripControlChars(data.value) : undefined;

  try {
    await writeEvent(env.TRACKING, data.type, keyword, value);
  } catch (e) {
    console.error("D1 write failed:", e);
  }

  return new Response(null, {
    status: 204,
    headers: corsHeaders(env.WEB_APP_ORIGIN),
  });
}

export function corsHeaders(origin: string): Headers {
  const headers = new Headers();
  headers.set("Access-Control-Allow-Origin", origin);
  headers.set("Access-Control-Allow-Methods", "POST");
  headers.set("Access-Control-Allow-Headers", "Content-Type");
  headers.set("Access-Control-Max-Age", "86400");
  return headers;
}
```

### A3. Unicode Origin 테스트 수정

**문제:** "accepts unicode Origin header" 테스트가 punycode Origin을 보내고 있어 정규화 로직을 검증하지 못함.

**수정:** Task 3 테스트의 해당 케이스를 다음으로 교체:

```ts
  it("accepts unicode Origin header (punycode normalization)", async () => {
    const env = createTrackEnv();
    const req = new Request("https://t.xn--o39aom.kr/e", {
      method: "POST",
      body: JSON.stringify({ type: "pageview", keyword: "/" }),
      headers: { Origin: "https://가격.kr" },  // unicode Origin
    });
    const res = await handleTrack(req, env);
    expect(res.status).toBe(204);
  });
```

### A4. 누락된 테스트 추가 — Task 3에 추가할 테스트 케이스

Task 3의 tracking.test.ts에 다음 테스트를 추가:

```ts
  it("returns 403 when Origin header is missing", async () => {
    const env = createTrackEnv();
    const req = new Request("https://t.xn--o39aom.kr/e", {
      method: "POST",
      body: JSON.stringify({ type: "pageview", keyword: "/" }),
    });
    const res = await handleTrack(req, env);
    expect(res.status).toBe(403);
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
```

### A5. `subdomain === 't'` tracking 제외 — Task 4 수정

**문제:** `t.가격.kr` GET 요청이 캐시 히트되면 `subdomain === 't'` + `status === 302`로 무의미한 redirect 이벤트가 기록됨.

**수정:** Task 4 Step 4의 redirect tracking 조건에 `subdomain !== 't'`를 추가:

```ts
// Cache hit tracking (기존 코드의 if 조건 수정)
if (subdomain && subdomain !== "t" && response.status === 302 && Math.random() < 0.1) {

// Cache miss tracking (동일하게 수정)
if (subdomain && subdomain !== "t" && response.status === 302 && Math.random() < 0.1) {
```

### A6. 10% 샘플링 테스트 추가 — Task 4에 추가할 테스트

Task 4 Step 5의 index.test.ts에 다음 테스트를 추가:

```ts
describe("Redirect tracking sampling", () => {
  it("records redirect event when Math.random < 0.1", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0.05);
    const targetUrl = "https://search.shopping.naver.com/search?query=%EB%A7%8C%EB%91%90";
    const env = createEnv({ "만두": targetUrl });
    const ctx = createCtx();
    const req = createRequest(
      "https://xn--hu1b07h.xn--o39aom.kr/",
      "xn--hu1b07h.xn--o39aom.kr"
    );
    await worker.fetch(req, env, ctx);
    // writeEvent should be called via ctx.waitUntil
    expect(ctx.waitUntil).toHaveBeenCalled();
    vi.restoreAllMocks();
  });

  it("skips redirect event when Math.random >= 0.1", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    const targetUrl = "https://search.shopping.naver.com/search?query=%EB%A7%8C%EB%91%90";
    const env = createEnv({ "만두": targetUrl });
    const ctx = createCtx();
    const req = createRequest(
      "https://xn--hu1b07h.xn--o39aom.kr/",
      "xn--hu1b07h.xn--o39aom.kr"
    );
    await worker.fetch(req, env, ctx);
    // Only cache.put waitUntil, no writeEvent waitUntil
    const waitUntilCalls = (ctx.waitUntil as ReturnType<typeof vi.fn>).mock.calls;
    expect(waitUntilCalls.length).toBe(1); // only cache.put
    vi.restoreAllMocks();
  });

  it("does NOT track redirect for subdomain 't'", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0.05);
    const env = createEnv();
    const ctx = createCtx();
    const req = createRequest(
      "https://t.xn--o39aom.kr/",
      "t.xn--o39aom.kr"
    );
    await worker.fetch(req, env, ctx);
    // t subdomain redirect should not trigger tracking writeEvent
    expect(env.TRACKING.prepare).not.toHaveBeenCalled();
    vi.restoreAllMocks();
  });
});
```

### A7. Task 4 import 지시 명확화

**문제:** Task 4 코드 블록의 import문이 기존 index.ts에 이미 있는 것과 중복.

**수정:** Task 4 Step 4에서 "Replace the `fetch()` method" 대신 다음 지시를 사용:

> `workers/src/index.ts` 상단에 **tracking import만 새로 추가** (기존 extractSubdomain, fetchFallback import 유지):
> ```ts
> import { handleTrack, writeEvent, corsHeaders } from "./tracking";
> ```
> 그 후 `export default` 객체의 `fetch()` 메서드만 교체. `_fetch_keyword()` 메서드는 **변경하지 않고 그대로 유지**한다 (subdomain 이중 추출이 발생하지만, 기능적으로 문제없으며 기존 테스트 호환성을 보존).

### A8. track.ts에 navigator 가드 추가

**문제:** SSR 또는 `sendBeacon` 미지원 환경에서 런타임 에러 가능.

**수정:** Task 5의 `track()` 함수에 가드 추가:

```ts
export function track(
  type: "pageview" | "search",
  keyword: string,
  value?: string
): void {
  if (process.env.NODE_ENV === "development") {
    console.debug("[track]", type, keyword, value);
    return;
  }

  if (typeof navigator === "undefined" || !navigator.sendBeacon) return;

  const payload: { type: string; keyword: string; value?: string } = { type, keyword };
  if (value !== undefined) {
    payload.value = value;
  }
  navigator.sendBeacon(TRACK_URL, JSON.stringify(payload));
}
```

### A9. Task 4 TDD 순서 수정

**문제:** Task 4에서 구현(Step 4)이 테스트(Step 5) 전에 온다.

**수정:** Task 4의 실행 순서를 다음으로 변경:
1. Step 1-3: Env + wrangler.toml + createEnv (이미 A1에서 Task 3 이전으로 이동)
2. **Step 5 먼저: 테스트 작성** (+ A6의 sampling 테스트 포함)
3. Step 4: fetch() 재구성 구현
4. Step 6-7: 테스트 실행 + 커밋
