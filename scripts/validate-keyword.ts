const CHOSEONG_LIST = [
  "ㄱ", "ㄲ", "ㄴ", "ㄷ", "ㄸ", "ㄹ", "ㅁ", "ㅂ", "ㅃ",
  "ㅅ", "ㅆ", "ㅇ", "ㅈ", "ㅉ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ",
];
const HANGUL_BASE = 0xac00;
const CHOSEONG_INTERVAL = 588;
const JAMO_SET = new Set(CHOSEONG_LIST);

export function normalizeKeyword(keyword: string): string {
  return keyword
    .normalize("NFC")
    .replace(/[^가-힣ㄱ-ㅎa-zA-Z0-9]/g, "")
    .toLowerCase();
}

/** Extract choseong sequence from composed Hangul text */
function extractChoseong(text: string): string {
  return [...text].map((ch) => {
    const code = ch.charCodeAt(0);
    if (code >= HANGUL_BASE && code <= 0xd7a3) {
      return CHOSEONG_LIST[Math.floor((code - HANGUL_BASE) / CHOSEONG_INTERVAL)];
    }
    return ch;
  }).join("");
}

/** Check if a string consists only of Hangul consonant Jamo (ㄱ-ㅎ) */
function isChoseongOnly(text: string): boolean {
  return [...text].every((ch) => JAMO_SET.has(ch));
}

export function isBlockedKeyword(
  keyword: string,
  blocklist: string[]
): boolean {
  const normalized = normalizeKeyword(keyword);

  // Direct match after normalization
  if (blocklist.some((blocked) => normalizeKeyword(blocked) === normalized)) {
    return true;
  }

  // Jamo-only input (e.g. "ㅋㅍ") → compare against choseong of blocklist words
  if (isChoseongOnly(normalized)) {
    return blocklist.some((blocked) => {
      const blockedChoseong = extractChoseong(normalizeKeyword(blocked));
      return blockedChoseong === normalized;
    });
  }

  return false;
}
