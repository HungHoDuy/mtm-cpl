# Engineering Implementation Plan: Speed Optimization & Deadline Recovery Architecture (RPI Cycle 09)

- **Session Date**: 2026-10-29
- **Target Packs**: [`team-orchestrator-pack`](file:///d:/mtm/team-orchestrator-pack) and [`D:\mtm\CPL_2\team-sdlc-pack`](file:///d:/mtm/CPL_2/team-sdlc-pack)
- **Objective**: Eliminate the 4 critical latency drivers that caused `BUG-02` deadline expiration in Match `JKYY7G0C`, enforce the Fast-Check verification policy, package a single-pass evidence capture runner, and fix the infinite restart loop in `team-recovery`.

---

## 1. Concrete Engineering Modifications

### Step 1: Enforce the Fast-Check Policy (Replace `pnpm build`)
**Files**:
- [`team-orchestrator-pack/skills/team-orchestrator/SKILL.md`](file:///d:/mtm/team-orchestrator-pack/skills/team-orchestrator/SKILL.md)
- [`D:\mtm\CPL_2\team-sdlc-pack\skills\team-orchestrator\SKILL.md`](file:///d:/mtm/CPL_2/team-sdlc-pack/skills/team-orchestrator/SKILL.md)

**Changes**:
1. In **Stage 4 (Fast-Check Verification Policy)**, add a strict rule:
   ```powershell
   # Mandatory 7-second Fast-Check:
   pnpm typecheck
   pnpm vitest run tests/<targeted>.test.ts
   ```
2. In **Stage 5 (After Evidence & Pre-Submission Check)**:
   - Change pre-submission gate from `pnpm build` to:
     > *"If match time remaining or countdown clock is $\le 5$ minutes, running full `pnpm build` is STRICTLY PROHIBITED. Trust `pnpm typecheck` and targeted Vitest. Immediately proceed to Stage 6."*
   - Running full `pnpm build` is only permitted when clock budget $\ge 15$ minutes and no countdown deadline is active.

---

### Step 2: Implement Single-Pass Consolidated Evidence Runner
**File**: [`team-orchestrator-pack/scripts/evidence-runner.mjs`](file:///d:/mtm/team-orchestrator-pack/scripts/evidence-runner.mjs)

**Changes**:
1. Add sub-command `batch-evidence`:
   - Accepts a JSON specification of actions and screenshots.
   - Launches a single headless Chrome instance.
   - Authenticates once (`/login`) and persists browser cookies/context.
   - Sequentially navigates to target routes, waits for `aria-selected="true"` tabs, triggers form submissions, and saves evidence PNGs directly into `answers/<backlogId>/evidence/`.
   - Closes browser in under 45 seconds total execution time (saving 4+ minutes of ad-hoc script authoring and multi-instance Chrome startups).
2. Add defensive tab selection helper:
   ```javascript
   // Auto-retrying resilient tab switch:
   const tab = page.getByRole('tab', { name: tabName });
   await tab.click();
   await page.waitForFunction(
     el => el.getAttribute('aria-selected') === 'true',
     await tab.elementHandle(),
     { timeout: 5000 }
   );
   ```

---

### Step 3: Fix Infinite Recovery Loop in `team-recovery`
**Files**:
- [`team-orchestrator-pack/skills/team-recovery/SKILL.md`](file:///d:/mtm/team-orchestrator-pack/skills/team-recovery/SKILL.md)
- [`D:\mtm\CPL_2\.agents\skills\team-recovery\SKILL.md`](file:///d:/mtm/CPL_2/.agents/skills/team-recovery/SKILL.md)
- [`D:\mtm\CPL_2\team-sdlc-pack\skills\team-recovery\SKILL.md`](file:///d:/mtm/CPL_2/team-sdlc-pack/skills/team-recovery/SKILL.md)
- [`D:\mtm\CPL_2\team-sdlc-pack\runtime\skills\team-recovery\SKILL.md`](file:///d:/mtm/CPL_2/team-sdlc-pack/runtime/skills/team-recovery/SKILL.md)

**Changes**:
Add **Section 5: Transition to Active Game Execution (Crucial)**:
```markdown
## 5. Transition to Active Game Execution

When server state reconciliation confirms the current backlog item is `CLOSED`, expired, or rejected:
1. Reconcile the closed item as `BLOCKED` in `progress.ndjson` with one atomic write.
2. **DO NOT STOP OR EXIT YOUR TURN**. Leaving the turn idle causes MTM Player to trigger an infinite restart loop.
3. Immediately transition to `team-orchestrator` active workflow:
   - Call `refresh_match()`.
   - Inspect open items and select the highest-value `OPEN` item (e.g. `CR-01` with 300 pts).
   - Call `start_work({ backlogItemKey: "<selectedItem>" })` in the exact same turn.
   - Proceed through Stage 2 (Plan & Baseline Evidence) and Stage 3 (Implementation) without pausing.
```

---

### Step 4: Compound Command Execution Directive
**Files**:
- [`team-orchestrator-pack/skills/team-orchestrator/SKILL.md`](file:///d:/mtm/team-orchestrator-pack/skills/team-orchestrator/SKILL.md)
- [`team-orchestrator-pack/agents/team-orchestrator.toml`](file:///d:/mtm/team-orchestrator-pack/agents/team-orchestrator.toml)

**Changes**:
Instruct the orchestrator to batch multi-step shell operations:
```powershell
# Execute in ONE tool turn instead of 4 separate turns:
git -C $root add -- src/ answers/<id>/ && git -C $root commit -m "fix(<id>): verified fix" && node -e "/* submit_work */"
```
This saves ~3 minutes of cumulative LLM turn dispatch and review latency.

---

## 2. Execution & Deployment Workflow

1. **Terminate Hung Recovery Process**:
   - Kill PID 4860 (`local-app-worker.mjs`) and PID 30404 (`codex`) currently spinning in the Attempt 10+ loop.
2. **Update Source Files in `team-orchestrator-pack`**:
   - Apply edits to `SKILL.md` (Fast-Check, Recovery Pivot) and `evidence-runner.mjs`.
3. **Run Validation Tests**:
   - `node test-mcp-server.mjs`
   - `node test-orchestrator-skills.mjs`
   - `node scripts/check-distribution.mjs`
4. **Re-sync into Contestant Workspace (`CPL_2`)**:
   - Run install script to propagate updated skills and runtime files to `D:\mtm\CPL_2`.

---

## 3. Verification & Acceptance Criteria

| Invariant | Test Method | Expected Result |
|---|---|---|
| **No Next.js Build Near DL** | Run mock task with clock $< 5$ min | Orchestrator runs `typecheck` + `vitest` and submits directly without `pnpm build`. |
| **No Recovery Deadlock** | Mock Game Master returning `BACKLOG_ITEM_CLOSED` | Orchestrator logs `BLOCKED` and immediately invokes `start_work("CR-01")` in same turn. |
| **Fast Evidence Runtime** | Execute `evidence-runner.mjs batch-evidence` | Captures baseline + 3 screenshots in $< 45$ seconds with 0 selector crashes. |
| **Total Task Turnaround** | Full dry-run on `BUG-02` or `CR-01` | End-to-end start to submit in **$< 7$ minutes**. |

