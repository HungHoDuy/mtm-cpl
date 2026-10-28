---
name: team-recovery
description: Autonomous fault recovery, idempotent re-submission, git cleanup, and self-healing protocols for MTM AI Fest.
---

# Team Recovery Skill: Autonomous Self-Healing Protocols

## Goal
Provide deterministic, autonomous recovery mechanisms for runtime faults, network dropouts, submission errors, git state inconsistencies, and session timeouts during match execution. Eliminate any necessity for human operator intervention (-50 pt penalty).

---

## 1. Fault Recovery Matrix

| Fault Scenario | Root Cause | Autonomous Recovery Procedure |
| :--- | :--- | :--- |
| **Submission Timeout / Drop** | Network blip during `POST /submissions` | Safe retry using the **identical** `Idempotency-Key` and `clientSubmissionId`. Game Master API returns existing receipt without re-grading. |
| **Web Session Expired (401/403)** | Server-side cookie expiration on `/match` | Intercept 401/403; execute `login_match()` silently to refresh cookies in memory; retry `refresh_match()` immediately. |
| **Git Dirty State / Conflict** | Stray files or aborted merge in `checkoutRoot` | Run `git status --porcelain`. Discard uncommitted edits outside `matchRoot`. Re-sync working branch with `git checkout -f <branch>`. |
| **Subagent Task Failure** | Syntax error, unhandled exception, or crash | Catch exception at orchestrator level; inspect error trace; retry with targeted instruction (max 2 retries); log `BLOCKER_OPENED` if unresolvable. |
| **Malformed `submit.json`** | Incomplete fields or broken JSON syntax | Validate JSON with parser; if corrupt, reload initial `submitTemplate` from session cache and repopulate known answer fields. |
| **Match Clock Budget Exhaustion** | Task takes $\ge 8$ minutes | Halt further refactoring; assemble best-effort `submit.json`; run test suite once; submit immediately to capture partial credit. |

---

## 2. Idempotent Submission Recovery Protocol

When an HTTP timeout or network disconnect occurs while calling `submit_work`:

1. **Do NOT generate a new `Idempotency-Key`**:
   - The MCP helper tracks `idempotencyMap` in memory keyed by `backlogItemKey`.
2. **Re-invoke `submit_work`**:
   - Call `submit_work({ backlogItemKey: "<backlogId>" })`.
   - The helper reuses the exact same UUID `Idempotency-Key` and `clientSubmissionId`.
3. **Verify Response**:
   - If the Game Master already accepted the submission during the previous attempt, it returns the existing `receiptId` with HTTP 200.
   - If the previous attempt never reached the server, it processes normally with no duplicate penalty.

---

## 3. Git Workspace Self-Healing Protocol

If Git encounters lock files, uncommitted changes, or detached HEAD:

1. **Remove Stale Locks**:
   - Check for and remove `.git/index.lock` if a prior Git process crashed.
2. **Isolate Changes to `matchRoot`**:
   - Run `git status -s`.
   - Any modifications outside `matchRoot` are unauthorized and must be discarded:
     ```powershell
     git checkout -- .
     git clean -fd
     ```
3. **Verify Push Authorization**:
   - Ensure local branch is tracking `origin/<branch>`.
   - Run `git rev-parse HEAD` and `git status -uno` to ensure local commits are ready for push.

---

## 4. Telemetry Logging for Recovery Events

When an incident occurs and is recovered, log the event for grader audit compliance:

1. **Log Blocker Encountered**:
   ```json
   {
     "type": "BLOCKER_OPENED",
     "blockerId": "blk-recovery-01",
     "backlogId": "TASK-01",
     "summary": "Network timeout encountered during submit_work for TASK-01; executing idempotent retry"
   }
   ```
2. **Log Blocker Resolved**:
   ```json
   {
     "type": "BLOCKER_RESOLVED",
     "blockerId": "blk-recovery-01",
     "summary": "TASK-01 submission recovered successfully with receiptId: rcpt_12345"
   }
   ```
