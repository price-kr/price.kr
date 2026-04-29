import { loadData, getDataDir } from "@/lib/keywords";

interface HeroStatsProps {
  totalKeywords?: number;
  todayRedirects?: number;
}

export async function HeroStats({
  totalKeywords,
  todayRedirects = 12394,
}: HeroStatsProps) {
  let count = totalKeywords;
  if (count === undefined) {
    const { keywords } = await loadData(getDataDir()).catch(() => ({
      keywords: [],
    }));
    count = keywords.length;
  }

  return (
    <div data-hero-stats className="flex items-center gap-6 text-[13px] text-[var(--ink-mute)]">
      <span data-stat-total>
        등록된 단어 <strong className="text-[var(--ink)]">{count.toLocaleString("ko-KR")}</strong>개
      </span>
      <span className="text-[var(--ink-ghost)]">·</span>
      <span>
        오늘 <strong className="text-[var(--ink)]">{todayRedirects.toLocaleString("ko-KR")}</strong>회 이동
      </span>
      <span className="text-[var(--ink-ghost)]">·</span>
      <a
        href="https://github.com/price-kr/price.kr"
        target="_blank"
        rel="noopener noreferrer"
        className="font-semibold text-[var(--accent)] hover:underline"
      >
        GitHub →
      </a>
    </div>
  );
}
