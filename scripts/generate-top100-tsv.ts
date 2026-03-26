import { readFileSync } from "fs";
import { join } from "path";
import { isBlockedKeyword } from "./validate-keyword.js";

// ── Blocklist loading ──────────────────────────────────────────
const dataDir = join(import.meta.dirname, "..", "data");
const blocklist: string[] = JSON.parse(
  readFileSync(join(dataDir, "blocklist.json"), "utf-8")
);
const profanity: string[] = JSON.parse(
  readFileSync(join(dataDir, "profanity-blocklist.json"), "utf-8")
);
const allBlocked = [...blocklist, ...profanity];

// ── Existing keywords (skip to avoid overwriting created date) ─
const EXISTING_KEYWORDS = new Set(["만두", "가방", "iphone"]);

// ── Keyword list with categories ───────────────────────────────
// Selected from 2025-2026 Korean search trends research.
// Categories: shopping, weather, place, wiki, news, food_map,
//             finance, sports, entertainment, realestate, info, transport
const keywords: Array<{ keyword: string; category: string }> = [
  // ── Shopping: Food / Groceries (13) ──
  { keyword: "라면", category: "shopping" },
  { keyword: "김치", category: "shopping" },
  { keyword: "커피", category: "shopping" },
  { keyword: "떡볶이", category: "shopping" },
  { keyword: "치킨", category: "shopping" },
  { keyword: "과자", category: "shopping" },
  { keyword: "소금빵", category: "shopping" },
  { keyword: "우유", category: "shopping" },
  { keyword: "생수", category: "shopping" },
  { keyword: "삼겹살", category: "shopping" },
  { keyword: "떡", category: "shopping" },
  { keyword: "홍삼", category: "shopping" },
  { keyword: "꿀", category: "shopping" },

  // ── Shopping: Electronics (9) ──
  { keyword: "노트북", category: "shopping" },
  { keyword: "에어팟", category: "shopping" },
  { keyword: "스마트폰", category: "shopping" },
  { keyword: "태블릿", category: "shopping" },
  { keyword: "모니터", category: "shopping" },
  { keyword: "키보드", category: "shopping" },
  { keyword: "마우스", category: "shopping" },
  { keyword: "이어폰", category: "shopping" },
  { keyword: "충전기", category: "shopping" },

  // ── Shopping: Fashion (10) ──
  { keyword: "원피스", category: "shopping" },
  { keyword: "코트", category: "shopping" },
  { keyword: "운동화", category: "shopping" },
  { keyword: "청바지", category: "shopping" },
  { keyword: "후드티", category: "shopping" },
  { keyword: "가디건", category: "shopping" },
  { keyword: "티셔츠", category: "shopping" },
  { keyword: "슬리퍼", category: "shopping" },
  { keyword: "백팩", category: "shopping" },
  { keyword: "선글라스", category: "shopping" },

  // ── Shopping: Beauty (8) ──
  { keyword: "선크림", category: "shopping" },
  { keyword: "립스틱", category: "shopping" },
  { keyword: "마스크팩", category: "shopping" },
  { keyword: "쿠션", category: "shopping" },
  { keyword: "향수", category: "shopping" },
  { keyword: "샴푸", category: "shopping" },
  { keyword: "치약", category: "shopping" },
  { keyword: "세럼", category: "shopping" },

  // ── Shopping: Home / Appliances (10) ──
  { keyword: "에어컨", category: "shopping" },
  { keyword: "냉장고", category: "shopping" },
  { keyword: "세탁기", category: "shopping" },
  { keyword: "공기청정기", category: "shopping" },
  { keyword: "정수기", category: "shopping" },
  { keyword: "텀블러", category: "shopping" },
  { keyword: "에어프라이어", category: "shopping" },
  { keyword: "전기밥솥", category: "shopping" },
  { keyword: "침대", category: "shopping" },
  { keyword: "책상", category: "shopping" },

  // ── Shopping: Baby / Pet / Sports gear (7) ──
  { keyword: "유모차", category: "shopping" },
  { keyword: "분유", category: "shopping" },
  { keyword: "강아지사료", category: "shopping" },
  { keyword: "고양이간식", category: "shopping" },
  { keyword: "요가매트", category: "shopping" },
  { keyword: "등산화", category: "shopping" },
  { keyword: "자전거", category: "shopping" },

  // ── Information: Finance (5) ──
  { keyword: "주식", category: "finance" },
  { keyword: "환율", category: "finance" },
  { keyword: "비트코인", category: "finance" },
  { keyword: "부동산", category: "realestate" },
  { keyword: "전세", category: "realestate" },

  // ── Information: Sports (4) ──
  { keyword: "야구", category: "sports" },
  { keyword: "축구", category: "sports" },
  { keyword: "농구", category: "sports" },
  { keyword: "골프", category: "sports" },

  // ── Information: Entertainment (4) ──
  { keyword: "영화", category: "entertainment" },
  { keyword: "드라마", category: "entertainment" },
  { keyword: "웹툰", category: "entertainment" },
  { keyword: "음악", category: "entertainment" },

  // ── Information: Travel (4) ──
  { keyword: "호텔", category: "info" },
  { keyword: "항공권", category: "info" },
  { keyword: "여행", category: "info" },
  { keyword: "캠핑", category: "shopping" },

  // ── Information: Health (3) ──
  { keyword: "다이어트", category: "info" },
  { keyword: "헬스", category: "info" },
  { keyword: "병원", category: "transport" },  // map search for nearby hospitals

  // ── Information: Education (3) ──
  { keyword: "영어", category: "info" },
  { keyword: "수능", category: "info" },
  { keyword: "공무원", category: "info" },

  // ── Information: Transportation (2) ──
  { keyword: "지하철", category: "transport" },
  { keyword: "택시", category: "transport" },

  // ── Region / City (10) ──
  { keyword: "서울", category: "place" },
  { keyword: "부산", category: "place" },
  { keyword: "제주도", category: "place" },
  { keyword: "인천", category: "place" },
  { keyword: "대구", category: "place" },
  { keyword: "대전", category: "place" },
  { keyword: "광주", category: "place" },
  { keyword: "수원", category: "place" },
  { keyword: "강남", category: "place" },
  { keyword: "이태원", category: "place" },

  // ── Other (5) ──
  { keyword: "날씨", category: "weather" },
  { keyword: "뉴스", category: "news" },
  { keyword: "맛집", category: "food_map" },
  { keyword: "로또", category: "info" },
  { keyword: "택배", category: "info" },
];

// ── URL generation by category ─────────────────────────────────
function getTargetUrl(keyword: string, category: string): string {
  const encoded = encodeURIComponent(keyword);
  switch (category) {
    case "shopping":
      return `https://search.shopping.naver.com/search/all?query=${encoded}`;
    case "weather":
      return "https://weather.naver.com";
    case "place":
    case "wiki":
      return `https://namu.wiki/w/${encoded}`;
    case "news":
      return `https://search.naver.com/search.naver?where=news&query=${encoded}`;
    case "food_map": {
      // Avoid "맛집맛집" duplication
      const mapQuery = keyword === "맛집" ? keyword : keyword + "맛집";
      return `https://map.naver.com/p/search/${encodeURIComponent(mapQuery)}`;
    }
    case "transport":
      return `https://map.naver.com/p/search/${encoded}`;
    case "finance":
    case "sports":
    case "entertainment":
    case "realestate":
    case "info":
      return `https://search.naver.com/search.naver?query=${encoded}`;
    default:
      return `https://search.naver.com/search.naver?query=${encoded}`;
  }
}

// ── Phase 1: Validate all keywords (before any output) ─────────
const outputLines: string[] = [];

for (const { keyword, category } of keywords) {
  if (EXISTING_KEYWORDS.has(keyword)) {
    console.error(`SKIP: ${keyword} (already exists)`);
    continue;
  }
  if (isBlockedKeyword(keyword, allBlocked)) {
    console.error(`BLOCKED: ${keyword} — TSV 생성 중단`);
    process.exit(1);
  }
  outputLines.push(`${keyword}\t${getTargetUrl(keyword, category)}`);
}

// ── Phase 2: Output all lines at once (no partial TSV) ─────────
console.log(outputLines.join("\n"));
console.error(`\nGenerated ${outputLines.length} keyword entries`);
