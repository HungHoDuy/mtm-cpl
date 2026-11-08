# Implementation Plan: Unified PI Preemption Architecture & Playwright Reliability Engine

- **Session**: `03_match_ytfhp47k_pi_preemption_reentry_and_playwright_reliability`
- **Target Repositories**:
  - `team-orchestrator-pack/src/runtime-session.mjs`
  - `CPL/team-sdlc-pack/src/runtime-session.mjs`
  - `team-orchestrator-pack/scripts/capture-client.mjs`
  - `CPL/team-sdlc-pack/scripts/capture-client.mjs`
  - `team-orchestrator-pack/skills/team-orchestrator/SKILL.md`
  - `CPL/team-sdlc-pack/skills/team-orchestrator/SKILL.md`
  - `team-orchestrator-pack/agents/team-orchestrator.toml`
  - `CPL/team-sdlc-pack/agents/team-orchestrator.toml`

---

## 1. Architectural Goals & Success Metrics

1. **Zero Context-Switch Latency for PI ($T_{switch} < 15s$)**:
   - Transition from non-PI work to active PI investigation in **1 single tool turn** via `get_next_task()`.
   - Eliminate all intermediate tool turns (`preempt_work`, `start_work`, manual `git stash`).
2. **Zero Process Crashes During Radar Scans**:
   - Background Radar performs non-destructive actions only (locks PI, pre-starts on Game Master, pre-crawls logs).
   - Radar **never** runs `git stash` while the agent is running shell commands, eliminating the 264ms "rug-pull" `ERR_MODULE_NOT_FOUND` crash.
3. **Flawless 1:1 Re-entry on Task Resumption**:
   - Guarantee `stashRestored: true` on `submit_work("PI-01")`.
   - Staging `submit.json` before `git stash pop` eliminates all double-stash collisions and manual file archaeology.
4. **First-Pass Playwright Evidence Success (>90% on Iteration 1)**:
   - Provide generic DOM diagnostic snapshots (`dumpPageDiagnostics`) when locators time out, giving blind models instant visibility of rendered tabs and buttons.
   - Enforce the "Display, Don't Recreate" rule in `SKILL.md`, cutting 80% of unnecessary form automation.

---

## 2. Component 1: `runtime-session.mjs` (Unified Sovereign Preemption)

### 2.1 Non-Destructive Background Radar
In `pollAndSyncBacklog()`:
* When a `PI` is detected:
  1. Auto-start the PI on Game Master (`startWork(pendingPI.key)`).
  2. Auto-crawl all microservice logs from Company MCP into `answers/<PI>/evidence/`.
  3. Write `.URGENT_PI_LOCK` to `matchRoot`.
  4. **DO NOT call `this.preemptWork()` from the background timer.** Git stashing is deferred until the agent synchronously calls `get_next_task()`.

### 2.2 1-Turn Atomic Preemption in `getNextTask()`
In `getNextTask()`:
* If the highest-priority item is a `PI` and `this.currentActiveItem` is a non-PI task (e.g. `BUG-02`):
  1. Check if git status is dirty (`git status --porcelain`).
  2. If dirty, stash the working copy cleanly in <200ms:
     `git stash push -u -m "preempt_for_${targetKey}_${Date.now()}"`
  3. Push `{ suspendedTaskKey: this.currentActiveItem, stashed: true, timestamp: Date.now() }` to `this.preemptionStack`.
  4. Set `this.currentActiveItem = targetKey`.
  5. Return the PI task object with pre-crawled evidence files immediately.
* **Result**: The agent transitions to the PI in **1 single turn**.

### 2.3 Deprecate and Drop `preempt_work` from MCP Tool List
* **`preempt_work` is no longer needed**: Because `getNextTask()` autonomously handles stashing and task context switching in one turn, an explicit `preempt_work` tool is completely redundant.
* **Action**: Remove `preempt_work` from `runtime-server.mjs` tool definitions (`tools/list`).
* **Benefit**:
  - Reduces tool catalog tokens in the system prompt.
  - Eliminates model confusion and tool paralysis.
  - Saves 1 full LLM round-trip turn (~15–20s) per incident.

### 2.4 Pristine Tree Stash Pop in `submitWork()`
In `submitWork(backlogItemKey)`:
* After stamping `receiptId` into `answers/<backlogItemKey>/submit.json`:
  1. Stage `answers/<backlogItemKey>/submit.json` cleanly so the working tree has no uncommitted modifications.
  2. Pop the single stash from `this.preemptionStack`:
     - If `git stash pop` succeeds: set `stashRestored: true`.
     - If `git stash pop` hits a conflict: fallback to `git stash apply` and `git stash drop`.
  3. Delete `.URGENT_PI_LOCK`.
  4. Set `this.currentActiveItem = record.suspendedTaskKey` and return `autoResume`.

---

## 3. Component 2: `capture-client.mjs` (Generic Diagnostics & Scoping Primitives)

### 3.1 PI Fail-Fast Circuit Breaker
In `createCapturePage()`:
* Before launching Chromium:
  ```javascript
  const lockPath = path.resolve(process.cwd(), '..', '.URGENT_PI_LOCK');
  if (fs.existsSync(lockPath)) {
    throw new Error(
      '\n🚨 [CRITICAL HALT] PRODUCT INCIDENT IS LIVE! 🚨\n' +
      'Evidence capture is suspended to protect active Speed Race points.\n' +
      'DO NOT debug Playwright locators. Call get_next_task() immediately!'
    );
  }
  ```
* Cuts off any repeating Playwright failure loops in 0.05 seconds.

### 3.2 Generic DOM Diagnostic Snapshot on Failure
Add exported helper `dumpPageDiagnostics(page)`:
* Captures:
  - `page.url()`
  - Active tab text from `[role="tab"][aria-selected="true"]`
  - All available tabs from `[role="tab"]`
  - All visible headings (`h1, h2, h3`)
  - All visible action buttons (`button, [role="button"]`)
* Outputs clean, formatted diagnostics to `console.error` whenever an assertion or locator times out.

### 3.3 Generic Table Row Scoper & Strict-Mode Shield
Add exported helper `getTableRow(page, rowText)`:
* Scopes search to `page.locator('tr, [role="row"]').filter({ hasText: rowText }).first()`.
* Guarantees that matching text like `"sent"` or `"paid"` inside a table row never triggers strict-mode multi-element violations.

### 3.4 Generic Radix / shadcn Tab Helper
Add exported helper `selectTab(page, tabName)`:
* Clicks `page.getByRole('tab', { name: new RegExp(tabName, 'i') }).first()`.
* Waits 300ms for Radix tabpanel hydration before proceeding.

---

## 4. Component 3: Skills & Agent Prompt Instructions

### 4.1 "Display, Don't Recreate" MVS Evidence Rule
Update [`SKILL.md`](file:///d:/mtm/team-orchestrator-pack/skills/team-orchestrator/SKILL.md) and [`team-orchestrator.toml`](file:///d:/mtm/team-orchestrator-pack/agents/team-orchestrator.toml):
* **Strict Rule**: If the database seed or unit tests already populated the required data, **NEVER automate UI forms to recreate it**.
* Simply navigate to the target route, select the appropriate tab, locate the table row, and capture the screenshot.

### 4.2 Universal 15-Line Playwright Evidence Recipe
Embed the standard recipe in `SKILL.md`:
```javascript
import { createCapturePage, selectTab, getTableRow } from '.../capture-client.mjs';

const { browser, page } = await createCapturePage();
try {
  await page.goto('http://127.0.0.1:3000/<route>');
  // 1. Select tab if multi-tab page
  // await selectTab(page, 'Invoices');

  // 2. Locate row if verifying data
  // const row = getTableRow(page, 'Acme Corp');
  // await row.waitFor({ state: 'visible' });

  // 3. Capture evidence
  await page.screenshot({ path: 'answers/<ID>/evidence/<name>.png', fullPage: true });
} finally {
  await browser.close();
}
```

### 4.3 Zero-Stash Instruction for PI Lock
Instruct the model in `SKILL.md`:
* When `.URGENT_PI_LOCK` appears or any tool returns `urgentPreemption`:
  1. **DO NOT run manual `git stash`** in PowerShell.
  2. **DO NOT call `preempt_work`** (deprecated).
  3. **Call `get_next_task()` directly.** The server stashes your work, starts the PI, and mounts pre-crawled logs in 1 turn.

---

## 5. Component 4: Ubiquitous 360° PI Notification System (Terminal, Tools & Gates)

To guarantee that the agent NEVER stays blind to a PI (even while exclusively running shell commands), implement 4 active notification tripwires:

### 5.1 Shell Command Notification (Terminal Output Invariant)
* Update the mandatory PowerShell prefix in `SKILL.md` and `agents/team-orchestrator.toml`:
  ```powershell
  Set-Location '<matchRoot>/src'; if (Test-Path '../.URGENT_PI_LOCK') { Write-Warning '🚨 [URGENT_PI_LOCK ACTIVE] PI-01 is waiting! Stop non-PI work and call get_next_task() now!' }
  ```
* **Effect**: Every single command executed via `exec_command` prints a loud warning in the terminal stdout/stderr if a PI is live, breaking shell tunnel vision immediately.

### 5.2 Universal MCP Tool Interceptor (Server-Level Response Injection)
* In `runtime-server.mjs`, wrap all tool execution responses:
  Whenever `.URGENT_PI_LOCK` exists on disk or radar flags a pending PI:
  Prepend an urgent banner to the returned JSON for **EVERY tool call** (`report_progress`, `get_test_data`, `wait_for_update`, `pack_submission`):
  ```json
  {
    "URGENT_ALERT": "🚨 PRODUCT INCIDENT ACTIVE: PI-01 is live! Immediately stop current task and call get_next_task() to claim 160 Speed Race points.",
    "urgentPreemption": "PI-01"
  }
  ```

### 5.3 Test & Verification Fail-Fast Hooks
* In `capture-client.mjs` (`createCapturePage`) and challenge test runners (`run-checks.mjs`):
  Check for `.URGENT_PI_LOCK` at startup. If present, immediately halt execution with:
  `Error: 🚨 EXECUTION HALTED FOR PI-01: Call get_next_task() now!`
  Preventing the agent from wasting time debugging timeouts on suspended tasks.

### 5.4 Hard Submission Gate on Non-PI Items
* In `submitWork(backlogItemKey)`:
  If a PI is active and `backlogItemKey` is a non-PI task (e.g. `BUG-02`):
  Hard-reject the submission:
  ```json
  {
    "success": false,
    "error": "SUBMISSION_BLOCKED_BY_PI",
    "message": "Submission blocked: Urgent incident PI-01 is live with decaying Speed Race points. Call get_next_task() now."
  }
  ```

---

## 6. Verification & Test Plan

1. **MCP Protocol & Session Test Suite**:
   - Run `node team-orchestrator-pack/test/test-mcp-server.mjs`.
   - Verify `getNextTask()` auto-stashes when PI preempts an active task.
   - Verify `submitWork()` auto-pops stash cleanly with zero collision.
2. **Capture Client Unit Test Suite**:
   - Create `team-orchestrator-pack/test/test-capture-client.mjs`.
   - Verify `getTableRow` scopes correctly.
   - Verify `selectTab` switches active tab cleanly.
   - Verify `createCapturePage` throws halt error when `.URGENT_PI_LOCK` exists.
3. **Skill & Prompt Linter**:
   - Run `node team-orchestrator-pack/test/test-orchestrator-skills.mjs`.
   - Verify prompt tokens and rule consistency.

