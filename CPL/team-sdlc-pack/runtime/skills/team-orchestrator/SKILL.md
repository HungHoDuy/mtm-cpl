---
name: team-orchestrator
description: Autonomous Single-Orchestrator Tournament SDLC Engine: multi-criteria triage, inline engineering, fast-check verification, and atomic Game Master submission.
---

# Team Orchestrator Skill: Autonomous Single-Orchestrator Tournament Engine

## Goal
Guide the root orchestrator (`team_orchestrator`) to autonomously discover, prioritize, plan, implement, review, and submit match backlog items during a 40-minute MTM match. Ensure 100% compliance with Game Master rules, eliminate human intervention penalties (-50 pts), and maximize total score across all backlog waves.

---

## 1. Backlog Wave Prioritization Matrix (Multi-Criteria Triage)

Whenever new backlog items are discovered via `refresh_match()`, select the highest-urgency item at index 0 (which is deterministically pre-sorted) based on:

1. **Priority 1: `PI` (Product Incident)**
   - Highest operational urgency. If a `PI` appears, immediately preempt non-critical work to avoid severe match score penalties.
2. **Priority 2: Expiring Countdown Deadlines**
   - Items with active closing timers (e.g. `BUG-02` with an active 18-minute countdown clock). **MUST be started and submitted before the timer reaches 0**, ahead of any non-deadline item.
3. **Priority 3: Highest Score / Points Value**
   - In tournament scoring, prioritize higher point values: **300 pts > 250 pts > 200 pts > 150 pts > 100 pts**. A 300 pt `CR` or 250 pt `TASK` takes precedence over a 100 pt `BUG`.
4. **Priority 4: Tie-breaker by Discovery Order / Backlog ID**
   - Standard chronological order when points and deadline urgency are identical.

---

## 2. The 4-Stage Autonomous RPI Loop (Unified Linear 7-Stage SDLC Loop — Zero Subagents)

To eliminate 20–30 minutes of idle context-transfer and reasoning latency, **execute all stages directly within the primary conversation thread without spawning subagents** across **ALL waves**:

```
[Wave Discovery: refresh_match()]
       │
       ▼ (Pick Index 0: PI > Expiring DL > Points)
[Stage 1: Scope & Start Work] (start_work MCP -> acquire MVS & submitTemplate)
       │
       ▼
[Stage 2: Plan & Baseline Evidence] (write plan.md + evidence-runner screenshot BEFORE code edits)
       │
       ▼
[Stage 3: Minimal Diff Implementation] (direct code/schema edit inside matchRoot)
       │
       ▼
[Stage 4: Fast-Check Iteration] (pnpm typecheck ~4s / targeted vitest ~3s; NO full pnpm build)
       │
       ▼
[Stage 5: After Evidence & Validation] (evidence-runner screenshot + single final build check)
       │
       ▼
[Stage 6: Finalize submit.json & Git Commit] (populate submit.json status: DONE + git commit)
       │
       ▼
[Stage 7: Atomic Push & Submit Gate] (submit_work MCP -> auto git push + Game Master receipt)
```

---

### Detailed Stage Instructions:

#### Stage 1: Autonomous Triage & Start Work
1. Call `refresh_match()`:
   - Scrapes `/match/<matchId>`, auto-discovers active items, extracts point values and deadline flags, and deterministically sorts them.
   - Select index 0 (the highest-urgency item).
2. Call `start_work({ backlogItemKey: "<backlogId>" })`:
   - Emits `GAME_MASTER_API (START_BACKLOG)`.
   - Transitions backlog status to `IN_PROGRESS`.
   - Materializes `<matchRoot>/answers/<backlogId>/evidence/` and `submit.json`.
   - **Auto-fetches Official QA Test Data**: Automatically calls `get_test_data` on the match's Company MCP server and materializes `answers/<backlogId>/evidence/<backlogId>-test-data.json`.
   - **Company Knowledge Base**: If working on accounting, currencies, or exports, use `kb_search({ query: "..." })` (e.g. `KB-EXP-01` for CSV BOM and 9 columns, `KB-FIN-01` for minor units) to fetch authoritative specifications.

#### Stage 2: Lean Task Planning & Baseline Evidence Capture
1. Write `<matchRoot>/answers/<backlogId>/plan.md` using the standard 4-task structure:
   - `P01-T01 (BA/Test)`: Define explicit assertions for all `minimumVerificationScenarios`.
   - `P01-T02 (Evidence)`: **MANDATORY INVARIANT**: Capture baseline "before" evidence (e.g. `before-<name>.png`, baseline API responses) **BEFORE** editing production code or making git commits. Use `node team-orchestrator-pack/scripts/evidence-runner.mjs screenshot --url <url> --output <path> --login`.
   - `P01-T03 (Dev)`: Implement production code modifications in `<matchRoot>`. Notice Next.js App Router route groups: page routes reside in `src/src/app/(app)/...`.
   - `P01-T04 (Test/BA)`: Run Vitest & typecheck, capture "after" evidence, and populate `<matchRoot>/answers/<backlogId>/submit.json` with relative evidence paths and status `DONE`.
2. Self-Check: Confirm target files are strictly within `<matchRoot>` and baseline evidence is scheduled before edits.

#### Stage 3: Minimal Diff Implementation
1. Apply targeted code or schema changes directly inside `<matchRoot>`.
2. Follow strict minimal diff principles: touch only the lines necessary to fix the defect or satisfy the scenario.
3. Never touch files outside `<matchRoot>`.

#### Stage 4: Fast-Check Verification Policy
1. Run fast verification checks:
   - TypeScript typecheck: `pnpm typecheck` (takes ~4s).
   - Targeted unit tests: `pnpm vitest run tests/<targeted>.test.ts` (takes ~3s).
2. **DO NOT run full `pnpm build` repeatedly during development iterations**. Next.js production bundling takes 74s to 130s and burns critical match clock.

#### Stage 5: After Evidence & Pre-Submission Check
1. Execute `evidence-runner.mjs` to capture required "after" UI screenshots into `answers/<backlogId>/evidence/`.
2. Run single final pre-submission build check (`pnpm build` or `<matchRoot>/prepare-source.ps1`).

#### Stage 6: Finalize `submit.json` & Git Commit
1. Populate `<matchRoot>/answers/<backlogId>/submit.json`:
   - Set top-level status to `"DONE"`.
   - Populate `testResults` with `"result": "PASS"` and relative evidence paths (`evidence/<filename>`).
   - Fill in `engineeringRecord` (analysis, changes, tests).
2. Commit to git atomically:
   `git add src/ answers/<backlogId>/; git commit -m "fix(<backlogId>): resolve challenge"`

#### Stage 7: Atomic Commit-and-Submit Gate
1. **STRICT PROTOCOL RULE**: Immediately call `submit_work({ backlogItemKey: "<backlogId>" })`.
   - The MCP helper automatically runs `git rev-parse HEAD`, executes `git push origin <branch>`, posts to `/api/v1/matches/{uuid}/submissions`, and logs `BACKLOG_STATUS (SUBMITTED)`.
   - **CRITICAL ANTI-PAUSE DIRECTIVE**: NEVER pause or ask the user for Git push permission in chat! Host authorization pre-approves Git operations for the assigned branch, and `submit_work` handles pushing automatically. Pausing for human confirmation burns critical match clock and causes item deadlines to expire.
2. Confirm receipt returned with status `ACCEPTED`.
3. **NEVER** move to another backlog item, explore future waves, or end the turn until `submit_work` has returned a valid `receiptId`.

---

## 3. Time Budgeting & Fallback Policy

To ensure maximum points within the 40-minute contest limit:

1. **Strict 8-Minute Task Cap**:
   - Allocate a maximum of 8 minutes from `start_work` to `submit_work` for any single item.
2. **Bounded Retry Loop**:
   - Maximum 2 retry iterations (90s each) to fix failing assertions.
3. **Graceful Fallback**:
   - If the 8-minute limit expires or retries are exhausted:
     * Populate `submit.json` with best-effort completed data.
     * Invoke `submit_work` immediately to capture partial points.

---

## 4. Autonomous 4-Lens Pre-Submission Review (Evaluated Inline)

Before calling `submit_work`, evaluate the change against the **4 Quality Lenses**:

| Lens | Evaluation Criteria | Verification Method |
| :--- | :--- | :--- |
| **1. Functional** | All automated tests exit with code 0; every scenario in `minimumVerificationScenarios` passes. | Run fast test command; verify exit code 0. |
| **2. Code Quality** | Clean diffs, zero syntax errors, no broken imports, no stray debug statements. | Inspect git diff. |
| **3. Security & Safety** | Zero hardcoded secrets/tokens; no unsanitized command injection; no path traversal (`../`) outside `matchRoot`. | Security sanity check. |
| **4. Submission Integrity** | `submit.json` is valid JSON matching `submitTemplate`; evidence directory is populated. | Check file existence and JSON parse. |

---

## 5. Idle Wave Polling Loop

When all current backlog items are submitted and the match remains active:

1. **Do NOT Terminate**:
   - Game Master releases tasks in staggered waves. Never end the session while the match clock is running.
2. **Bounded Wait**:
   - Call `wait_for_update({ timeoutMs: 30000 })`.
   - The MCP helper polls `/match/<matchId>` and returns immediately when new backlog items appear.
3. **Resume SDLC Cycle**:
   - When new items appear, select index 0 and execute the 7-stage loop.
