# Validate Keyword Issue - Manual Rerun Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Update `validate-issue.yml` to support `workflow_dispatch` and `labeled` triggers, and automatically re-open issues if validation passes on a re-run.

**Architecture:** Update GitHub Action triggers, add a data resolution step to handle manual inputs, and implement auto-reopen logic using `actions/github-script`.

**Tech Stack:** GitHub Actions, JavaScript (via `actions/github-script`).

---

### Task 1: Update Workflow Triggers and Permissions

**Files:**
- Modify: `.github/workflows/validate-issue.yml:1-12`

- [x] **Step 1: Update triggers to include `labeled` and `workflow_dispatch`**

```yaml
name: Validate Keyword Issue

on:
  issues:
    types: [opened, labeled]
  workflow_dispatch:
    inputs:
      issue_number:
        description: 'Issue number to validate'
        required: true
        type: string
```

- [x] **Step 2: Update job-level `if` to handle all triggers**

```yaml
jobs:
  validate:
    if: |
      github.event_name == 'workflow_dispatch' ||
      contains(github.event.issue.labels.*.name, 'keyword-proposal') ||
      contains(github.event.issue.labels.*.name, 'keyword-change')
```

---

### Task 2: Implement Context Resolution for Manual Trigger

**Files:**
- Modify: `.github/workflows/validate-issue.yml` (insert new step before "Parse issue body")

- [x] **Step 1: Add "Resolve context" step**

```yaml
      - name: Resolve context
        id: context
        uses: actions/github-script@ed597411d8f924073f98dfc5c65a23a2325f34cd # v8
        with:
          script: |
            let issueNumber = context.issue.number;
            let body = context.payload.issue?.body;
            let labels = context.payload.issue?.labels?.map(l => l.name) || [];

            if (context.eventName === 'workflow_dispatch') {
              issueNumber = parseInt(context.payload.inputs.issue_number);
              const { data: issue } = await github.rest.issues.get({
                owner: context.repo.owner,
                repo: context.repo.repo,
                issue_number: issueNumber
              });
              body = issue.body;
              labels = issue.labels.map(l => l.name);
            }

            core.setOutput('issue_number', issueNumber);
            core.setOutput('body', body);
            core.setOutput('labels', JSON.stringify(labels));
```

- [x] **Step 2: Update "Parse issue body" to use resolved context**

```yaml
      - name: Parse issue body
        id: parse
        uses: actions/github-script@ed597411d8f924073f98dfc5c65a23a2325f34cd # v8
        with:
          script: |
            const body = `${{ steps.context.outputs.body }}` || '';
            const issueNumber = parseInt(`${{ steps.context.outputs.issue_number }}`);
            // ... (rest of parsing logic)
            // Use issueNumber instead of context.issue.number
```

---

### Task 3: Implement Auto-Reopen Logic

**Files:**
- Modify: `.github/workflows/validate-issue.yml` (update "Create PR" step)

- [x] **Step 1: Add re-open logic before creating PR**

```javascript
            // Inside actions/github-script in Create PR step
            const issueNumber = parseInt(`${{ steps.context.outputs.issue_number }}`);
            const { data: issue } = await github.rest.issues.get({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: issueNumber
            });

            if (issue.state === 'closed') {
              await github.rest.issues.update({
                owner: context.repo.owner,
                repo: context.repo.repo,
                issue_number: issueNumber,
                state: 'open'
              });
              await github.rest.issues.createComment({
                owner: context.repo.owner,
                repo: context.repo.repo,
                issue_number: issueNumber,
                body: '🔄 재검증 결과가 유효하여 이슈를 다시 오픈합니다.'
              });
            }
```

- [x] **Step 2: Update all steps to use `steps.context.outputs.issue_number`**

---

### Task 4: Final Validation and Commit

- [x] **Step 1: Verify YAML syntax**

Run: `actionlint .github/workflows/validate-issue.yml` (if available)

- [x] **Step 2: Commit all changes**

```bash
git add .github/workflows/validate-issue.yml
git commit -m "ci: allow manual rerun and auto-reopen for validate-issue workflow"
```
