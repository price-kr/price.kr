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

  if (typeof navigator === "undefined" || !navigator.sendBeacon) return;

  const payload: { type: string; keyword: string; value?: string } = {
    type,
    keyword,
  };
  if (value !== undefined) {
    payload.value = value;
  }

  navigator.sendBeacon(TRACK_URL, JSON.stringify(payload));
}
