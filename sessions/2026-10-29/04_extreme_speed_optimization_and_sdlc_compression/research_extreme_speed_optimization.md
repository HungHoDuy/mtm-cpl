# Technical Research & Architecture: Extreme Speed Optimization, Ad-Hoc Playwright Elimination & 4.5-Minute SDLC Compression (Cycle 04)

- **Session Date**: 2026-10-29
- **Cycle**: 04 of 2026-10-29
- **Session Focus**: **Forensic Timeline Deconstruction of Match `DZCJAFEG` (BUG-02 Lost by 4 Seconds), Elimination of Ad-Hoc Playwright Scripting & `write_stdin` Polling Overhead, and Architectural Compression of the Task SDLC from 18m 05s to ~4m 40s**
- **Project**: Master The Machine (MTM) — AI Fest 2026
- **Team**: CPL (`CPL_digital_cuder` / `[FHM] Còpilot`)
- **Status**: Technical Research & Architectural Specification Document
- **Primary Evidence Sources**:
  - Live Match `DZCJAFEG` Execution Profile: [`codex_dzcjafeg_command_execution_profile.md`](../03_autonomous_git_submission_and_progress_telemetry/codex_dzcjafeg_command_execution_profile.md)
  - Match `DZCJAFEG` Codex Session Log: [`C:\Users\ADMIN\.codex\sessions\2026\10\29\rollout-2026-10-29T14-23-28-01a1868a-d784-7fc2-a8a9-cf989feabe11.jsonl`](file:///C:/Users/ADMIN/.codex/sessions/2026/10/29/rollout-2026-10-29T14-23-28-01a1868a-d784-7fc2-a8a9-cf989feabe11.jsonl)
  - Match `DZCJAFEG` Progress Log: [`d:\mtm\CPL_3\team-sdlc-pack\logs\DZCJAFEG.progress.ndjson`](file:///d:/mtm/CPL_3/team-sdlc-pack/logs/DZCJAFEG.progress.ndjson)
  - Match `DZCJAFEG` Final Commit: `5ecf111` (*fix(BUG-02): use company currency for accounting entries*)

---

## 1. Executive Summary & Problem Statement

In Match `DZCJAFEG` on testbed `CPL_3`, the autonomous orchestrator solved the challenge completely:
- The currency scaling bug in `invoices-tab.tsx`, `payments-tab.tsx`, and `accounting.ts` was perfectly patched.
- 100% of the 4 official verification scenarios (`BUG-02-TC-01` through `TC-04`) passed.
- The changes were committed to Git (`5ecf111`), and `mcp__mtm_helper__submit_work` was invoked automatically without pausing for human permission.

**However, the team lost `BUG-02` by literally 4 seconds:**
- `start_work` invoked at: **`14:29:19`**
- `submit_work` invoked at: **`14:47:24`**
- **Total elapsed time**: **18 minutes 05 seconds** (against an 18-minute Game Master countdown deadline).
- The Game Master rejected the submission with HTTP 409 `BACKLOG_ITEM_CLOSED` (0 points awarded).

### The Critical Realization
Forensic analysis reveals that the **actual code fix and passing unit tests were completed by `14:39:15`** (under 10 minutes from match launch). 
Codex then spent **8 minutes and 9 seconds** after the bug was already solved fighting Playwright to capture evidence screenshots, plus another **6.5 minutes** across the session trapped in empty `write_stdin` terminal polling loops.

In a live championship match where the backlog volume is doubled (multiple CRs, BUGs, PIs, and TASKs), an 18-minute per-item turnaround guarantees failure. This research formulates the architecture to compress the entire task SDLC down to **4 minutes 40 seconds**.

---

## 2. Forensic Timeline Deconstruction: Match `DZCJAFEG`

```mermaid
gantt
    title Match DZCJAFEG: BUG-02 Latency Breakdown (18m 05s vs 18m Deadline)
    dateFormat mm:ss
    axisFormat %M:%S

    section 1. Prep & Reproduce
    Preparation & Build (#1-29)         :done, p1, 00:00, 05:11
    Dev Server & Before Screenshot (#30-64):done, p2, 05:11, 11:42

    section 2. Code Fix & Tests
    Read Code & Surgical Patch (#65-80) :crit, done, c1, 11:42, 14:20
    Verify Vitest & Typecheck (#81-84)  :done, c2, 14:20, 15:00

    section 3. The Fatal Evidence Trap
    6 Ad-Hoc Playwright Scripts (#85-97):crit, active, e1, 15:00, 21:02
    Ajv, Python, Diff Checks (#98-104)  :crit, active, e2, 21:02, 23:22
    Submit Work (Rejected: Closed)       :crit, e3, 23:22, 23:26
```

### Detailed Forensic Phase Audit

| Phase | Calls | Start | End | Duration | What Happened | Latency Severity |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **1. Preparation** | #1–29 | 14:23:30 | 14:28:41 | **5m 11s** | Ran `pnpm build` (took 114s & 14 `write_stdin` polls), Prisma setup, match login. | **Severe** |
| **2. Dev Server & "Before" Shot** | #30–64 | 14:28:48 | 14:35:19 | **6m 31s** | Started dev server in foreground, fought default credential login failure, debugged Argon2 hashes, captured `before-accounting.png`. | **Lethal Waste** |
| **3. Code Fix & Fast Checks** | #65–84 | 14:35:59 | 14:39:15 | **3m 16s** | **The actual engineering work.** Read `invoices-tab.tsx`, patched currency factors, ran typechecks and unit tests. | **Optimal (2m 38s coding)** |
| **4. UI Evidence Capture** | #85–97 | 14:39:26 | 14:45:28 | **6m 02s** | Wrote **6 separate inline Playwright scripts** because selectors hit default 30s timeouts. | **Fatal Bottleneck** |
| **5. Packaging & Submission** | #98–105 | 14:45:28 | 14:47:24 | **1m 56s** | Ran currency report, 2 Python jsonschema checks, Node Ajv, 3 git diff checks, and finally committed and called `submit_work`. | **Over-Engineering Delay** |

---

## 3. The 5 Architectural Pillars for 4.5-Minute Turnaround

### Pillar 1: Eliminate Ad-Hoc Playwright Scripting (Saves ~7–8 Minutes)

#### The Problem:
- In commands `#42–58`, `evidence-runner.mjs` failed to authenticate due to unseeded credentials, forcing Codex to spend 3.5 minutes inspecting database hashes and hand-coding custom login scripts.
- In `#85–97`, Codex wrote and executed **6 separate inline Node scripts** importing `chromium`. Because each script used Playwright's default `30,000ms` selector timeout, every selector mismatch or page transition lag cost 40–82 seconds per attempt.

#### The Architectural Solution:
1. **Pre-Authenticated Session Caching (`storageState.json`)**:
   During the **Preparation Phase**, `evidence-runner.mjs` executes an automated authentication handshake against the local Next.js dev server and saves the browser context state to `<matchRoot>/storageState.json`.
   Every subsequent test/evidence script injects `storageState.json`, completely bypassing the `/login` route, credentials lookup, and form submission.
2. **Declarative Multi-Step Recipe Runner**:
   Enhance `evidence-runner.mjs` with a declarative recipe mode:
   ```bash
   node team-sdlc-pack/scripts/evidence-runner.mjs --recipe BUG-02
   ```
   A single, consolidated runner executes all scenarios (TC-01, TC-02, TC-03) within **one persistent browser process**, capturing all required screenshots sequentially in ~30–45 seconds total.
3. **Strict 5-Second Playwright Timeout Rule**:
   Inject an inviolable directive into `team-orchestrator/SKILL.md`:
   > *"NEVER allow default 30,000ms Playwright timeouts. When writing UI scripts, always set `page.setDefaultTimeout(5000)` so selector mismatches fail immediately in 5 seconds instead of burning 60–80 seconds per attempt."*

---

### Pillar 2: Kill the `write_stdin` Polling Tax (Saves ~6.5 Minutes)

#### The Problem:
- 46 out of 137 tool calls (392 seconds / 6.5 minutes) were empty `write_stdin` polling loops waiting for long commands:
  - `pnpm build` during prep: 14 polls (~114s).
  - Background dev server startup: 6 polls.
  - Playwright test runs: 16 polls.
  - `pnpm typecheck`: 10 polls.
- Every `write_stdin` poll burns 8–10 seconds of LLM turn generation and JSON-RPC protocol round-trip latency.

#### The Architectural Solution:
1. **Drop `pnpm build` in the Preparation Phase**:
   Unless competition rules explicitly mandate a full Next.js production build check during prep, running `pnpm build` on Windows stdio burns ~120s of clock for zero scoring benefit.
   Replace with: `pnpm prisma generate` + `pnpm prisma migrate deploy` + `pnpm db:seed` + `pnpm typecheck` (~12 seconds total).
2. **Detached Background Dev Server Startup**:
   Codex previously ran `pnpm dev --hostname 127.0.0.1` directly in a foreground tool call, blocking until the tool timed out into a background session.
   Implement a detached startup utility in PowerShell:
   ```powershell
   Start-Process pnpm -ArgumentList "dev" -RedirectStandardOutput "dev.log" -RedirectStandardError "dev-err.log"
   # Fast wait loop:
   $portOpen = $false; $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
   while ($stopwatch.ElapsedMilliseconds -lt 15000) {
     if ((Test-NetConnection -ComputerName 127.0.0.1 -Port 3000 -InformationLevel Quiet)) { $portOpen = $true; break }
     Start-Sleep -Milliseconds 500
   }
   ```
   The tool call returns in **2 seconds** as soon as port 3000 is open, completely eliminating foreground server blocking.

---

### Pillar 3: Upfront Path & Challenge Fixture Linking (Saves ~2 Minutes)

#### The Problem:
- At `#40`, Codex discovered that `challenge/BUG-02-...` expected `src/prisma/seed-bug02.ts`, forcing it to stop, read the script, and copy files manually.
- At `#60` (costing 42.7s), Codex's relative path resolved against `D:\mtm` instead of `matchRoot`, dumping `before-accounting.png` into a stray directory and requiring a re-run (`#61–64`).

#### The Architectural Solution:
1. **Mandatory Working Directory Invariant (`Set-Location`)**:
   Mandate in `team-orchestrator.toml` and `SKILL.md` that every shell command must anchor its working directory explicitly:
   `Set-Location '<matchRoot>/src'` or execute with explicit `workdir: matchRoot`.
2. **Automated Challenge Fixture Provisioning on `start_work`**:
   Enhance `mtm_helper/start_work` so that when a backlog item is started:
   - It scans `<matchRoot>/challenge/<BACKLOG_ID>*` for seed scripts and test fixtures.
   - It automatically copies any `seed-<id>.ts` into `<matchRoot>/src/prisma/`.
   - It automatically seeds the database with the official challenge fixture before returning to the agent.

---

### Pillar 4: Code-First, Evidence-Last Workflow (Saves ~3.5 Minutes)

#### The Problem:
- From `14:30:50` (`#41`) to `14:35:52` (`#64`), Codex spent **5 full minutes** debugging dev server port binding, fixing login credentials, and capturing `before-accounting.png` *before it even looked at the broken accounting code* (`#65`)!
- Once Codex actually read the code, it solved the problem in **2 minutes 38 seconds**.
- Codex repeatedly called `view_image` (`#45, #59, #64, #99` — 32 seconds total) on every screenshot, burning LLM vision tokens and turn latency just to look at PNGs that Playwright had already asserted.

#### The Architectural Solution:
1. **Invert the SDLC Sequence (Code-First)**:
   - **Step 1**: Read challenge requirements and inspect target code (`rg` / `Get-Content`).
   - **Step 2**: Apply the targeted code fix (`apply_patch`).
   - **Step 3**: Verify with fast headless checks (`node challenge/<id>-run-checks.mjs` or `pnpm typecheck`).
   - **Step 4**: Run evidence collection in a single pass at the end.
2. **Strict Ban on `view_image` During Active Gameplay**:
   If Playwright asserts that the DOM text is visible (e.g., `await expect(page.locator('.invoice-total')).toContainText('₫12,345')`), the test is proven mathematically. The agent is strictly forbidden from invoking `view_image` to visually inspect screenshots during active competition.

---

### Pillar 5: Atomic Verification & Packaging Script (`pack-and-submit.mjs`) (Saves ~2 Minutes)

#### The Problem:
From `#98` to `#104` (`14:45:28` to `14:47:12`), Codex burned nearly **2 minutes** executing 7 fragmented tool calls:
- Running `prisma/report-bug02.ts`.
- Calling `view_image`.
- Writing `submit.json` via PowerShell `[System.IO.File]::WriteAllText`.
- Running `node -e` with Ajv to validate against schema.
- Running `python -c "import jsonschema"`.
- Checking Git diff 3 separate times.
- Checking `ALL_TOOLS` for MCP functions.

#### The Architectural Solution:
Implement a unified packaging CLI tool:
[`team-sdlc-pack/scripts/pack-and-submit.mjs`](file:///d:/mtm/team-orchestrator-pack/scripts/pack-and-submit.mjs)
```bash
node team-sdlc-pack/scripts/pack-and-submit.mjs --backlog BUG-02
```
In a single synchronous execution (~3–5 seconds), this script:
1. Validates `answers/<backlogId>/submit.json` against `challenge/<backlogId>-submit.schema.json` using Ajv.
2. Asserts that all declared `evidenceFiles` exist and have non-zero file size.
3. Automatically executes `git add -A` and commits the changes (`fix(<id>): resolve challenge`).
4. Invokes `mtm_helper/submit_work({ backlogItemKey })` directly or signals ready for submission.

---

## 4. Expected Turnaround Compression: `DZCJAFEG` vs Target

| Phase | Observed in `DZCJAFEG` | Optimized Target | Architectural Mechanism | Time Recovered |
| :--- | :--- | :--- | :--- | :--- |
| **Preparation Phase (#1–29)** | 5m 11s | **1m 30s** | Drop `pnpm build`; background dev server; cache Playwright `storageState.json`. | **+3m 41s** |
| **Start Work & Triage (#30–64)** | 6m 31s | **1m 00s** | Code-First triage; auto-copy challenge seeds; drop `view_image`. | **+5m 31s** |
| **Code Fix & Fast Check (#65–84)**| 3m 16s | **2m 00s** | Surgical patch; run `challenge/run-checks.mjs` first before `typecheck`. | **+1m 16s** |
| **UI Evidence Capture (#85–97)** | 6m 02s | **0m 45s** | Single-pass recipe runner; pre-authenticated context; 5s Playwright timeout. | **+5m 17s** |
| **Packaging & Submit (#98–105)** | 2m 20s | **0m 25s** | One-shot `pack-and-submit.mjs` CLI tool (Ajv + commit + submit). | **+1m 55s** |
| **Total Task Turnaround** | **18m 05s (FAILED)** | **~4m 40s (PASSED)**| **End-to-End SDLC Compression** | **~13.5 Minutes Saved** |

---

## 5. Architectural Blueprint for Implementation

```
[Match Launch: T-0]
       │
       ▼ (1m 30s)
[Preparation Gate: Drop pnpm build, Background Dev Server on Port 3000, Pre-Auth storageState.json]
       │
       ▼ (15s)
[start_work: Auto-Copy challenge/<id>* Seeds into src/prisma/ & Seed DB]
       │
       ▼ (2m 00s)
[Code-First Implementation: Read Component -> Surgical apply_patch -> Fast Vitest Check]
       │
       ▼ (45s)
[Consolidated Evidence Capture: evidence-runner.mjs --recipe <id> with 5s Timeout]
       │
       ▼ (25s)
[Atomic Packaging & Submission: pack-and-submit.mjs --backlog <id>]
       │
       ▼ (T + 4m 40s)
[SUBMITTED (ACCEPTED) -> Immediate refresh_match() -> Next Open Backlog]
```

With an average completion time of **~4.5 to 5.0 minutes per item**, the digital team can comfortably complete **6 to 8 backlog items** within the 40-minute contest limit, easily achieving full-match clearance even in doubled-backlog scenarios.
