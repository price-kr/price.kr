# Development Progress

Phase별 개발 진행 상황을 추적합니다. 이어서 개발하는 사람이 현재 상태를 빠르게 파악할 수 있도록 유지합니다.

**상태 표기:** ✅ 완료 | 🔧 진행 중 | ⬜ 미착수

---

## Phase 1: MVP

| # | Task | 상태 | 비고 |
|---|------|------|------|
| 1 | Project Scaffolding & Monorepo Setup | ✅ 완료 | npm workspaces, tsconfig, .gitignore, .nvmrc |
| 2 | Hangul Utilities (Shared Logic) | ⬜ 미착수 | hangul-path.ts, validate-keyword.ts |
| 3 | Cloudflare Worker — Redirect Engine | ⬜ 미착수 | subdomain.ts, fallback.ts, index.ts |
| 4 | Next.js Web App — Vercel | ⬜ 미착수 | 검색 UI, [keyword] 페이지, 개인정보처리방침 |
| 5 | Sample Data Structure | ⬜ 미착수 | 샘플 키워드 JSON 파일 |
| 6 | KV Sync Script | ⬜ 미착수 | JSON → Cloudflare KV 동기화 |
| 7 | GitHub Issue Templates | ⬜ 미착수 | 제안/변경/삭제 양식 |
| 8 | Whitelist & Blocklist Data Files | ⬜ 미착수 | blocklist, whitelist, profanity-blocklist |
| 9 | GitHub Actions — Issue Validation & PR Creation | ⬜ 미착수 | validate-issue.yml |
| 10 | GitHub Actions — KV Sync on Main Push | ⬜ 미착수 | sync-kv.yml |
| 11 | GitHub Actions — Auto-Merge on Vote Threshold | ⬜ 미착수 | auto-merge.yml |
| 12 | Root Layout & Vercel Config | ⬜ 미착수 | Korean meta/OG tags |
| 13 | Seed Data Generator | ⬜ 미착수 | 1,000개 키워드 TSV → JSON |
| 14 | End-to-End Smoke Test | ⬜ 미착수 | 전체 워크스페이스 테스트 |
| 15 | Deletion Request Template & CODEOWNERS | ⬜ 미착수 | 삭제 요청 양식, 관리자 보호 |
| 16 | CONTRIBUTING.md & README | ⬜ 미착수 | 기여 가이드, README 업데이트 |

---

## Phase 2: 커뮤니티 활성화

> Phase 1 완료 후 작성 예정

## Phase 3: 스케일업

> Phase 2 완료 후 작성 예정
