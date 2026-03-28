import { readFileSync, readdirSync, statSync } from "fs";
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

// ── Non-keyword files to skip ──────────────────────────────────
const NON_KEYWORD_FILES = new Set([
  "blocklist.json",
  "whitelist.json",
  "profanity-blocklist.json",
]);

// ── Dynamic existing keyword discovery ─────────────────────────
function loadExistingKeywords(dir: string): Set<string> {
  const existing = new Set<string>();
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      for (const kw of loadExistingKeywords(fullPath)) existing.add(kw);
    } else if (entry.name.endsWith(".json") && !NON_KEYWORD_FILES.has(entry.name)) {
      try {
        const data = JSON.parse(readFileSync(fullPath, "utf-8"));
        if (typeof data.keyword === "string" && typeof data.url === "string") {
          existing.add(data.keyword);
        }
      } catch { /* skip malformed */ }
    }
  }
  return existing;
}

const EXISTING_KEYWORDS = loadExistingKeywords(dataDir);

// ── URL helper functions ───────────────────────────────────────
const enc = (kw: string) => encodeURIComponent(kw);

// Existing helpers
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

// New helpers
const encar = (kw: string) =>
  `https://www.encar.com/dc/dc_carsearchlist.do?carType=kor&searchType=model&q=${enc(kw)}`;

const yes24 = (kw: string) =>
  `https://www.yes24.com/Product/Search?domain=ALL&query=${enc(kw)}`;

const petFriends = (kw: string) =>
  `https://www.pet-friends.co.kr/search?query=${enc(kw)}`;

const goodChoice = (kw: string) =>
  `https://www.goodchoice.kr/product/search/${enc(kw)}`;

const siksinhot = (kw: string) =>
  `https://www.siksinhot.com/search?keywords=${enc(kw)}`;

const coupang = (kw: string) =>
  `https://www.coupang.com/np/search?component=&q=${enc(kw)}`;

const naverMap = (kw: string) =>
  `https://map.naver.com/p/search/${enc(kw)}`;

const oliveyoung = (kw: string) =>
  `https://www.oliveyoung.co.kr/store/search/getSearchMain.do?query=${enc(kw)}`;

// ── Category definition ────────────────────────────────────────
interface CategoryDef {
  name: string;
  defaultUrl: (kw: string) => string;
  keywords: string[];
  overrides?: Record<string, string>;
}

// ══════════════════════════════════════════════════════════════
// Tier 1: Witty "가격" reinterpretation (custom URLs)
// ══════════════════════════════════════════════════════════════

const TIER1_KEYWORDS: Record<string, string> = {
  // Finance
  "주식": "https://finance.naver.com/",
  "비트코인": "https://upbit.com/",
  "환율": "https://finance.naver.com/marketindex/",
  "금값": "https://finance.naver.com/marketindex/goldDaily498702.naver",
  "은값": "https://finance.naver.com/marketindex/silverDailyQuote.naver",
  "유가": "https://finance.naver.com/marketindex/oilDailyQuote.naver",
  "펀드": "https://finance.naver.com/fund/",
  "코스피": "https://finance.naver.com/sise/sise_index.naver?code=KOSPI",
  "코스닥": "https://finance.naver.com/sise/sise_index.naver?code=KOSDAQ",
  "적금": "https://finlife.fss.or.kr/finlife/savingDepositList.do",
  "예금": "https://finlife.fss.or.kr/finlife/savingDepositList.do",

  // Real estate
  "부동산": "https://hogangnono.com/",
  "전세": "https://kbland.kr/",
  "월세": "https://kbland.kr/",
  "아파트": "https://hogangnono.com/",
  "오피스텔": "https://land.naver.com/article/articleList.naver?rletTypeCd=OR",

  // Public service prices
  "공무원": "https://www.mpm.go.kr/mpm/info/resultPay/bizSalary/",
  "택배": "https://service.epost.go.kr/iservice/usr/charge/EpoPstDmstcChargeList.jsp",
  "택시": "https://kakaomobility.com/",
  "지하철": "https://map.naver.com/p/subway",
  "병원": "https://www.hira.or.kr/",
  "버스": "https://map.naver.com/p/bus",
  "KTX": "https://www.letskorail.com/",
  "고속버스": "https://www.kobus.co.kr/",
  "전기요금": "https://cyber.kepco.co.kr/",
  "수도요금": "https://www.waterworks.seoul.go.kr/",
  "가스요금": "https://www.gasapp.co.kr/",
  "통신비": "https://www.smartchoice.or.kr/",

  // Entertainment prices
  "영화": "https://www.cgv.co.kr/",
  "음악": "https://www.melon.com/ticket/index.htm",
  "드라마": "https://www.netflix.com/kr/",
  "웹툰": "https://comic.naver.com/",
  "넷플릭스": "https://www.netflix.com/kr/",
  "유튜브프리미엄": "https://www.youtube.com/premium",
  "스포티파이": "https://www.spotify.com/kr-ko/premium/",
  "게임": "https://store.steampowered.com/",
  "콘서트": "https://ticket.interpark.com/",
  "뮤지컬": "https://ticket.interpark.com/",
  "전시회": "https://ticket.interpark.com/",

  // Food & drink prices
  "커피": "https://www.starbucks.co.kr/menu/drink_list.do",
  "치킨": "https://www.kyochon.com/menu/chicken.asp",
  "피자": "https://www.dominos.co.kr/menu/pizza",
  "햄버거": "https://www.mcdelivery.co.kr/kr/browse/menu.html",
  "편의점도시락": "https://www.cu.bgfretail.com/product/listCategory.do",

  // Sports
  "야구": "https://statiz.co.kr/",
  "축구": "https://www.kleague.com/",
  "골프": "https://www.teescanner.com/",

  // Travel prices
  "항공권": "https://flightdeal.kr/",
  "호텔": "https://www.goodchoice.kr/",
  "캠핑": "https://www.gocamping.or.kr/",
  "렌터카": "https://www.lotterentacar.net/",

  // Education prices
  "영어": "https://www.toeic.co.kr/",
  "수능": "https://www.ebs.co.kr/",
  "토익": "https://www.toeic.co.kr/",
  "토플": "https://www.ets.org/toefl.html",

  // Lifestyle prices
  "맛집": "https://www.siksinhot.com/",
  "헬스": "https://www.da-gym.co.kr/",
  "로또": "https://dhlottery.co.kr/",

  // Insurance
  "자동차보험": "https://www.carinsurance.or.kr/",
  "실비보험": "https://www.klia.or.kr/",
  "암보험": "https://www.klia.or.kr/",
  "여행자보험": "https://www.klia.or.kr/",

  // Digital services
  "도메인": "https://whois.co.kr/",
  "호스팅": "https://www.cafe24.com/",
  "클라우드": "https://www.ncloud.com/",

  // Weather & info
  "날씨": "https://weather.naver.com",
  "뉴스": `https://search.naver.com/search.naver?where=news&query=${enc("뉴스")}`,
  "농구": `https://search.naver.com/search.naver?query=${enc("농구")}`,
  "이태원": `https://map.naver.com/p/search/${enc("이태원")}`,
  "다이어트": naverShopping("다이어트"),
  "여행": "https://flightdeal.kr/",

  // ══════════════════════════════════════════════════════════════
  // Tier 1 expansion: Witty "가격" reinterpretation
  // ══════════════════════════════════════════════════════════════

  // Life events — 인생 이벤트 비용
  "결혼": `https://search.naver.com/search.naver?query=${enc("결혼 비용 평균")}`,
  "출산": `https://search.naver.com/search.naver?query=${enc("출산 비용")}`,
  "장례": `https://search.naver.com/search.naver?query=${enc("장례 비용")}`,
  "이혼": `https://search.naver.com/search.naver?query=${enc("이혼 비용 위자료")}`,
  "입양": `https://search.naver.com/search.naver?query=${enc("입양 절차 비용")}`,

  // Medical/cosmetic procedures — 시술비
  "교정": `https://search.naver.com/search.naver?query=${enc("치아교정 비용")}`,
  "라식": `https://search.naver.com/search.naver?query=${enc("라식 가격 비교")}`,
  "성형": `https://search.naver.com/search.naver?query=${enc("성형 비용")}`,
  "타투": `https://search.naver.com/search.naver?query=${enc("타투 가격")}`,
  "필러": `https://search.naver.com/search.naver?query=${enc("필러 가격")}`,
  "보톡스": `https://search.naver.com/search.naver?query=${enc("보톡스 가격")}`,
  "임플란트": "https://www.hira.or.kr/",
  "탈모치료": `https://search.naver.com/search.naver?query=${enc("탈모치료 비용")}`,

  // Career salaries — 직업 연봉 시리즈
  "의사": "https://www.saramin.co.kr/zf_user/jobs/industry-salary",
  "변호사": "https://www.saramin.co.kr/zf_user/jobs/industry-salary",
  "판사": "https://www.saramin.co.kr/zf_user/jobs/industry-salary",
  "교사": "https://www.saramin.co.kr/zf_user/jobs/industry-salary",
  "소방관": "https://www.saramin.co.kr/zf_user/jobs/industry-salary",
  "경찰": "https://www.saramin.co.kr/zf_user/jobs/industry-salary",
  "파일럿": "https://www.saramin.co.kr/zf_user/jobs/industry-salary",
  "약사": "https://www.saramin.co.kr/zf_user/jobs/industry-salary",
  "간호사": "https://www.saramin.co.kr/zf_user/jobs/industry-salary",
  "회계사": "https://www.saramin.co.kr/zf_user/jobs/industry-salary",

  // Public fees — 공공요금/벌금
  "군대": "https://www.mma.go.kr/",
  "국회의원": "https://www.assembly.go.kr/",
  "과태료": "https://www.efine.go.kr/",
  "주차위반": "https://www.efine.go.kr/",
  "음주운전": "https://www.efine.go.kr/",

  // Exam/license fees — 응시료
  "한국사": `https://search.naver.com/search.naver?query=${enc("한국사능력검정시험 응시료")}`,
  "공인중개사": `https://search.naver.com/search.naver?query=${enc("공인중개사 시험 응시료")}`,

  // Time/labor — 시간과 노동의 가격
  "시간": "https://www.minimumwage.go.kr/",
  "야근": `https://search.naver.com/search.naver?query=${enc("야근수당 계산기")}`,
  "알바": `https://search.naver.com/search.naver?query=${enc("알바 시급 검색")}`,
  "퇴직": `https://search.naver.com/search.naver?query=${enc("퇴직금 계산기")}`,

  // Legal consequences — 법적 대가
  "실수": "https://www.efine.go.kr/",
  "명예훼손": `https://search.naver.com/search.naver?query=${enc("명예훼손 벌금")}`,

  // Korean culture — 한국 문화 시세
  "세뱃돈": `https://search.naver.com/search.naver?query=${enc("세뱃돈 시세")}`,
  "추석선물": `https://search.shopping.naver.com/search/all?query=${enc("추석선물세트")}`,
  "축의금": `https://search.naver.com/search.naver?query=${enc("축의금 시세")}`,

  // Misc witty — 기타 위트
  "명품": "https://kream.co.kr/",
  "행복": `https://search.naver.com/search.naver?query=${enc("세계 행복 지수 순위")}`,
  "치킨집창업": "https://www.ftc.go.kr/",
  "강아지입양": `https://search.naver.com/search.naver?query=${enc("강아지 입양 비용")}`,
  "고양이입양": `https://search.naver.com/search.naver?query=${enc("고양이 입양 비용")}`,
  "동물병원": `https://search.naver.com/search.naver?query=${enc("동물병원 진료비")}`,
};

// ══════════════════════════════════════════════════════════════
// Tier 2-3: Category-based keywords with default URL mapping
// ══════════════════════════════════════════════════════════════

const CATEGORIES: CategoryDef[] = [
  // ── 1. Food / Groceries (식품/식료품) ──
  {
    name: "식품/식료품",
    defaultUrl: naverShopping,
    keywords: [
      // Existing
      "라면", "김치", "과자", "떡볶이", "떡", "소금빵", "우유", "생수", "삼겹살", "꿀", "홍삼",
      // Meat & Seafood
      "소고기", "돼지고기", "닭고기", "오리고기", "양고기", "연어", "참치", "새우", "굴", "전복",
      "랍스타", "게", "오징어", "멸치", "고등어", "갈치", "광어", "우삼겹", "차돌박이", "양념갈비",
      // Fruits & Vegetables
      "사과", "배", "딸기", "포도", "수박", "참외", "복숭아", "감귤", "바나나", "망고",
      "체리", "블루베리", "키위", "아보카도", "토마토", "감자", "고구마", "양파", "마늘", "대파",
      "브로콜리", "당근", "오이", "상추", "버섯",
      // Processed & Snacks
      "초콜릿", "아이스크림", "빵", "케이크", "요거트", "치즈", "햄", "소시지", "만두", "떡갈비",
      "김", "두부", "계란", "식용유", "간장", "고추장", "된장", "참기름", "소금", "설탕",
      "밀가루", "쌀", "현미", "잡곡", "누룽지",
      // Beverages
      "맥주", "소주", "와인", "위스키", "막걸리", "탄산수", "주스", "두유", "녹차", "커피캡슐",
      // Additional
      "콩나물", "시금치", "미역", "다시마", "어묵", "순대", "보쌈재료",
      "호두", "아몬드", "캐슈넛", "땅콩", "건포도", "말린망고", "육포", "건어물",
      "냉동만두", "냉동피자", "즉석밥", "컵라면", "통조림", "잼", "꿀버터아몬드", "젓갈",
    ],
  },

  // ── 2. Electronics (가전/전자) ──
  {
    name: "가전/전자",
    defaultUrl: danawa,
    keywords: [
      // Existing
      "노트북", "스마트폰", "태블릿", "모니터", "키보드", "마우스", "무선이어폰", "이어폰",
      "충전기", "에어컨", "냉장고", "세탁기", "공기청정기", "정수기", "에어프라이어",
      "전기밥솥", "텀블러", "유모차", "분유",
      // New
      "TV", "스피커", "블루투스스피커", "헤드폰", "웹캠", "프린터", "스캐너", "외장하드",
      "SSD", "USB", "보조배터리", "무선충전기", "그래픽카드", "CPU", "메모리",
      "데스크탑", "미니PC", "게이밍마우스", "게이밍키보드", "모니터암",
      "전자레인지", "식기세척기", "건조기", "로봇청소기", "가습기", "제습기",
      "선풍기", "전기히터", "전기포트", "믹서기", "토스터", "커피머신",
      "전동칫솔", "안마의자", "안마기", "체중계", "혈압계", "전기면도기",
      "드라이기", "고데기", "다리미", "청소기", "스팀청소기", "음식물처리기",
      "전기장판", "온풍기", "서큘레이터", "빔프로젝터",
      // Additional
      "전자사전", "전자피아노", "미디키보드", "액션캠", "드론", "DSLR", "미러리스",
      "삼각대", "메모리카드", "카메라렌즈", "공유기", "허브", "랜케이블",
      "전기그릴", "와플메이커", "에스프레소머신",
    ],
  },

  // ── 3. Fashion (패션) ──
  {
    name: "패션",
    defaultUrl: musinsa,
    keywords: [
      // Existing
      "운동화", "청바지", "원피스", "코트", "후드티", "가디건", "티셔츠", "슬리퍼", "백팩", "선글라스",
      // New
      "구두", "로퍼", "샌들", "부츠", "스니커즈", "플리스", "패딩", "점퍼", "바람막이", "트렌치코트",
      "정장", "셔츠", "블라우스", "니트", "맨투맨", "조거팬츠", "슬랙스", "반바지", "치마", "레깅스",
      "양말", "스타킹", "속옷", "브래지어", "팬티", "파자마", "수영복",
      "모자", "벨트", "지갑", "클러치", "토트백", "크로스백", "캐리어",
      "넥타이", "스카프", "머플러", "장갑", "귀마개", "우산",
      "시계", "팔찌", "목걸이", "반지", "귀걸이", "브로치",
      // Additional
      "트레이닝복", "카고팬츠", "데님재킷", "야구점퍼", "무스탕", "베스트", "폴로셔츠",
      "린넨셔츠", "와이드팬츠", "미니스커트", "롱스커트", "점프수트",
      "숄더백", "에코백", "파우치",
    ],
  },

  // ── 4. Beauty / Personal Care (뷰티/생활) ──
  {
    name: "뷰티/생활",
    defaultUrl: hwahae,
    keywords: [
      // Existing
      "선크림", "립스틱", "마스크팩", "쿠션", "향수", "샴푸", "세럼", "치약",
      // New skincare
      "클렌징폼", "클렌징오일", "토너", "스킨", "로션", "에센스", "아이크림", "수분크림",
      "미스트", "필링젤", "각질제거제", "여드름패치", "자외선차단제", "BB크림", "CC크림",
      // Makeup
      "파운데이션", "컨실러", "블러셔", "하이라이터", "아이섀도", "아이라이너", "마스카라",
      "아이브로우", "립글로즈", "립틴트", "매니큐어", "화장솜", "메이크업브러시",
      // Hair & body
      "린스", "트리트먼트", "헤어오일", "헤어왁스", "염색약", "바디워시", "바디로션",
      "핸드크림", "풋크림", "데오드란트", "면도기", "제모기", "치실", "구강청결제",
    ],
  },

  // ── 5. Home / Interior (가구/인테리어) ──
  {
    name: "가구/인테리어",
    defaultUrl: ohou,
    keywords: [
      // Existing
      "침대", "책상",
      // New furniture
      "소파", "식탁", "의자", "옷장", "서랍장", "신발장", "책장", "TV다이", "거울",
      "화장대", "행거", "선반", "수납장", "매트리스", "베개", "이불", "토퍼",
      // Kitchen & dining
      "냄비", "프라이팬", "칼", "도마", "수저세트", "그릇", "접시", "컵", "텀블러세트",
      // Interior & decor
      "커튼", "블라인드", "러그", "카펫", "벽시계", "액자", "조명", "스탠드", "무드등",
      "디퓨저", "캔들", "화분", "인조잔디", "벽지", "타일", "페인트",
      // Additional
      "수건", "욕실매트", "샤워기", "변기커버", "빨래건조대", "옷걸이", "정리함",
      "리클라이너", "빈백", "좌식의자", "풍경인테리어", "벽걸이선반",
    ],
  },

  // ── 6. Regions (지역) ──
  {
    name: "지역",
    defaultUrl: naverLand,
    keywords: [
      // Existing
      "서울", "부산", "제주도", "인천", "대구", "대전", "광주", "수원", "강남",
      // New cities
      "울산", "세종", "청주", "전주", "포항", "창원", "천안", "김해", "제천", "춘천",
      "원주", "강릉", "속초", "여수", "목포", "순천", "군산", "경주", "안동", "통영",
      "거제", "양양", "평택", "파주", "고양", "성남", "용인", "화성", "안양", "안산",
      "시흥", "김포", "광명", "하남", "남양주", "의정부", "구리", "양주", "동탄",
      // Seoul districts
      "강서", "마포", "송파", "서초", "관악", "용산", "종로", "영등포", "성동", "강동",
    ],
  },

  // ── 7. Baby / Kids (육아/키즈) ──
  {
    name: "육아/키즈",
    defaultUrl: naverShopping,
    keywords: [
      // Existing via danawa
      "등산화",
      // New
      "기저귀", "물티슈", "젖병", "분유포트", "아기침대", "유아카시트", "보행기", "아기띠",
      "아기옷", "아기신발", "아기모자", "턱받이", "아기이불", "이유식", "아기과자", "아기음료",
      "장난감", "블록", "퍼즐", "인형", "레고", "미끄럼틀", "자전거보조바퀴", "킥보드",
      "어린이책", "색연필", "크레파스", "스케치북", "학용품", "필통", "책가방",
      "동화책", "학습지", "피아노", "바이올린",
    ],
  },

  // ── 8. Pets (반려동물) ──
  {
    name: "반려동물",
    defaultUrl: petFriends,
    keywords: [
      // Existing
      "강아지사료", "고양이간식",
      // New dogs
      "강아지간식", "강아지장난감", "강아지옷", "강아지목줄", "강아지하네스", "강아지집",
      "강아지샴푸", "강아지패드", "강아지유모차", "강아지껌",
      // New cats
      "고양이사료", "고양이모래", "고양이화장실", "고양이장난감", "고양이캔", "고양이츄르",
      "고양이집", "캣타워", "캣휠", "고양이스크래처",
      // General
      "펫카메라", "자동급식기", "자동급수기",
    ],
  },

  // ── 9. Health / Supplements (건강/영양) ──
  {
    name: "건강/영양",
    defaultUrl: naverShopping,
    keywords: [
      // New
      "비타민", "오메가3", "유산균", "프로바이오틱스", "콜라겐", "루테인", "철분",
      "칼슘", "마그네슘", "아연", "밀크씨슬", "프로폴리스", "글루코사민", "관절영양제",
      "다이어트보조제", "단백질보충제", "프로틴", "BCAA", "크레아틴", "식이섬유",
      "녹용", "인삼", "흑마늘", "벌꿀", "로열젤리", "스피루리나", "클로렐라",
      "혈압영양제", "혈당영양제", "눈영양제", "간영양제", "장영양제",
      "체온계", "산소포화도측정기", "혈당측정기",
      // Additional
      "종합비타민", "비오틴", "크릴오일", "코엔자임", "감마리놀렌산", "쏘팔메토",
      "석류즙", "양배추즙", "매실액", "흑초", "효소", "레시틴", "EPA",
    ],
  },

  // ── 10. Sports / Outdoor (스포츠/아웃도어) ──
  {
    name: "스포츠/아웃도어",
    defaultUrl: naverShopping,
    keywords: [
      // Existing (요가매트, 자전거 already in generate)
      "요가매트", "자전거",
      // New fitness
      "덤벨", "바벨", "케틀벨", "풀업바", "푸쉬업바", "복근롤러", "런닝머신", "실내자전거",
      "폼롤러", "저항밴드", "점프로프", "짐볼", "헬스장갑", "리스트랩",
      // Outdoor
      "텐트", "침낭", "코펠", "버너", "랜턴", "아이스박스", "돗자리", "해먹", "트레킹화",
      "등산스틱", "등산배낭", "등산복", "고어텍스", "바라클라바",
      // Ball sports
      "축구화", "축구공", "야구글러브", "야구배트", "농구화", "농구공", "배드민턴라켓",
      "테니스라켓", "탁구라켓", "골프채", "골프공", "골프장갑",
      // Additional
      "스키복", "스키장비", "스노보드", "수경", "수영모", "래쉬가드",
      "서핑보드", "낚시대", "낚시릴", "루어", "구명조끼",
    ],
  },

  // ── 11. Auto / Transport (자동차/교통) ──
  {
    name: "자동차/교통",
    defaultUrl: naverShopping,
    keywords: [
      // New
      "블랙박스", "내비게이션", "차량용충전기", "차량용방향제", "핸들커버", "시트커버",
      "자동차매트", "세차용품", "광택제", "타이어", "엔진오일", "와이퍼", "배터리",
      "점프스타터", "자동차시트", "트렁크정리함", "차량용공기청정기", "선팅필름",
      "자동차커버", "주차번호판", "하이패스", "견인로프",
      "전동킥보드", "전기자전거", "전동휠", "헬멧", "자전거잠금장치", "자전거라이트",
      "오토바이", "오토바이헬멧", "오토바이장갑",
      "유아안전시트", "자동차방석", "차박매트", "차박텐트",
    ],
    // 타이어, 엔진오일 use default naverShopping (no override needed)
  },

  // ── 12. Books / Education (도서/교육) ──
  {
    name: "도서/교육",
    defaultUrl: yes24,
    keywords: [
      // New books
      "소설", "에세이", "시집", "자기계발서", "경제경영서", "인문학", "과학책", "역사책",
      "여행가이드", "요리책", "그림책", "만화", "잡지", "사전",
      // Education
      "영어교재", "수학교재", "과학교재", "중학참고서", "고등참고서", "수능교재",
      "토익교재", "토플교재", "한국사교재", "자격증교재",
      // Stationery (also fits here)
      "노트", "다이어리", "플래너", "펜", "만년필", "볼펜", "형광펜",
    ],
  },

  // ── 13. Travel / Accommodation (여행/숙박) ──
  {
    name: "여행/숙박",
    defaultUrl: goodChoice,
    keywords: [
      // New accommodation
      "모텔", "펜션", "리조트", "게스트하우스", "에어비앤비", "글램핑", "한옥스테이",
      // Travel gear
      "여행가방", "보조가방", "여행파우치", "여행용어댑터", "목베개", "수면안대",
      "여권케이스", "와이파이도시락",
      // Destinations
      "오사카", "도쿄", "후쿠오카", "교토", "방콕", "다낭", "발리",
      "싱가포르", "홍콩", "대만", "괌", "하와이", "파리", "런던", "뉴욕",
      // Activities
      "스키장", "워터파크", "놀이공원", "수족관", "온천",
      // Additional
      "사이판", "세부", "보라카이", "푸켓", "몰디브", "라스베가스",
      "유럽여행", "크루즈", "배낭여행", "패키지여행",
    ],
  },

  // ── 14. Finance / Insurance (금융/보험) ──
  {
    name: "금융/보험",
    defaultUrl: (kw) => `https://search.naver.com/search.naver?query=${enc(kw + " 비교")}`,
    keywords: [
      // New
      "신용카드", "체크카드", "대출", "주택담보대출", "전세대출", "학자금대출",
      "자동차대출", "신용대출", "저축은행", "적립식펀드",
      "화재보험", "건강보험", "치아보험", "운전자보험", "펫보험",
      "연금", "국민연금", "퇴직연금", "개인연금",
    ],
  },

  // ── 15. Entertainment (엔터테인먼트) ──
  {
    name: "엔터테인먼트",
    defaultUrl: (kw) => `https://search.naver.com/search.naver?query=${enc(kw)}`,
    keywords: [
      // New
      "닌텐도", "플레이스테이션", "엑스박스", "게임패드", "게이밍모니터",
      "보드게임", "카드게임", "방탈출", "VR", "노래방",
      "영화관", "넷플릭스추천", "디즈니플러스", "왓챠", "티빙", "쿠팡플레이",
      "유튜브", "트위치", "아프리카TV",
      "앨범", "포토카드", "굿즈", "피규어", "프라모델",
    ],
  },

  // ── 16. Office / Stationery (사무/문구) ──
  {
    name: "사무/문구",
    defaultUrl: naverShopping,
    keywords: [
      // New
      "복사지", "프린터잉크", "토너카트리지", "파일", "바인더", "클리어파일",
      "스테이플러", "테이프", "가위", "풀", "메모지", "포스트잇", "명함",
      "화이트보드", "마커펜", "네임펜", "사무용의자", "사무용책상", "모니터받침대",
      "독서대", "북엔드", "서류함", "레이저포인터", "계산기", "파쇄기",
    ],
  },

  // ── 17. Garden / DIY (원예/DIY) ──
  {
    name: "원예/DIY",
    defaultUrl: naverShopping,
    keywords: [
      // New
      "화분받침", "원예용흙", "비료", "씨앗", "모종", "물뿌리개", "전정가위",
      "화분선반", "행잉화분", "다육이", "선인장", "공기정화식물",
      "전동드릴", "드라이버세트", "망치", "줄자", "수평계", "글루건",
    ],
  },

  // ── 18. Wedding / Events (결혼/이벤트) ──
  {
    name: "결혼/이벤트",
    defaultUrl: naverShopping,
    keywords: [
      // New
      "웨딩드레스", "턱시도", "부케", "웨딩촬영", "청첩장", "결혼반지", "예물",
      "한복", "돌잔치", "돌반지", "답례품", "축의금봉투",
      "생일선물", "크리스마스선물", "어버이날선물", "발렌타인선물", "화이트데이선물",
      "꽃다발", "케이크주문", "풍선장식",
    ],
  },

  // ── 19. Digital Services (디지털서비스) ──
  {
    name: "디지털서비스",
    defaultUrl: (kw) => `https://search.naver.com/search.naver?query=${enc(kw + " 가격")}`,
    keywords: [
      // New
      "VPN", "클라우드스토리지", "포토샵", "오피스365", "한컴오피스",
      "백신프로그램", "윈도우", "맥북", "아이패드", "갤럭시탭",
      "인터넷", "와이파이공유기", "메쉬와이파이", "NAS",
      "전자책", "오디오북", "온라인강의", "인강",
      "앱스토어", "구글플레이", "기프티콘", "상품권",
    ],
  },

  // ── 20. Dining / Delivery (외식/배달) ──
  {
    name: "외식/배달",
    defaultUrl: siksinhot,
    keywords: [
      // New
      "삼겹살맛집", "곱창맛집", "초밥맛집", "중국집", "분식",
      "카페", "브런치", "뷔페", "회", "냉면", "칼국수", "짜장면", "짬뽕",
      "국밥", "설렁탕", "감자탕", "부대찌개", "순두부찌개", "김치찌개",
      "족발", "보쌈", "곱창", "대창", "막창",
      "배달음식", "밀키트",
      // Additional
      "해장국", "순댓국", "백반", "비빔밥", "돈까스", "우동", "라멘", "쌀국수",
      "마라탕", "양꼬치", "스시", "타코", "파스타", "리조또", "스테이크",
    ],
  },

  // ── 21. Public Services (공공서비스) ──
  {
    name: "공공서비스",
    defaultUrl: (kw) => `https://search.naver.com/search.naver?query=${enc(kw + " 가격")}`,
    keywords: [
      // New
      "주민등록등본", "여권", "운전면허", "인감증명", "국제운전면허",
      "우체국택배", "등기우편", "국제택배", "이사", "포장이사",
      "세탁소", "수선집", "열쇠", "잠금장치", "방충망",
      "이삿짐센터", "청소업체", "방역업체", "인테리어업체", "이사견적",
    ],
  },

  // ── 22. Real Estate Detail (부동산상세) ──
  {
    name: "부동산상세",
    defaultUrl: naverLand,
    keywords: [
      // New
      "빌라", "원룸", "투룸", "스리룸", "상가", "사무실", "토지", "공장",
      "재건축", "재개발", "분양", "청약", "임대아파트", "공공임대", "행복주택",
    ],
  },

  // ── 23. Lifestyle / Hobbies (라이프스타일/취미) ──
  {
    name: "라이프스타일/취미",
    defaultUrl: naverShopping,
    keywords: [
      "향초", "아로마오일", "명상쿠션", "요가복", "필라테스복",
      "카메라가방", "앨범제작", "스티커", "마스킹테이프", "스탬프",
      "직소퍼즐", "크로스스티치", "뜨개질", "수채화물감", "유화물감",
      "캘리그라피펜", "타로카드", "독서등", "북커버",
    ],
  },
];

// ── Build final keyword→URL mapping ────────────────────────────
function buildKeywordUrls(): Record<string, string> {
  const result: Record<string, string> = { ...TIER1_KEYWORDS };

  for (const cat of CATEGORIES) {
    for (const kw of cat.keywords) {
      if (kw in result) {
        console.error(`DUPLICATE: "${kw}" in category "${cat.name}" — already defined. Skipping.`);
        continue;
      }
      result[kw] = cat.overrides?.[kw] ?? cat.defaultUrl(kw);
    }
  }

  return result;
}

// ── Phase 1: Build and validate ────────────────────────────────
const forceAll = process.argv.includes("--force");
const KEYWORD_URLS = buildKeywordUrls();
const outputLines: string[] = [];
const keywords = Object.keys(KEYWORD_URLS);

for (const keyword of keywords) {
  if (!forceAll) {
    const checkKeyword = /[a-zA-Z]/.test(keyword) ? keyword.toLowerCase() : keyword;
    if (EXISTING_KEYWORDS.has(keyword) || EXISTING_KEYWORDS.has(checkKeyword)) {
      console.error(`SKIP: ${keyword} (already exists)`);
      continue;
    }
  }
  if (isBlockedKeyword(keyword, allBlocked)) {
    console.error(`BLOCKED: ${keyword} — TSV generation aborted`);
    process.exit(1);
  }
  // English keywords must be lowercased per CLAUDE.md: "Always lowercased in
  // both filename and JSON keyword field to ensure KV key matches filename"
  const finalKeyword = /[a-zA-Z]/.test(keyword) ? keyword.toLowerCase() : keyword;
  outputLines.push(`${finalKeyword}\t${KEYWORD_URLS[keyword]}`);
}

// ── Phase 2: Output all lines at once ──────────────────────────
console.log(outputLines.join("\n"));
console.error(`\nTotal defined: ${keywords.length}`);
console.error(`Already existing: ${EXISTING_KEYWORDS.size}`);
console.error(`New entries generated: ${outputLines.length}`);
