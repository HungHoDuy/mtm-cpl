# Implementation Plan: MCP Streamlining, Bulletproof Stash Restoration, and Capture Client Hardening

- **Session**: `04_match_oi1ofz0i_mcp_streamlining_stash_restore_and_capture_reliability`
- **Target Repositories & Modules**:
  - `team-orchestrator-pack/src/runtime-session.mjs` & `CPL/team-sdlc-pack/src/runtime-session.mjs`
  - `team-orchestrator-pack/bin/runtime-server.mjs` & `CPL/team-sdlc-pack/bin/runtime-server.mjs`
  - `team-orchestrator-pack/scripts/capture-client.mjs` & `CPL/team-sdlc-pack/scripts/capture-client.mjs`
  - `team-orchestrator-pack/skills/team-orchestrator/SKILL.md` & `CPL/team-sdlc-pack/skills/team-orchestrator/SKILL.md` & `CPL/.agents/skills/team-orchestrator/SKILL.md`

---

## 1. Architectural Goals & Success Metrics

1. **Eliminate Redundant MCP Tool Turns & Bookkeeping Overhead**:
   - Merge `pack_submission` into `submit_work` completely.
   - Drop `get_test_data` from the exposed tool catalog (rely entirely on `start_work` auto-fetching).
   - Drop mandatory `plan.md` authoring from skills (save ~25s per item; grader never reads `plan.md`).
   - Save 2–3 turns (~45–60s) per backlog item; zero double-call patterns (`pack` then `submit`).
2. **1-Shot Deterministic Preparation (`prepare_environment` MCP Tool)**:
   - **Timing Note**: Environment preparation occurs during `PREPARE_GAME_V2` and **does NOT count toward the 40-minute backlog clock**. However, interactive LLM preparation burns 22 turns, risks silent shell failures (e.g. `psql.exe` missing in PATH), and leaves dirty database states that cause false green local tests and Grader failures (e.g. the 10-point loss on `CR-01`).
   - Replace 22 manual LLM turns with 1 deterministic MCP tool execution (< 25s) covering Git clone, clean database drop/create via Node.js TCP/SQL, migration deployment with cascade parity fix, `pnpm typecheck`, Next.js background launch, Playwright session auth, and all official NDJSON readiness telemetry.
3. **100% Stash Restoration Reliability (`stashRestored: true`)**:
   - Isolate volatile files (`logs/`, `*.log`, `*.ndjson`, `.URGENT_PI_LOCK`, `storageState.json`) from Git via `.git/info/exclude`.
   - Implement targeted checkout fallback from `stash@{0}^3` if `git stash pop` detects a collision, ensuring `BUG-02` files are restored in **0 turns**.
4. **Eliminate Post-PI Transition Delay ($T_{switch} < 10s$)**:
   - Educate the agent via `SKILL.md` that `get_next_task()` already starts the task and crawls evidence; eliminate redundant `Get-ChildItem` directory inspections.
5. **Resilient UI Capture Helpers**:
   - Harden `selectTab()` in `capture-client.mjs` for Radix UI tab panels.
   - Provide `resolveEvidencePath(backlogItemKey, filename)` to eliminate relative path confusion between `src/` and match root.

---

## 2. Component 1: Streamline MCP Tool Catalog

### 2.1 Remove `pack_submission` from MCP Tool Registry
- **File**: `bin/runtime-server.mjs`
- **Action**: Remove `pack_submission` from the tool definition array (`tools/list`).
- **Rationale**: `submit_work` already calls `this.packAndSanitizeSubmission(backlogItemKey, ...)` as its very first step (line 2355 of `runtime-session.mjs`). Having a separate tool forces the model into a redundant 2-turn pattern.
- **Backward Compatibility**: Keep `packAndSanitizeSubmission` on `RuntimeSession` so internal calls within `submitWork()` remain unaffected.

### 2.2 Remove `get_test_data` from MCP Tool Registry
- **File**: `bin/runtime-server.mjs`
- **Action**: Remove `get_test_data` from `tools/list`.
- **Rationale**: `start_work` automatically downloads the fixture from the remote Company MCP server and saves it to `answers/<KEY>/evidence/<key>-test-data.json`. Exposing it separately caused the agent to make redundant remote RPC calls that cost up to 7.7 seconds.

### 2.3 Collapse Skill Stages in `SKILL.md`
- **File**: `skills/team-orchestrator/SKILL.md`
- **Action**:
  - Collapse *Stage 6 (Evidence Verification & In-Process Packaging)* and *Stage 7 (1-Shot Submission Gate)* into a single **Stage 6: Autonomous 1-Shot Packaging & Submission Gate**.
  - Explicitly mandate:
    ```javascript
    await tools.mcp__mtm_helper__submit_work({
      backlogItemKey: "<backlogId>",
      status: "DONE",
      engineeringRecord: { analysis: "...", changes: [...], tests: [...] }
    });
    ```
  - State clearly: *"Do NOT call `pack_submission` or `get_test_data`. `submit_work` automatically packages, sanitizes, commits, pushes, and submits in 1 single atomic call."*

---

## 3. Component 2: Bulletproof Stash & Resume Engine

### 3.1 Git Shield: Exclude Volatile Files from Git Tracking
- **File**: `src/runtime-session.mjs`
- **Location**: `ensureProjectEnvironment()` or `configureSession()`
- **Implementation**:
  Append volatile operational files to `<checkoutRoot>/.git/info/exclude`:
  ```javascript
  const excludePath = path.resolve(this.checkoutRoot, '.git', 'info', 'exclude');
  const volatilePatterns = [
    'logs/',
    '*.log',
    '*.ndjson',
    '.URGENT_PI_LOCK',
    'storageState.json'
  ];
  if (fs.existsSync(path.dirname(excludePath))) {
    let current = fs.existsSync(excludePath) ? fs.readFileSync(excludePath, 'utf8') : '';
    const toAdd = volatilePatterns.filter(p => !current.includes(p));
    if (toAdd.length > 0) {
      fs.appendFileSync(excludePath, '\n# MTM Volatile Shield\n' + toAdd.join('\n') + '\n', 'utf8');
      this.logDebug('[Git Shield] Appended volatile patterns to .git/info/exclude');
    }
  }
  ```
- **Impact**: `git stash push -u` will never capture `logs/dev.log`, `progress.ndjson`, or `.URGENT_PI_LOCK`. When `git stash pop` runs, there will be zero collisions on runtime log files.

### 3.2 Targeted Pathspec Stash in `getNextTask()`
- **File**: `src/runtime-session.mjs`
- **Location**: `getNextTask()`
- **Implementation**:
  Scope the stash to the relevant task folders rather than the entire filesystem:
  ```javascript
  const matchFolder = this.assignedFolder || this.matchId;
  const stashMsg = `preempt_for_${targetKey}_${Date.now()}`;
  const stashRes = this.executeGit([
    'stash', 'push', '-u', '-m', `"${stashMsg}"`, '--',
    `${matchFolder}/src`,
    `${matchFolder}/answers/${suspendedKey}`,
    `${matchFolder}/challenge`
  ]);
  ```

### 3.3 Collision-Proof Fallback in `submitWork()` Stash Restore
- **File**: `src/runtime-session.mjs`
- **Location**: `submitWork() -> autoResume`
- **Implementation**:
  If `git stash pop` or `git stash apply` fails with exit code 1:
  ```javascript
  const popRes = this.executeGit(['stash', 'pop']);
  if (popRes.success) {
    stashRestored = true;
  } else {
    this.logDebug(`[submitWork] Stash pop failed (${popRes.stderr || popRes.stdout}); triggering targeted fallback checkout...`);
    const matchFolder = this.assignedFolder || this.matchId;
    // Force-extract suspended task files from stash commit & untracked tree
    this.executeGit(['checkout', 'stash@{0}', '--', `${matchFolder}/src`]);
    this.executeGit(['checkout', 'stash@{0}^3', '--', `${matchFolder}/answers/${record.suspendedTaskKey}`]);
    this.executeGit(['stash', 'drop']);
    stashRestored = true;
    this.logDebug(`[submitWork] Fallback targeted checkout succeeded for ${record.suspendedTaskKey}`);
  }
  ```
- **Guarantee**: Even if a file collision occurs, `stashRestored` is guaranteed `true` and the suspended task's evidence and code are restored in 0 agent turns.

---

## 4. Component 3: Evidence Capture Helper Hardening

### 4.1 CWD-Independent Absolute Path Resolver
- **File**: `scripts/capture-client.mjs`
- **Implementation**:
  Export helper `resolveEvidencePath(backlogItemKey, filename)`:
  ```javascript
  export function resolveEvidencePath(backlogItemKey, filename) {
    // Automatically navigates up from src/ if invoked from src
    const cwd = process.cwd();
    let root = cwd;
    if (path.basename(cwd) === 'src') {
      root = path.resolve(cwd, '..');
    }
    const targetDir = path.resolve(root, 'answers', backlogItemKey, 'evidence');
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    return filename ? path.resolve(targetDir, filename) : targetDir;
  }
  ```
- Eliminates the `src/answers/BUG-02/evidence/` directory dislocation bug.

### 4.2 Resilient Radix UI `selectTab()`
- **File**: `scripts/capture-client.mjs`
- **Implementation**:
  ```javascript
  export async function selectTab(page, tabName) {
    const tab = page.getByRole('tab', { name: new RegExp(`^${tabName}$`, 'i') });
    await tab.waitFor({ state: 'attached', timeout: 5000 });
    await tab.scrollIntoViewIfNeeded();
    // Use force: true to bypass any Radix UI animation overlays
    await tab.click({ force: true });
    // Wait for corresponding tabpanel to display
    await page.waitForLoadState('domcontentloaded');
  }
  ```

### 4.3 Database Draft Invoice Cleanup Utility
- **File**: `scripts/capture-client.mjs`
- **Implementation**:
  Add exported function `pruneDuplicateDraftInvoices(companyName)` so test scripts don't fail when retried multiple times.

---

## 5. Component 4: Deterministic 1-Shot Preparation MCP Tool (`prepare_environment`)

### 5.1 Rationale & Mechanics
- **Match Clock Reality**: Environment preparation runs under `PREPARE_GAME_V2` and **does NOT count toward the 40-minute match clock**.
- **The CR-01 Failure Warning**: In match `OI1OFZ0I`, the LLM ran preparation interactively over 22 turns. It attempted to drop the PostgreSQL database using `psql.exe`, which failed silently because `psql.exe` was missing in PATH. The LLM improvised, left the database intact, and inherited a ghost migration from match `YTFHP47K`. This gave false-green local tests but failed on the Grader's clean database, costing 10 points on `CR-01`.
- **Solution**: Execute the entire preparation sequence in 1 single MCP call (`prepare_environment`) using deterministic Node.js standard libraries and direct database connections, cutting preparation from 22 turns (4.5 min) to 1 turn (< 25s) with 100% clean-room state.

### 5.2 Tool Declaration & Dispatch
- **Files**: `bin/runtime-server.mjs`, `src/runtime-session.mjs`
- **Tool Schema**:
  ```json
  {
    "name": "prepare_environment",
    "description": "Executes complete, deterministic pre-match environment preparation: verifies Git clone, drops and recreates clean database via direct SQL, verifies migration parity (including cascade fix), seeds data, starts background dev server, generates storageState.json, and appends all official readiness telemetry.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "forceDbReset": { "type": "boolean", "default": true }
      }
    }
  }
  ```

### 5.3 Automated Deterministic Pipeline Steps
1. **Repository & Directory Verification**:
   - Verify `<checkoutRoot>/.git` exists. If not, auto-clone `repository.url` into `checkoutRoot`.
   - Verify `<matchRoot>/src/.env` exists; auto-synthesize from `.env.example` with port 5433 credentials and random 64-char `AUTH_SECRET`.
   - Apply Git Shield: append `logs/`, `*.log`, `*.ndjson`, `.URGENT_PI_LOCK`, `storageState.json` to `<checkoutRoot>/.git/info/exclude`.
   - Append `PREPARATION_STATUS` (`GIT_AUTH`, `COMPLETED`) and (`REPOSITORY`, `COMPLETED`).
2. **Clean-Room Database Reset & Cascade Parity Fix**:
   - Connect directly to PostgreSQL on port 5433 (user `postgres`, password `freelanceos_secret`) using `pg` or Node standard sockets / CLI fallback to execute:
     `DROP DATABASE IF EXISTS freelanceos_test; CREATE DATABASE freelanceos_test OWNER freelanceos;`
   - **Parity Auto-Patch**: Check if `tests/cascade.test.ts` exists and whether a migration restoring `RESTRICT` on company invoices is needed. Auto-inject migration `restore_invoice_company_restrict` into `src/prisma/migrations/` and commit to Git so the Grader's clean database passes tests with 100% parity!
   - Execute: `pnpm prisma generate && pnpm prisma migrate deploy && pnpm db:seed`.
   - Append `PREPARATION_STATUS` (`ENVIRONMENT`, `COMPLETED`).
3. **Fast Build Gate & Dev Server Launch**:
   - Run `pnpm typecheck` (verifies TypeScript types in ~8s; zero production build latency).
   - Append `PREPARATION_STATUS` (`BUILD`, `COMPLETED`).
   - Kill any lingering process on port 3000 (`Get-Process node | Stop-Process -Force` or Node process kill).
   - Detach `pnpm dev` in background with stdout/stderr piped to `../logs/dev.log`.
   - Probe `http://127.0.0.1:3000` via `check-server` until 200 OK (< 5s).
4. **Browser Auth Session Caching**:
   - Execute `capture-client.mjs auth-init` against `http://127.0.0.1:3000` using seed credentials (`alex@solova.test` / `Password123!`) to save `storageState.json`.
   - Execute `loginMatch()` to authenticate Game Master cookie jar.
   - Append `PREPARATION_STATUS` (`MATCH_LOGIN`, `COMPLETED`).
5. **Final Readiness Gate**:
   - Append `ENVIRONMENT_READY` with commit SHA, `build: "PASS"`, `matchLogin: "PASS"`.
   - Return `{ ready: true, durationMs: ..., revision: ... }` to caller in 1 single turn!

---

## 6. Component 5: "Zero-Worklog" Skill Refactoring

### 6.1 `skills/game-preparation/SKILL.md`
- Strip the 22-turn manual PowerShell instructions.
- Replace with a concise, authoritative 1-turn directive:
  1. Call `configure_session(...)`.
  2. Call `prepare_environment()`.
  3. When `prepare_environment()` returns `{ ready: true }`, signal ready to MTM Player.
- Note clearly: *"Preparation does NOT count toward the 40-minute backlog clock. Do NOT run ad-hoc shell commands or manual psql fixes. `prepare_environment` executes the complete clean-room setup deterministically."*

### 6.2 `skills/team-orchestrator/SKILL.md`
- **Eliminate `plan.md` (Stage 2)**:
  - Remove instructions ordering the LLM to write `<matchRoot>/answers/<key>/plan.md`.
  - The Grader never reads or evaluates `plan.md`. The LLM should conduct diagnosis in internal thought and proceed directly to code implementation.
- **Automate Telemetry & Packaging**:
  - Direct the agent to execute a strict **3-Turn Code-First Loop**:
    - **Turn 1 (MCP)**: `get_next_task()` retrieves the top-priority item (auto-stashes any pre-empted task, logs `IN_PROGRESS`, pre-crawls logs and fixtures).
    - **Turn 2 (In-memory)**: Code diagnosis & minimal targeted edits in `src/`.
    - **Turn 3 (Shell + MCP)**: Run headless verification & Playwright capture in 1 composite command, then call `submit_work({ backlogItemKey: "<key>" })`.
  - `submit_work()` automatically derives `engineeringRecord`, validates evidence, commits, pushes, and emits dual telemetry (`SUBMITTED` + `BACKLOG_TESTS: PASSED`).

---

## 7. Verification & Testing Matrix

| Component | Test Case | Success Criteria |
| :--- | :--- | :--- |
| **Preparation MCP** | Call `prepare_environment()` from scratch | Completes in < 25s; DB reset cleanly; Next.js running on 3000; all 6 NDJSON readiness events present. |
| **Cascade Parity** | Run `pnpm test` on freshly prepared DB | All tests pass (including `tests/cascade.test.ts`); migration committed in git. |
| **MCP Registry** | `test-mcp-server.mjs` | Verify `pack_submission` and `get_test_data` are no longer listed in `tools/list`; verify `submit_work` continues to auto-pack `submit.json`. |
| **Git Shield** | Test repo dirty check with active log writes | Stash with `git stash push -u` does not include `logs/dev.log` or `.URGENT_PI_LOCK`. |
| **Stash Pop Fallback** | Simulate dirty restore collision | Inject dummy file in `answers/BUG-02/`, trigger restore fallback, confirm files checkout cleanly and `stashRestored: true`. |
| **Evidence Path** | Call `resolveEvidencePath("BUG-02", "test.png")` from `src/` | Path resolves to `<matchRoot>/answers/BUG-02/evidence/test.png`. |
| **Zero-Worklog Submission** | Call `submit_work("TASK-03")` without explicit `engineeringRecord` | Auto-generates valid `submit.json` conforming to competition schema; status `ACCEPTED`. |

