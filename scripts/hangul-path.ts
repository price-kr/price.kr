const CHOSEONG_LIST = [
  "ㄱ", "ㄲ", "ㄴ", "ㄷ", "ㄸ", "ㄹ", "ㅁ", "ㅂ", "ㅃ",
  "ㅅ", "ㅆ", "ㅇ", "ㅈ", "ㅉ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ",
];

const HANGUL_BASE = 0xac00;
const CHOSEONG_INTERVAL = 21 * 28; // 588

export function getChoseong(char: string): string | null {
  const code = char.charCodeAt(0);
  if (code < HANGUL_BASE || code > 0xd7a3) return null;
  const index = Math.floor((code - HANGUL_BASE) / CHOSEONG_INTERVAL);
  return CHOSEONG_LIST[index] ?? null;
}

function isKorean(char: string): boolean {
  return getChoseong(char) !== null;
}

function startsWithDigit(keyword: string): boolean {
  return /^\d/.test(keyword);
}

export function getKeywordPath(keyword: string): string {
  if (!keyword) throw new Error("keyword must not be empty");
  const first = keyword[0];

  if (startsWithDigit(keyword)) {
    return `data/_num/${keyword}.json`;
  }

  if (!isKorean(first)) {
    return `data/_en/${keyword.toLowerCase()}.json`;
  }

  const choseong = getChoseong(first)!;
  return `data/${choseong}/${first}/${keyword}.json`;
}
