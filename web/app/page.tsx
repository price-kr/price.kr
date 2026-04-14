import { loadData, getDataDir } from "@/lib/keywords";
import { SearchBar } from "@/components/SearchBar";

export default async function HomePage() {
  const dataDir = getDataDir();
  const { keywords } = await loadData(dataDir).catch(() => ({ keywords: [] }));

  // `loadData` already resolves aliases into `keywords`, so use only `keywords`
  // here to avoid duplicate suggestions and duplicate React keys in SearchBar.
  const keywordList = keywords.map((k) => k.keyword);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      <h1 className="text-4xl font-bold mb-2">가격.kr</h1>
      <p className="text-gray-600 mb-8 text-center">
        한글 키워드로 최저가를 찾아보세요
      </p>
      <SearchBar keywords={keywordList} />
      <p className="mt-12 text-sm text-gray-400">
        커뮤니티가 만들어가는{" "}
        <a 
          href="https://github.com/price-kr/price.kr" 
          className="underline hover:text-gray-600 transition-colors"
          target="_blank" 
          rel="noopener noreferrer"
        >
          오픈소스
        </a>{" "}
        단축 URL 서비스
      </p>
    </main>
  );
}
