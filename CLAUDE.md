# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

가격.kr — a community-driven Korean subdomain URL shortener. Users type `만두.가격.kr` and get redirected to the best destination URL chosen by community vote.

**Hybrid architecture:** Cloudflare (redirect engine) + Vercel (web app)
- `workers/` — Cloudflare Workers: wildcard DNS → Host header subdomain extraction → punycode decode → KV lookup → 302 redirect. Falls back to GitHub Raw Content on KV failure.
- `web/` — Next.js 15 App Router on Vercel Free: search UI, unregistered keyword pages, privacy page.
- `data/` — Keyword-URL JSON files in 3-level directory structure (초성 → 첫 글자 → keyword.json). English in `_en/`, numeric in `_num/`.
- `scripts/` — Shared utilities: hangul path resolution, keyword validation (blocklist + jamo bypass detection + profanity filter), seed data generator, KV sync.
- `.github/workflows/` — Issue→PR automation (validate-issue.yml), vote-based auto-merge (auto-merge.yml), KV sync on push (sync-kv.yml).

## Build & Test Commands

```bash
# All workspaces
npm test                          # Run tests across all workspaces
npm run lint                      # Lint across all workspaces

# Workers (Cloudflare)
cd workers && npm run dev         # Local dev with wrangler
cd workers && npx vitest run      # Run all worker tests
cd workers && npx vitest run test/subdomain.test.ts  # Single test file
cd workers && npm run deploy      # Deploy to Cloudflare

# Web (Next.js)
cd web && npm run dev             # Next.js dev server
cd web && npx vitest run          # Run all web tests

# Scripts
cd scripts && npx vitest run      # Run utility tests
```

Workers uses `@cloudflare/vitest-pool-workers` with vitest 2.x (not 3.x — pool-workers compatibility).

## Key Architecture Decisions

- **Korean subdomain routing:** Browser sends punycode in Host header → Workers decode via `punycode/` npm package → KV lookup. `extractSubdomain()` rejects multi-level subdomains and `www`.
- **No rate limiter in Workers:** Cloudflare KV free tier (1K writes/day) is too low for per-request rate limiting. Relies on Cloudflare's built-in DDoS protection.
- **Data path on Vercel:** `web/` accesses `data/` via `join(process.cwd(), "..", "data")` with `outputFileTracingRoot` set to the monorepo root in `next.config.ts`.
- **GitHub Actions security:** All user inputs from issues are passed via `env:` blocks to `process.env`, never via `${{ }}` interpolation in script blocks. Keywords validated with `/^[가-힣ㄱ-ㅎa-zA-Z0-9]+$/` regex.
- **English keyword case:** Always lowercased in both filename and JSON `keyword` field to ensure KV key matches filename for deletion sync.
- **Admin approval (Phase 1):** PRs with `admin-approved` label bypass vote threshold and 24-hour wait. Regular PRs need 3+ thumbs-up (5+ for changes).

## Data Structure

Each keyword is one JSON file: `{ "keyword": "만두", "url": "https://...", "created": "2026-03-17" }`

Path computation: Korean → `data/{초성}/{첫글자}/{keyword}.json`, English → `data/_en/{keyword}.json`, Numeric-start → `data/_num/{keyword}.json`

Hangul choseong extraction uses Unicode math: `CHOSEONG_LIST[Math.floor((charCode - 0xAC00) / 588)]`

## Required: Development Tracking

### `docs/DEV_PROGRESS.md` — 개발 진행 상황
- Phase별 태스크 목록과 상태(✅ 완료 / 🔧 진행 중 / ⬜ 미착수)를 관리한다.
- **태스크를 시작할 때** 해당 항목을 🔧 진행 중으로, **완료 시** ✅ 완료로 업데이트한다.
- 비고 란에 간단한 요약을 적는다.

### `docs/DEV_LOG.md` — 개발 로그
- 개발 과정의 주요 내용, 기술적 결정, 검토 사항을 **블로그 형식(최신이 위)**으로 기록한다.
- 각 엔트리에 **날짜와 대략적 시각**을 포함한다 (예: `## 2026-03-17 ~14:40`).
- 기술적 결정이 있었다면 **결정 내용, 이유, 검토한 대안**을 함께 적는다.
- 단순 코드 작성뿐 아니라 아키텍처 변경, 의존성 선택, 트레이드오프 등 이후 개발자가 "왜 이렇게 했지?"라고 물을 만한 것을 기록한다.

**이 두 파일은 매 태스크 작업 시 반드시 업데이트해야 한다.**

## Language

PRD and user-facing content are in Korean. Code comments and commit messages are in English.
