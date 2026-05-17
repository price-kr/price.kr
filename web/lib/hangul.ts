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

const PARTICLES = {
  topic: { with: "은", without: "는", fallback: "은(는)" },
  subject: { with: "이", without: "가", fallback: "이(가)" },
  object: { with: "을", without: "를", fallback: "을(를)" },
  and: { with: "과", without: "와", fallback: "과(와)" },
} as const;

export type KoreanParticle = keyof typeof PARTICLES;

/**
 * Pick the correct Korean particle ending for `word` based on whether the
 * last syllable has a 받침 (final consonant). Returns the bracketed fallback
 * form (e.g. "은(는)") when the word does not end in a Hangul syllable.
 */
export function pickParticle(word: string, type: KoreanParticle): string {
  if (!word) return PARTICLES[type].fallback;
  const lastChar = word[word.length - 1];
  const code = lastChar.charCodeAt(0);
  if (code < HANGUL_BASE || code > 0xd7a3) {
    return PARTICLES[type].fallback;
  }
  const hasBatchim = (code - HANGUL_BASE) % 28 !== 0;
  return hasBatchim ? PARTICLES[type].with : PARTICLES[type].without;
}
