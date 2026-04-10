# 기여 가이드 (Contributing Guide)

가격.kr에 관심을 가져 주셔서 감사합니다! GitHub 계정만 있으면 누구나 참여할 수 있습니다. 계정이 없다면 [여기에서 무료로 만들 수 있습니다](https://github.com/signup).

## 1. 새 키워드 제안하기

가장 쉬운 기여 방법입니다.

1. [새 단어 제안하기](../../issues/new?template=new-keyword.yml) 양식을 작성합니다.
2. 봇이 자동으로 유효성을 검증하고 PR을 생성합니다.
3. 커뮤니티가 👍/👎로 투표합니다.
4. 찬성 3개 이상이면 자동 병합됩니다.

## 2. 키워드 변경/삭제 요청

- **변경**: [키워드 변경 요청](../../issues/new?template=change-keyword.yml) 양식을 작성합니다. 변경 PR은 찬성 5개 이상이 필요합니다.
- **삭제**: [키워드 삭제 요청](../../issues/new?template=delete-keyword.yml) 양식을 작성합니다. 삭제 요청은 자동화 파이프라인 없이 관리자가 수동으로 검토합니다.

## 3. 투표로 참여하기

등록 대기 중인 키워드에 투표할 수 있습니다.

1. [Pull Requests](../../pulls) 탭을 엽니다.
2. 키워드 추가/변경 PR을 찾습니다.
3. PR 본문 아래의 반응(Reaction) 버튼에서 👍 또는 👎를 클릭합니다.

👍 3개 이상(변경은 5개 이상)이 모이면 자동으로 병합됩니다.

## 4. 버그 리포트 / 기능 제안

- **버그**: [버그 리포트](../../issues/new?template=bug-report.yml) 양식을 작성합니다.
- **기능 제안**: [기능 제안](../../issues/new?template=feature-request.yml) 양식을 작성합니다.

## 5. 코드 기여

### 개발 환경 설정

```bash
# 저장소 포크 후 클론 (sparse checkout 권장 — 키워드 JSON 파일이 많습니다)
git clone --filter=blob:none --sparse https://github.com/<your-username>/price.kr.git
cd price.kr
git sparse-checkout set workers web scripts .github

# Hangul 파일명이 깨지지 않도록 설정
git config core.quotePath false

# 의존성 설치
npm install
```

### 요구사항

- Node.js 20+
- npm

### 테스트

```bash
npm test  # 전체 워크스페이스 테스트
```

### PR 제출

1. 기능 브랜치를 생성합니다: `git checkout -b feat/my-feature`
2. 변경 사항을 커밋합니다.
3. `npm test`가 통과하는지 확인합니다.
4. 포크한 저장소에 push 후 PR을 생성합니다.

### 로컬 개발

```bash
cd workers && npm run dev  # Workers 로컬 개발
cd web && npm run dev      # Web 로컬 개발
```

## 6. 행동 강령

모든 참여자는 [행동 강령](CODE_OF_CONDUCT.md)을 준수해 주세요.

## 7. 기여 라이선스 동의

이 프로젝트에 코드를 기여하면, 해당 코드가 [MIT 라이선스](LICENSE)로 제공되는 것에 동의하는 것으로 간주됩니다.
