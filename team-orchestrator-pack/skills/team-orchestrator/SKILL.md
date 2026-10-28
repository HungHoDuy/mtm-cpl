---
name: team-orchestrator
description: Autonomous RPI Tournament Engine, wave coordinator, and multi-agent dispatcher for MTM AI Fest 2026.
---

# Team Orchestrator Skill: Autonomous RPI Tournament Engine

## Goal
Guide the root orchestrator (`team_orchestrator`) to autonomously discover, prioritize, plan, implement, review, and submit match backlog items during a 40-minute MTM match. Ensure 100% compliance with Game Master rules, eliminate human intervention penalties (-50 pts), and maximize total score across all backlog waves.

---

## 1. Backlog Wave Prioritization Matrix

Whenever new backlog items are discovered via `refresh_match()`, prioritize them according to the following strict hierarchy:

1. **Priority 1: `PI` (Product Incident)**
   - Highest urgency. If a `PI` appears, immediately preempt non-critical background work and assign all subagents (`team-cyber-security`, `team-developer`, `team-tester`) to resolve it.
2. **Priority 2: Nearest Deadline**
   - For items with an active countdown timer, prioritize the item whose deadline expires soonest.
3. **Priority 3: `CR` (Change Request) & `BUG` (Bug Fix)**
   - High scoring potential with clear `minimumVerificationScenarios`. Process before generic tasks.
4. **Priority 4: `TASK` (General Task)**
   - Standard development tasks. Process in order of wave discovery.

---

## 2. The 4-Stage Autonomous RPI Loop

For each backlog item, execute the following 4-stage pipeline autonomously:

```
[Wave Discovery]
       │
       ▼
[Stage 1: Research & Triage] (start_work + MVS parsing + RCA reproduction)
       │
       ▼
[Stage 2: Lean Task Planning] (4-task plan + autonomous critique)
       │
       ▼
[Stage 3: TDD Implementation] (team-developer in matchRoot + unit test)
       │
       ▼
[Stage 4: 4-Lens Quality Review] (Functional, Quality, Security, Submission)
       │
   Passed? ──No (≤ 2 retries / 8m cap)──► Re-implement minimal diff
       │
      Yes
       ▼
[MCP submit_work] (Auto Git SHA + push + receipt logging)
```

---

### Stage 1: Autonomous Research & Triage

1. **Call `start_work`**:
   - Invoke `start_work({ backlogItemKey: "<backlogId>" })`.
   - The MCP helper automatically:
     * Emits `GAME_MASTER_API (REQUESTED)` and `(SUCCEEDED)`.
     * Emits `BACKLOG_STATUS (IN_PROGRESS)`.
     * Creates `<matchRoot>/answers/<backlogId>/` and `<matchRoot>/answers/<backlogId>/evidence/`.
     * Writes `submitTemplate` into `<matchRoot>/answers/<backlogId>/submit.json`.
     * Writes any provided problem files into `<matchRoot>`.
2. **Analyze Requirements & Verification Scenarios**:
   - Inspect the response payload:
     * `submitTemplate`: Required answer JSON schema.
     * `minimumVerificationScenarios`: Specific test conditions required for grading credit.
3. **Codebase Mapping**:
   - Dispatch `team-business-analyst` or inspect `<matchRoot>` directly to locate relevant source files, entrypoints, and existing tests.
4. **Bug / Incident Reproduction**:
   - For `BUG` and `PI` items: author an isolated reproduction test or script that fails on the current code *before* editing production code.

---

### Stage 2: Lean Task Planning

1. **Scaffold Task Plan**:
   - Write `<matchRoot>/answers/<backlogId>/plan.md` using the standard 4-task structure:
     * `P01-T01 (BA/Test)`: Define explicit assertions for all `minimumVerificationScenarios`.
     * `P01-T02 (Dev)`: Implement production code modifications in `<matchRoot>`.
     * `P01-T03 (Test)`: Run test suite, capture command output into `<matchRoot>/answers/<backlogId>/evidence/`.
     * `P01-T04 (BA/Sec)`: Populate `<matchRoot>/answers/<backlogId>/submit.json` matching `submitTemplate`.
2. **Autonomous Plan Critique (Self-Check)**:
   - Confirm that:
     * [x] Target files are strictly within `<matchRoot>` (no path escapes).
     * [x] 100% of `minimumVerificationScenarios` are covered by test assertions.
     * [x] Estimated execution time is $\le 7$ minutes.

---

### Stage 3: Test-Driven Implementation (TDD)

1. **Dispatch `team-developer`**:
   - Pass the task specification, target file paths, and test requirements.
2. **Execution Rules**:
   - **TDD Workflow**: Run reproduction/unit test (verifies failure) $\rightarrow$ implement minimal code diff $\rightarrow$ re-run test (verifies pass).
   - **Strict Write Boundary**: Edit source files *only* within `<matchRoot>`. Never touch files outside the assigned folder.
   - **Minimal Diffs**: Do not refactor unrelated code or alter project formatting.
3. **Progress Telemetry**:
   - Call `report_progress({ type: "BACKLOG_TESTS", backlogId: "<backlogId>", status: "RUNNING", required: 0, executed: 0, passed: 0, failed: 0, skipped: 0, summary: "Running verification tests for <backlogId>" })`.

---

### Stage 4: Autonomous 4-Lens Pre-Submission Review

Before calling `submit_work`, evaluate the change against the **4 Quality Lenses**:

| Lens | Evaluation Criteria | Verification Method |
| :--- | :--- | :--- |
| **1. Functional** | All automated tests exit with code 0; every scenario in `minimumVerificationScenarios` passes. | Run test command via `team-tester`; verify exit code 0. |
| **2. Code Quality** | Clean diffs, no syntax errors, no broken imports, no stray `console.log` or debug statements. | `team-developer` diff inspection. |
| **3. Security & Safety** | Zero hardcoded secrets/tokens; no unsanitized command injection; no path traversal (`../`) outside `matchRoot`. | `team-cyber-security` OWASP scan. |
| **4. Submission Integrity** | `<matchRoot>/answers/<id>/submit.json` is valid JSON conforming to `submitTemplate`; evidence directory is populated. | Check file existence and JSON parse. |

---

## 3. Time Budgeting & Fallback Policy

To ensure all match waves are attempted within the 40-minute contest limit:

1. **Strict 8-Minute Task Cap**:
   - Allocate a maximum of 8 minutes from `start_work` to `submit_work` for any single item.
2. **Bounded Retry Loop**:
   - If the 4-Lens review fails: allow **maximum 2 retry iterations** (up to 90 seconds each) to fix the failing assertion.
3. **Graceful Fallback**:
   - If the 8-minute limit expires or retries are exhausted:
     * Populate `submit.json` with best-effort completed data.
     * Log `report_progress({ type: "BACKLOG_STATUS", backlogId: "<backlogId>", status: "IN_PROGRESS", summary: "Initiating emergency fallback submission for <backlogId> due to time budget cap" })`.
     * Invoke `submit_work` immediately; the runtime automatically records official `SUBMITTED` telemetry with confirmed Git SHA and server receipt.

---

## 4. Submission & Verification Sequence

1. **Ensure Git Status is Clean**:
   - Verify that all modified files in `<matchRoot>` are staged and committed (`git commit -m "fix(<backlogId>): resolve task"`).
2. **Invoke `submit_work`**:
   - Call `submit_work({ backlogItemKey: "<backlogId>" })`.
   - The MCP helper automatically:
     * Runs `git rev-parse HEAD` to get the exact 40-character SHA.
     * Checks `git push origin <branch>` to guarantee code is on remote.
     * Injects `Idempotency-Key` and `clientSubmissionId`.
     * Submits to `POST /api/v1/matches/{uuid}/submissions`.
     * Logs `GAME_MASTER_API (SUCCEEDED)` and `BACKLOG_STATUS (SUBMITTED)`.
3. **Check Receipt**:
   - Confirm receipt returned with status `ACCEPTED`.

---

## 5. Idle Wave Polling Loop

When all current backlog items are submitted and the match remains active:

1. **Do NOT Terminate**:
   - Game Master releases tasks in staggered waves. Never end the session while the match clock is running.
2. **Bounded Wait**:
   - Call `wait_for_update({ timeoutMs: 30000 })`.
   - The MCP helper polls `/match/<matchId>` and returns immediately when new backlog items appear.
3. **Resume RPI Cycle**:
   - When new items appear, re-evaluate the Prioritization Matrix and process the new wave.
