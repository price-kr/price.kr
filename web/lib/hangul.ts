const CHOSEONG_LIST = [
  "ㄱ", "ㄲ", "ㄴ", "ㄷ", "ㄸ", "ㄹ", "ㅁ", "ㅂ", "ㅃ",
  "ㅅ", "ㅆ", "ㅇ", "ㅈ", "ㅉ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ",
];

const HANGUL_BASE = 0xac00;
const CHOSEONG_INTERVAL = 21 * 28;

function getCharChoseong(char: string): string | null {
  const code = char.charCodeAt(0);
  if (code < HANGUL_BASE || code > 0xd7a3) return null;
  const index = Math.floor((code - HANGUL_BASE) / CHOSEONG_INTERVAL);
  return CHOSEONG_LIST[index] ?? null;
}

export function getChoseong(text: string): string {
  return [...text]
    .map((ch) => getCharChoseong(ch) ?? ch)
    .join("");
}

function isChoseongOnly(text: string): boolean {
  return [...text].every((ch) => CHOSEONG_LIST.includes(ch));
}

export function searchKeywords(
  query: string,
  keywords: string[]
): string[] {
  if (isChoseongOnly(query)) {
    return keywords.filter((kw) => getChoseong(kw).startsWith(query));
  }
  return keywords.filter((kw) => kw.startsWith(query));
}
