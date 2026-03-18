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

export function parseKeywordJson(text: string): string | null {
  try {
    const data = JSON.parse(text);
    return data?.url ?? null;
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
  githubToken?: string
): Promise<string | null> {
  // Check Cache API first
  const cache = await caches.open("github-raw-contents");
  const cacheKey = new Request(keyword);
  const cached = await cache.match(cacheKey);
  if (cached) {
    const text = await cached.text();
    return parseKeywordJson(text);
  }

  // Fetch from GitHub
  const url = buildFallbackUrl(keyword, githubRawBase);
  const headers: Record<string, string> = { "User-Agent": "price-kr-worker" };
  if (githubToken) {
    headers["Authorization"] = `token ${githubToken}`;
  }

  const response = await fetch(url, { headers });
  if (!response.ok) return null;

  // Read body as text first, then cache and parse from the string
  const text = await response.text();

  // Cache for 5 minutes
  const responseToCache = new Response(text, {
    headers: {
      "Cache-Control": "public, max-age=300, s-maxage=300", // NOTE(cf-cache): s-maxage for edge caching, max-age for browser caching.
      "Cache-Tag": "github-raw-contents",
    },
  });
  await cache.put(cacheKey, responseToCache).catch(() => { /* noop: cache put failure shouldn't block the response */ });

  return parseKeywordJson(text);
}
