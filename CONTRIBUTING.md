# 기여 가이드 (Contributing Guide)

가격.kr에 기여해 주셔서 감사합니다!

## 새 키워드 제안하기

1. [Issues](../../issues/new?template=new-keyword.yml)에서 "새 단어 제안하기" 양식을 작성합니다.
2. 봇이 자동으로 유효성을 검증하고 PR을 생성합니다.
3. 커뮤니티가 👍/👎로 투표합니다.
4. 찬성 3개 이상이면 자동 병합됩니다.

## 로컬 개발 환경

### 요구사항
- Node.js 20+
- npm

### 설치
```bash
# 저장소 클론 (sparse checkout 권장 — 파일이 많을 수 있습니다)
git clone --filter=blob:none --sparse https://github.com/price-kr/price.kr.git
cd price.kr
git sparse-checkout set workers web scripts .github

npm install
```

### 테스트
```bash
npm test  # 전체 워크스페이스 테스트
```

### Workers 로컬 개발
```bash
cd workers && npm run dev
```

### Web 로컬 개발
```bash
cd web && npm run dev
```

## 데이터 구조

키워드는 `data/` 디렉토리에 JSON 파일로 저장됩니다:
- 한글: `data/{초성}/{첫글자}/{키워드}.json`
- 영문: `data/_en/{keyword}.json`
- 숫자: `data/_num/{keyword}.json`

## 행동 강령

모든 기여자는 존중과 배려를 바탕으로 참여해 주세요.
