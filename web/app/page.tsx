import { loadData, getDataDir } from "@/lib/keywords";
import { pickDemoKeywords } from "@/lib/demoKeywords";
import { AddressBar } from "@/components/AddressBar";
import { FloatingChips } from "@/components/FloatingChips";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

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

      <SiteHeader totalKeywords={keywordList.length} />

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

      <SiteFooter />
    </main>
  );
}
