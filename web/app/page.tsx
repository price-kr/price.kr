import { loadData, getDataDir } from "@/lib/keywords";
import { AddressBar } from "@/components/AddressBar";
import { FloatingChips } from "@/components/FloatingChips";
import { HeroStats } from "@/components/HeroStats";

function pickDemoKeywords(all: string[], n: number): string[] {
  const preferred = [
    "만두", "가방", "iphone", "김치", "커피", "노트북",
    "운동화", "아이패드", "에어팟", "라면", "치킨", "비타민",
    "선풍기", "책상", "모니터", "키보드", "맥북", "청바지",
    "화장품", "향수", "운동복", "안경", "시계", "지갑",
  ];
  const set = new Set(all);
  const filtered = preferred.filter((k) => set.has(k));
  if (filtered.length >= 6) return filtered.slice(0, n);
  return all.slice(0, n);
}

export default async function HomePage() {
  const dataDir = getDataDir();
  const { keywords } = await loadData(dataDir).catch(() => ({ keywords: [] }));
  const keywordList = keywords.map((k) => k.keyword);
  const demoKeywords = pickDemoKeywords(keywordList, 24);

  return (
    <main className="relative min-h-screen overflow-x-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 20% 30%, rgba(229,90,43,0.04), transparent 50%), radial-gradient(circle at 80% 70%, rgba(20,30,80,0.03), transparent 50%)",
        }}
      />

      <FloatingChips keywords={demoKeywords} />

      <header
        data-hero-header
        className="absolute top-7 left-10 right-10 z-10 flex items-center justify-between"
      >
        <a href="/" className="flex items-baseline gap-1.5">
          <span className="text-[22px] font-bold tracking-tight text-[var(--ink)]">가격</span>
          <span className="text-[22px] font-light text-[var(--ink-ghost)]">.kr</span>
        </a>
        <HeroStats totalKeywords={keywordList.length} />
      </header>

      <section className="relative z-[5] flex min-h-screen flex-col items-center justify-center px-6 py-24">
        <p
          className="m-0 inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[13px] font-semibold"
          style={{
            background: "var(--accent-soft)",
            color: "var(--accent)",
            letterSpacing: "0.02em",
          }}
        >
          <span
            aria-hidden="true"
            style={{
              width: 6,
              height: 6,
              borderRadius: 3,
              background: "var(--accent)",
              animation: "pulse-dot 1.6s ease-in-out infinite",
            }}
          />
          주소창에 바로 입력하세요
        </p>

        <h1
          className="mt-5 text-center font-extrabold tracking-tight"
          style={{
            fontSize: "clamp(40px, 5.5vw, 56px)",
            lineHeight: 1.05,
            letterSpacing: "-0.04em",
            color: "var(--ink)",
          }}
        >
          한 단어로 끝나는
          <br />
          <span style={{ color: "var(--accent)" }}>최저가 검색.</span>
        </h1>

        <div className="mt-12 w-full max-w-[1100px]">
          <AddressBar keywords={demoKeywords} />
        </div>
      </section>

      <footer className="absolute bottom-8 left-10 right-10 z-10 flex items-center justify-between text-[12px] tracking-wider text-[var(--ink-ghost)]">
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
    </main>
  );
}
