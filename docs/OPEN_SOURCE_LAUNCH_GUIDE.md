# 가격.kr 오픈소스 공개 가이드

이 문서는 가격.kr 프로젝트를 오픈소스로 공개할 때 따라야 할 단계별 가이드입니다.

---

## 1단계: 공개 전 필수 확인

### 1-1. 비속어 블록리스트 확인 (완료)

`data/profanity-blocklist.json`이 82개 항목으로 확장되었습니다 (2026-04-10). 일반 비속어 변형, 혐오 표현, 인터넷 은어를 커버합니다. 자모 입력(ㅅㅂ 등)은 `validate-keyword.ts`의 초성 매칭 로직이 자동 차단합니다.

공개 후에도 우회 시도가 발견되면 지속적으로 항목을 추가해야 합니다.

### 1-2. 커밋 히스토리 확인

```bash
# 9개 오픈소스 준비 커밋이 있는지 확인
git log --oneline -9
```

다음 커밋들이 모두 있어야 합니다:
- `chore: add MIT LICENSE file`
- `chore: move PRD.md to docs/`
- `chore: add CODE_OF_CONDUCT.md in Korean`
- `chore: add license, repository, and metadata to package.json`
- `docs: rewrite CONTRIBUTING.md — community-first structure`
- `chore: add PR template, bug report and feature request issue templates`
- `docs: restructure README for community participation`
- `docs: update dev tracking for open source readiness work`
- `docs: add open source readiness spec and implementation plan`

### 1-3. 필수 파일 존재 확인

```bash
# 아래 파일들이 모두 존재하는지 확인
ls LICENSE CODE_OF_CONDUCT.md CONTRIBUTING.md SECURITY.md README.md
ls .github/PULL_REQUEST_TEMPLATE.md
ls .github/ISSUE_TEMPLATE/config.yml
ls .github/ISSUE_TEMPLATE/bug-report.yml
ls .github/ISSUE_TEMPLATE/feature-request.yml
ls docs/PRD.md
```

### 1-4. 시크릿 노출 확인

```bash
# 하드코딩된 API 키, 토큰, 비밀번호가 없는지 확인
grep -rn "CLOUDFLARE_API_TOKEN\|sk-\|ghp_\|gho_" --include="*.ts" --include="*.json" workers/ web/ scripts/
# 결과가 없어야 정상 (env 참조는 OK)
```

### 1-5. .gitignore 확인

```bash
# .env 파일이 추적되고 있지 않은지 확인
git ls-files | grep -i "\.env"
# 결과가 없어야 정상
```

---

## 2단계: GitHub 저장소 설정

### 2-1. 코드 Push

```bash
# 현재 상태 확인
git status
# working tree clean 이어야 함

# origin/main에 push
git push origin main
```

### 2-2. 저장소 공개 전환

1. [GitHub 저장소 Settings](https://github.com/price-kr/price.kr/settings) 접속
2. 페이지 하단 **Danger Zone** 섹션
3. **Change repository visibility** 클릭
4. **Make public** 선택
5. 저장소 이름(`price-kr/price.kr`)을 입력하여 확인

### 2-3. GitHub 저장소 메타데이터 설정

GitHub 저장소 메인 페이지에서:

1. **About** (우측 상단 톱니바퀴 아이콘) 클릭
2. 다음 정보 입력:
   - **Description**: `커뮤니티 기반 한글 단축 URL 서비스 — 만두.가격.kr`
   - **Website**: `https://가격.kr`
   - **Topics**: `korean`, `url-shortener`, `community`, `cloudflare-workers`, `nextjs`, `open-source`, `hangul`
3. **Save changes**

### 2-4. GitHub Features 활성화

GitHub 저장소 Settings → General:

- [x] **Issues** — 활성화 (기본값)
- [x] **Projects** — 필요 시 활성화
- [ ] **Wiki** — 비활성화 (docs/ 디렉토리 사용)
- [ ] **Discussions** — 커뮤니티 형성 후 활성화 예정

---

## 3단계: 공개 후 즉시 확인

### 3-1. README 렌더링 확인

브라우저에서 `https://github.com/price-kr/price.kr` 접속 후:

- [ ] 영문 부제가 blockquote로 표시되는지
- [ ] 5개 배지 (License, Node, tests, contributions, 한국어)가 이미지로 렌더링되는지
- [ ] "참여하기" 섹션이 보이는지
- [ ] 셋업 가이드가 `<details>`로 접혀 있는지 (클릭하면 펼쳐지는지)
- [ ] 프로젝트 구조 다이어그램이 정상 표시되는지
- [ ] 라이선스 섹션에 `MIT` 링크가 작동하는지

### 3-2. Issue 템플릿 확인

`https://github.com/price-kr/price.kr/issues/new/choose` 접속:

- [ ] 5개 템플릿이 표시되는지 (새 단어 제안, 키워드 변경, 키워드 삭제, 버그 리포트, 기능 제안)
- [ ] 빈 Issue 생성 옵션이 없는지 (blank_issues_enabled: false)
- [ ] 각 템플릿을 클릭하면 양식이 정상 로드되는지

### 3-3. PR 템플릿 확인

테스트 브랜치를 만들어 PR 생성 시:

- [ ] PR 본문에 체크리스트 템플릿이 자동 삽입되는지

### 3-4. GitHub Actions 확인

- [ ] Issue 생성 시 `validate-issue.yml`이 정상 실행되는지
- [ ] 버그/기능 제안 Issue는 validate-issue를 트리거하지 않는지 (라벨 필터링)

### 3-5. 커뮤니티 파일 인식 확인

`https://github.com/price-kr/price.kr/community` 접속:

GitHub Community Profile에서 다음 항목이 체크되어 있어야 합니다:
- [x] Description
- [x] README
- [x] Code of conduct
- [x] Contributing
- [x] License
- [x] Security policy
- [x] Issue templates

---

## 4단계: 자동화 파이프라인 동작 확인

### 4-1. 키워드 제안 → 자동 PR 생성 테스트

1. Issues → "새 단어 제안하기" 선택
2. 테스트 키워드 입력 (예: `테스트공개`)
3. 테스트 URL 입력 (예: `https://example.com`)
4. Issue 생성 후:
   - [ ] `validate-issue.yml` 워크플로우가 실행되는지
   - [ ] 키워드 검증이 통과하는지
   - [ ] 자동 PR이 생성되는지
5. 테스트 후 생성된 Issue/PR을 닫습니다

### 4-2. GitHub Secrets 확인

GitHub Actions가 정상 동작하려면 다음 Secrets가 설정되어 있어야 합니다:

| Secret | 확인 방법 |
|--------|----------|
| `CLOUDFLARE_API_TOKEN` | Settings → Secrets → Repository secrets에 존재 |
| `CF_KV_NAMESPACE_ID` | Settings → Secrets → Repository secrets에 존재 |
| `GOOGLE_SAFE_BROWSING_API_KEY` | (선택) 있으면 URL 검증 활성화 |

---

## 5단계: 공개 후 모니터링 (첫 1주)

### 매일 확인

- [ ] 새로운 Issue/PR이 있는지 확인
- [ ] 스팸성 키워드 제안이 있는지 모니터링
- [ ] 비속어 우회 시도가 있는지 확인 → 블록리스트 보강

### 대응 준비

| 상황 | 대응 |
|------|------|
| 스팸성 키워드 폭주 | Issue rate limit 검토, 블록리스트 보강 |
| 비속어 우회 성공 | `profanity-blocklist.json` 즉시 업데이트, `validate-keyword.ts` 강화 |
| 악성 URL 제안 | Google Safe Browsing API 키 설정 확인, 수동 차단 |
| 부적절한 행동 | CODE_OF_CONDUCT.md 절차에 따라 경고 → 차단 |

---

## 6단계: 커뮤니티 성장 후 추가 작업

커뮤니티가 형성된 후 다음 항목을 순차적으로 추가합니다:

- [ ] **GitHub Discussions 활성화** — 카테고리: 공지사항, 키워드 아이디어, Q&A, 자유 게시판
- [ ] **CHANGELOG.md** — 주요 변경 사항 기록 시작
- [ ] **.github/FUNDING.yml** — GitHub Sponsors 등 후원 채널 설정
- [ ] **기여자 인정** — all-contributors bot 또는 README에 contributors 섹션
- [ ] **코드 포매터** — `.prettierrc`, `.editorconfig` 추가로 PR 코드 스타일 통일
- [ ] **Social Preview 이미지** — 저장소 공유 시 표시되는 OG 이미지 설정

---

## 빠른 체크리스트

공개 당일 순서대로 체크:

```
공개 전
  [x] 비속어 블록리스트 확장 완료 (82개, 2026-04-10)
  [ ] 시크릿 노출 확인 완료
  [ ] git push origin main 완료

GitHub 설정
  [ ] 저장소 Public 전환
  [ ] About (Description, Website, Topics) 설정
  [ ] Features (Issues 활성화, Wiki 비활성화) 확인

공개 후 확인
  [ ] README 렌더링 정상
  [ ] Issue 템플릿 5종 정상 표시
  [ ] PR 템플릿 자동 삽입 확인
  [ ] Community Profile 항목 체크
  [ ] 키워드 제안 → 자동 PR 파이프라인 테스트
  [ ] GitHub Secrets 설정 확인
```
