# Match `OI1OFZ0I` Forensic Autopsy: MCP Streamlining, Stash Restore Collisions, and Evidence Capture Reliability

- **Match ID**: `OI1OFZ0I` (Exam: `MTM-26-7UJVLX`)
- **Date**: 2026-11-04 | Match Duration: 40 minutes (2,400s)
- **Active Window**: `19:37:05` to `20:21:45` Local Vietnam Time (UTC+7) / `12:37:05` to `13:21:45` UTC
- **Team**: CPL (`CPL_digital_cuder` / `[FHM] Còpilot`)
- **Outcome**: **Total Score: 340 pts**
  - **`PI-01`**: **160 / 160 pts** (1st in Speed Race, submitted at `12:58:14 UTC`)
  - **`TASK-03`**: **50 / 50 pts** (Submitted at `13:09:38 UTC`)
  - **`CR-01`**: **130 / 140 pts** (Submitted at `13:19:03 UTC`)
  - **`BUG-02`**: **0 / 100 pts** (**Deadline Expired / CLOSED**; submitted at `13:06:02 UTC`, 6m 22s after 18m deadline expired at `12:59:40 UTC`, HTTP 409 rejection)
- **Primary Telemetry & Evidence Sources**:
  - Live Spectator State: [`spectator_OI1OFZ0I_initialState.json`](file:///d:/mtm/scratch/spectator_OI1OFZ0I_initialState.json)
  - Game Master Portal Dump: [`spectator_OI1OFZ0I.html`](file:///d:/mtm/scratch/spectator_OI1OFZ0I.html)
  - Codex Rollout Telemetry: [`rollout-2026-11-04T19-37-08-*.jsonl`](file:///C:/Users/ADMIN/.codex/sessions/2026/11/04/)
  - Progress Log: [`OI1OFZ0I.progress.ndjson`](file:///D:/mtm/CPL/team-sdlc-pack/logs/OI1OFZ0I.progress.ndjson)
  - Parsed Command Log: [`oi1ofz0i_extracted_calls.json`](file:///d:/mtm/scratch/oi1ofz0i_extracted_calls.json)

---

## 1. Executive Summary & Forensic Narrative

Match **`OI1OFZ0I`** validated several major architectural enhancements introduced from the previous match autopsy (`YTFHP47K`):
1. **The Circuit Breaker Succeeded**: When Wave 3 published `PI-01`, the newly implemented `[CRITICAL HALT]` circuit breaker in `capture-client.mjs` intercepted the agent within 12 seconds, completely preventing the runaway Playwright loops seen in earlier matches.
2. **First-Place Speed Race Victory on `PI-01`**: Team CPL diagnosed, verified, and submitted `PI-01` in under **3 minutes and 50 seconds** (`12:54:24` to `12:58:14 UTC`), earning the maximum **160 points** with 0 deduction.

However, **100 points were lost on `BUG-02` due to an expired deadline**, caused by two severe friction points:
- **Pre-PI Playwright Capture Loop (7m 17s lost)**: Before `PI-01` arrived, the agent spent over 7 minutes fighting Radix UI tab switching in Next.js, handling database invoice pollution from failed script iterations, and debugging relative evidence paths.
- **Post-PI Stash Restore Collision (7m 48s lost)**: When `PI-01` was submitted, the automatic stash pop failed (`stashRestored: false`). The agent was forced to perform 7.5 minutes of manual Git archaeology on `stash@{0}^3`, pushing the `BUG-02` submission past its 18-minute deadline to `13:06:02 UTC` (6m 22s late).

---

## 2. Chronological Timeline of Critical Events

```mermaid
sequenceDiagram
    autonumber
    participant GM as Game Master
    participant R as Background Radar
    participant A as Agent
    participant S as Runtime Session (MCP)
    participant G as Git

    Note over GM, A: 12:41:40 UTC: Wave 1 Published (BUG-02 released, 18m deadline closes 12:59:40)
    A->>S: 12:42:46: start_work("BUG-02")
    A->>S: 12:42:55: get_test_data("BUG-02") (Redundant!)
    A->>A: 12:44 - 12:46: Code fix in invoices-tab.tsx, vitest passes (15/15)
    
    Note over A: Pre-PI Friction: Playwright Capture Loop (7m 17s)
    A->>A: 12:46 - 12:53: capture.mjs tab switching fails; duplicate drafts pollute DB
    A->>A: 12:52: Agent writes prune-bug02-drafts.ts to clean up DB
    
    Note over GM, R: 12:53:41.823 UTC: Wave 3 Published (PI-01 released)
    R->>R: 12:53:45: Discovers PI-01, pre-crawls logs, drops .URGENT_PI_LOCK
    A->>A: 12:53:53: capture.mjs hits .URGENT_PI_LOCK -> CRITICAL HALT!
    A->>S: 12:53:58: get_next_task()
    S->>G: 12:54:00: git stash push -u (stashes logs/, locks, and answers)
    A->>S: 12:54:24: start_work("PI-01") (Delay: 42.4s total)
    
    Note over A: Solving PI-01 (3m 50s)
    A->>S: 12:58:14: submit_work("PI-01") -> 160 pts (1st Place!)
    S->>G: 12:58:18: git stash pop -> FAILED (error: could not restore untracked files)
    S-->>A: autoResume: { resumedTask: "BUG-02", stashRestored: false }
    
    Note over GM: 12:59:40 UTC: BUG-02 DEADLINE EXPIRED (CLOSED)
    
    Note over A, G: Post-PI Friction: Stash Forensics (7m 48s)
    A->>G: 12:58 - 13:05: Manual git archaeology on stash@{0}^3 & fixes misplaced screenshots
    A->>S: 13:05:38: pack_submission("BUG-02") (Redundant!)
    A->>S: 13:06:02: submit_work("BUG-02")
    GM-->>A: HTTP 409 Conflict: BUG-02 deadline expired (0 pts)
```

---

## 3. Deep-Dive Findings

### Finding 1: Microsecond Breakdown of the 42-Second PI Delay

The 42.4-second delay between Wave 3 release (`12:53:41.823 UTC`) and active incident work (`12:54:24.241 UTC`) was composed of three segments:

| Segment | Window (UTC) | Duration | What Happened | Bottleneck |
| :--- | :--- | :--- | :--- | :--- |
| **In-Flight Turn** | `12:53:41.823` – `12:53:53.244` | **11.4s** | Agent was executing Turn 83 (patching `capture.mjs`) and Turn 84 (deleting prune script). | Agent had no awareness of Game Master state during active shell command execution. |
| **Halt & Preemption** | `12:53:53.244` – `12:53:58.645` | **5.4s** | `capture.mjs` threw `CRITICAL HALT` (0.26s). LLM inferred halt message (4.0s) and called `get_next_task()`. `get_next_task()` stashed tree (4.3s). | **Optimal**: Circuit breaker functioned exactly as intended. |
| **Agent Hesitation & Redundant Inspection** | `12:54:02.920` – `12:54:24.241` | **21.3s** | Agent received `PI-01` from `get_next_task()`, but hesitated (11.4s), executed manual `Get-ChildItem -Force ..\answers\PI-01` (1.4s), reasoned (8.5s), and only then called `start_work("PI-01")`. | Agent lacked instruction that `get_next_task()` already materializes assets; manual directory check burned 21 seconds. |

---

### Finding 2: Anatomy of the Broken Auto-Restore (`stashRestored: false`)

The auto-restore feature failed because of an unconstrained untracked file collision:

1. **Unconstrained Stash (`git stash push -u`)**:
   - Because there is no `.gitignore` at the repository root `D:\mtm\CPL\matches\OI1OFZ0I` (only inside `src/.gitignore`), `git stash push -u` scooped up volatile runtime files:
     - `logs/dev.log`
     - `logs/dev-err.log`
     - `logs/OI1OFZ0I.progress.ndjson`
     - `.URGENT_PI_LOCK`
     - `storageState.json`
2. **Working Tree Mutation During PI**:
   - While `PI-01` was being solved, the background Next.js dev server kept appending logs to `logs/dev.log`.
   - The orchestrator logger kept writing to `logs/OI1OFZ0I.progress.ndjson`.
3. **The Fatal Collision on Stash Pop**:
   - When `submit_work("PI-01")` executed `git stash pop`, Git attempted to unpack `stash@{0}^3`.
   - Because `logs/dev.log`, `logs/dev-err.log`, and `progress.ndjson` already existed on disk with newer modifications, Git aborted with:
     ```
     error: could not restore untracked files from stash
     ```
   - Fallback `git stash apply` failed with the exact same error, resulting in `stashRestored: false`.
4. **The Consequence**:
   - `BUG-02`'s challenge and evidence files remained trapped in `stash@{0}^3`.
   - The agent spent **7 minutes and 48 seconds** manually inspecting the stash tree, checking out files, resolving misplaced screenshot directories, and staging changes.
   - This 7.5-minute delay caused `BUG-02` to miss its 18-minute deadline by 6m 22s.

---

### Finding 3: Redundant MCP Tools Audit (`get_test_data` & `pack_submission`)

Both `get_test_data` and `pack_submission` are redundant and create severe turn overhead:

#### A. `get_test_data`
- **Current Behavior**: `start_work(key)` already calls `getTestData()` automatically and writes `answers/<KEY>/evidence/<key>-test-data.json` before returning.
- **Observed Overhead**:
  - In `BUG-02` (Turn 33): Redundant call.
  - In `TASK-03` (Turn 120): Test data was already read from disk in Turn 117, but agent called `get_test_data` anyway, burning **7.7 seconds of wall-clock time**.
  - In `CR-01` (Turn 126) and `CR-02` (Turn 152): Identical redundant calls.
- **Cost**: ~30 seconds of wasted match time across 4 tasks.

#### B. `pack_submission`
- **Current Behavior**: `submit_work` already calls `this.packAndSanitizeSubmission(...)` as Step 1 of its execution.
- **Observed Overhead**:
  - In `BUG-02`: Agent called `pack_submission` (Turn 113), then `submit_work` (Turn 114).
  - In `CR-01`: Agent called `pack_submission` (Turn 148), then `submit_work` (Turn 149).
- **Cost**: Burns 1 full turn (10–15 seconds) per task right before deadline cutoff.

---

### Finding 4: Playwright Evidence Capture Bottlenecks on `BUG-02`

The 7-minute capture loop on `BUG-02` was driven by four specific issues:
1. **Default Tab Confusion**: Navigating to `http://127.0.0.1:3000/accounting` lands on the `Reports` tab by default. The script's tab switching logic (`page.getByRole("tab", { name: "Invoices" }).click()`) intermittently timed out because Next.js/Radix had not finished hydration.
2. **Strict Regex Mismatch on Status**: The script waited for exact text `"sent"`, but the newly created invoice was marked `"partial"`, causing a locator timeout.
3. **Database Pollution from Retries**: Each rerun of `capture.mjs` created a new draft invoice (`INV-0027`, `INV-0028`, `INV-0030`, `INV-0032`). When `report-bug02.ts` ran, it threw validation errors because of multiple draft invoices. The agent had to author and run `prune-bug02-drafts.ts` to clean up the DB.
4. **Relative Path CWD Bug**: `capture.mjs` declared `const evidence = "answers/BUG-02/evidence"`. Because CWD was `src/`, screenshots were saved to `src/answers/BUG-02/evidence/` instead of `../answers/BUG-02/evidence/`, leading to missing evidence errors during stash recovery.

---

### Finding 5: Autopsy of the 10-Point Loss on `CR-01` (How Interactive Preparation Poisoned the Match)

In match `OI1OFZ0I`, Team CPL scored **130 / 140 points** on `CR-01`. All 5 MVS verification scenarios passed with full points (120/120 pts), but the automated test gate failed:
```text
[FAIL] CR-01 · Test tự động: 0/10 điểm.
Tiêu chí: Grader tự chạy toàn bộ test của đội (vitest trong node_modules, Postgres riêng,
         file config và test gốc của BTC được khôi phục trước): không test nào hỏng và có
         hơn 12 test đạt (ít nhất 13), tức đội đã thêm test mới; không dùng test.log.
Lý do: Grader tự chạy test: 23 test đạt, 1 test hỏng.
       Test hỏng: tests/cascade.test.ts › deletion cascades (spec §4) ›
       deleting a company with invoices is RESTRICTED (financial history is protected).
```

#### The Root Cause Chain
1. **The Starter Repo Bug**: In the official starter repo, Migration 6 (`20260702093140_company_delete_cascades_financials`) set invoice foreign keys to `ON DELETE CASCADE`. However, the competition test suite in `tests/cascade.test.ts` asserts that deleting a company with invoices must be `RESTRICTED`.
2. **Ghost Migration in Local Postgres**: During the earlier match `YTFHP47K`, an 8th migration (`20261104103000_restore_invoice_company_restrict`) was created and applied to PostgreSQL container `freelanceos_test` (port 5433).
3. **The Interactive Preparation Failure**:
   - In match `OI1OFZ0I`, the LLM was tasked with running environment preparation interactively across 22 turns.
   - The LLM attempted to run a PowerShell snippet to reset PostgreSQL using `psql.exe`. Because `psql.exe` was not in PATH, the script silently skipped database dropping.
   - The LLM did not verify that the database was dropped; it proceeded to run `pnpm prisma migrate deploy`.
   - Because `freelanceos_test` was **never dropped**, it retained the ghost migration from match `YTFHP47K`.
4. **The False Green Illusion**:
   - When the agent ran `pnpm test` locally for `CR-01`, all 24 tests passed (including `cascade.test.ts`), because the ghost migration was active in the local container!
   - However, the agent never committed this migration to the Git remote for `OI1OFZ0I`.
   - When the Game Master Grader cloned the repository, deployed migrations on its own **clean, independent PostgreSQL instance**, and executed `vitest`, `cascade.test.ts` crashed with `ON DELETE CASCADE` behavior, deducting 10 points.

#### Core Lesson: Interactive LLM Preparation is an Anti-Pattern
- **Preparation Does Not Count Toward the 40-Minute Clock**:
  The match clock has not started during `PREPARE_GAME_V2`. However, leaving environment setup to the LLM invites ad-hoc shell commands, silent command failures, and local-vs-grader state divergence.
- **An Impure Preparation Fatally Poisons the Match**:
  Even though preparation is outside the 40-minute active window, a failed database reset during preparation directly cost Team CPL 10 points on `CR-01` and risked database drift across the entire match.

---

### Finding 6: The "Zero-Worklog LLM" Architectural Paradigm

A comprehensive review of the Game Master evaluation criteria, tournament rulebook, and spectator logs confirms:

1. **Zero Grader Points for LLM-Authored Worklogs**:
   - The Game Master Grader does not inspect `<matchRoot>/answers/<key>/plan.md`. Writing `plan.md` burns an entire turn (~20–30s) and hundreds of tokens for zero score benefit.
   - The Grader checks `submit.json` purely against JSON schema validation (`additionalProperties: false`, matching regex patterns, and string array types). The qualitative content of `engineeringRecord` is never evaluated.
   - Progress events in `<matchId>.progress.ndjson` are read exclusively by the spectator dashboard to visualize match states; whether an event was emitted by an LLM tool call or emitted automatically in pure Node.js by the MCP server is completely indistinguishable.
2. **The High Cost of LLM Bookkeeping**:
   - Prompting the LLM to format progress events, maintain worklogs, or invoke separate packaging tools forces extra roundtrips.
   - In MTM tournament infrastructure, every shell execution is subjected to a ~5.5s auto-reviewer delay.
   - Letting the LLM juggle bookkeeping invites schema errors, accidental command misfires, and distraction from code implementation.
3. **The Solution: Full Automation of Worklog & Preparation**:
   - Shift 100% of environment setup into a deterministic MCP tool (`prepare_environment`).
   - Shift 100% of telemetry (`BACKLOG_STATUS`, `BACKLOG_TESTS`, `PREPARATION_STATUS`) into automatic MCP lifecycle hooks.
   - Shift 100% of submission packaging (`submit.json`, `engineeringRecord`, git commit/push) into `submit_work`.
   - Strip all worklog mandates (`plan.md`, `report_progress`) from agent skills, reducing backlog execution to a strict **3-turn Code-First loop**.

