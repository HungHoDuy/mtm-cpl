# Implementation Plan: Single-Orchestrator Architecture, Multi-Criteria Triage & Submission Pipeline (RPI Cycle 07)

- **Session Date**: 2026-10-28
- **Session Focus**: **End-to-End Execution of Single-Orchestrator SDLC Engine (Zero Subagents), Multi-Criteria Triage (PI > Expiring Deadline > Score Value), Pre-Flight Dual-Log Sync, and Self-Healing Submission Pipeline**
- **Project**: Master The Machine (MTM) — AI Fest 2026
- **Team**: CPL (`CPL_digital_cuder` / `CPL Team`)
- **Status**: Implementation Plan — Revised per User Directives — Ready for Approval & Execution
- **Predecessor Research**: [`research_performance_telemetry_and_submission_pipeline.md`](file:///d:/mtm/sessions/2026-10-28/07_performance_telemetry_and_submission_pipeline/research_performance_telemetry_and_submission_pipeline.md)

---

## 1. Architectural Transformation & Objectives

In response to forensic data showing that **65% of match time (~31.5 minutes)** was wasted on multi-agent context transfers and reasoning pauses across 7 subagents, this plan replaces the subagent hierarchy with a **high-throughput, single-agent autonomous orchestrator engine** across **ALL waves**:

1. **Eliminate All Subagent Spawning (Single-Orchestrator Architecture)**:
   - Configure `team_orchestrator` as a unified, self-contained SDLC engine executing the entire 7-stage workflow inline (Discover $\to$ Scope $\to$ Baseline Evidence $\to$ Minimal Diff $\to$ Fast-Check $\to$ After Evidence $\to$ Atomic Push & Submit).
   - Eliminate 100% of subagent handoff pauses, saving **20–25 minutes of contest time** and reducing token consumption by ~80%.
   - Apply this single-orchestrator workflow across **ALL waves** for the full 40-minute contest duration.
2. **Multi-Criteria Triage Hierarchy (PI > Expiring Deadline > Score Value)**:
   - Replace arbitrary prefix sorting (`BUG > CR > TASK`) with a deterministic urgency scoring formula:
     $$\mathbf{UrgencyRank} = \mathbf{PI} \;(100,000) \;\;+\;\; \mathbf{DeadlineActive} \;(50,000) \;\;+\;\; \mathbf{PointsValue} \;(100 \dots 300)$$
   - Pre-sort discovered backlogs in `runtime-session.mjs:refreshMatch()` so **Index 0 is ALWAYS the highest-value, highest-urgency task**.
3. **Pre-Flight Telemetry Completeness & Dual-Write Logging**:
   - Enumerate all 5 mandatory stages (`GIT_AUTH`, `REPOSITORY`, `ENVIRONMENT`, `BUILD`, `MATCH_LOGIN`) in `game-preparation/SKILL.md`.
   - Implement dual-write progress logging in `runtime-session.mjs:appendProgress()`: every event is written simultaneously to `matchRoot/logs/` and `team-sdlc-pack/logs/`, ensuring MTM Player's desktop UI stays 100% synchronized in real time.
4. **Autonomous Submission Pipeline & 409 Conflict Self-Healing Guard**:
   - Enforce the **Atomic Commit-and-Submit Gate** in `skills/team-orchestrator/SKILL.md`.
   - Add a self-healing guard in `runtime-session.mjs:startWork()`: if the previous backlog item was completed locally (`status: "DONE"`) but unsubmitted, `startWork` automatically runs `git push origin main` and calls the Game Master submission API before starting the new item.
5. **Zero Token Cost Offline Verification**:
   - Add Tests 12, 13, and 14 to `test-mcp-server.mjs`. Verify 100% passing test suites across all 60+ MCP tests and 73+ skill contract tests locally offline.

---

## 2. Work Breakdown Structure (WBS)

```mermaid
flowchart TD
    subgraph WP1 ["WP1: Single-Orchestrator Architecture (Zero Subagents)"]
        A1["Update agents/team-orchestrator.toml: Self-contained SDLC engine"]
        A2["Update skills/team-orchestrator/SKILL.md: 7-stage linear workflow for ALL waves"]
        A3["Update team-developer.toml & team-tester.toml: Fast-check policy (typecheck/vitest)"]
    end

    subgraph WP2 ["WP2: Multi-Criteria Triage (PI > Expiring Deadline > Score Value)"]
        B1["Update runtime-session.mjs: Parse points and deadlines from card HTML"]
        B2["Update runtime-session.mjs: Deterministic sorting formula (PI > DL > Points)"]
        B3["Update team-orchestrator.toml & SKILL.md: Reinforce priority hierarchy"]
    end

    subgraph WP3 ["WP3: Submission Pipeline & 409 Self-Healing Guard"]
        C1["Update skills/team-orchestrator/SKILL.md: Atomic Commit-and-Submit Gate"]
        C2["Update runtime-session.mjs startWork(): Auto-submit uncommitted predecessor"]
    end

    subgraph WP4 ["WP4: Pre-Flight Telemetry & Dual-Write Logging"]
        D1["Update skills/game-preparation/SKILL.md: Mandatory 5-stage preflight"]
        D2["Update runtime-session.mjs appendProgress(): Dual-write to pack logs"]
    end

    subgraph WP5 ["WP5: Offline Test Harness Expansion & Workspace Sync"]
        E1["Add Test 12 in test-mcp-server.mjs: Multi-criteria urgency sorting"]
        E2["Add Test 13: Dual-write progress log verification"]
        E3["Add Test 14: Self-healing submission guard verification"]
        E4["Run test-orchestrator-skills.mjs & check-distribution.mjs"]
        E5["Sync to D:/mtm/CPL via install.mjs"]
    end

    WP1 & WP2 & WP3 & WP4 --> WP5
```

---

## 3. Detailed Work Packages

### WP1: Single-Orchestrator Architecture & Unified Workflow (Zero Subagents)

#### File 1: `team-orchestrator-pack/agents/team-orchestrator.toml`
- **Change**: Transform `team_orchestrator` from a delegation coordinator into an **autonomous, end-to-end SDLC executor**:
  - Remove instructions to spawn `team-developer`, `team-tester`, and `team-cyber-security` subagents.
  - Embed the complete 7-stage workflow directly into developer instructions:
    1. **Triage**: Select highest-urgency item from `refresh_match()` (PI > Expiring Deadline > Highest Points).
    2. **Scope**: Call `start_work({ backlogItemKey })`, read challenge scenarios and submit template.
    3. **Baseline Evidence**: Execute `evidence-runner.mjs` to capture "before" screenshots/logs before making any code edits.
    4. **Minimal Diff**: Implement code or schema changes directly inside `matchRoot`.
    5. **Fast-Check**: Verify fixes via `pnpm typecheck` (4s) and targeted Vitest tests (3s). Avoid full `pnpm build` during iteration.
    6. **After Evidence**: Execute `evidence-runner.mjs` to capture "after" screenshots/logs, validate evidence paths, and set `submit.json` to `status: "DONE"`.
    7. **Atomic Submit**: Commit to git, then invoke `submit_work({ backlogItemKey })` immediately to push to GitHub and acquire the Game Master receipt.
  - Apply this unified workflow across **ALL waves** for the entire 40-minute contest duration.

#### File 2: `team-orchestrator-pack/skills/team-orchestrator/SKILL.md`
- **Change**: Rewrite Section 2 ("The 4-Stage Autonomous RPI Loop") to the **Linear 7-Stage Autonomous SDLC Loop**:
  - Clearly state that the orchestrator executes all steps inline without subagent delegation.
  - Detail each step with exact command examples.

---

### WP2: Multi-Criteria Backlog Triage (`PI` > Expiring Deadline > Score Value)

#### File: `team-orchestrator-pack/src/runtime-session.mjs`
- **Location**: `refreshMatch()`
- **Changes**:
  1. **Parse Points and Deadlines**:
     - Extract point value from `<span class="text-zinc-400">(\d+)\s*pts</span>` or card text (e.g. `200 pts` $\to$ `points: 200`). Default to `100` if absent.
     - Extract active countdown deadline: set `hasDeadline: true` if the card HTML contains countdown markers (`\d+m`, `countdown`, `deadline`), or if the key is `BUG-02`.
  2. **Deterministic Urgency Sorting Function**:
     ```javascript
     function computeUrgencyRank(item) {
       let score = 0;
       const key = item.key.toUpperCase();
       
       // Rank 1: PI-* (Product Incidents) - immediate penalty avoidance
       if (key.startsWith('PI-')) score += 100000;
       
       // Rank 2: Expiring countdown deadlines (e.g. BUG-02 18m countdown)
       if (item.hasDeadline || key === 'BUG-02' || (item.title && item.title.toLowerCase().includes('deadline'))) {
         score += 50000;
       }
       
       // Rank 3: Score / Points Value (higher points = higher priority)
       score += (item.points || 100);
       
       return score;
     }

     discoveredItems.sort((a, b) => computeUrgencyRank(b) - computeUrgencyRank(a));
     ```
  3. Ensure `discoveredItems[0]` returned by `refresh_match` is guaranteed to be the optimal choice.

---

### WP3: Submission Pipeline & 409 Self-Healing Guard

#### File 1: `team-orchestrator-pack/skills/team-orchestrator/SKILL.md`
- **Location**: Section 4 ("Submission & Verification Sequence")
- **Change**: Define the **Atomic Commit-and-Submit Gate**:
  - Mandates invoking `submit_work({ backlogItemKey })` immediately upon test verification.
  - Strictly forbids starting a new item, exploring future waves, or idling before `submit_work` returns a verified server receipt.

#### File 2: `team-orchestrator-pack/src/runtime-session.mjs`
- **Location**: `startWork(backlogItemKey)`
- **Change**: Add Self-Healing Guard against HTTP 409 Conflict:
  ```javascript
  if (this.currentActiveItem && this.currentActiveItem !== backlogItemKey) {
    const prevKey = this.currentActiveItem;
    const prevAnswer = path.resolve(this.getMatchRoot(), 'answers', prevKey, 'submit.json');
    
    if (fs.existsSync(prevAnswer)) {
      try {
        const prevData = JSON.parse(fs.readFileSync(prevAnswer, 'utf8'));
        if (prevData.status === 'DONE' || prevData.status === 'COMPLETED') {
          this.logDebug(`[Self-Healing Guard] Predecessor ${prevKey} is DONE locally but unsubmitted. Auto-submitting before starting ${backlogItemKey}...`);
          await this.submitWork(prevKey);
        }
      } catch (e) {
        this.logDebug(`[Self-Healing Guard] Warning during predecessor check: ${e.message}`);
      }
    }
  }
  this.currentActiveItem = backlogItemKey;
  ```

---

### WP4: Pre-Flight Telemetry & Dual-Write Logging

#### File 1: `team-orchestrator-pack/skills/game-preparation/SKILL.md`
- **Change**: In Section 4 ("Mandatory Telemetry Logging"), enumerate all five distinct preparation stages:
  1. `stage: "GIT_AUTH"`, `status: "COMPLETED"`
  2. `stage: "REPOSITORY"`, `status: "COMPLETED"`
  3. `stage: "ENVIRONMENT"`, `status: "COMPLETED"`
  4. `stage: "BUILD"`, `status: "COMPLETED"` (explicit Next.js build verification)
  5. `stage: "MATCH_LOGIN"`, `status: "COMPLETED"`
  6. `type: "ENVIRONMENT_READY"` (final gate containing `build: "PASS"` and `matchLogin: "PASS"`)

#### File 2: `team-orchestrator-pack/src/runtime-session.mjs`
- **Location**: `appendProgress(event)`
- **Change**: Implement dual-write logging:
  ```javascript
  // 1. Primary write to working directory / matchRoot
  fs.appendFileSync(this.progressLogFile, logLine, 'utf8');

  // 2. Secondary mirror write to team-sdlc-pack/logs/ for MTM Player UI
  try {
    const parentPackLogs = path.resolve(this.checkoutRoot, '..', 'team-sdlc-pack', 'logs');
    if (fs.existsSync(parentPackLogs)) {
      const activeMatchId = this.matchId || 'active';
      const mirrorLog = path.resolve(parentPackLogs, `${activeMatchId}.progress.ndjson`);
      if (mirrorLog !== this.progressLogFile) {
        fs.appendFileSync(mirrorLog, logLine, 'utf8');
      }
    }
  } catch (err) {
    // Non-fatal mirror logging error
  }
  ```

---

### WP5: Offline Test Harness Expansion & Workspace Sync

#### File: `team-orchestrator-pack/test/test-mcp-server.mjs`
- **New Tests**:
  - **Test 12: Multi-Criteria Backlog Triage Sorting**:
    Feed a mock match page containing:
    - `TASK-01` (100 pts)
    - `CR-01` (300 pts)
    - `BUG-01` (200 pts)
    - `BUG-02` (150 pts, active 18m deadline)
    - `PI-01` (250 pts, product incident)
    Verify `refresh_match` returns them sorted as:
    1. `PI-01` (Product Incident, highest urgency)
    2. `BUG-02` (Expiring Deadline, time-decay risk)
    3. `CR-01` (300 pts, highest score)
    4. `BUG-01` (200 pts)
    5. `TASK-01` (100 pts)
  - **Test 13: Dual-Write Progress Log Verification**:
    Verify that calling `report_progress` writes the line to both `matchRoot/logs/` and `team-sdlc-pack/logs/`.
  - **Test 14: Self-Healing Submission Guard**:
    Verify that calling `start_work("BUG-02")` while `BUG-01` is `DONE` locally auto-submits `BUG-01` first.

#### Sync & Verification Commands:
1. `node team-orchestrator-pack/test/test-mcp-server.mjs` (target: 60+ tests passed, 0 failed).
2. `node team-orchestrator-pack/test/test-orchestrator-skills.mjs` (target: 73+ tests passed, 0 failed).
3. `node team-orchestrator-pack/scripts/check-distribution.mjs` (target: 0 errors).
4. `node team-orchestrator-pack/scripts/install.mjs --target=D:\mtm\CPL` to deploy the hardened pack to `CPL`.

---

## 4. Risk Analysis & Mitigation

| Risk | Severity | Mitigation |
| :--- | :---: | :--- |
| **Card HTML without points tag** | Low | Fallback parser assigns default `100` points if `\d+ pts` is not found, maintaining deadline and PI priority. |
| **Self-healing submit triggers on incomplete work** | Low | The guard only activates if `answers/<prev>/submit.json` exists AND explicitly has `status: "DONE"` or `"COMPLETED"`. Incomplete or in-progress tasks are never auto-submitted. |
| **Token Cost during testing** | Zero | All test suites run locally against stdio and offline HTTP mocks. Zero OpenAI/Codex API tokens consumed. |

---

## 5. Review & Approval

Please review this revised implementation plan. Upon your confirmation, we will proceed to execute the implementation across `team-orchestrator-pack`, run the offline test suites, and sync the changes to `D:\mtm\CPL`.
