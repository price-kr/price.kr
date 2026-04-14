import { loadData, getDataDir, loadKeywordFile } from "@/lib/keywords";
import { searchKeywords } from "@/lib/hangul";
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

  // Determine keyword status: alias, canonical, or unregistered
  let keywordData = null;
  try {
    keywordData = await loadKeywordFile(decoded, dataDir);
  } catch {
    keywordData = null;
  }
  const isAlias = keywordData !== null && typeof (keywordData as any).alias_of === "string";
  const isCanonical = keywordData !== null && typeof (keywordData as any).url === "string";

  // Use stored keyword name for canonical lookup to handle case differences (e.g. "Gold" vs "gold")
  const canonicalLookupKeyword =
    isCanonical && typeof (keywordData as any).keyword === "string"
      ? ((keywordData as any).keyword as string)
      : decoded;

  // For canonical: load data once and derive aliases without a redundant scan
  // For unregistered: load data once to find similar keywords
  // For alias: no loadData call needed
  let aliases: string[] = [];
  let similar: string[] = [];

  if (isCanonical) {
    const { aliases: allAliases } = await loadData(dataDir).catch(() => ({ keywords: [], aliases: [] }));
    aliases = allAliases.filter((a) => a.alias_of === canonicalLookupKeyword).map((a) => a.keyword);
  } else if (!isAlias) {
    const { keywords: allKeywords } = await loadData(dataDir).catch(() => ({ keywords: [], aliases: [] }));
    const keywordList = allKeywords.map((k) => k.keyword);
    similar = searchKeywords(decoded.slice(0, 1), keywordList)
      .filter((k) => k !== decoded)
      .slice(0, 5);
  }

  const issueUrl = `https://github.com/price-kr/price.kr/issues/new?template=new-keyword.yml&title=${encodeURIComponent(`[키워드 제안] ${decoded}`)}`;
  const canonicalKeyword = isAlias ? (keywordData as any).alias_of as string : null;

  // --- Alias view ---
  if (isAlias && canonicalKeyword) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-8">
        <h1 className="text-3xl font-bold mb-4">
          <span className="text-blue-600">{decoded}</span>은(는){" "}
          <a href={`https://${canonicalKeyword}.가격.kr`} className="text-blue-500 underline">
            {canonicalKeyword}
          </a>
          의 다른 이름입니다
        </h1>
        <p className="text-gray-600 mb-6 text-center">
          <a href={`https://${decoded}.가격.kr`} className="font-mono text-blue-600">
            {decoded}.가격.kr
          </a>{" "}
          방문 시{" "}
          <a href={`https://${canonicalKeyword}.가격.kr`} className="font-mono text-blue-600">
            {canonicalKeyword}.가격.kr
          </a>
          과 동일한 목적지로 이동됩니다.
        </p>
        <a
          href={`https://${canonicalKeyword}.가격.kr`}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          {canonicalKeyword}.가격.kr 바로가기
        </a>
        <Link href="/" className="mt-4 text-gray-500 hover:text-gray-700">
          ← 메인으로 돌아가기
        </Link>
      </main>
    );
  }

  // --- Canonical view (keyword is registered) ---
  if (isCanonical) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-8">
        <h1 className="text-3xl font-bold mb-4">
          <span className="text-blue-600">{decoded}</span>.가격.kr
        </h1>
        <p className="text-gray-600 mb-6">
          이 키워드는 등록되어 있습니다.{" "}
          <a href={`https://${decoded}.가격.kr`} className="text-blue-500 underline">
            {decoded}.가격.kr
          </a>
          로 접속하면 바로 이동됩니다.
        </p>
        {aliases.length > 0 && (
          <div className="mb-6 text-center">
            <h2 className="text-lg font-semibold mb-2">다른 이름</h2>
            <ul className="flex gap-2 flex-wrap justify-center">
              {aliases.map((alias) => (
                <li key={alias}>
                  <a
                    href={`https://${alias}.가격.kr`}
                    className="px-3 py-1 bg-gray-100 rounded-full text-blue-600 hover:bg-gray-200 transition"
                  >
                    {alias}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
        <Link href="/" className="mt-4 text-gray-500 hover:text-gray-700">
          ← 메인으로 돌아가기
        </Link>
      </main>
    );
  }

  // --- Unregistered view (existing behavior) ---
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      <h1 className="text-3xl font-bold mb-4">
        <span className="text-blue-600">{decoded}</span> 키워드가 아직
        등록되지 않았습니다
      </h1>

      {similar.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-2">유사한 키워드</h2>
          <ul className="space-y-1">
            {similar.map((kw) => (
              <li key={kw}>
                <a
                  href={`https://${kw}.가격.kr`}
                  className="text-blue-500 hover:underline"
                >
                  {kw}.가격.kr
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      <a
        href={issueUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
      >
        이 단어 제안하기
      </a>

      <Link href="/" className="mt-4 text-gray-500 hover:text-gray-700">
        ← 메인으로 돌아가기
      </Link>
    </main>
  );
}
