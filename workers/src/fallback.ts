const CHOSEONG_LIST = [
  "ㄱ", "ㄲ", "ㄴ", "ㄷ", "ㄸ", "ㄹ", "ㅁ", "ㅂ", "ㅃ",
  "ㅅ", "ㅆ", "ㅇ", "ㅈ", "ㅉ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ",
];
const HANGUL_BASE = 0xac00;
const CHOSEONG_INTERVAL = 588;

function getKeywordPath(keyword: string): string {
  const first = keyword[0];
  if (/^\d/.test(keyword)) return `data/_num/${keyword}.json`;
  const code = first.charCodeAt(0);
  if (code < HANGUL_BASE || code > 0xd7a3) return `data/_en/${keyword.toLowerCase()}.json`;
  const cho = CHOSEONG_LIST[Math.floor((code - HANGUL_BASE) / CHOSEONG_INTERVAL)];
  return `data/${cho}/${first}/${keyword}.json`;
}

export function buildFallbackUrl(keyword: string, githubRawBase: string): string {
  const path = getKeywordPath(keyword);
  // URL-encode each path segment for non-ASCII characters
  const encodedPath = path
    .split("/")
    .map((seg) => encodeURIComponent(seg))
    .join("/");
  return `${githubRawBase}/${encodedPath}`;
}

export interface KeywordData {
  keyword: string;
  url?: string;
  alias_of?: string;
}

export function parseKeywordJson(text: string): KeywordData | null {
  try {
    const data = JSON.parse(text);
    if (typeof data.keyword !== "string") return null;
    return {
      keyword: data.keyword,
      url: typeof data.url === "string" ? data.url : undefined,
      alias_of: typeof data.alias_of === "string" ? data.alias_of : undefined,
    };
  } catch {
    return null;
  }
}

/**
 * Fetch keyword URL from GitHub Raw Content as fallback.
 * Uses Cache API to avoid repeated fetches.
 */
export async function fetchFallback(
  keyword: string,
  githubRawBase: string,
  githubToken?: string,
  depth: number = 0
): Promise<string | null> {
  // Prevent infinite loops or deep chains
  if (depth > 1) return null;

  // Check Cache API first
  const cache = await caches.open("github-raw-contents");
  // keyword might be non-ASCII, so use a dummy base URL for Request
  const cacheKey = new Request(`https://github-raw-cache/${encodeURIComponent(keyword)}`);
  const cached = await cache.match(cacheKey);
  if (cached) {
    const text = await cached.text();
    const data = parseKeywordJson(text);
    if (!data) return null;
    if (data.url) return data.url;
    if (data.alias_of) {
      return fetchFallback(data.alias_of, githubRawBase, githubToken, depth + 1);
    }
  }

  // Fetch from GitHub
  const url = buildFallbackUrl(keyword, githubRawBase);
  const parsedUrl = new URL(url);
  if (parsedUrl.hostname !== "raw.githubusercontent.com") {
    return null;
  }
  const headers: Record<string, string> = { "User-Agent": "price-kr-worker" };
  if (githubToken) {
    headers["Authorization"] = `token ${githubToken}`;
  }

  const response = await fetch(url, { headers });
  if (!response.ok) return null;

  // Read body as text first, then cache and parse from the string
  const text = await response.text();
  const data = parseKeywordJson(text);

  if (data) {
    // Cache for 5 minutes
    const responseToCache = new Response(text, {
      headers: {
        "Cache-Control": "public, max-age=300, s-maxage=300", // NOTE(cf-cache): s-maxage for edge caching, max-age for browser caching.
        "Cache-Tag": "github-raw-contents",
      },
    });
    // @ts-ignore - CF Workers Request can take non-standard URLs
    await cache.put(cacheKey, responseToCache).catch(() => { /* noop: cache put failure shouldn't block the response */ });

    if (data.url) return data.url;
    if (data.alias_of) {
      return fetchFallback(data.alias_of, githubRawBase, githubToken, depth + 1);
    }
  }

  return null;
}
