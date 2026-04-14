# Keyword Alias P2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add GitHub Actions automation so the community can register, detach, and delete keyword aliases via Issues — with auto-generated PRs, community voting, and conflict notification.

**Architecture:** Extend `validate-issue.yml` with four new label handlers (`keyword-alias`, `keyword-alias-detach`, `keyword-delete` cascade, `keyword-change` alias redirect). Add two new Issue templates. All handlers follow the existing pattern: parse → validate → create branch + file via GitHub API → create PR → comment on Issue.

**Tech Stack:** GitHub Actions, `actions/github-script` (v8), GitHub REST API via `@octokit/core`, Node.js `fs` (for filesystem scans after checkout)

> **Prerequisite:** P1 must be merged first — this plan assumes alias JSON files (`alias_of` field) already exist and are synced to KV.
>
> **Testing note:** GitHub Actions workflows cannot be unit-tested locally. Verification for each task is via `workflow_dispatch` on a test Issue. Steps include exact curl/gh commands to trigger tests.

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `.github/ISSUE_TEMPLATE/register-alias.yml` | Issue template: 유사어 등록 요청 |
| Create | `.github/ISSUE_TEMPLATE/detach-alias.yml` | Issue template: 유사어 해제 요청 |
| Modify | `.github/workflows/validate-issue.yml` | Add 4 new label handlers + concurrent notification |

---

## Shared Helper Reference

These JavaScript snippets are reused across multiple steps. Do NOT inline them redundantly — define them once in each step's script scope.

**`computeFilePath(keyword)`** — identical to logic already in "Create PR" step:
```javascript
function computeFilePath(keyword) {
  const CHOSEONG = ['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
  const first = keyword[0];
  const code = first.charCodeAt(0);
  if (code >= 0xAC00 && code <= 0xD7A3) {
    const cho = CHOSEONG[Math.floor((code - 0xAC00) / 588)];
    return `data/${cho}/${first}/${keyword}.json`;
  } else if (/\d/.test(first)) {
    return `data/_num/${keyword}.json`;
  }
  return `data/_en/${keyword.toLowerCase()}.json`;
}
```

**`getKeywordData(keyword)`** — fetch and decode a keyword's JSON from main branch:
```javascript
async function getKeywordData(keyword) {
  const filePath = computeFilePath(keyword);
  try {
    const { data } = await github.rest.repos.getContent({
      owner: context.repo.owner, repo: context.repo.repo,
      path: filePath, ref: 'main'
    });
    return { filePath, data: JSON.parse(Buffer.from(data.content, 'base64').toString()), sha: data.sha };
  } catch { return null; }
}
```

**`createBranchFromMain(branch)`** — create or reset branch to main HEAD:
```javascript
async function createBranchFromMain(branch) {
  const mainRef = await github.rest.git.getRef({
    owner: context.repo.owner, repo: context.repo.repo, ref: 'heads/main'
  });
  const sha = mainRef.data.object.sha;
  try {
    await github.rest.git.getRef({ owner: context.repo.owner, repo: context.repo.repo, ref: `heads/${branch}` });
    await github.rest.git.updateRef({ owner: context.repo.owner, repo: context.repo.repo, ref: `heads/${branch}`, sha, force: true });
  } catch (e) {
    if (e.status === 404) {
      await github.rest.git.createRef({ owner: context.repo.owner, repo: context.repo.repo, ref: `refs/heads/${branch}`, sha });
    } else throw e;
  }
}
```

**`findAliasFiles(canonicalKeyword)`** — scan checked-out repo for alias files pointing to canonical:
```javascript
function findAliasFiles(canonicalKeyword) {
  const fs = require('fs'), path = require('path');
  const NON_KW = new Set(['blocklist.json','whitelist.json','profanity-blocklist.json']);
  const results = [];
  function scan(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) scan(full);
      else if (entry.name.endsWith('.json') && !NON_KW.has(entry.name)) {
        try {
          const d = JSON.parse(fs.readFileSync(full, 'utf-8'));
          if (d.alias_of === canonicalKeyword && typeof d.keyword === 'string') {
            results.push({ filePath: full.replace(process.cwd() + '/', ''), keyword: d.keyword });
          }
        } catch {}
      }
    }
  }
  scan(path.join(process.cwd(), 'data'));
  return results;
}
```

---

## Task 1: Issue templates

**Files:**
- Create: `.github/ISSUE_TEMPLATE/register-alias.yml`
- Create: `.github/ISSUE_TEMPLATE/detach-alias.yml`

- [ ] **Step 1: Create `.github/ISSUE_TEMPLATE/register-alias.yml`**

```yaml
name: "유사어 등록 요청"
description: "기존 키워드의 유사어(다른 이름)를 등록합니다"
title: "[유사어 등록] "
labels: ["keyword-alias"]
body:
  - type: input
    id: alias_keyword
    attributes:
      label: "유사어 키워드"
      description: "등록할 유사어 (예: 금)"
      placeholder: "금"
    validations:
      required: true
  - type: input
    id: canonical_keyword
    attributes:
      label: "연결할 기존 키워드"
      description: "이미 등록된 키워드 (예: 금값)"
      placeholder: "금값"
    validations:
      required: true
  - type: textarea
    id: reason
    attributes:
      label: "등록 이유"
      description: "이 유사어가 유용한 이유를 설명해 주세요"
    validations:
      required: false
```

- [ ] **Step 2: Create `.github/ISSUE_TEMPLATE/detach-alias.yml`**

```yaml
name: "유사어 해제 요청"
description: "유사어 연결을 해제하고 독립 키워드로 전환합니다"
title: "[유사어 해제] "
labels: ["keyword-alias-detach"]
body:
  - type: input
    id: alias_keyword
    attributes:
      label: "해제할 유사어 키워드"
      description: "현재 유사어로 등록된 키워드 (예: 금)"
      placeholder: "금"
    validations:
      required: true
  - type: input
    id: new_url
    attributes:
      label: "새로운 목적지 URL"
      description: "독립 키워드로 전환 시 연결할 URL"
      placeholder: "https://example.com"
    validations:
      required: true
  - type: textarea
    id: reason
    attributes:
      label: "해제 이유"
      description: "유사어 연결을 해제하는 이유를 설명해 주세요"
    validations:
      required: true
```

- [ ] **Step 3: Verify YAML is syntactically valid**

Run: `cd /path/to/repo && npx js-yaml .github/ISSUE_TEMPLATE/register-alias.yml && npx js-yaml .github/ISSUE_TEMPLATE/detach-alias.yml`
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add .github/ISSUE_TEMPLATE/register-alias.yml .github/ISSUE_TEMPLATE/detach-alias.yml
git commit -m "feat(issues): add register-alias and detach-alias issue templates"
```

---

## Task 2: Extend trigger condition in validate-issue.yml

**Files:**
- Modify: `.github/workflows/validate-issue.yml`

The current `if` condition in the `validate` job only handles `keyword-proposal` and `keyword-change`. We need to add `keyword-alias`, `keyword-alias-detach`, and `keyword-delete`.

- [ ] **Step 1: Update the job `if` condition**

In `.github/workflows/validate-issue.yml`, find the `if:` block under `jobs: validate:` (currently around line 15) and replace it with:

```yaml
    if: |
      github.event_name == 'workflow_dispatch' ||
      (
        github.event_name == 'issues' &&
        github.event.action == 'labeled' &&
        (
          github.event.label.name == 'keyword-proposal' ||
          github.event.label.name == 'keyword-change' ||
          github.event.label.name == 'keyword-alias' ||
          github.event.label.name == 'keyword-alias-detach' ||
          github.event.label.name == 'keyword-delete'
        )
      )
```

- [ ] **Step 2: Verify YAML is syntactically valid**

Run: `npx js-yaml .github/workflows/validate-issue.yml`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/validate-issue.yml
git commit -m "feat(validate-issue): add keyword-alias, keyword-alias-detach, keyword-delete to trigger"
```

---

## Task 3: Alias registration handler (keyword-alias label)

**Files:**
- Modify: `.github/workflows/validate-issue.yml`

Add a new step after the existing "Create PR" step. This step handles the full alias registration flow: parse fields → validate → create alias JSON file → create PR → comment.

- [ ] **Step 1: Add the alias registration step to validate-issue.yml**

Append the following step at the end of the `steps:` list in the `validate` job:

```yaml
      - name: Handle alias registration
        if: contains(fromJson(steps.context.outputs.labels), 'keyword-alias')
        uses: actions/github-script@ed597411d8f924073f98dfc5c65a23a2325f34cd # v8
        env:
          BODY: ${{ steps.context.outputs.body }}
          ISSUE_NUMBER: ${{ steps.context.outputs.issue_number }}
          GOOGLE_SAFE_BROWSING_API_KEY: ${{ secrets.GOOGLE_SAFE_BROWSING_API_KEY }}
        with:
          script: |
            const body = process.env.BODY || '';
            const issueNumber = parseInt(process.env.ISSUE_NUMBER);
            const { owner, repo } = context.repo;
            const fs = require('fs');

            // --- helpers ---
            function computeFilePath(keyword) {
              const CHOSEONG = ['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
              const first = keyword[0];
              const code = first.charCodeAt(0);
              if (code >= 0xAC00 && code <= 0xD7A3) {
                return `data/${CHOSEONG[Math.floor((code - 0xAC00) / 588)]}/${first}/${keyword}.json`;
              } else if (/\d/.test(first)) {
                return `data/_num/${keyword}.json`;
              }
              return `data/_en/${keyword.toLowerCase()}.json`;
            }

            async function getKeywordData(keyword) {
              try {
                const { data } = await github.rest.repos.getContent({ owner, repo, path: computeFilePath(keyword), ref: 'main' });
                return JSON.parse(Buffer.from(data.content, 'base64').toString());
              } catch { return null; }
            }

            async function createBranchFromMain(branch) {
              const mainRef = await github.rest.git.getRef({ owner, repo, ref: 'heads/main' });
              const sha = mainRef.data.object.sha;
              try {
                await github.rest.git.getRef({ owner, repo, ref: `heads/${branch}` });
                await github.rest.git.updateRef({ owner, repo, ref: `heads/${branch}`, sha, force: true });
              } catch (e) {
                if (e.status === 404) await github.rest.git.createRef({ owner, repo, ref: `refs/heads/${branch}`, sha });
                else throw e;
              }
            }

            async function fail(msg) {
              await github.rest.issues.createComment({ owner, repo, issue_number: issueNumber, body: msg });
              await github.rest.issues.update({ owner, repo, issue_number: issueNumber, state: 'closed' });
            }

            // --- parse ---
            const aliasMatch = body.match(/### 유사어 키워드\s*\n\s*(.+)/);
            const canonicalMatch = body.match(/### 연결할 기존 키워드\s*\n\s*(.+)/);
            if (!aliasMatch || !canonicalMatch) {
              return fail('❌ 유사어 키워드 또는 연결할 기존 키워드를 파싱할 수 없습니다. 양식을 확인해 주세요.');
            }
            const alias = aliasMatch[1].trim();
            const canonical = canonicalMatch[1].trim();

            // --- validate alias character rules ---
            if (!/^[가-힣ㄱ-ㅎa-zA-Z0-9]+$/.test(alias)) {
              return fail('❌ 유사어 키워드에 허용되지 않는 문자가 포함되어 있습니다. 한글, 영문, 숫자만 사용 가능합니다.');
            }

            // --- validate alias not blocklisted/profanity ---
            const CHOSEONG = ['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
            const JAMO_SET = new Set(CHOSEONG);
            const normalize = (s) => s.normalize('NFC').replace(/[^가-힣ㄱ-ㅎa-zA-Z0-9]/g, '').toLowerCase();
            const extractCho = (s) => [...s].map(ch => { const c = ch.charCodeAt(0); return (c >= 0xAC00 && c <= 0xD7A3) ? CHOSEONG[Math.floor((c - 0xAC00) / 588)] : ch; }).join('');
            const isJamoOnly = (s) => [...s].every(ch => JAMO_SET.has(ch));
            const isBlocked = (word, list) => {
              const n = normalize(word);
              if (list.some(b => normalize(b) === n)) return true;
              if (isJamoOnly(n) && list.some(b => extractCho(normalize(b)) === n)) return true;
              return false;
            };

            let blocklist = [], profanityList = [];
            try { blocklist = JSON.parse(fs.readFileSync('data/blocklist.json', 'utf-8')); } catch {}
            try { profanityList = JSON.parse(fs.readFileSync('data/profanity-blocklist.json', 'utf-8')); } catch {}

            if (isBlocked(alias, [...blocklist, ...profanityList])) {
              return fail('❌ 이 키워드는 등록이 제한되어 있습니다 (금지 키워드 목록).');
            }

            // --- validate canonical exists and is not itself an alias ---
            const canonicalData = await getKeywordData(canonical);
            if (!canonicalData) {
              return fail(`❌ 연결할 키워드 "${canonical}"가 존재하지 않습니다. 먼저 해당 키워드를 등록해 주세요.`);
            }
            if (canonicalData.alias_of) {
              return fail(`❌ "${canonical}"은 "${canonicalData.alias_of}"의 유사어입니다. 유사어의 유사어는 등록할 수 없습니다 (체인 금지). "${canonicalData.alias_of}"를 대상으로 다시 시도해 주세요.`);
            }
            if (typeof canonicalData.url !== 'string') {
              return fail(`❌ "${canonical}"의 데이터 형식이 올바르지 않습니다.`);
            }

            // --- validate alias keyword doesn't already exist as a canonical ---
            const existingAlias = await getKeywordData(alias);
            if (existingAlias && typeof existingAlias.url === 'string') {
              return fail(`❌ "${alias}"는 이미 독립 키워드로 등록되어 있습니다. 유사어로 등록하려면 먼저 해당 키워드를 삭제해야 합니다.`);
            }
            if (existingAlias && existingAlias.alias_of) {
              return fail(`❌ "${alias}"는 이미 "${existingAlias.alias_of}"의 유사어로 등록되어 있습니다.`);
            }

            // --- create alias JSON + PR ---
            const branch = `keyword/issue-${issueNumber}`;
            await createBranchFromMain(branch);

            const filePath = computeFilePath(alias);
            const content = JSON.stringify({ keyword: alias, alias_of: canonical, created: new Date().toISOString().split('T')[0] }, null, 2) + '\n';
            await github.rest.repos.createOrUpdateFileContents({
              owner, repo, path: filePath,
              message: `feat: add alias "${alias}" → "${canonical}"`,
              content: Buffer.from(content).toString('base64'),
              branch
            });

            const { data: pr } = await github.rest.pulls.create({
              owner, repo,
              title: `[유사어 등록] ${alias} → ${canonical}`,
              head: branch, base: 'main',
              body: `## 유사어 등록 제안\n\n- **유사어:** \`${alias}\`\n- **연결 키워드:** \`${canonical}\`\n- **제안 Issue:** Fixes #${issueNumber}\n\n---\n\n투표해 주세요! 👍 찬성 / 👎 반대\n\nPR 생성 후 24시간이 지난 다음 찬성이 3개 이상이면 자동 병합됩니다.`
            });

            await github.rest.issues.createComment({
              owner, repo, issue_number: issueNumber,
              body: `✅ "${alias}"을 "${canonical}"의 유사어로 등록하는 PR을 생성했습니다: #${pr.number}\n\n커뮤니티 투표를 기다립니다. 👍 찬성 3개 이상, PR 생성 후 24시간이 지나면 자동 병합됩니다.`
            });

            // --- concurrent issue notification ---
            const { data: openIssues } = await github.rest.issues.listForRepo({
              owner, repo, state: 'open', labels: 'keyword-alias,keyword-change,keyword-alias-detach'
            });
            const concurrent = openIssues.filter(i => i.number !== issueNumber && (i.body || '').includes(canonical));
            if (concurrent.length > 0) {
              const refs = concurrent.map(i => `#${i.number}`).join(', ');
              await github.rest.issues.createComment({
                owner, repo, issue_number: issueNumber,
                body: `ℹ️ 이 키워드에 대한 다른 진행 중인 요청이 있습니다: ${refs}\n두 요청 모두 커뮤니티 투표로 진행됩니다.`
              });
            }
```

- [ ] **Step 2: Verify YAML is syntactically valid**

Run: `npx js-yaml .github/workflows/validate-issue.yml`
Expected: no errors

- [ ] **Step 3: Manual test via workflow_dispatch**

Create a test Issue manually with label `keyword-alias`, alias keyword = `테스트금`, canonical = `금값`.
Then run:
```bash
gh workflow run validate-issue.yml -f issue_number=<ISSUE_NUMBER>
```
Expected: PR created titled `[유사어 등록] 테스트금 → 금값`, comment on Issue.

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/validate-issue.yml
git commit -m "feat(validate-issue): add alias registration handler for keyword-alias label"
```

---

## Task 4: Alias detach handler (keyword-alias-detach label)

**Files:**
- Modify: `.github/workflows/validate-issue.yml`

- [ ] **Step 1: Add the alias detach step to validate-issue.yml**

Append after the alias registration step:

```yaml
      - name: Handle alias detach
        if: contains(fromJson(steps.context.outputs.labels), 'keyword-alias-detach')
        uses: actions/github-script@ed597411d8f924073f98dfc5c65a23a2325f34cd # v8
        env:
          BODY: ${{ steps.context.outputs.body }}
          ISSUE_NUMBER: ${{ steps.context.outputs.issue_number }}
          GOOGLE_SAFE_BROWSING_API_KEY: ${{ secrets.GOOGLE_SAFE_BROWSING_API_KEY }}
        with:
          script: |
            const body = process.env.BODY || '';
            const issueNumber = parseInt(process.env.ISSUE_NUMBER);
            const { owner, repo } = context.repo;
            const fs = require('fs');

            function computeFilePath(keyword) {
              const CHOSEONG = ['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
              const first = keyword[0];
              const code = first.charCodeAt(0);
              if (code >= 0xAC00 && code <= 0xD7A3) {
                return `data/${CHOSEONG[Math.floor((code - 0xAC00) / 588)]}/${first}/${keyword}.json`;
              } else if (/\d/.test(first)) { return `data/_num/${keyword}.json`; }
              return `data/_en/${keyword.toLowerCase()}.json`;
            }

            async function getKeywordFile(keyword) {
              const filePath = computeFilePath(keyword);
              try {
                const { data } = await github.rest.repos.getContent({ owner, repo, path: filePath, ref: 'main' });
                return { filePath, sha: data.sha, data: JSON.parse(Buffer.from(data.content, 'base64').toString()) };
              } catch { return null; }
            }

            async function createBranchFromMain(branch) {
              const mainRef = await github.rest.git.getRef({ owner, repo, ref: 'heads/main' });
              const sha = mainRef.data.object.sha;
              try {
                await github.rest.git.getRef({ owner, repo, ref: `heads/${branch}` });
                await github.rest.git.updateRef({ owner, repo, ref: `heads/${branch}`, sha, force: true });
              } catch (e) {
                if (e.status === 404) await github.rest.git.createRef({ owner, repo, ref: `refs/heads/${branch}`, sha });
                else throw e;
              }
            }

            async function fail(msg) {
              await github.rest.issues.createComment({ owner, repo, issue_number: issueNumber, body: msg });
              await github.rest.issues.update({ owner, repo, issue_number: issueNumber, state: 'closed' });
            }

            // --- parse ---
            const aliasMatch = body.match(/### 해제할 유사어 키워드\s*\n\s*(.+)/);
            const urlMatch = body.match(/### 새로운 목적지 URL\s*\n\s*(.+)/);
            if (!aliasMatch || !urlMatch) {
              return fail('❌ 유사어 키워드 또는 새로운 URL을 파싱할 수 없습니다. 양식을 확인해 주세요.');
            }
            const alias = aliasMatch[1].trim();
            const newUrl = urlMatch[1].trim();

            // --- confirm target is actually an alias ---
            const existing = await getKeywordFile(alias);
            if (!existing) {
              return fail(`❌ "${alias}"는 등록되지 않은 키워드입니다.`);
            }
            if (!existing.data.alias_of) {
              return fail(`❌ "${alias}"는 유사어가 아닙니다. 일반 키워드 변경 요청을 사용해 주세요.`);
            }
            const canonicalKeyword = existing.data.alias_of;

            // --- validate new URL ---
            let urlObj;
            try { urlObj = new URL(newUrl); } catch {
              return fail('❌ 유효하지 않은 URL 형식입니다.');
            }
            if (!['http:', 'https:'].includes(urlObj.protocol)) {
              return fail('❌ URL은 http:// 또는 https://로 시작해야 합니다.');
            }

            let allowedDomains = [];
            try { allowedDomains = JSON.parse(fs.readFileSync('data/whitelist.json', 'utf-8')); } catch {
              return fail('❌ 내부 오류: 허용 도메인 목록을 로드할 수 없습니다.');
            }
            if (!allowedDomains.some(d => urlObj.hostname === d || urlObj.hostname.endsWith('.' + d))) {
              await github.rest.issues.createComment({
                owner, repo, issue_number: issueNumber,
                body: `⚠️ URL 도메인(${urlObj.hostname})이 허용 목록에 없습니다. 관리자 검토가 필요합니다.`
              });
              return;
            }

            // Safe Browsing check (non-blocking)
            const safeBrowsingKey = process.env.GOOGLE_SAFE_BROWSING_API_KEY;
            if (safeBrowsingKey) {
              try {
                const sbResp = await fetch(`https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${safeBrowsingKey}`, {
                  method: 'POST', headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ client: { clientId: 'price-kr', clientVersion: '1.0' },
                    threatInfo: { threatTypes: ['MALWARE','SOCIAL_ENGINEERING','UNWANTED_SOFTWARE'],
                      platformTypes: ['ANY_PLATFORM'], threatEntryTypes: ['URL'], threatEntries: [{ url: newUrl }] } })
                });
                const sbData = await sbResp.json();
                if (sbData.matches?.length > 0) return fail('❌ URL이 Google Safe Browsing에서 위험한 것으로 감지되었습니다.');
              } catch (err) { console.warn('Safe Browsing check failed:', err.message); }
            }

            // --- create PR: convert alias JSON to canonical JSON ---
            const branch = `keyword/issue-${issueNumber}`;
            await createBranchFromMain(branch);

            const newContent = JSON.stringify({
              keyword: alias, url: newUrl, created: new Date().toISOString().split('T')[0]
            }, null, 2) + '\n';

            await github.rest.repos.createOrUpdateFileContents({
              owner, repo, path: existing.filePath,
              message: `feat: detach alias "${alias}" from "${canonicalKeyword}" as independent keyword`,
              content: Buffer.from(newContent).toString('base64'),
              sha: existing.sha, branch
            });

            const { data: pr } = await github.rest.pulls.create({
              owner, repo,
              title: `[유사어 해제] ${alias} (← ${canonicalKeyword})`,
              head: branch, base: 'main',
              body: `## 유사어 해제 제안\n\n- **유사어 키워드:** \`${alias}\`\n- **기존 연결:** \`${canonicalKeyword}\`\n- **새로운 URL:** \`${newUrl}\`\n- **제안 Issue:** Fixes #${issueNumber}\n\n---\n\n투표해 주세요! 👍 찬성 / 👎 반대\n\nPR 생성 후 24시간이 지난 다음 찬성이 3개 이상이면 자동 병합됩니다.`
            });

            await github.rest.issues.createComment({
              owner, repo, issue_number: issueNumber,
              body: `✅ "${alias}"의 "${canonicalKeyword}" 유사어 연결을 해제하고 독립 키워드로 전환하는 PR을 생성했습니다: #${pr.number}`
            });
```

- [ ] **Step 2: Verify YAML is syntactically valid**

Run: `npx js-yaml .github/workflows/validate-issue.yml`
Expected: no errors

- [ ] **Step 3: Manual test**

Create test Issue with label `keyword-alias-detach`, 해제할 유사어 키워드 = `금`, 새로운 URL = `https://finance.naver.com/marketindex/goldDaily498702.naver`.
```bash
gh workflow run validate-issue.yml -f issue_number=<ISSUE_NUMBER>
```
Expected: PR created converting `금.json` from alias to canonical JSON, comment on Issue.

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/validate-issue.yml
git commit -m "feat(validate-issue): add alias detach handler for keyword-alias-detach label"
```

---

## Task 5: Detect alias target in keyword-change flow

**Files:**
- Modify: `.github/workflows/validate-issue.yml`

When a `keyword-change` Issue targets a keyword that is an alias, redirect the PR to change the **canonical's** URL instead.

- [ ] **Step 1: Locate the "Create PR" step in validate-issue.yml**

Find the step named `Create PR` (currently around line 281). Inside its script, find the block that checks `isChangeRequest` and whether the file exists (around lines 333–352). After the `existingFile` is fetched:

```javascript
// After this line:
existingFile = await github.rest.repos.getContent({ ... });
```

- [ ] **Step 2: Add alias detection before PR creation**

In the `Create PR` step script, add this block BEFORE the duplicate-check logic (`if (existingFile && !isChangeRequest)`):

```javascript
            // --- alias detection for keyword-change ---
            if (isChangeRequest && existingFile) {
              let existingData;
              try {
                existingData = JSON.parse(Buffer.from(existingFile.data.content, 'base64').toString());
              } catch {}
              if (existingData && existingData.alias_of) {
                // Target is an alias — redirect change to canonical
                const canonicalKeyword = existingData.alias_of;
                await github.rest.issues.createComment({
                  owner: context.repo.owner,
                  repo: context.repo.repo,
                  issue_number: issueNumber,
                  body: `ℹ️ "${keyword}"은 "${canonicalKeyword}"의 유사어입니다.\n"${canonicalKeyword}"의 URL을 변경하는 PR을 생성했습니다.\n이 변경은 "${canonicalKeyword}"에 연결된 모든 유사어에 자동 반영됩니다.`
                });
                // Repoint keyword/filePath to canonical for PR creation
                keyword = canonicalKeyword;
                filePath = computeFilePath(canonicalKeyword);
                existingFile = await github.rest.repos.getContent({
                  owner: context.repo.owner, repo: context.repo.repo,
                  path: filePath, ref: 'main'
                }).catch(() => undefined);
              }
            }
```

Note: `computeFilePath` is already defined inline in the "Create PR" step as CHOSEONG path logic. Refactor it into a local function at the top of that step's script if not already done.

- [ ] **Step 3: Verify YAML is syntactically valid**

Run: `npx js-yaml .github/workflows/validate-issue.yml`
Expected: no errors

- [ ] **Step 4: Manual test**

Create test Issue with label `keyword-change`, 변경할 키워드 = `금`, 새로운 URL = any valid whitelisted URL.
```bash
gh workflow run validate-issue.yml -f issue_number=<ISSUE_NUMBER>
```
Expected: PR changes `금값.json` (not `금.json`), comment explains alias redirect.

- [ ] **Step 5: Commit**

```bash
git add .github/workflows/validate-issue.yml
git commit -m "feat(validate-issue): redirect keyword-change to canonical when target is alias"
```

---

## Task 6: keyword-delete alias cascade

**Files:**
- Modify: `.github/workflows/validate-issue.yml`

When a `keyword-delete` Issue targets a canonical that has aliases, include all alias files in the deletion PR. When it targets an alias directly, delete only the alias.

- [ ] **Step 1: Add the keyword-delete handler step to validate-issue.yml**

Append after the alias detach step:

```yaml
      - name: Handle keyword delete with alias cascade
        if: contains(fromJson(steps.context.outputs.labels), 'keyword-delete')
        uses: actions/github-script@ed597411d8f924073f98dfc5c65a23a2325f34cd # v8
        env:
          BODY: ${{ steps.context.outputs.body }}
          ISSUE_NUMBER: ${{ steps.context.outputs.issue_number }}
        with:
          script: |
            const body = process.env.BODY || '';
            const issueNumber = parseInt(process.env.ISSUE_NUMBER);
            const { owner, repo } = context.repo;
            const fs = require('fs'), path = require('path');

            function computeFilePath(keyword) {
              const CHOSEONG = ['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
              const first = keyword[0];
              const code = first.charCodeAt(0);
              if (code >= 0xAC00 && code <= 0xD7A3) {
                return `data/${CHOSEONG[Math.floor((code - 0xAC00) / 588)]}/${first}/${keyword}.json`;
              } else if (/\d/.test(first)) { return `data/_num/${keyword}.json`; }
              return `data/_en/${keyword.toLowerCase()}.json`;
            }

            // Scan checked-out repo for alias files pointing to canonical
            function findAliasFiles(canonicalKeyword) {
              const NON_KW = new Set(['blocklist.json','whitelist.json','profanity-blocklist.json']);
              const results = [];
              function scan(dir) {
                for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
                  const full = path.join(dir, entry.name);
                  if (entry.isDirectory()) scan(full);
                  else if (entry.name.endsWith('.json') && !NON_KW.has(entry.name)) {
                    try {
                      const d = JSON.parse(fs.readFileSync(full, 'utf-8'));
                      if (d.alias_of === canonicalKeyword && typeof d.keyword === 'string') {
                        results.push({ filePath: full.replace(process.cwd() + '/', ''), keyword: d.keyword });
                      }
                    } catch {}
                  }
                }
              }
              scan(path.join(process.cwd(), 'data'));
              return results;
            }

            async function createBranchFromMain(branch) {
              const mainRef = await github.rest.git.getRef({ owner, repo, ref: 'heads/main' });
              const sha = mainRef.data.object.sha;
              try {
                await github.rest.git.getRef({ owner, repo, ref: `heads/${branch}` });
                await github.rest.git.updateRef({ owner, repo, ref: `heads/${branch}`, sha, force: true });
              } catch (e) {
                if (e.status === 404) await github.rest.git.createRef({ owner, repo, ref: `refs/heads/${branch}`, sha });
                else throw e;
              }
            }

            async function fail(msg) {
              await github.rest.issues.createComment({ owner, repo, issue_number: issueNumber, body: msg });
              await github.rest.issues.update({ owner, repo, issue_number: issueNumber, state: 'closed' });
            }

            // --- parse ---
            const keywordMatch = body.match(/### 삭제할 키워드\s*\n\s*(.+)/);
            if (!keywordMatch) return fail('❌ 삭제할 키워드를 파싱할 수 없습니다. 양식을 확인해 주세요.');
            const keyword = keywordMatch[1].trim();

            // --- fetch target keyword ---
            const filePath = computeFilePath(keyword);
            let existingFile;
            try {
              const { data } = await github.rest.repos.getContent({ owner, repo, path: filePath, ref: 'main' });
              existingFile = { filePath, sha: data.sha, data: JSON.parse(Buffer.from(data.content, 'base64').toString()) };
            } catch {
              return fail(`❌ "${keyword}" 키워드를 찾을 수 없습니다.`);
            }

            const branch = `keyword/issue-${issueNumber}`;
            await createBranchFromMain(branch);

            const mainRef = await github.rest.git.getRef({ owner, repo, ref: 'heads/main' });
            const { data: commit } = await github.rest.git.getCommit({ owner, repo, commit_sha: mainRef.data.object.sha });

            const filesToDelete = [existingFile];
            let commentBody;

            if (existingFile.data.alias_of) {
              // Target is an alias — delete only alias
              commentBody = `✅ 유사어 "${keyword}" (→ "${existingFile.data.alias_of}")를 삭제하는 PR을 생성했습니다: #PR_NUMBER\n원본 키워드 "${existingFile.data.alias_of}"은 유지됩니다.`;
            } else {
              // Target is canonical — find and cascade to all aliases
              const aliases = findAliasFiles(keyword);
              for (const alias of aliases) {
                try {
                  const { data } = await github.rest.repos.getContent({ owner, repo, path: alias.filePath, ref: 'main' });
                  filesToDelete.push({ filePath: alias.filePath, sha: data.sha, data: {} });
                } catch {}
              }
              if (aliases.length > 0) {
                const aliasNames = aliases.map(a => a.keyword).join(', ');
                commentBody = `⚠️ "${keyword}"에 연결된 유사어가 있습니다: ${aliasNames}\n원본 키워드와 함께 모든 유사어도 삭제하는 PR을 생성했습니다: #PR_NUMBER`;
              } else {
                commentBody = `✅ "${keyword}" 키워드를 삭제하는 PR을 생성했습니다: #PR_NUMBER`;
              }
            }

            // Build tree with all files deleted (mode "000000" = delete)
            const baseTree = commit.tree.sha;
            const treeItems = filesToDelete.map(f => ({ path: f.filePath, mode: '100644', type: 'blob', sha: null }));
            const { data: newTree } = await github.rest.git.createTree({ owner, repo, base_tree: baseTree, tree: treeItems });
            const { data: newCommit } = await github.rest.git.createCommit({
              owner, repo,
              message: `feat: delete keyword "${keyword}" and ${filesToDelete.length - 1} alias(es)`,
              tree: newTree.sha, parents: [mainRef.data.object.sha]
            });
            await github.rest.git.updateRef({ owner, repo, ref: `heads/${branch}`, sha: newCommit.sha });

            const { data: pr } = await github.rest.pulls.create({
              owner, repo,
              title: `[키워드 삭제] ${keyword}`,
              head: branch, base: 'main',
              body: `## 키워드 삭제 제안\n\n- **키워드:** \`${keyword}\`\n- **삭제 파일:** ${filesToDelete.map(f => `\`${f.filePath}\``).join(', ')}\n- **제안 Issue:** Fixes #${issueNumber}\n\n---\n\n투표해 주세요! 👍 찬성 / 👎 반대\n\nPR 생성 후 24시간이 지난 다음 찬성이 3개 이상이면 자동 병합됩니다.`
            });

            await github.rest.issues.createComment({
              owner, repo, issue_number: issueNumber,
              body: commentBody.replace('#PR_NUMBER', `#${pr.number}`)
            });
```

- [ ] **Step 2: Verify YAML is syntactically valid**

Run: `npx js-yaml .github/workflows/validate-issue.yml`
Expected: no errors

- [ ] **Step 3: Manual test — canonical with aliases**

Create test Issue with label `keyword-delete`, 삭제할 키워드 = `금값` (which has alias `금`).
```bash
gh workflow run validate-issue.yml -f issue_number=<ISSUE_NUMBER>
```
Expected: PR deletes both `금값.json` and `금.json`, comment warns about cascade.

- [ ] **Step 4: Manual test — alias only**

Create test Issue with label `keyword-delete`, 삭제할 키워드 = `금`.
Expected: PR deletes only `금.json`, comment says canonical preserved.

- [ ] **Step 5: Commit**

```bash
git add .github/workflows/validate-issue.yml
git commit -m "feat(validate-issue): add keyword-delete handler with alias cascade"
```

---

## Self-Review

**Spec coverage:**
- ✅ `register-alias.yml` Issue template — Task 1
- ✅ `detach-alias.yml` Issue template — Task 1
- ✅ `keyword-alias` label: alias validation + PR creation — Task 3
  - ✅ Blocklist/profanity check for alias keyword — Task 3
  - ✅ Canonical existence check — Task 3
  - ✅ Chain prohibition (canonical must not be alias) — Task 3
  - ✅ Existing keyword collision check — Task 3
  - ✅ Concurrent issue notification — Task 3
- ✅ `keyword-alias-detach` label: detach + URL validation + PR — Task 4
- ✅ `keyword-change` alias detection → canonical redirect — Task 5
- ✅ `keyword-delete` cascade: canonical deleted → aliases also deleted — Task 6
- ✅ `keyword-delete` alias only: alias deleted, canonical preserved — Task 6
- ✅ Issue comment with alias relationship info — Tasks 3, 4, 5, 6

**Type consistency:** All steps use consistent `computeFilePath`, `createBranchFromMain` patterns. Branch naming is uniformly `keyword/issue-${issueNumber}`.

**Limitation:** The `keyword-delete` step uses `git.createTree` with `sha: null` to delete files, which is the correct GitHub API approach. The existing workflow uses `repos.createOrUpdateFileContents` for single-file operations — the tree approach is needed for multi-file deletes.
