import { loadAllKeywords, getDataDir } from "@/lib/keywords";
import { SearchBar } from "@/components/SearchBar";

export default async function HomePage() {
  const keywords = await loadAllKeywords(getDataDir()).catch(() => []);
  const keywordList = keywords.map((k) => k.keyword);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      <h1 className="text-4xl font-bold mb-2">가격.kr</h1>
      <p className="text-gray-600 mb-8 text-center">
        한글 키워드로 최저가를 찾아보세요
      </p>
      <SearchBar keywords={keywordList} />
      <p className="mt-12 text-sm text-gray-400">
        커뮤니티가 만들어가는 오픈소스 단축 URL 서비스
      </p>
    </main>
  );
}
