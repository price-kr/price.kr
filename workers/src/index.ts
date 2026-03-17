import { extractSubdomain } from "./subdomain";
import { fetchFallback } from "./fallback";

export interface Env {
  KEYWORDS: KVNamespace;
  MAIN_DOMAIN: string;
  WEB_APP_ORIGIN: string;
  GITHUB_RAW_BASE: string;
  GITHUB_TOKEN?: string; // Optional: for higher rate limits on fallback
}

function redirect302(url: string): Response {
  return new Response(null, {
    status: 302,
    headers: {
      Location: url,
      "Cache-Control": "private, no-store",
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
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const host = request.headers.get("Host") ?? url.hostname;

    // Extract subdomain from Host header
    const keyword = extractSubdomain(host, env.MAIN_DOMAIN);

    // No subdomain → bare domain handled by Vercel via DNS
    if (!keyword) {
      return new Response("Not found", { status: 404 });
    }

    // 1. Try KV lookup
    try {
      const targetUrl = await env.KEYWORDS.get(keyword);
      if (targetUrl) {
        return redirect302(targetUrl);
      }
    } catch {
      // KV failed → try fallback
      console.error("KV lookup failed for keyword:", keyword);

      try {
        const fallbackUrl = await fetchFallback(
          keyword,
          env.GITHUB_RAW_BASE,
          env.GITHUB_TOKEN
        );
        if (fallbackUrl) {
          return redirect302(fallbackUrl);
        }
      } catch {
        console.error("Fallback also failed for keyword:", keyword);
        return errorPage(env.WEB_APP_ORIGIN);
      }
    }

    // Unknown keyword → redirect to web app keyword page
    return redirect302(
      `${env.WEB_APP_ORIGIN}/${encodeURIComponent(keyword)}`
    );
  },
};
