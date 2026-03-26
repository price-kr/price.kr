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

// ── URL helper functions ───────────────────────────────────────
const enc = (kw: string) => encodeURIComponent(kw);

const naverShopping = (kw: string) =>
  `https://search.shopping.naver.com/search/all?query=${enc(kw)}`;

const danawa = (kw: string) =>
  `https://search.danawa.com/dsearch.php?query=${enc(kw)}`;

const musinsa = (kw: string) =>
  `https://www.musinsa.com/search/goods?keyword=${enc(kw)}`;

const hwahae = (kw: string) =>
  `https://www.hwahae.co.kr/search?query=${enc(kw)}`;

const ohou = (kw: string) =>
  `https://ohou.se/search?query=${enc(kw)}`;

const naverLand = (kw: string) =>
  `https://land.naver.com/search/result.naver?query=${enc(kw)}`;

// ── Keyword → URL mapping ──────────────────────────────────────
// "○○.가격.kr = ○○의 가격을 가장 잘 보여주는 곳"
//
// Tier 1: Witty — creative "가격" reinterpretation
// Tier 2: Price comparison — specialized comparison sites
// Tier 3: Fallback — Naver Shopping (food), Naver Land (regions)

const KEYWORD_URLS: Record<string, string> = {
  // ══════════════════════════════════════════════════════════════
  // Tier 1: Witty "가격" reinterpretation (~30)
  // ══════════════════════════════════════════════════════════════

  // Finance — 금융 시세/지수
  "주식": "https://finance.naver.com/",
  "비트코인": "https://upbit.com/",
  "환율": "https://finance.naver.com/marketindex/",

  // Real estate — 부동산 실거래가
  "부동산": "https://hogangnono.com/",
  "전세": "https://kbland.kr/",

  // Public service prices — 공공 요금/봉급
  "공무원": "https://www.mpm.go.kr/mpm/info/resultPay/bizSalary/",
  "택배": "https://service.epost.go.kr/iservice/usr/charge/EpoPstDmstcChargeList.jsp",
  "택시": "https://kakaomobility.com/",
  "지하철": "https://map.naver.com/p/subway",
  "병원": "https://www.hira.or.kr/",

  // Entertainment prices — 구독료/티켓값
  "영화": "https://www.cgv.co.kr/",
  "음악": "https://www.melon.com/ticket/index.htm",
  "드라마": "https://www.netflix.com/kr/",
  "웹툰": "https://comic.naver.com/",

  // Food & drink prices — 메뉴 가격
  "커피": "https://www.starbucks.co.kr/menu/drink_list.do",
  "치킨": "https://www.kyochon.com/menu/chicken.asp",

  // Sports — 선수 연봉/이용료
  "야구": "https://statiz.co.kr/",
  "축구": "https://www.kleague.com/",
  "골프": "https://www.teescanner.com/",

  // Travel prices — 여행 가격비교
  "항공권": "https://www.skyscanner.co.kr/",
  "호텔": "https://www.goodchoice.kr/",
  "캠핑": "https://www.gocamping.or.kr/",

  // Education prices — 응시료/교재
  "영어": "https://www.toeic.co.kr/",
  "수능": "https://www.ebs.co.kr/",

  // Lifestyle prices — 가격비교/리뷰
  "맛집": "https://www.siksinhot.com/",
  "헬스": "https://www.da-gym.co.kr/",
  "로또": "https://dhlottery.co.kr/",

  // ══════════════════════════════════════════════════════════════
  // Tier 2: Price comparison sites (~44)
  // ══════════════════════════════════════════════════════════════

  // Electronics/Appliances → Danawa (가전/전자 가격비교)
  "노트북": danawa("노트북"),
  "스마트폰": danawa("스마트폰"),
  "태블릿": danawa("태블릿"),
  "모니터": danawa("모니터"),
  "키보드": danawa("키보드"),
  "마우스": danawa("마우스"),
  "무선이어폰": danawa("무선이어폰"),
  "이어폰": danawa("이어폰"),
  "충전기": danawa("충전기"),
  "에어컨": danawa("에어컨"),
  "냉장고": danawa("냉장고"),
  "세탁기": danawa("세탁기"),
  "공기청정기": danawa("공기청정기"),
  "정수기": danawa("정수기"),
  "에어프라이어": danawa("에어프라이어"),
  "전기밥솥": danawa("전기밥솥"),
  "텀블러": danawa("텀블러"),
  "유모차": danawa("유모차"),
  "분유": danawa("분유"),
  "등산화": musinsa("등산화"),
  "요가매트": naverShopping("요가매트"),
  "자전거": naverShopping("자전거"),

  // Fashion → Musinsa (패션 가격비교)
  "운동화": musinsa("운동화"),
  "청바지": musinsa("청바지"),
  "원피스": musinsa("원피스"),
  "코트": musinsa("코트"),
  "후드티": musinsa("후드티"),
  "가디건": musinsa("가디건"),
  "티셔츠": musinsa("티셔츠"),
  "슬리퍼": musinsa("슬리퍼"),
  "백팩": musinsa("백팩"),
  "선글라스": musinsa("선글라스"),

  // Beauty → Hwahae (뷰티 성분+가격 비교)
  "선크림": hwahae("선크림"),
  "립스틱": hwahae("립스틱"),
  "마스크팩": hwahae("마스크팩"),
  "쿠션": hwahae("쿠션"),
  "향수": hwahae("향수"),
  "샴푸": hwahae("샴푸"),
  "세럼": hwahae("세럼"),
  "치약": hwahae("치약"),

  // Furniture → Ohou (가구 가격비교)
  "침대": ohou("침대"),
  "책상": ohou("책상"),

  // Pets → Pet Friends (반려동물 쇼핑)
  "강아지사료": `https://www.pet-friends.co.kr/search?query=${enc("강아지사료")}`,
  "고양이간식": `https://www.pet-friends.co.kr/search?query=${enc("고양이간식")}`,

  // ══════════════════════════════════════════════════════════════
  // Tier 3: Fallback — best available destination
  // ══════════════════════════════════════════════════════════════

  // Food → Naver Shopping (식품 가격비교 대안 없음)
  "라면": naverShopping("라면"),
  "김치": naverShopping("김치"),
  "과자": naverShopping("과자"),
  "떡볶이": naverShopping("떡볶이"),
  "떡": naverShopping("떡"),
  "소금빵": naverShopping("소금빵"),
  "우유": naverShopping("우유"),
  "생수": naverShopping("생수"),
  "삼겹살": naverShopping("삼겹살"),
  "꿀": naverShopping("꿀"),
  "홍삼": naverShopping("홍삼"),

  // Regions → Naver Real Estate (지역 = 집값)
  "서울": naverLand("서울"),
  "부산": naverLand("부산"),
  "제주도": naverLand("제주도"),
  "인천": naverLand("인천"),
  "대구": naverLand("대구"),
  "대전": naverLand("대전"),
  "광주": naverLand("광주"),
  "수원": naverLand("수원"),
  "강남": naverLand("강남"),

  // Other — keep current best destination
  "이태원": `https://map.naver.com/p/search/${enc("이태원")}`,
  "날씨": "https://weather.naver.com",
  "뉴스": `https://search.naver.com/search.naver?where=news&query=${enc("뉴스")}`,
  "다이어트": naverShopping("다이어트"),
  "농구": `https://search.naver.com/search.naver?query=${enc("농구")}`,
  "여행": `https://search.naver.com/search.naver?query=${enc("여행")}`,
};

// ── Phase 1: Validate all keywords (before any output) ─────────
const outputLines: string[] = [];
const keywords = Object.keys(KEYWORD_URLS);

for (const keyword of keywords) {
  if (EXISTING_KEYWORDS.has(keyword)) {
    console.error(`SKIP: ${keyword} (already exists)`);
    continue;
  }
  if (isBlockedKeyword(keyword, allBlocked)) {
    console.error(`BLOCKED: ${keyword} — TSV 생성 중단`);
    process.exit(1);
  }
  outputLines.push(`${keyword}\t${KEYWORD_URLS[keyword]}`);
}

// ── Phase 2: Output all lines at once (no partial TSV) ─────────
console.log(outputLines.join("\n"));
console.error(`\nGenerated ${outputLines.length} keyword entries`);
