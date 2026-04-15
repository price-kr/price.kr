# 보안 및 로직 무결성 점검 리포트

**점검 일자:** 2026-04-14  
**대상 브랜치:** `feature/keyword-alias`  
**점검 범위:** 키워드 별칭(Alias) 기능 도입 후 시스템 전반

---

## 요약

| # | 영역 | 심각도 | 상태 | 제목 |
|---|------|--------|------|------|
| A1 | Workers | HIGH | ✅ 수정됨 | Location 헤더 CRLF 인젝션 가능성 |
| A2 | Workers | INFO | — | ReDoS: 위험 없음 |
| A3 | Workers | INFO | — | Punycode 임포트 방식: 올바름 |
| A4 | Workers | INFO | — | 서브도메인 우회 경로: 없음 |
| B1 | Scripts | HIGH | ✅ 수정됨 | `aliasIndex` 미정의로 인한 alias 해소 로직 오류 |
| B2 | Scripts | HIGH | ℹ️ 문서화 | Full sync가 stale KV 키를 삭제하지 않음 |
| B3 | Scripts | MED | — | Cascade 삭제 로직: 정상 |
| B4 | Scripts | MED | — | Alias chain 누락 시 CI 경고 미출력 |
| C1 | CI/CD | HIGH | ✅ 수정됨 | sync-kv.yml `${{ }}` 인터폴레이션 인젝션 벡터 |
| C2 | CI/CD | HIGH | ✅ 수정됨 | auto-merge.yml이 유사어/삭제 PR을 처리하지 않음 |
| C3 | CI/CD | MED | — | `admin-approved` 레이블 권한 검증 없음 |
| C4 | CI/CD | MED | — | alias 이슈에서 keyword 누락 시 validate 통과 가능성 |
| C5 | CI/CD | LOW | — | `github.run_id != ''` 조건: 항상 참 (무의미한 가드) |
| C6 | CI/CD | INFO | — | 이슈 작성자 자기 투표 가능 (알려진 한계) |

---

## 에이전트 A: Workers 리다이렉트 엔진 & 보안

### A1 — HIGH: Location 헤더 CRLF 인젝션 ✅ 수정됨

**파일:** `workers/src/index.ts:112`  
**설명:** `isSafeRedirectUrl()`은 스킴(http/https)만 검증하여 KV에 저장된 URL의 CRLF 시퀀스를 차단하지 않았다. 악의적인 CRLF가 포함된 URL이 KV에 저장된 경우 `Location` 헤더 인젝션이 가능했다.  
**수정:** `new URL(targetUrl).href`를 사용하여 URL을 정규화. `new URL()`은 CRLF를 퍼센트 인코딩하여 헤더 인젝션을 방지한다.

```typescript
// Before
return redirect302(targetUrl, true);
// After  
return redirect302(new URL(targetUrl).href, true);
```

### A2 — INFO: ReDoS 위험 없음

**파일:** `workers/src/subdomain.ts`  
정규식 `/^[가-힣a-z0-9]+(?:-[가-힣a-z0-9]+)*$/`은 hyphen이 구분자로만 동작하며 중첩 수량자가 없어 ReDoS 위험 없음.

### A3 — INFO: Punycode 임포트 방식 올바름

`import punycode from "punycode/"` (trailing slash)는 deprecated Node.js 내장 대신 npm userland 패키지를 강제하는 올바른 방식.

### A4 — INFO: 서브도메인 우회 경로 없음

`extractSubdomain()` → `validSubdomainRegex` 게이트 → `keyword.toLowerCase()` → KV 조회 흐름에서 외부 입력이 regex를 우회하는 경로 없음.

---

## 에이전트 B: 데이터 무결성 및 로직 검증 (Scripts)

### B1 — HIGH: Alias 해소 로직 오류 (`aliasIndex` 미정의) ✅ 수정됨

**파일:** `scripts/sync-kv.ts:buildKvEntries()`  
**설명:** 리팩토링 과정에서 `aliasIndex` 변수를 선언하지 않은 채 참조하는 코드가 도입됨. 런타임에 `ReferenceError`가 발생하여 full sync 시 모든 alias가 KV에 등록되지 않을 위험이 있었다.  
**수정:** 원본 단순 로직으로 복원. `alias_of`가 `canonicalMap`에 직접 존재하지 않으면 skip (chain 금지 정책 유지).

### B2 — HIGH: Full sync가 stale KV 키를 삭제하지 않음 (설계 한계, 문서화)

**설명:** `buildKvEntries()`는 PUT 전용으로, 기존 KV 키를 삭제하지 않는다. 파일이 삭제된 뒤 full sync를 실행해도 해당 KV 키가 잔류한다.  
**권고:** 운영자는 full sync 전 `wrangler kv bulk delete`로 네임스페이스를 초기화하거나, incremental sync를 주 경로로 유지할 것. 이 한계는 CLAUDE.md에 명시되어 있음.

### B3 — MED: Cascade 삭제 로직 정상

`incrementalKvEntries()`의 canonical 삭제 시 alias 처리는 `aliasesFromDiff` + `aliasesFromDisk` 합집합으로 올바르게 구현됨.

### B4 — MED: Alias chain 누락 시 CI 경고 미출력

alias chain이 발견되면 `console.warn`만 출력하고 `process.exitCode`를 설정하지 않아 CI가 실패로 인식하지 않는다.  
**권고:** chain 또는 orphan alias 발견 시 `console.error` + `process.exitCode = 1` 설정 고려.

---

## 에이전트 C: 워크플로우 및 인프라 보안 (CI/CD)

### C1 — HIGH: sync-kv.yml 인젝션 벡터 ✅ 수정됨

**파일:** `.github/workflows/sync-kv.yml:46`  
**설명:** `run:` 블록 내 `${{ github.event.inputs.mode }}` 인터폴레이션은 `type: choice`로 제한되어 있어 현재는 안전하나, GitHub 보안 가이드라인 위반이며 제약 조건 변경 시 인젝션 벡터가 됨.  
**수정:** `env: SYNC_MODE` 블록으로 분리.

### C2 — HIGH: auto-merge.yml이 유사어/삭제 PR을 처리하지 않음 ✅ 수정됨

**파일:** `.github/workflows/auto-merge.yml:46`  
**설명:** 타이틀 필터가 `[키워드 등록]`, `[키워드 변경]`만 처리하여 `[유사어 등록]`, `[유사어 해제]`, `[키워드 삭제]` PR이 vote 기반 자동 머지에서 영구 제외되는 기능 버그.  
**수정:** 5개 PR 접두사를 모두 포함하도록 배열 기반 필터로 교체.

### C3 — MED: `admin-approved` 레이블 권한 미검증

레이블 추가자의 권한을 검증하지 않아, repo에 triage 역할이 추가되는 경우 비관리자가 bypass 레이블을 추가할 수 있다.  
**권고:** 레이블 추가자의 권한을 `getCollaboratorPermissionLevel` API로 검증하거나, protected 레이블 정책 활용.

### C4 — MED: alias 이슈에서 keyword 공백 시 validate 통과 가능성

**파일:** `validate-issue.yml:113`  
validate 단계 실행 조건이 `keyword || canonical`로, `canonical`만 존재해도 실행된다. keyword가 비어 있을 경우 blocklist 검사가 생략될 수 있다.  
**권고:** `keyword-alias` 레이블 이슈에서는 `keyword`와 `canonical` 모두 필수 검증.

### C5 — LOW: `github.run_id != ''` 조건 항상 참

**파일:** `sync-kv.yml:51`  
`github.run_id`는 항상 존재하므로 해당 가드는 `failure()`와 동일. 주석이 오해를 유발할 수 있음. `if: failure()`로 단순화 권고.

### C6 — INFO: 이슈 작성자 자기 투표 가능

PR은 `github-actions[bot]`이 생성하므로 자기 투표 제외 로직이 봇 투표를 제외하지, 이슈 원작성자를 제외하지 않는다. 알려진 한계(코드 내 TODO 주석 있음).

---

## 수정 커밋

이번 점검 과정에서 적용된 수정 사항:

| 커밋 | 내용 |
|------|------|
| `1d413d5` | security: strengthen subdomain validation and sync-kv alias resolution |
| (이번 커밋) | security: fix CRLF injection, workflow injection, auto-merge title filter |
