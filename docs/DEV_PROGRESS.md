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
