import { loadData, getDataDir, loadKeywordFile } from "@/lib/keywords";
import { searchKeywords, pickParticle } from "@/lib/hangul";
import { pickDemoKeywords } from "@/lib/demoKeywords";
import { FloatingChips } from "@/components/FloatingChips";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import Link from "next/link";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ keyword: string }>;
}

/** Pre-generate pages for all known keywords at build time */
export async function generateStaticParams() {
  const { keywords } = await loadData(getDataDir()).catch(() => ({ keywords: [] }));
  return keywords.map((k) => ({ keyword: k.keyword }));
}

/** Allow dynamic params for unregistered keywords */
export const dynamicParams = true;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { keyword } = await params;
  const decoded = safeDecodeURIComponent(keyword);
  return {
    title: `${decoded} - 가격.kr`,
    description: `${decoded} 키워드의 가격.kr 리다이렉트 페이지. 커뮤니티 투표로 목적지가 결정됩니다.`,
  };
}

function safeDecodeURIComponent(str: string): string {
  try {
    return decodeURIComponent(str);
  } catch {
    return str;
  }
}

export default async function KeywordPage({ params }: Props) {
  const { keyword } = await params;
  const decoded = safeDecodeURIComponent(keyword);
  const dataDir = getDataDir();

  // Load full data once — used by demo chips for all views, plus aliases/similar
  // derivation for canonical/unregistered views. Cost is comparable to the
  // existing per-view load (canonical and unregistered already called loadData).
  const { keywords: allKeywords, aliases: allAliases } = await loadData(dataDir).catch(
    () => ({ keywords: [], aliases: [] })
  );
  const keywordList = allKeywords.map((k) => k.keyword);
  const demoKeywords = pickDemoKeywords(keywordList, 24);

  // Determine keyword status: alias, canonical, or unregistered
  let keywordData = null;
  try {
    keywordData = await loadKeywordFile(decoded, dataDir);
  } catch {
    keywordData = null;
  }
  const isAlias = keywordData !== null && typeof (keywordData as any).alias_of === "string";
  const isCanonical = keywordData !== null && typeof (keywordData as any).url === "string";

  const canonicalLookupKeyword =
    isCanonical && typeof (keywordData as any).keyword === "string"
      ? ((keywordData as any).keyword as string)
      : decoded;

  const aliases: string[] = isCanonical
    ? allAliases.filter((a) => a.alias_of === canonicalLookupKeyword).map((a) => a.keyword)
    : [];

  const similar: string[] = !isAlias && !isCanonical
    ? searchKeywords(decoded.slice(0, 1), keywordList)
        .filter((k) => k !== decoded)
        .slice(0, 5)
    : [];

  const issueUrl = `https://github.com/price-kr/price.kr/issues/new?template=new-keyword.yml&title=${encodeURIComponent(`[키워드 제안] ${decoded}`)}`;
  const canonicalKeyword = isAlias ? ((keywordData as any).alias_of as string) : null;

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

      <FloatingChips keywords={demoKeywords} excludeKeyword={decoded} />

      <SiteHeader totalKeywords={keywordList.length} />

      <section className="relative z-[5] flex min-h-screen flex-col items-center justify-center px-6 py-24">
        {isAlias && canonicalKeyword ? (
          <AliasView decoded={decoded} canonicalKeyword={canonicalKeyword} />
        ) : isCanonical ? (
          <CanonicalView decoded={decoded} aliases={aliases} />
        ) : (
          <UnregisteredView decoded={decoded} similar={similar} issueUrl={issueUrl} />
        )}
      </section>

      <SiteFooter showSteps={false} />
    </main>
  );
}

function EyebrowPill({ children, tone = "accent" }: { children: React.ReactNode; tone?: "accent" | "muted" }) {
  const styles =
    tone === "muted"
      ? { background: "rgba(0,0,0,0.04)", color: "var(--ink-mute)" }
      : { background: "var(--accent-soft)", color: "var(--accent)" };
  return (
    <p
      className="m-0 inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[13px] font-semibold"
      style={{ ...styles, letterSpacing: "0.02em" }}
    >
      {children}
    </p>
  );
}

function MonoUrl({ keyword, size = "lg" }: { keyword: string; size?: "lg" | "md" | "sm" }) {
  const fontSize =
    size === "lg" ? "clamp(22px, 2.6vw, 38px)" : size === "md" ? "18px" : "14px";
  return (
    <span
      className="font-mono font-semibold tracking-tight whitespace-nowrap"
      style={{ fontSize, letterSpacing: "-0.02em" }}
    >
      <span style={{ color: "var(--accent)" }}>{keyword}</span>
      <span style={{ color: "var(--ink-faint)" }}>.가격.kr</span>
    </span>
  );
}

function PrimaryCTA({
  href,
  external = false,
  children,
}: {
  href: string;
  external?: boolean;
  children: React.ReactNode;
}) {
  const externalProps = external
    ? { target: "_blank", rel: "noopener noreferrer" as const }
    : {};
  return (
    <a
      href={href}
      {...externalProps}
      className="inline-flex items-center gap-2 rounded-[var(--r-md)] px-7 py-4 text-[15px] font-semibold transition-transform hover:scale-[1.02]"
      style={{
        background: "var(--accent)",
        color: "#fff",
        boxShadow: "var(--shadow-bar)",
      }}
    >
      {children}
    </a>
  );
}

function BackLink() {
  return (
    <Link
      href="/"
      className="mt-8 text-[13px] tracking-wider text-[var(--ink-faint)] hover:text-[var(--ink)] transition-colors"
    >
      ← 메인으로 돌아가기
    </Link>
  );
}

function AliasView({ decoded, canonicalKeyword }: { decoded: string; canonicalKeyword: string }) {
  const topicParticle = pickParticle(decoded, "topic");
  return (
    <>
      <EyebrowPill tone="muted">별칭 키워드</EyebrowPill>

      <h1
        className="mt-5 text-center font-extrabold tracking-tight"
        style={{
          fontSize: "clamp(32px, 4.5vw, 48px)",
          lineHeight: 1.1,
          letterSpacing: "-0.04em",
          color: "var(--ink)",
        }}
      >
        <span style={{ color: "var(--accent)" }}>{decoded}</span>
        {topicParticle}{" "}
        <span style={{ color: "var(--ink)" }}>{canonicalKeyword}</span>의
        <br />
        다른 이름입니다
      </h1>

      <p className="mt-6 max-w-xl text-center text-[15px] leading-relaxed text-[var(--ink-mute)]">
        <a
          href={`https://${decoded}.가격.kr`}
          className="underline-offset-2 hover:underline"
        >
          <MonoUrl keyword={decoded} size="md" />
        </a>{" "}
        방문 시{" "}
        <a
          href={`https://${canonicalKeyword}.가격.kr`}
          className="underline-offset-2 hover:underline"
        >
          <MonoUrl keyword={canonicalKeyword} size="md" />
        </a>
        과 동일한 목적지로 이동됩니다.
      </p>

      <div className="mt-10">
        <PrimaryCTA href={`https://${canonicalKeyword}.가격.kr`}>
          <span className="font-mono tracking-tight">
            {canonicalKeyword}.가격.kr
          </span>
          <span>바로가기 →</span>
        </PrimaryCTA>
      </div>

      <BackLink />
    </>
  );
}

function CanonicalView({ decoded, aliases }: { decoded: string; aliases: string[] }) {
  return (
    <>
      <EyebrowPill>
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
        등록된 키워드
      </EyebrowPill>

      <h1
        className="mt-5 text-center font-extrabold tracking-tight"
        style={{
          fontSize: "clamp(36px, 5vw, 56px)",
          lineHeight: 1.05,
          letterSpacing: "-0.04em",
          color: "var(--ink)",
        }}
      >
        <MonoUrl keyword={decoded} size="lg" />
      </h1>

      <p className="mt-6 max-w-xl text-center text-[15px] leading-relaxed text-[var(--ink-mute)]">
        주소창에{" "}
        <a
          href={`https://${decoded}.가격.kr`}
          className="underline-offset-2 hover:underline"
        >
          <MonoUrl keyword={decoded} size="md" />
        </a>{" "}
        입력 시 즉시 최저가 페이지로 이동합니다.
      </p>

      {aliases.length > 0 && (
        <div className="mt-10 flex flex-col items-center gap-3">
          <p className="m-0 text-[12px] tracking-wider text-[var(--ink-ghost)]">다른 이름</p>
          <ul className="flex max-w-xl flex-wrap justify-center gap-2 p-0">
            {aliases.map((alias) => (
              <li key={alias} className="list-none">
                <a
                  href={`https://${alias}.가격.kr`}
                  className="inline-flex items-center rounded-[var(--r-pill)] border border-[var(--hairline)] bg-[var(--bg-elev-1)] px-3.5 py-1.5 font-mono text-[13px] tracking-tight text-[var(--ink)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
                >
                  {alias}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-10">
        <PrimaryCTA href={`https://${decoded}.가격.kr`}>
          바로 이동하기 →
        </PrimaryCTA>
      </div>

      <BackLink />
    </>
  );
}

function UnregisteredView({
  decoded,
  similar,
  issueUrl,
}: {
  decoded: string;
  similar: string[];
  issueUrl: string;
}) {
  const topicParticle = pickParticle(decoded, "topic");
  return (
    <>
      <EyebrowPill tone="muted">미등록 키워드</EyebrowPill>

      <h1
        className="mt-5 text-center font-extrabold tracking-tight"
        style={{
          fontSize: "clamp(32px, 4.5vw, 48px)",
          lineHeight: 1.1,
          letterSpacing: "-0.04em",
          color: "var(--ink)",
        }}
      >
        <span style={{ color: "var(--accent)" }}>{decoded}</span>
        {topicParticle} 아직
        <br />
        등록되지 않은 단어입니다
      </h1>

      <p className="mt-6 max-w-xl text-center text-[15px] leading-relaxed text-[var(--ink-mute)]">
        커뮤니티 투표로 등록할 수 있어요. 비슷한 단어부터 둘러볼 수도 있습니다.
      </p>

      {similar.length > 0 && (
        <div className="mt-10 flex flex-col items-center gap-3">
          <p className="m-0 text-[12px] tracking-wider text-[var(--ink-ghost)]">유사한 키워드</p>
          <ul className="flex max-w-xl flex-wrap justify-center gap-2 p-0">
            {similar.map((kw) => (
              <li key={kw} className="list-none">
                <a
                  href={`https://${kw}.가격.kr`}
                  className="inline-flex items-center rounded-[var(--r-pill)] border border-[var(--hairline)] bg-[var(--bg-elev-1)] px-3.5 py-1.5 font-mono text-[13px] tracking-tight transition-colors hover:border-[var(--accent)]"
                >
                  <span style={{ color: "var(--accent)" }}>{kw}</span>
                  <span style={{ color: "var(--ink-faint)" }}>.가격.kr</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-10">
        <PrimaryCTA href={issueUrl} external>
          이 단어 제안하기 →
        </PrimaryCTA>
      </div>

      <BackLink />
    </>
  );
}
