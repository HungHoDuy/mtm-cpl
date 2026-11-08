# Implementation Plan: CR-01 Isolation & Lightweight Evidence Runner Evolution

- **Target Systems**: `D:\mtm\team-orchestrator-pack` (source) and `D:\mtm\CPL\team-sdlc-pack`
- **Primary Goals**:
  1. Eliminate test file cross-contamination where premature background radar auto-linking leaks unstarted challenge tests into git commits of earlier tasks (saving 20 points on CR-01).
  2. Implement task-scoped Git staging in `ensureGitPushed()` to prevent uncompleted files from leaking into challenge revisions.
  3. Replace the 832-line brittle `evidence-runner.mjs` DSL with a lightweight 45-line `capture-client.mjs` utility that solves the 4 historical bottlenecks (cached auth, host Chrome, 4s timeouts, Radix helper) and allows the agent to write transparent 15-line Playwright scripts.
  4. Update `SKILL.md` to remove the blanket Playwright ban and document the fast evidence workflow.
- **Estimated Implementation Time**: ~20 minutes

---

## 1. Architectural Architecture & Component Changes

```mermaid
flowchart TD
    subgraph CoreEngine ["1. src/runtime-session.mjs"]
        RadarCheck["pollAndSyncBacklog()<br/>(Passes isBackground = true)"]
        StartWork["startWork(key, isBackground)<br/>(Only auto-links test files if !isBackground)"]
        ScopedStage["ensureGitPushed()<br/>(Stages answers/${activeKey} instead of blanket answers/)"]
        TestShield["Test Shield Guard<br/>(Reverts unstarted *-mvs.test.ts before staging)"]
    end

    subgraph EvidenceClient ["2. scripts/capture-client.mjs"]
        CreatePage["createCapturePage()<br/>(Host Chrome + storageState.json + 4s timeout)"]
        RadixSelect["selectRadixOption(page, trigger, optionText)<br/>(Reliable Radix portal dropdown handler)"]
        DownloadHelper["captureDownload(page, action, outputPath)<br/>(Reliable 1-line download capture)"]
    end

    subgraph SkillRules ["3. skills/team-orchestrator/SKILL.md"]
        RemoveBan["Remove 'BANNED: Inline Playwright Scripts'"]
        AddTemplate["Provide 15-line fast capture.mjs template"]
    end

    RadarCheck --> StartWork
    StartWork --> ScopedStage
    ScopedStage --> TestShield
    CreatePage --> RadixSelect
    CreatePage --> DownloadHelper
    CreatePage --> AddTemplate
```

---

## 2. Work Packages (WPs)

### WP1: Radar Test Isolation (`src/runtime-session.mjs`)

#### Problem:
In `pollAndSyncBacklog()`, when a new wave arrives, the radar auto-starts newly discovered items in the background via `startWork(k, true)`. Currently, `startWork` unconditionally runs `this.autoLinkChallengeFixtures(backlogItemKey)`, copying `*-mvs.test.ts` into `src/tests/`. For `CR-03`, this imported `~/lib/contact-links` which was not implemented yet, breaking `vitest` and `tsc` for `CR-01`.

#### Changes:
1. In `startWork(backlogItemKey, isBackground = false)`:
   - Always pre-materialize `answers/<KEY>/evidence/` and pre-fetch test data fixtures (safe for speed).
   - Only copy `*-mvs.test.ts` into `src/tests/` if `!isBackground`:
     ```javascript
     // runtime-session.mjs
     if (!isBackground) {
       const linked = this.autoLinkChallengeFixtures(backlogItemKey, targetFixturePath);
       if (linked.length > 0) filesWritten.push(...linked);
     } else {
       this.logDebug(`[Background Radar] Deferred test file linking for ${backlogItemKey} until active development.`);
     }
     ```
2. When the LLM agent explicitly calls `start_work({ backlogItemKey })`, `isBackground` is `false`, so `autoLinkChallengeFixtures` runs immediately at the exact moment work begins.

---

### WP2: Task-Scoped Git Staging (`src/runtime-session.mjs`)

#### Problem:
`ensureGitPushed()` in `runtime-session.mjs` line 389 executes `git add src answers`. If any unworked or intermediate file exists under `src/tests/` or in another task's answer folder, it is staged and committed into the active task's submission revision.

#### Changes:
In `ensureGitPushed(branch = null)`:
1. Identify the current active item: `const activeKey = this.currentActiveItem || 'backlog'`.
2. Clean up any unstarted `*-mvs.test.ts` files in `src/tests/`:
   ```javascript
   const testDir = path.resolve(gitCwd, 'src', 'tests');
   if (fs.existsSync(testDir)) {
     const testFiles = fs.readdirSync(testDir);
     for (const tf of testFiles) {
       // If file is an MVS test for a different item that has NOT been started/completed by agent
       if (tf.endsWith('-mvs.test.ts') && !tf.toUpperCase().startsWith(activeKey.toUpperCase())) {
         const taskPrefix = tf.split('-')[0] + '-' + tf.split('-')[1];
         if (!this.submittedBacklogs.has(taskPrefix.toUpperCase())) {
           try {
             fs.unlinkSync(path.join(testDir, tf));
             this.logDebug(`[Git Shield] Removed unstarted test file src/tests/${tf} prior to staging ${activeKey}`);
           } catch (_) {}
         }
       }
     }
   }
   ```
3. Stage only `src/` and the active task's answer folder:
   ```javascript
   this.executeGit(['add', 'src', `answers/${activeKey}`], gitCwd);
   ```

---

### WP3: Lightweight `capture-client.mjs` Micro-Utility

#### Problem:
`evidence-runner.mjs` (832 lines) implements an inflexible, brittle action DSL and hardcodes obsolete match recipes (`BUG-01`, `BUG-02`, `CR-01`). When modern React/Radix components are tested, the custom DSL times out, forcing the agent to spend 6–7 minutes hacking workarounds.

#### Solution:
Create `team-orchestrator-pack/scripts/capture-client.mjs` (~45 lines) that solves the 4 real bottlenecks without imposing an opinionated DSL:
1. **Host Chrome Binary Resolution**: Automatically detects installed Google Chrome (`C:\Program Files\Google\Chrome\Application\chrome.exe`) or Edge.
2. **Instant Authentication**: Automatically attaches `storageState.json` cached during preparation.
3. **Strict 4-Second Timeouts**: Clamps `page.setDefaultTimeout(4000)` and `page.setDefaultNavigationTimeout(6000)` so selector errors fail fast instead of hanging for 30s.
4. **Radix Select Helper**:
   ```javascript
   export async function selectRadixOption(page, triggerSelector, optionText) {
     const trigger = page.locator(triggerSelector).first();
     await trigger.click();
     await page.locator('[role="option"]', { hasText: optionText }).first().click();
   }
   ```
5. **Download Capture Helper**:
   ```javascript
   export async function captureDownload(page, triggerAction, outputPath) {
     fs.mkdirSync(path.dirname(path.resolve(outputPath)), { recursive: true });
     const [download] = await Promise.all([
       page.waitForEvent('download', { timeout: 5000 }),
       triggerAction()
     ]);
     await download.saveAs(outputPath);
   }
   ```

---

### WP4: Modernize `SKILL.md` Instructions

#### Changes in `skills/team-orchestrator/SKILL.md`:
1. **Remove the Blanket Ban**: Remove Rule 1 under Section 3 (*"STRICTLY BAN writing raw inline Node Playwright scripts"*).
2. **Update Stage 5 (UI Evidence Capture)**:
   Instruct the agent to write a single task-specific `capture.mjs` using `capture-client.mjs`:
   ```javascript
   import { createCapturePage, selectRadixOption, captureDownload } from '../../scripts/capture-client.mjs';

   const { browser, page } = await createCapturePage();
   await page.goto('http://127.0.0.1:3000/accounting');
   await page.getByRole('tab', { name: 'Invoices' }).click();

   // All required screenshots & downloads in one pass
   await page.screenshot({ path: '../answers/CR-01/evidence/after-invoices.png' });
   await captureDownload(page, () => page.getByRole('button', { name: 'Export CSV' }).click(), '../answers/CR-01/evidence/tc-01-all-invoices.csv');

   await selectRadixOption(page, '[aria-label="Filter by company"]', 'Lotus Media CPL');
   await page.screenshot({ path: '../answers/CR-01/evidence/tc-02-filtered-invoices.png' });
   await captureDownload(page, () => page.getByRole('button', { name: 'Export CSV' }).click(), '../answers/CR-01/evidence/tc-02-filtered-invoices.csv');

   await browser.close();
   ```
3. Highlight that writing this 15-line script takes 5 seconds, captures all evidence in < 15 seconds, and provides transparent Playwright error stack traces if a selector fails.

---

## 3. Verification & Safety Criteria

| Test ID | Scenario | Expected Outcome |
| :--- | :--- | :--- |
| **TC-WP1-01** | Radar discovers Wave 4 in background during CR-01 | `CR-03-mvs.test.ts` is NOT copied into `src/tests/` while CR-01 is active. |
| **TC-WP1-02** | Agent calls `start_work("CR-03")` | `CR-03-mvs.test.ts` is immediately linked into `src/tests/`. |
| **TC-WP2-01** | `ensureGitPushed()` runs for CR-01 | Only `src/` and `answers/CR-01/` are staged; no unstarted challenge tests are committed. |
| **TC-WP3-01** | `capture-client.mjs` tests | Launches host Chrome, loads `storageState.json`, navigates without login, and captures screenshot in < 3s. |
| **TC-WP3-02** | Radix Select & Download helpers | Correctly selects dropdown option and saves downloaded file in 1 call without timeout. |

---

## 4. Implementation Status & Verification Results

All work packages have been implemented and tested:
1. **WP1 & WP2**: Implemented in [`runtime-session.mjs`](file:///d:/mtm/team-orchestrator-pack/src/runtime-session.mjs) and synced across `CPL/team-sdlc-pack/src/runtime-session.mjs`.
   - `ensureGitPushed()` now isolates staging to `answers/${activeKey}` and prunes unstarted challenge tests prior to staging.
   - `startWork(key, isAutoStart)` defers test file linking if `isAutoStart = true`.
   - `getNextTask()` and `preemptWork()` ensure test files and fixtures are auto-linked immediately when an item becomes active.
2. **WP3**: Created [`capture-client.mjs`](file:///d:/mtm/team-orchestrator-pack/scripts/capture-client.mjs) exporting `createCapturePage()`, `selectRadixOption()`, `captureDownload()`, and `captureScreenshot()`. Successfully verified on host Chrome.
3. **WP4 & WP5**:
   - Updated [`SKILL.md`](file:///d:/mtm/team-orchestrator-pack/skills/team-orchestrator/SKILL.md) and [`game-preparation/SKILL.md`](file:///d:/mtm/team-orchestrator-pack/skills/game-preparation/SKILL.md).
   - Updated all agent profiles ([`team-orchestrator.toml`](file:///d:/mtm/team-orchestrator-pack/agents/team-orchestrator.toml) and [`team-tester.toml`](file:///d:/mtm/team-orchestrator-pack/agents/team-tester.toml)) across all packs.
   - Enhanced [`capture-client.mjs`](file:///d:/mtm/team-orchestrator-pack/scripts/capture-client.mjs) with CLI support for `check-server` and `auth-init`.
   - **Completely deleted `evidence-runner.mjs`** across the entire workspace (0 occurrences remaining).
4. **Harness Verification**:
   - `node team-orchestrator-pack/test/test-mcp-server.mjs`: **99 Passed, 0 Failed**.
   - `node team-orchestrator-pack/test/test-orchestrator-skills.mjs`: **71 Passed, 0 Failed**.
