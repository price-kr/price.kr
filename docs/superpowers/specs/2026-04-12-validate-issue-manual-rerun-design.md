# Spec: Validate Keyword Issue - Manual Rerun & Auto-Recovery

## 1. Goal
Currently, `validate-issue.yml` only runs on `issues: [opened]`. If an issue is created without the required labels (`keyword-proposal`, `keyword-change`), the workflow doesn't run, or if it runs and fails (e.g., due to missing labels), it closes the issue. There is no easy way to re-trigger it once labels are added.

The goal is to allow:
1.  **Automatic re-runs** when specific labels are added to an existing issue.
2.  **Manual re-runs** via `workflow_dispatch` (Actions tab) for any specific issue ID.
3.  **Auto-recovery** (re-opening) of issues if validation passes after a re-run.

## 2. Architecture & Triggers

### New Triggers
```yaml
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

### Context Resolution Logic
The workflow must handle three different event payloads:
- `issues: [opened]`: Normal flow.
- `issues: [labeled]`: Automates re-validation.
- `workflow_dispatch`: Manual flow (requires fetching issue data via API).

The logic will normalize these into a single set of variables (`issue_number`, `body`, `labels`) for the subsequent validation steps.

## 3. Detailed Logic Updates

### Job Filter (`if` condition)
The job-level `if` must be updated to account for `workflow_dispatch` and `labeled` events:
- If `workflow_dispatch`, always run (validation will happen inside).
- If `issues`, check labels as before, but ensure it only triggers for the *specific* labels we care about during the `labeled` event.

### State Recovery (Auto-Reopen)
If validation passes:
1.  Check current issue state via API.
2.  If `state === 'closed'`, update `state` to `open`.
3.  Add a comment explaining that validation passed and the issue has been re-opened.

### Parsing Logic
Update "Parse issue body" to use fetched data if `workflow_dispatch` is used.

## 4. Testing & Validation
- **Test Case 1**: Create issue without label -> Manual trigger via Actions -> PR created, issue re-opened.
- **Test Case 2**: Create issue with wrong data -> Fixed -> Add `keyword-proposal` label -> PR created, issue re-opened.
- **Test Case 3**: Normal `opened` flow still works as expected.

## 5. Scope & Constraints
- Only handles issues with `keyword-proposal` or `keyword-change` labels.
- Uses existing validation scripts (`scripts/validate-keyword.ts` if applicable, or inline logic in workflow).
- Does not modify existing PR creation or branch naming conventions.
