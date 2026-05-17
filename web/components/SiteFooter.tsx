interface SiteFooterProps {
  showSteps?: boolean;
}

export function SiteFooter({ showSteps = true }: SiteFooterProps) {
  return (
    <footer className="absolute bottom-8 left-10 right-10 z-10 flex items-center justify-between text-[12px] tracking-wider text-[var(--ink-ghost)]">
      {showSteps ? (
        <ol
          data-hero-steps
          aria-label="이용 단계"
          className="m-0 flex list-none gap-8 p-0"
        >
          <li>
            <strong className="text-[var(--ink)]">01</strong> 입력
          </li>
          <li>
            <strong className="text-[var(--ink)]">02</strong> 리다이렉트
          </li>
          <li>
            <strong className="text-[var(--ink)]">03</strong> 최저가
          </li>
        </ol>
      ) : (
        <span />
      )}
      <div>
        커뮤니티 투표로 만들어가는{" "}
        <a
          href="https://github.com/price-kr/price.kr"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-[var(--ink)] transition-colors"
        >
          오픈소스
        </a>
      </div>
    </footer>
  );
}
