# Development Progress

Phase별 개발 진행 상황을 추적합니다. 이어서 개발하는 사람이 현재 상태를 빠르게 파악할 수 있도록 유지합니다.

**상태 표기:** ✅ 완료 | 🔧 진행 중 | ⬜ 미착수

---

## Phase 1: MVP

| # | Task | 상태 | 비고 |
|---|------|------|------|
| 1 | Project Scaffolding & Monorepo Setup | ✅ 완료 | npm workspaces, tsconfig, .gitignore, .nvmrc |
| 2 | Hangul Utilities (Shared Logic) | ✅ 완료 | hangul-path.ts, validate-keyword.ts (vitest 2.x) |
| 3 | Cloudflare Worker — Redirect Engine | ✅ 완료 | subdomain.ts, fallback.ts, index.ts (16 tests) |
| 4 | Next.js Web App — Vercel | ✅ 완료 | 검색 UI, [keyword] 페이지, 개인정보처리방침 (7 tests) |
| 5 | Sample Data Structure | ✅ 완료 | 만두, 가방, iphone 샘플 |
| 6 | KV Sync Script | ✅ 완료 | sync-kv.ts + 1 test |
| 7 | GitHub Issue Templates | ✅ 완료 | 제안/변경/삭제 양식 |
| 8 | Whitelist & Blocklist Data Files | ✅ 완료 | blocklist, whitelist, profanity-blocklist |
| 9 | GitHub Actions — Issue Validation & PR Creation | ✅ 완료 | validate-issue.yml (blocklist + Safe Browsing) |
| 10 | GitHub Actions — KV Sync on Main Push | ✅ 완료 | sync-kv.yml (incremental + full + delete) |
| 11 | GitHub Actions — Auto-Merge on Vote Threshold | ✅ 완료 | auto-merge.yml (admin-approved + vote) |
| 12 | Root Layout & Vercel Config | ✅ 완료 | Task 4에서 완료 (layout.tsx + next.config.ts) |
| 13 | Seed Data Generator | ✅ 완료 | seed-data.ts + 3 tests |
| 14 | End-to-End Smoke Test | ✅ 완료 | 43 tests, 11 files, ALL PASS |
| 15 | Deletion Request Template & CODEOWNERS | ✅ 완료 | delete-keyword.yml + CODEOWNERS |
| 16 | CONTRIBUTING.md & README | ✅ 완료 | 기여 가이드 + README 업데이트 |

---

## Phase 2: 커뮤니티 활성화

| # | Task | 상태 | 비고 |
|---|------|------|------|
| 1 | Top 100 Korean Keywords Seeding | ✅ 완료 | 97개 신규 키워드 추가 (기존 3개 유지, 총 100개) |
| 2 | Witty URL Mapping — "가격" 테마 URL 전면 교체 | ✅ 완료 | 97개 키워드를 위트있는 가격 테마 URL로 교체 |

## Phase 3: 스케일업

| # | Task | 상태 | 비고 |
|---|------|------|------|
| 1 | Keyword Expansion to 1000 | ✅ 완료 | 101→1002개, 23개 카테고리, 카테고리별 URL 매핑 함수 |
| 2 | Witty Tier 1 Keyword Expansion | ✅ 완료 | ~80→~125개 Tier 1 위트형 키워드 확장, 직업/연봉 시리즈 추가 |

---

## Phase 5: 운영 최적화

| # | Task | 상태 | 비고 |
|---|------|------|------|
| 1 | auto-merge.yml 비용 최적화 | ✅ 완료 | checkout 제거, cron 1일1회, labeled 이벤트 트리거 추가 |

---

## Phase 4: 오픈소스 공개 준비

| # | Task | 상태 | 비고 |
|---|------|------|------|
| 1 | package-lock.json 복원 | ✅ 완료 | npm ci 호환성 확보 |
| 2 | MIT LICENSE 파일 생성 | ✅ 완료 | 가장 허용적인 라이선스 선택 |
| 3 | package.json 메타데이터 추가 | ✅ 완료 | license, repository, homepage, author, keywords |
| 4 | PRD.md → docs/PRD.md 이동 | ✅ 완료 | 문서 디렉토리 정리 |
| 5 | CODE_OF_CONDUCT.md 생성 | ✅ 완료 | Contributor Covenant 기반, 한국어 작성 |
| 6 | CONTRIBUTING.md 재작성 | ✅ 완료 | 커뮤니티 중심 7섹션 구조 (URL 제안/변경/삭제 안내 포함) |
| 7 | PR 템플릿 + 이슈 템플릿 정비 | ✅ 완료 | PR template, bug-report, feature-request, config.yml |
| 8 | README.md 커뮤니티 중심 재구성 | ✅ 완료 | 배지, 참여하기 섹션, &lt;details&gt; 개발자 가이드 |
| 9 | DEV_PROGRESS.md 및 DEV_LOG.md 업데이트 | ✅ 완료 | 오픈소스 공개 준비 작업 기록 |
| 10 | validate-issue 워크플로우 수동 재실행 및 자동 재오픈 | ✅ 완료 | workflow_dispatch, labeled 지원, env 변수 안전성 개선 |

---

## Phase 5: Incremental KV Sync

| # | Task | 상태 | 비고 |
|---|------|------|------|
| 1 | Incremental KV Sync (commit-based diff) | ✅ 완료 | __sync_commit__ marker, git diff --name-status, bulk put/delete, chunking, dry-run, rename support, same-key rename safeguard |
