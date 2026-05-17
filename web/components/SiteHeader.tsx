import { HeroStats } from "./HeroStats";

interface SiteHeaderProps {
  totalKeywords: number;
}

export function SiteHeader({ totalKeywords }: SiteHeaderProps) {
  return (
    <header
      data-hero-header
      className="absolute top-7 left-10 right-10 z-10 flex items-center justify-between"
    >
      <a href="/" className="flex items-baseline gap-1.5">
        <span className="text-[22px] font-bold tracking-tight text-[var(--ink)]">가격</span>
        <span className="text-[22px] font-light text-[var(--ink-ghost)]">.kr</span>
      </a>
      <HeroStats totalKeywords={totalKeywords} />
    </header>
  );
}
