import { loadAllKeywords, getDataDir } from "@/lib/keywords";
import { searchKeywords } from "@/lib/hangul";
import Link from "next/link";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ keyword: string }>;
}

/** Pre-generate pages for all known keywords at build time */
export async function generateStaticParams() {
  const keywords = await loadAllKeywords(getDataDir()).catch(() => []);
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

  const allKeywords = await loadAllKeywords(getDataDir()).catch(() => []);
  const keywordList = allKeywords.map((k) => k.keyword);

  const similar = searchKeywords(decoded.slice(0, 1), keywordList)
    .filter((k) => k !== decoded)
    .slice(0, 5);

  const issueUrl = `https://github.com/laeyoung/price.kr/issues/new?template=new-keyword.yml&title=${encodeURIComponent(`[키워드 제안] ${decoded}`)}`;

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
