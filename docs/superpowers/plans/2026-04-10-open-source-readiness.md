# 오픈소스 공개 준비 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 가격.kr을 커뮤니티 참여 중심 오픈소스 프로젝트로 공개하기 위한 법적/문서/GitHub 설정을 완료한다.

**Architecture:** 코드 변경 없이 문서 파일과 GitHub 설정만 추가/수정한다. 9개 Spec 섹션을 의존성 순서대로 실행: Git 정리 → 법적 파일 → 커뮤니티 문서 → GitHub 템플릿 → README 재구성.

**Tech Stack:** Markdown, GitHub YAML issue/PR templates, npm package.json

**Spec:** `docs/superpowers/specs/2026-04-10-open-source-readiness-design.md`

---

## File Structure

### 새로 생성할 파일
- `LICENSE` — MIT License 전문
- `CODE_OF_CONDUCT.md` — 행동 강령 (한국어)
- `.github/PULL_REQUEST_TEMPLATE.md` — PR 체크리스트
- `.github/ISSUE_TEMPLATE/config.yml` — 빈 Issue 차단 설정
- `.github/ISSUE_TEMPLATE/bug-report.yml` — 버그 리포트 템플릿
- `.github/ISSUE_TEMPLATE/feature-request.yml` — 기능 제안 템플릿

### 수정할 파일
- `package.json` — 메타데이터 필드 추가
- `CONTRIBUTING.md` — 전면 재작성
- `README.md` — 구조 재조정

### 이동할 파일
- `PRD.md` → `docs/PRD.md`

### 복원할 파일
- `package-lock.json` — `npm install`로 재생성

---

## Task 1: Git 정리 — package-lock.json 복원

**Files:**
- Restore: `package-lock.json`

- [ ] **Step 1: package-lock.json 복원**

```bash
cd /Users/laeyoung/Documents/personal/price.kr
npm install
```

Expected: `package-lock.json` 파일이 재생성됨.

- [ ] **Step 2: 테스트 실행으로 의존성 무결성 확인**

```bash
npm test
```

Expected: 모든 테스트 통과 (52 tests).

- [ ] **Step 3: 커밋**

```bash
git add package-lock.json
git commit -m "chore: restore package-lock.json for reproducible builds"
```

---

## Task 2: LICENSE 파일 생성

**Files:**
- Create: `LICENSE`

- [ ] **Step 1: LICENSE 파일 생성**

```
MIT License

Copyright (c) 2026 Laeyoung Chang, Minho Ryang

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

- [ ] **Step 2: 파일 존재 확인**

```bash
cat LICENSE | head -3
```

Expected: "MIT License" + "Copyright (c) 2026 Laeyoung Chang, Minho Ryang"

- [ ] **Step 3: 커밋**

```bash
git add LICENSE
git commit -m "chore: add MIT LICENSE file"
```

---

## Task 3: package.json 메타데이터 보강

**Files:**
- Modify: `package.json`

- [ ] **Step 1: package.json에 메타데이터 필드 추가**

현재 상태:
```json
{
  "name": "price-kr",
  "private": true,
  "workspaces": ["workers", "web", "scripts"],
  "engines": {
    "node": ">=20"
  },
  "scripts": {
    "test": "npm test --workspaces --if-present",
    "lint": "npm run lint --workspaces --if-present"
  }
}
```

수정 후 전체 파일:
```json
{
  "name": "price-kr",
  "description": "커뮤니티 기반 한글 단축 URL 서비스",
  "private": true,
  "license": "MIT",
  "author": "Laeyoung Chang",
  "contributors": ["Minho Ryang"],
  "homepage": "https://가격.kr",
  "repository": {
    "type": "git",
    "url": "https://github.com/price-kr/price.kr.git"
  },
  "keywords": ["korean", "url-shortener", "community", "cloudflare-workers", "nextjs"],
  "workspaces": ["workers", "web", "scripts"],
  "engines": {
    "node": ">=20"
  },
  "scripts": {
    "test": "npm test --workspaces --if-present",
    "lint": "npm run lint --workspaces --if-present"
  }
}
```

- [ ] **Step 2: JSON 유효성 확인**

```bash
node -e "JSON.parse(require('fs').readFileSync('package.json','utf8')); console.log('Valid JSON')"
```

Expected: "Valid JSON"

- [ ] **Step 3: npm install이 깨지지 않는지 확인**

```bash
npm install --ignore-scripts
```

Expected: 정상 완료, 에러 없음.

- [ ] **Step 4: 커밋**

```bash
git add package.json package-lock.json
git commit -m "chore: add license, repository, and metadata to package.json"
```

---

## Task 4: PRD.md 이동

**Files:**
- Move: `PRD.md` → `docs/PRD.md`

- [ ] **Step 1: 파일 이동**

```bash
git mv PRD.md docs/PRD.md
```

- [ ] **Step 2: 이동 확인**

```bash
ls docs/PRD.md && ! ls PRD.md 2>/dev/null && echo "OK"
```

Expected: "OK"

- [ ] **Step 3: 커밋**

```bash
git commit -m "chore: move PRD.md to docs/ — keep root clean for community files"
```

---

## Task 5: CODE_OF_CONDUCT.md 생성

**Files:**
- Create: `CODE_OF_CONDUCT.md`

- [ ] **Step 1: CODE_OF_CONDUCT.md 파일 생성**

```markdown
# 행동 강령 (Code of Conduct)

## 우리의 약속

가격.kr은 누구나 존중받는 환경에서 참여할 수 있는 커뮤니티를 지향합니다. 나이, 장애, 민족, 성별, 경험 수준에 관계없이 모든 참여자가 환영받는 공간을 만들기 위해 노력합니다.

## 기대하는 행동

- 건설적이고 배려 있는 피드백 제공
- 다양한 의견과 관점 존중
- 커뮤니티에 도움이 되는 키워드 제안과 투표

## 금지하는 행동

- 비하, 차별, 혐오 발언
- 스팸성 키워드 남용 또는 상업적 목적의 키워드 독점 시도
- 타인의 개인정보 무단 노출
- 위협, 괴롭힘, 성적 언어 또는 이미지 사용

## 신고 및 조치

행동 강령 위반을 목격하거나 경험하셨다면, 메인테이너에게 이메일로 신고해 주세요:

📧 **vibevista.cc@gmail.com**

> 보안 취약점 신고는 행동 강령 위반과 별개입니다. [SECURITY.md](SECURITY.md)의 절차를 따라 주세요.

신고 접수 후 다음 단계로 조치합니다:

1. **경고** — 위반 행위에 대한 명확한 안내
2. **임시 차단** — 반복 위반 시 일정 기간 참여 제한
3. **영구 차단** — 심각하거나 지속적인 위반 시 커뮤니티 영구 제외

## 적용 범위

이 행동 강령은 GitHub Issues, Pull Requests, 코드 리뷰 등 이 프로젝트의 모든 공간에 적용됩니다.

---

이 행동 강령은 [Contributor Covenant v2.1](https://www.contributor-covenant.org/version/2/1/code_of_conduct/)을 기반으로 작성되었습니다.
```

- [ ] **Step 2: 파일 확인**

```bash
head -1 CODE_OF_CONDUCT.md
```

Expected: "# 행동 강령 (Code of Conduct)"

- [ ] **Step 3: 커밋**

```bash
git add CODE_OF_CONDUCT.md
git commit -m "chore: add CODE_OF_CONDUCT.md in Korean"
```

---

## Task 6: CONTRIBUTING.md 재작성

**Files:**
- Modify: `CONTRIBUTING.md`

- [ ] **Step 1: CONTRIBUTING.md 전면 재작성**

```markdown
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
```

- [ ] **Step 2: 링크 형식 확인**

```bash
grep -c '../../issues/new?template=' CONTRIBUTING.md
```

Expected: 5 (new-keyword, change-keyword, delete-keyword, bug-report, feature-request)

- [ ] **Step 3: 커밋**

```bash
git add CONTRIBUTING.md
git commit -m "docs: rewrite CONTRIBUTING.md — community-first structure"
```

---

## Task 7: PR 템플릿 + Issue 템플릿 (atomic deploy)

**Files:**
- Create: `.github/PULL_REQUEST_TEMPLATE.md`
- Create: `.github/ISSUE_TEMPLATE/config.yml`
- Create: `.github/ISSUE_TEMPLATE/bug-report.yml`
- Create: `.github/ISSUE_TEMPLATE/feature-request.yml`

**주의:** config.yml과 새 Issue 템플릿은 반드시 같은 커밋에 배포해야 합니다.

- [ ] **Step 1: PR 템플릿 생성**

`.github/PULL_REQUEST_TEMPLATE.md`:
```markdown
## 변경 내용

<!-- 이 PR에서 변경한 내용을 간단히 설명해 주세요 -->

## 체크리스트

- [ ] `npm test` 통과 확인
- [ ] 로컬에서 동작 테스트 완료
- [ ] 관련 Issue: #
```

- [ ] **Step 2: Issue 템플릿 config.yml 생성**

`.github/ISSUE_TEMPLATE/config.yml`:
```yaml
blank_issues_enabled: false
```

- [ ] **Step 3: 버그 리포트 템플릿 생성**

`.github/ISSUE_TEMPLATE/bug-report.yml`:
```yaml
name: "버그 리포트"
description: "버그를 발견하셨나요? 알려주세요"
title: "[버그] "
labels: ["bug"]
body:
  - type: textarea
    id: description
    attributes:
      label: "버그 설명"
      description: "어떤 문제가 발생했는지 설명해 주세요"
    validations:
      required: true
  - type: textarea
    id: steps
    attributes:
      label: "재현 단계"
      description: "버그를 재현하는 단계를 알려주세요"
      placeholder: |
        1. '...'에 접속
        2. '...'을 클릭
        3. 오류 발생
    validations:
      required: true
  - type: textarea
    id: expected
    attributes:
      label: "기대 동작"
      description: "어떻게 동작해야 한다고 생각하시나요?"
    validations:
      required: true
  - type: textarea
    id: actual
    attributes:
      label: "실제 동작"
      description: "실제로 어떻게 동작했나요?"
    validations:
      required: true
  - type: input
    id: environment
    attributes:
      label: "환경 정보"
      description: "브라우저, OS 등"
      placeholder: "Chrome 130, macOS 15"
    validations:
      required: false
```

- [ ] **Step 4: 기능 제안 템플릿 생성**

`.github/ISSUE_TEMPLATE/feature-request.yml`:
```yaml
name: "기능 제안"
description: "새로운 기능이나 개선 사항을 제안합니다"
title: "[기능 제안] "
labels: ["enhancement"]
body:
  - type: textarea
    id: description
    attributes:
      label: "제안 내용"
      description: "어떤 기능을 원하시나요?"
    validations:
      required: true
  - type: textarea
    id: reason
    attributes:
      label: "제안 이유"
      description: "이 기능이 왜 필요한지 설명해 주세요"
    validations:
      required: true
  - type: textarea
    id: expected_effect
    attributes:
      label: "기대 효과"
      description: "이 기능이 추가되면 어떤 점이 좋아질까요?"
    validations:
      required: false
```

- [ ] **Step 5: 기존 Issue 템플릿과 충돌 없는지 확인**

```bash
ls .github/ISSUE_TEMPLATE/
```

Expected: `bug-report.yml`, `change-keyword.yml`, `config.yml`, `delete-keyword.yml`, `feature-request.yml`, `new-keyword.yml` (6개 파일)

- [ ] **Step 6: YAML 유효성 확인**

```bash
node -e "
const fs = require('fs');
['bug-report.yml','feature-request.yml','config.yml'].forEach(f => {
  const content = fs.readFileSync('.github/ISSUE_TEMPLATE/' + f, 'utf8');
  if (!content.trim()) throw new Error(f + ' is empty');
  // config.yml: blank_issues_enabled 키 존재 확인
  if (f === 'config.yml' && !content.includes('blank_issues_enabled')) throw new Error('config.yml missing key');
  // issue templates: name, body 키 존재 확인
  if (f !== 'config.yml' && (!content.includes('name:') || !content.includes('body:'))) throw new Error(f + ' missing required keys');
  console.log(f + ': valid');
});
"
```

Expected: 3개 파일 모두 "valid". GitHub가 push 시 YAML 스키마를 추가 검증하므로, 여기서는 구조적 키 존재만 확인합니다.

- [ ] **Step 7: 한 커밋에 모두 배포 (atomic)**

```bash
git add .github/PULL_REQUEST_TEMPLATE.md .github/ISSUE_TEMPLATE/config.yml .github/ISSUE_TEMPLATE/bug-report.yml .github/ISSUE_TEMPLATE/feature-request.yml
git commit -m "chore: add PR template, bug report and feature request issue templates

Add config.yml to disable blank issues.
All three issue template files deployed atomically."
```

---

## Task 8: README.md 구조 재조정

**Depends on:** Task 1-7 완료 필수 (LICENSE, CODE_OF_CONDUCT.md, CONTRIBUTING.md, PR 템플릿, Issue 템플릿, docs/PRD.md 이동이 모두 완료된 상태에서 실행)

**Files:**
- Modify: `README.md`

이 태스크가 가장 큽니다. README 전체를 커뮤니티 참여 중심으로 재구성합니다.

- [ ] **Step 1: README.md 전면 재작성**

아래 구조로 `README.md`를 재작성합니다. 기존 내용(아키텍처, 프로젝트 구조, 키워드 등록 프로세스, 기술 스택)은 보존하되, 순서와 구조를 변경합니다.

```markdown
# 가격.kr — 커뮤니티 기반 한글 단축 URL 서비스

> Community-driven Korean subdomain URL shortener. Type `만두.가격.kr` to find the best price for 만두 (dumplings).

한글 키워드로 최저가를 찾아보세요. `만두.가격.kr` → 네이버 쇼핑 최저가 페이지로 바로 이동!

커뮤니티 투표로 각 키워드의 목적지 URL이 결정됩니다.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20-brightgreen.svg)](https://nodejs.org/)
[![tests](https://img.shields.io/badge/tests-52%20passed-brightgreen.svg)](#)
[![contributions welcome](https://img.shields.io/badge/contributions-welcome-brightgreen.svg)](CONTRIBUTING.md)
[![language](https://img.shields.io/badge/language-한국어-blue.svg)](#)

## 사용법

브라우저 주소창에 `{키워드}.가격.kr`을 입력하세요.

```
만두.가격.kr  → 만두 최저가 검색
가방.가격.kr  → 가방 최저가 검색
iphone.가격.kr → iPhone 최저가 검색
```

## 참여하기

누구나 참여할 수 있습니다! 아래 세 가지 방법 중 하나를 선택하세요.

### 🗳️ 키워드 제안하기

새로운 키워드-URL 매핑을 제안합니다. [새 단어 제안하기 →](../../issues/new?template=new-keyword.yml)

### 👍 투표로 참여하기

등록 대기 중인 키워드에 투표하세요. [열린 PR 보기 →](../../pulls)

PR에서 👍 반응을 달면 투표 완료! 3개 이상 모이면 자동 등록됩니다.

### 💻 코드 기여

버그 수정, 기능 개선 등 코드로 기여합니다. [기여 가이드 →](CONTRIBUTING.md)

## 키워드 등록 프로세스

```
Issue 제안 → 자동 검증 → PR 생성 → 커뮤니티 투표 → 자동 병합 → KV 동기화
   ┌─────┐    ┌─────┐    ┌─────┐    ┌──────────┐    ┌──────┐    ┌────────┐
   │ 제안 │───→│ 검증 │───→│  PR  │───→│ 👍 투표  │───→│ 병합  │───→│ KV 반영│
   └─────┘    └─────┘    └─────┘    └──────────┘    └──────┘    └────────┘
   Issue 작성   블록리스트   자동 생성   3+ 찬성        24시간     Cloudflare
               비속어 필터              (변경 5+)      대기 후     자동 동기화
               자모 우회 탐지
               도메인 화이트리스트
               Safe Browsing
```

`admin-approved` 라벨이 있는 PR은 투표/대기 없이 즉시 병합됩니다.

## 아키텍처

Cloudflare (리다이렉트) + Vercel (웹앱) 하이브리드 구조로 월 $0 운영됩니다.

```
사용자 → 만두.가격.kr
         ↓
  Cloudflare Workers (와일드카드 DNS)
    → Host 헤더에서 서브도메인 추출
    → Punycode 디코딩 (xn--hu1b07h → 만두)
    → KV 조회 → 302 리다이렉트
    → (KV 실패 시) GitHub Raw Content 폴백
    → (키워드 미등록 시) Vercel 웹앱으로 안내
```

## 프로젝트 구조

```
price.kr/
├── LICENSE               # MIT 라이선스
├── CODE_OF_CONDUCT.md    # 행동 강령
├── CONTRIBUTING.md       # 기여 가이드
├── SECURITY.md           # 보안 정책
├── CLAUDE.md             # Claude Code 설정
├── workers/              # Cloudflare Workers 리다이렉트 엔진
│   └── src/              #   subdomain.ts, fallback.ts, index.ts
├── web/                  # Next.js 15 App Router (Vercel)
│   ├── app/              #   검색 UI, [keyword] 페이지, 개인정보처리방침
│   ├── components/       #   SearchBar (자동완성, 초성 검색)
│   └── lib/              #   hangul.ts, keywords.ts
├── scripts/              # 공유 유틸리티
│   ├── hangul-path.ts    #   초성 추출, 키워드→파일 경로 계산
│   ├── validate-keyword.ts # 키워드 검증 (블록리스트, 비속어, 자모 우회 탐지)
│   ├── sync-kv.ts        #   JSON → Cloudflare KV 동기화
│   ├── seed-data.ts      #   TSV → 키워드 JSON 일괄 생성
│   └── generate-top1000-tsv.ts  # Top 1000 키워드 TSV 생성
├── data/                 # 키워드 데이터 (3단계 디렉토리 구조)
│   ├── {초성}/{첫글자}/{keyword}.json  # 한글 키워드
│   ├── _en/{keyword}.json              # 영문 키워드
│   ├── _num/{keyword}.json             # 숫자 시작 키워드
│   ├── blocklist.json        # 상표명 블록리스트
│   ├── whitelist.json        # 허용 도메인 목록
│   └── profanity-blocklist.json  # 비속어 블록리스트
├── .github/
│   ├── CODEOWNERS            # 코드 리뷰 규칙
│   ├── PULL_REQUEST_TEMPLATE.md  # PR 체크리스트
│   ├── ISSUE_TEMPLATE/       # Issue 양식 (제안/변경/삭제/버그/기능)
│   └── workflows/
│       ├── validate-issue.yml  # Issue → 키워드/URL 검증 → 자동 PR
│       ├── sync-kv.yml         # main push → KV 동기화
│       └── auto-merge.yml      # 커뮤니티 투표 → 자동 병합
└── docs/
    ├── PRD.md              # 제품 요구사항 정의서
    ├── OPERATIONS.md       # 운영 가이드
    ├── DEV_PROGRESS.md     # 개발 진행 상황
    ├── DEV_LOG.md          # 기술적 결정 기록
    ├── PLAN-top100-keywords.md  # 키워드 확장 계획
    └── superpowers/        # 설계 문서 및 구현 계획
```

## 기술 스택

| 영역 | 기술 |
|------|------|
| 리다이렉트 엔진 | Cloudflare Workers + KV + Cache API |
| 웹 앱 | Next.js 15 App Router (Vercel Free) |
| 자동화 | GitHub Actions (Issue 검증, KV 동기화, 자동 병합) |
| 데이터 | GitHub 저장소 (JSON 파일, 3단계 디렉토리 구조) |
| 테스트 | Vitest 2.x |
| 보안 | Open redirect 방지, Script injection 방지, Google Safe Browsing |

<details>
<summary><strong>셋업 가이드 (포크/자체 운영 시)</strong></summary>

### 1. 사전 요구사항

- Node.js 20+
- [Cloudflare 계정](https://dash.cloudflare.com/) (Workers + KV 무료 플랜)
- [Vercel 계정](https://vercel.com/) (웹앱 배포용, 무료 플랜)
- 도메인 (`가격.kr` / `xn--o39aom.kr`) — Cloudflare DNS에 등록

### 2. 의존성 설치

```bash
git clone https://github.com/price-kr/price.kr.git
cd price.kr
npm install
```

### 3. Cloudflare 도메인 & DNS 설정

#### 도메인 등록

1. [Cloudflare 대시보드](https://dash.cloudflare.com/)에서 도메인 추가: `xn--o39aom.kr` (가격.kr의 punycode)
2. 도메인 등록기관(예: 가비아, 후이즈 등)에서 네임서버를 Cloudflare가 제공하는 NS로 변경

#### DNS 레코드 설정

Cloudflare DNS 탭에서 다음 레코드를 추가합니다:

| 타입 | 이름 | 값 | 프록시 | 용도 |
|------|------|-----|--------|------|
| A | `@` (루트) | `76.76.21.21` | OFF (DNS only) | bare domain → Vercel 웹앱 |
| CNAME | `www` | Vercel 대시보드에서 확인 | OFF (DNS only) | www → Vercel 웹앱 (bare domain으로 리다이렉트) |
| A | `*` (와일드카드) | `192.0.2.1` | ON (Proxied) | `*.가격.kr` → Cloudflare Workers |
| AAAA | `*` (와일드카드) | `100::` | ON (Proxied) | IPv6 와일드카드 → Cloudflare Workers |

> **핵심 구조:** `가격.kr` (bare domain)은 Vercel이 처리하고, `만두.가격.kr` 등 와일드카드 서브도메인은 Cloudflare Workers가 처리합니다.

- **루트 도메인 (`@`):** Vercel의 A 레코드 IP를 사용하며, Cloudflare 프록시를 끕니다 (회색 구름). Vercel이 직접 SSL과 라우팅을 처리합니다.
- **`www`:** Vercel 프로젝트별 CNAME 값(Vercel 대시보드 → Domains에서 확인, 형식: `<hash>.vercel-dns.com`)으로 연결하며, 프록시를 끕니다. Vercel이 자동으로 bare domain으로 리다이렉트합니다.
- **와일드카드 (`*`):** dummy IP를 사용하며, Cloudflare 프록시를 켭니다 (주황 구름). 실제 트래픽은 Workers route(`*.xn--o39aom.kr/*`)가 가로채서 처리합니다.

> `192.0.2.1`은 RFC 5737 문서용 IP이며, origin 서버가 필요 없는 Cloudflare Workers 설정에서 사용하는 표준 방식입니다. `100::`은 RFC 6666 discard prefix입니다. Cloudflare DNS는 구체적인 레코드(`@`, `www`)를 와일드카드(`*`)보다 우선 처리합니다.

#### SSL/TLS 설정

Cloudflare 대시보드 → SSL/TLS에서 **Full** 모드를 선택합니다.

> SSL/TLS 모드는 프록시된(주황 구름) 트래픽에만 적용됩니다. bare domain과 `www`는 DNS only(회색 구름)이므로 Vercel이 SSL 인증서를 직접 발급·관리합니다. 와일드카드 서브도메인은 Cloudflare Universal SSL(무료)이 자동으로 edge 인증서를 제공합니다.

### 4. Cloudflare Workers 설정

```bash
# Wrangler CLI 설치 (전역)
npm install -g wrangler

# Cloudflare 로그인
wrangler login

# KV 네임스페이스 생성
wrangler kv namespace create KEYWORDS
wrangler kv namespace create KEYWORDS --preview
```

생성된 ID를 `workers/wrangler.toml`에 반영:

```toml
[[kv_namespaces]]
binding = "KEYWORDS"
id = "<위에서 생성된 KV namespace ID>"
preview_id = "<위에서 생성된 preview ID>"
```

Workers route 설정 (`workers/wrangler.toml`에 이미 포함):

```toml
routes = [
  { pattern = "*.xn--o39aom.kr/*", zone_name = "xn--o39aom.kr" }
]
```

> 이 route는 와일드카드 서브도메인의 모든 경로를 Workers가 처리하도록 합니다. KV 조회 실패 시 GitHub Raw Content 폴백을 시도하고, 그마저도 키워드를 찾지 못하면 `WEB_APP_ORIGIN`을 통해 Vercel 웹앱의 키워드 페이지로 리다이렉트됩니다.

**(선택)** GitHub Raw Content 폴백의 rate limit을 확장하려면 (60 → 5,000 req/hr):

```bash
wrangler secret put GITHUB_TOKEN
# GitHub Personal Access Token 입력 (public repo read 권한)
```

### 5. GitHub Repository Secrets

GitHub repo → Settings → Secrets and variables → Actions에서 설정:

| Secret | 용도 | 필수 여부 |
|--------|------|----------|
| `CLOUDFLARE_API_TOKEN` | Wrangler가 KV에 write하기 위한 Cloudflare API 토큰 | **필수** |
| `CF_KV_NAMESPACE_ID` | 4단계에서 생성한 KV namespace ID | **필수** |
| `GOOGLE_SAFE_BROWSING_API_KEY` | Issue 등록 시 URL 안전성 검증 ([발급](https://developers.google.com/safe-browsing/v4/get-started)) | 선택 (없으면 검증 skip) |

**Cloudflare API 토큰 생성:**
1. [Cloudflare API Tokens](https://dash.cloudflare.com/profile/api-tokens) 페이지
2. "Create Token" → "Edit Cloudflare Workers" 템플릿 사용
3. 권한에 `Account - Workers KV Storage - Edit` 추가
4. 생성된 토큰을 `CLOUDFLARE_API_TOKEN` 시크릿에 저장

### 6. Vercel 배포

```bash
# Vercel CLI 설치 및 프로젝트 연결
npm install -g vercel
cd web
vercel link
```

Vercel 대시보드에서 설정:
- **Framework Preset:** Next.js
- **Root Directory:** `web`
- **Build Command:** (기본값 사용)

> Vercel 웹앱은 환경 변수가 필요 없습니다. 데이터는 빌드 시 파일시스템에서 직접 읽습니다.

#### 커스텀 도메인 연결

1. Vercel 대시보드 → 프로젝트 → Settings → Domains
2. `xn--o39aom.kr` (가격.kr) 도메인 추가
3. `www.xn--o39aom.kr` 도메인 추가 → Vercel이 기본 도메인을 묻는다면 `xn--o39aom.kr` (bare domain)을 선택하여 `www`가 bare domain으로 리다이렉트되도록 설정
4. Vercel이 안내하는 DNS 설정이 3단계에서 설정한 A 레코드(`76.76.21.21`) 및 `www` CNAME(Vercel 대시보드에 표시된 프로젝트별 값)과 일치하는지 확인
5. SSL 인증서가 자동 발급될 때까지 대기 (보통 수 분 이내)

> bare domain(`가격.kr`)과 `www.가격.kr`은 Vercel의 Next.js 웹앱이 응답하고, 서브도메인(`만두.가격.kr`)으로 접속하면 Cloudflare Workers가 리다이렉트를 처리합니다. `vercel.json`은 필요 없습니다.

### 7. 로컬 개발

```bash
# Workers 로컬 개발 (wrangler dev)
cd workers && npm run dev

# Web 로컬 개발 (Next.js dev server)
cd web && npm run dev

# 전체 테스트
npm test
```

### 8. 배포

```bash
# Workers 배포
cd workers && npm run deploy

# Web은 git push 시 Vercel에서 자동 배포
# KV 동기화는 main push 시 GitHub Actions가 자동 실행
```

### 도메인 설정 트러블슈팅

| 증상 | 원인 | 해결 |
|------|------|------|
| `*.가격.kr` 접속 시 연결 거부 | 와일드카드 DNS 레코드의 프록시가 꺼져 있음 (회색 구름) | Cloudflare DNS에서 `*` 레코드를 Proxied (주황 구름)로 변경 |
| `가격.kr` 접속 시 SSL 오류 | 루트 도메인 DNS 프록시가 켜져 있음 (주황 구름) | `@` 레코드를 DNS only (회색 구름)로 변경하여 Vercel이 SSL 처리 |
| 설정 후 도메인이 동작하지 않음 | DNS 전파 지연 (네임서버 변경 후 최대 48시간) | `dig xn--o39aom.kr` 또는 `nslookup`으로 전파 상태 확인 후 대기 |
| `curl`로 테스트 시 리다이렉트 안 됨 | Host 헤더에 한글 대신 punycode 사용 필요 | `curl -I https://xn--hu1b07h.xn--o39aom.kr` (만두.가격.kr) |
| 새 키워드 등록 후 리다이렉트 안 됨 | KV 전파 지연 (최대 60초) 또는 Workers 엣지 캐시 (최대 1시간 TTL) | KV 확인: `wrangler kv key get`, 캐시 문제 시 Cloudflare 대시보드에서 Purge Cache 실행 |

</details>

## 라이선스

[MIT](LICENSE)

이 프로젝트의 소스 코드는 MIT 라이선스로 공개됩니다. 단, `가격.kr` 도메인 및 서비스 인프라(Cloudflare, Vercel 설정 등)의 소유권과 운영 권한은 라이선스 범위에 포함되지 않습니다.
```

- [ ] **Step 2: 기존 README 대비 핵심 섹션 존재 확인**

```bash
grep -c "## 참여하기" README.md && grep -c "## 라이선스" README.md && grep -c "<details>" README.md
```

Expected: 각각 1 이상

- [ ] **Step 3: 배지 렌더링 확인 (마크다운 구문)**

```bash
grep -c "img.shields.io" README.md
```

Expected: 5 (License, Node, tests, contributions-welcome, language)

- [ ] **Step 4: 기존 "기여하기" 섹션이 제거되고 "참여하기"로 대체되었는지 확인**

```bash
grep "## 기여하기" README.md || echo "OK: 기여하기 section removed"
```

Expected: "OK: 기여하기 section removed"

- [ ] **Step 5: 테스트 실행으로 빌드 무결성 확인**

```bash
npm test
```

Expected: 모든 테스트 통과. (README 변경은 코드에 영향 없지만 확인)

- [ ] **Step 6: 커밋**

```bash
git add README.md
git commit -m "docs: restructure README for community participation

- Add English subtitle for GitHub discoverability
- Add badges (License, Node, contributions-welcome, Korean)
- Add '참여하기' section prominently near top
- Collapse setup guide and troubleshooting into <details>
- Update project structure diagram to reflect actual files
- Add domain/infra ownership note to license section"
```

---

## Task 9: DEV_PROGRESS.md 및 DEV_LOG.md 업데이트

**Files:**
- Modify: `docs/DEV_PROGRESS.md`
- Modify: `docs/DEV_LOG.md`

- [ ] **Step 1: DEV_PROGRESS.md에 오픈소스 준비 태스크 상태 업데이트**

오픈소스 공개 준비 항목을 ✅ 완료로 기록합니다.

- [ ] **Step 2: DEV_LOG.md에 오늘 작업 기록**

날짜와 함께 기술적 결정 사항을 기록합니다:
- 접근법 B (커뮤니티 중심 준비) 선택 이유
- MIT 라이선스 선택
- README 구조 재조정 방향
- 리뷰 결과 반영 사항 (5라운드 에이전트 리뷰)

- [ ] **Step 3: 커밋**

```bash
git add docs/DEV_PROGRESS.md docs/DEV_LOG.md
git commit -m "docs: update dev tracking for open source readiness work"
```

---

## Self-Review Checklist

| Spec 섹션 | 구현 Task | 상태 |
|-----------|----------|------|
| 1. LICENSE 파일 생성 | Task 2 | ✅ |
| 2. package.json 메타데이터 | Task 3 | ✅ |
| 3. CODE_OF_CONDUCT.md | Task 5 | ✅ |
| 4. CONTRIBUTING.md 보강 | Task 6 | ✅ |
| 5. PR 템플릿 | Task 7 | ✅ |
| 6. Issue 템플릿 보강 | Task 7 (atomic) | ✅ |
| 7. README 구조 조정 | Task 8 | ✅ |
| 8. 내부 문서 정리 (PRD.md 이동) | Task 4 | ✅ |
| 9. Git 정리 (package-lock.json) | Task 1 | ✅ |
| DEV_PROGRESS/DEV_LOG 업데이트 | Task 9 | ✅ |
