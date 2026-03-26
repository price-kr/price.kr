# Design: Witty URL Mapping for Top 100 Keywords

> **상태**: 승인됨
> **작성일**: 2026-03-26
> **목표**: 97개 키워드의 target URL을 "가격" 테마에 맞게 창의적으로 재배정

---

## 1. 핵심 컨셉

**"○○.가격.kr" = "○○의 가격을 가장 잘 보여주는 곳"**

키워드를 3개 Tier로 분류하여 URL을 배정한다:

| Tier | 전략 | 비율 |
|------|------|------|
| **Tier 1: 위트** | "가격"을 재미있게 재해석 | ~30개 |
| **Tier 2: 가격비교** | 전문 가격비교 사이트 | ~40개 |
| **Tier 3: 유지/미세조정** | 네이버 쇼핑 유지 또는 부동산 시세 | ~27개 |

---

## 2. Tier 1: 위트 키워드 (~30개)

"가격"을 창의적으로 재해석하여 관련 사이트로 연결.

| 키워드 | 위트 해석 | Target URL | 도메인 |
|--------|----------|------------|--------|
| 공무원 | 봉급표 | https://www.mpm.go.kr/mpm/info/resultPay/bizSalary/2026/ | www.mpm.go.kr |
| 부동산 | 아파트 실거래가 | https://hogangnono.com/ | hogangnono.com |
| 전세 | 전세가격지수 | https://kbland.kr/ (KB부동산 전세지수) | kbland.kr |
| 주식 | 코스피 지수 | https://finance.naver.com/ | finance.naver.com |
| 비트코인 | 실시간 시세 | https://upbit.com/ | upbit.com |
| 환율 | 실시간 환율 | https://finance.naver.com/marketindex/ | finance.naver.com |
| 로또 | 당첨번호/당첨금 | https://dhlottery.co.kr/ | dhlottery.co.kr |
| 영화 | 영화 티켓값 | https://www.cgv.co.kr/ | www.cgv.co.kr |
| 커피 | 스타벅스 메뉴 가격 | https://www.starbucks.co.kr/menu/drink_list.do | www.starbucks.co.kr |
| 치킨 | 교촌 메뉴 가격 | https://www.kyochon.com/menu/chicken.asp (정확한 경로 조사 필요) | kyochon.com |
| 항공권 | 최저가 항공권 | https://www.skyscanner.co.kr/ | www.skyscanner.co.kr |
| 호텔 | 숙박 가격비교 | https://www.goodchoice.kr/ (여기어때) | www.goodchoice.kr |
| 택배 | 택배 요금표 | https://parcel.epost.go.kr/ (우체국 택배) | epost.go.kr |
| 택시 | 택시 요금 안내 | https://kakaomobility.com/ (카카오T) | kakaomobility.com |
| 지하철 | 지하철 요금표 | https://smrt.co.kr/ (서울교통공사) | smrt.co.kr |
| 야구 | KBO 선수 연봉 순위 | https://statiz.co.kr/ | statiz.co.kr |
| 축구 | K리그 선수 연봉 | 구현 시 웹 조사로 확정 | 조사 필요 |
| 골프 | 그린피 비교 | 구현 시 웹 조사로 확정 | 조사 필요 |
| 음악 | 멜론 구독료 | https://www.melon.com/ | www.melon.com |
| 드라마 | 넷플릭스 구독료 | https://www.netflix.com/kr/ | www.netflix.com |
| 웹툰 | 네이버웹툰 쿠키 가격 | https://comic.naver.com/ | comic.naver.com |
| 캠핑 | 캠핑장 예약 가격 | https://www.gocamping.or.kr/ | gocamping.or.kr |
| 영어 | TOEIC 응시료 | https://www.toeic.co.kr/ | www.toeic.co.kr |
| 수능 | EBS 수능특강 교재 | https://www.ebs.co.kr/ | www.ebs.co.kr |
| 병원 | 비급여 진료비 | https://www.hira.or.kr/ (건보심사평가원) | www.hira.or.kr |
| 맛집 | 맛집 평균 가격 | https://www.siksinhot.com/ (식신) | www.siksinhot.com |
| 헬스 | 헬스장 가격비교 | 구현 시 웹 조사로 확정 | 조사 필요 |
| 날씨 | 위트 해석 어려우면 현행(weather.naver.com) 유지 | 구현 시 결정 | — |
| 뉴스 | 위트 해석 어려우면 현행 유지 | 구현 시 결정 | — |
| 다이어트 | 다이어트 식품 가격 → 네이버 쇼핑 유지 가능 | 구현 시 결정 | — |
| 농구 | KBL 연봉 정보 부족 → 네이버 검색 유지 가능 | 구현 시 결정 | — |

---

## 3. Tier 2: 가격비교 쇼핑 키워드 (~40개)

네이버 쇼핑 대신 전문 가격비교 사이트로 업그레이드.

### 가전/전자 → 다나와 (search.danawa.com)

URL 패턴: `https://search.danawa.com/dsearch.php?query={encoded_keyword}`

키워드: 노트북, 스마트폰, 태블릿, 모니터, 키보드, 마우스, 무선이어폰, 이어폰, 충전기, 에어컨, 냉장고, 세탁기, 공기청정기, 정수기, 에어프라이어, 전기밥솥, 텀블러, 유모차, 분유, 등산화, 요가매트, 자전거 (22개)

### 패션 → 무신사 (www.musinsa.com)

URL 패턴: `https://www.musinsa.com/search/goods?keyword={encoded_keyword}`

키워드: 운동화, 청바지, 원피스, 코트, 후드티, 가디건, 티셔츠, 슬리퍼, 백팩, 선글라스 (10개)

### 뷰티 → 화해 (www.hwahae.co.kr)

URL 패턴: `https://www.hwahae.co.kr/search?query={encoded_keyword}`

키워드: 선크림, 립스틱, 마스크팩, 쿠션, 향수, 샴푸, 세럼, 치약 (8개)

### 가구 → 오늘의집 (ohou.se)

URL 패턴: `https://ohou.se/search?query={encoded_keyword}`

키워드: 침대, 책상 (2개)

### 반려동물 → 펫프렌즈 (pet-friends.co.kr)

URL 패턴: `https://www.pet-friends.co.kr/search?query={encoded_keyword}` (정확한 경로 조사 필요)

키워드: 강아지사료, 고양이간식 (2개)

---

## 4. Tier 3: 유지 및 미세조정 (~27개)

### 식품 → 네이버 쇼핑 유지

전문 가격비교 사이트가 없는 식품류. 현행 네이버 쇼핑 URL 유지.

키워드: 라면, 김치, 과자, 떡볶이, 떡, 소금빵, 우유, 생수, 삼겹살, 꿀, 홍삼 (11개)

### 지역/도시 → 네이버 부동산 (land.naver.com)

"이 동네의 가격 = 이 동네 집값" 재해석.

URL 패턴: `https://land.naver.com/search/result.naver?query={encoded_keyword}` (정확한 경로 조사 필요)

키워드: 서울, 부산, 제주도, 인천, 대구, 대전, 광주, 수원, 강남 (9개)

### 기타 현행 유지

| 키워드 | 현행 URL | 유지 이유 |
|--------|---------|----------|
| 이태원 | map.naver.com | 지도 검색이 적절 (문화적 고려) |

---

## 5. 구현 계획

### 파일 변경

| 파일 | 동작 | 설명 |
|------|------|------|
| `scripts/generate-top100-tsv.ts` | **REWRITE** | 카테고리 기반 → 키워드별 개별 URL 매핑으로 전환 |
| `data/whitelist.json` | **UPDATE** | ~25개 신규 도메인 추가 |
| `scripts/top100-keywords.tsv` | **REGENERATE** | 새 URL로 재생성 |
| `data/{초성}/{첫글자}/{keyword}.json` × 97 | **REGENERATE** | 새 URL로 재생성 |
| `docs/DEV_PROGRESS.md` | **UPDATE** | 태스크 완료 표시 |
| `docs/DEV_LOG.md` | **UPDATE** | 개발 로그 추가 |

### 스크립트 구조 변경

기존: 카테고리 기반 `getTargetUrl(keyword, category)` switch문
변경: 키워드별 개별 URL 맵 + 카테고리 fallback

```typescript
// 키워드별 개별 URL (Tier 1 위트 + Tier 2 가격비교 + Tier 3 부동산)
const CUSTOM_URLS: Record<string, string> = {
  "공무원": "https://www.mpm.go.kr/mpm/info/resultPay/bizSalary/2026/",
  "부동산": "https://hogangnono.com/",
  "노트북": "https://search.danawa.com/dsearch.php?query=노트북",
  // ...
};

// fallback: 카테고리 기반 (Tier 3 식품 등)
function getTargetUrl(keyword: string, category: string): string {
  if (CUSTOM_URLS[keyword]) return CUSTOM_URLS[keyword];
  // 기존 카테고리 switch문 (식품 → 네이버 쇼핑 등)
}
```

### 검증 계획

1. 모든 URL이 실제 접속 가능한지 웹 검색으로 확인
2. 신규 도메인이 whitelist에 포함되었는지 확인
3. blocklist 충돌 없음 확인
4. 기존 52개 테스트 통과
5. 기존 키워드 (만두, 가방, iphone) 보존 확인

### 미확정 항목 (웹 조사로 확정)

- 축구, 골프, 헬스: 최적 URL
- 날씨, 뉴스, 다이어트, 농구: 위트 해석 가능 여부 판단 후 결정
- 각 사이트의 정확한 검색 URL 경로
- 치킨 (교촌 외 대안), 펫프렌즈 검색 URL 형식

---

## 6. 신규 whitelist 도메인

```json
[
  "finance.naver.com",
  "land.naver.com",
  "comic.naver.com",
  "dhlottery.co.kr",
  "search.danawa.com",
  "www.musinsa.com",
  "www.hwahae.co.kr",
  "ohou.se",
  "www.cgv.co.kr",
  "www.starbucks.co.kr",
  "www.skyscanner.co.kr",
  "www.goodchoice.kr",
  "upbit.com",
  "statiz.co.kr",
  "www.mpm.go.kr",
  "hogangnono.com",
  "www.hira.or.kr",
  "kbland.kr",
  "www.pet-friends.co.kr",
  "parcel.epost.go.kr",
  "www.toeic.co.kr",
  "www.ebs.co.kr",
  "www.melon.com",
  "www.netflix.com",
  "www.siksinhot.com",
  "www.gocamping.or.kr",
  "kakaomobility.com",
  "smrt.co.kr",
  "www.kyochon.com"
]
```
