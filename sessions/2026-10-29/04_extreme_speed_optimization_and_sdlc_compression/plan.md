# Engineering Plan: Extreme Speed Optimization & 4.5-Minute SDLC Compression (Cycle 04)

- **Date**: 2026-10-29
- **Cycle**: 04 of 2026-10-29
- **Objective**: **Compress backlog turnaround from 18m 05s down to ~4m 40s per item, eliminate ad-hoc Playwright scripting, kill the `write_stdin` polling tax, enforce a Code-First workflow, and automate packaging with a unified CLI tool.**
- **Associated Research**: [`research_extreme_speed_optimization.md`](./research_extreme_speed_optimization.md)
- **Status**: **READY FOR USER REVIEW (DO NOT IMPLEMENT BEFORE USER APPROVAL)**

---

## 1. Scope & Impacted Components

| Component | Target File | Nature of Implementation |
| :--- | :--- | :--- |
| **Evidence Runner** | [`team-orchestrator-pack/scripts/evidence-runner.mjs`](file:///d:/mtm/team-orchestrator-pack/scripts/evidence-runner.mjs) | 1. Add `auth-cache` command to create pre-authenticated `storageState.json`.<br/>2. Set `page.setDefaultTimeout(5000)` globally.<br/>3. Add declarative batch recipe mode (`--recipe <id>`). |
| **Packaging & Submission Tool** | [`team-orchestrator-pack/scripts/pack-and-submit.mjs`](file:///d:/mtm/team-orchestrator-pack/scripts/pack-and-submit.mjs) | Create new high-speed CLI tool to validate `submit.json` with Ajv, verify evidence files, run atomic `git add && git commit`, and invoke `submit_work` in one step (~3s). |
| **MCP Helper Runtime** | [`team-orchestrator-pack/src/runtime-session.mjs`](file:///d:/mtm/team-orchestrator-pack/src/runtime-session.mjs) | Auto-copy challenge seeds/fixtures (`challenge/<id>*`) into `src/prisma/` on `start_work`. |
| **Preparation Skill** | [`team-orchestrator-pack/skills/game-preparation/SKILL.md`](file:///d:/mtm/team-orchestrator-pack/skills/game-preparation/SKILL.md) | Drop heavy `pnpm build`; replace with fast `prisma generate` + `typecheck`; start detached dev server on port 3000; generate `storageState.json`. |
| **Orchestrator Skill & Agent TOML** | [`team-orchestrator-pack/skills/team-orchestrator/SKILL.md`](file:///d:/mtm/team-orchestrator-pack/skills/team-orchestrator/SKILL.md) & [`team-orchestrator.toml`](file:///d:/mtm/team-orchestrator-pack/agents/team-orchestrator.toml) | 1. Invert workflow to Code-First (fix code -> test -> single evidence run).<br/>2. Strictly ban inline Playwright scripts and `view_image`.<br/>3. Mandate `page.setDefaultTimeout(5000)` and `Set-Location`. |
| **Distribution Workspaces** | `D:\mtm\CPL`, `D:\mtm\CPL_2`, `D:\mtm\CPL_3` | Synchronize modified runtime, scripts, skills, and agent profiles. |

---

## 2. Detailed Implementation Phases

### Phase 1: Overhaul `evidence-runner.mjs` (Pre-Auth Caching & 5s Timeouts)
1. **Pre-Authenticated Context (`storageState.json`)**:
   Add `--auth-init` flag:
   - Launches Chromium, navigates to `http://127.0.0.1:3000/login`.
   - Logs in using standard seed credentials (`test@example.com` / `password123`).
   - Saves storage state to `<matchRoot>/storageState.json`.
   - All subsequent screenshot captures launch browser with `{ storageState: '<matchRoot>/storageState.json' }`, skipping the login page completely.
2. **Short 5,000ms Timeout Enforcement**:
   Set `page.setDefaultTimeout(5000)` and `page.setDefaultNavigationTimeout(8000)` on all page contexts.
3. **Declarative Recipe Runner (`--recipe <id>`)**:
   Add built-in recipes for standard challenges (e.g., `BUG-02`):
   - Opens accounting tab once.
   - Captures `tc-01-vnd-invoice.png`, `tc-02-vnd-payment.png`, `tc-03-usd-invoice.png` sequentially in the same page session without closing/re-opening the browser.
   - Total execution time: **~35 seconds** (vs 6 minutes before).

---

### Phase 2: Create Unified `pack-and-submit.mjs` Script
Create [`team-orchestrator-pack/scripts/pack-and-submit.mjs`](file:///d:/mtm/team-orchestrator-pack/scripts/pack-and-submit.mjs):
```javascript
// Usage: node scripts/pack-and-submit.mjs --backlog BUG-02
```
In a single synchronous call (~3 seconds):
1. **Ajv Schema Check**: Validates `<matchRoot>/answers/<backlogId>/submit.json` against `challenge/<backlogId>-submit.schema.json`.
2. **Evidence Integrity Check**: Asserts that every file declared in `evidenceFiles` exists and `stat.size > 0`.
3. **Atomic Git Commit**: Executes `git add -A && git commit -m "fix(<backlogId>): resolve challenge"`.
4. **Autonomous Submission**: Invokes `tools.mcp__mtm_helper__submit_work({ backlogItemKey })` via standard CLI wrapper or returns exit code 0 indicating submission readiness.

---

### Phase 3: Auto-Link Challenge Fixtures on `start_work`
In [`runtime-session.mjs`](file:///d:/mtm/team-orchestrator-pack/src/runtime-session.mjs) inside `startWork()`:
- After calling Game Master `/backlogs/start` and saving QA fixtures:
- Scan `<matchRoot>/challenge/` for any files matching `${backlogItemKey}*seed*.ts` or `${backlogItemKey}*.json`.
- Automatically copy them to `<matchRoot>/src/prisma/` and run `pnpm tsx prisma/<seed-script>.ts`.
- The developer agent receives a pre-seeded, pre-configured environment immediately upon turn start.

---

### Phase 4: Streamline `game-preparation` (Drop Heavy Build & Detach Dev Server)
In [`skills/game-preparation/SKILL.md`](file:///d:/mtm/team-orchestrator-pack/skills/game-preparation/SKILL.md):
1. **Drop `pnpm build` in Prep**:
   - Replace with fast preparation checks:
     `pnpm prisma generate && pnpm prisma migrate deploy && pnpm db:seed && pnpm typecheck` (~12s).
2. **Background Dev Server Detaching**:
   - Instruct the preparation script to launch Next.js via detached PowerShell process:
     ```powershell
     Start-Process pnpm -ArgumentList "dev" -RedirectStandardOutput "dev.log" -RedirectStandardError "dev-err.log"
     ```
   - Poll port 3000 with `Test-NetConnection` for up to 15s; exit as soon as port 3000 opens.
3. **Generate `storageState.json`**:
   - Run `node team-sdlc-pack/scripts/evidence-runner.mjs --auth-init`.

---

### Phase 5: Code-First SDLC Invariants in Agent & Skill
In [`team-orchestrator.toml`](file:///d:/mtm/team-orchestrator-pack/agents/team-orchestrator.toml) and [`skills/team-orchestrator/SKILL.md`](file:///d:/mtm/team-orchestrator-pack/skills/team-orchestrator/SKILL.md):
1. **Code-First Sequence**:
   - Stage 1: Triage -> Stage 2: `start_work` -> Stage 3: Inspect code & tests -> Stage 4: Apply patch -> Stage 5: Fast headless checks -> Stage 6: Single-pass evidence capture -> Stage 7: `pack-and-submit.mjs`.
2. **Explicit Tool Bans**:
   - **STRICTLY BAN** raw inline Node Playwright scripts (`import { chromium } from ...`). Always use `evidence-runner.mjs`.
   - **STRICTLY BAN** `view_image` during active matches. Playwright DOM assertions are authoritative.
   - **STRICTLY BAN** default 30s timeouts. Always use 5s timeouts.
3. **Mandate Working Directory Anchoring**:
   - Every PowerShell block must begin with `Set-Location '<matchRoot>/src'` or execute with `workdir: matchRoot`.

---

## 3. Testing & Verification Plan

1. **MCP Test Suite**: Run `npm --prefix team-orchestrator-pack test` to verify all 82 tests pass.
2. **`pack-and-submit.mjs` Offline Unit Test**:
   Create a mock test scenario to verify that `pack-and-submit.mjs` correctly validates schema, checks evidence, and commits files within < 3 seconds.
3. **`evidence-runner.mjs` Recipe Test**:
   Verify that `--auth-init` generates valid `storageState.json` and that `--recipe` executes within < 45 seconds with 5s timeouts.
4. **Multi-Workspace Distribution**:
   Deploy across `CPL`, `CPL_2`, and `CPL_3` and verify with `check-distribution.mjs`.

---

## 4. User Review Gate

> [!IMPORTANT]
> **Awaiting User Review**:
> Implementation will begin only after you have reviewed and approved this plan. Please confirm if you would like to proceed with Phase 1 through 5 or suggest adjustments.
