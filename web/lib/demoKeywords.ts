const PREFERRED_DEMO_KEYWORDS = [
  "만두", "가방", "iphone", "김치", "커피", "노트북",
  "운동화", "아이패드", "에어팟", "라면", "치킨", "비타민",
  "선풍기", "책상", "모니터", "키보드", "맥북", "청바지",
  "화장품", "향수", "운동복", "안경", "시계", "지갑",
];

export function pickDemoKeywords(all: string[], n: number): string[] {
  const set = new Set(all);
  const filtered = PREFERRED_DEMO_KEYWORDS.filter((k) => set.has(k));
  if (filtered.length >= 6) return filtered.slice(0, n);
  if (all.length > 0) return all.slice(0, n);
  return PREFERRED_DEMO_KEYWORDS.slice(0, n);
}
