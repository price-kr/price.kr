import { extractSubdomain } from "./subdomain";
import { fetchFallback } from "./fallback";
import { handleTrack, writeEvent, corsHeaders } from "./tracking";

export interface Env {
  KEYWORDS: KVNamespace;
  TRACKING: D1Database;
  MAIN_DOMAIN: string;
  WEB_APP_ORIGIN: string;
  GITHUB_RAW_BASE: string;
  GITHUB_TOKEN?: string; // Optional: for higher rate limits on fallback
}

function isSafeRedirectUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

function redirect302(url: string, isCacheable: boolean = false): Response {
  return new Response(null, {
    status: 302,
    headers: {
      Location: url,
      "Cache-Control": isCacheable ? "public, max-age=3600, s-maxage=3600, immutable" : "private, no-store", // FIXME: env.CACHE_MAX_AGE=3600
      // NOTE(minho@): 3600s (1h) is a reasonable cache duration for valid redirects, balancing freshness with performance.
      //    The `immutable` directive allows browsers to cache the response without revalidation, which is suitable since the redirect target for a given keyword is not expected to change frequently.
      //    For Cloudflare's edge caching, the `s-maxage` directive ensures that Cloudflare caches the response for 1 hour as well.
      // NOTE(cf-edge): default: 20m on 302 responses -- https://developers.cloudflare.com/cache/concepts/default-cache-behavior/#edge-ttl
      "Cache-Tag": "x-cacheable-redirect",
      // NOTE(cf-cache): purge via tag -- https://developers.cloudflare.com/cache/how-to/purge-cache/purge-by-tags/
    },
  });
}

function errorPage(webAppOrigin: string): Response {
  const safeOrigin = webAppOrigin
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
  const html = `<!DOCTYPE html>
<html lang="ko">
<head><meta charset="utf-8"><title>가격.kr - 오류</title></head>
<body style="font-family:sans-serif;text-align:center;padding:4rem">
<h1>일시적인 오류가 발생했습니다</h1>
<p>잠시 후 다시 시도해 주세요.</p>
<a href="${safeOrigin}">가격.kr 메인으로 이동</a>
</body></html>`;
  return new Response(html, {
    status: 503,
    headers: { "Content-Type": "text/html;charset=utf-8" },
  });
}

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
      // Cache hit — track redirect if it's an actual 302 (10% sampling, exclude 't')
      if (subdomain && subdomain !== "t" && response.status === 302 && Math.random() < 0.1) {
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

    // Track redirect on cache miss (10% sampling, exclude 't')
    if (subdomain && subdomain !== "t" && response.status === 302 && Math.random() < 0.1) {
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

  async _fetch_keyword(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const host = request.headers.get("Host") ?? url.hostname;

    // Extract subdomain from Host header and normalize to lowercase
    const rawKeyword = extractSubdomain(host, env.MAIN_DOMAIN);

    // No subdomain → bare domain handled by Vercel via DNS
    if (!rawKeyword) {
      return new Response("Not found", { status: 404 });
    }

    // Lowercase for consistent KV key matching (safe for Hangul — no-op)
    const keyword = rawKeyword.toLowerCase();

    // 1. Try KV lookup
    let targetUrl: string | null = null;
    try {
      targetUrl = await env.KEYWORDS.get(keyword);
    } catch {
      console.error("KV lookup failed for keyword:", keyword);
    }

    // 2. Try GitHub Raw Content fallback if KV miss or KV error
    if (!targetUrl) {
      try {
        targetUrl = await fetchFallback(
          keyword,
          env.GITHUB_RAW_BASE,
          env.GITHUB_TOKEN
        );
      } catch {
        console.error("Fallback also failed for keyword:", keyword);
      }
    }

    // 3. Redirect if we found a valid URL and cache it 1hr in client and cf-edge.
    // Use new URL().href to normalize percent-encoding and strip CRLF sequences
    // that could otherwise be injected into the Location header.
    if (targetUrl && isSafeRedirectUrl(targetUrl)) {
      return redirect302(new URL(targetUrl).href, true);
    }

    // 4. Invalid URL in KV/fallback — show error page
    if (targetUrl) {
      console.error("Unsafe redirect URL for keyword:", keyword, targetUrl);
      return errorPage(env.WEB_APP_ORIGIN);
    }

    // 5. Unknown keyword → redirect to web app keyword page
    return redirect302(
      `${env.WEB_APP_ORIGIN}/${encodeURIComponent(keyword)}`
    );
  },
};
