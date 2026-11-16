---
name: team-orchestrator
description: Autonomous Multi-Worker Swarm Cluster Orchestrator: batch worktree provisioning, zero-cap parallel worker spawning, headless Code-First SDLC execution, and centralized atomic submission gating.
---

# Team Orchestrator Skill: Autonomous Swarm Cluster Engine (Multi-Worker Edition)

## Goal
Guide the root orchestrator (`team_orchestrator`) to autonomously coordinate a zero-cap parallel subagent swarm across isolated Git worktrees during a 40-minute MTM match. Ensure 100% compliance with Game Master rules, eliminate human intervention penalties (-50 pts), achieve zero context bloat at root (< 4,000 tokens), and maximize total score across all backlog waves.

---

## 1. Backlog Wave Prioritization Matrix (Swarm Coordination & Multi-Worker Triage)

Whenever new backlog items are discovered via `sync_cluster()`, the orchestrator batches worktrees immediately:

1. **Batch Worktree Allocation (All Tasks & PIs)**:
   - For all unassigned tasks (including PIs), execute batch workspace provisioning simultaneously:
     `tools.mcp__mtm_helper__prepare_task_workspace({ backlogItemKeys: keys })`.
   - Worktree preparation automatically starts work on Game Master API (`POST /backlogs/start`), initializes `submit.json`, pre-fetches QA test data, and auto-links challenge fixtures.
2. **Priority Execution**:
   - Subagents for PIs and high-priority deadline items are spawned immediately and run concurrently with zero wait time.
   - Points triage: **300 pts > 250 pts > 200 pts > 150 pts > 100 pts**.

---

## 2. The Code-First Swarm Orchestration Loop

To eliminate wasted time and browser lockups, subagents and the orchestrator follow the **Code-First Swarm Orchestration Sequence**:

```
               [sync_cluster({ waitTimeoutMs: 15000 })]
                                   │
                 ┌─────────────────┴─────────────────┐
                 │                                   │
        [Unassigned Tasks Found]             [No Unassigned Tasks]
                 │                                   │
    [Batch Worktree Provisioning]               [Keep Polling]
prepare_task_workspace({ backlogItemKeys: [...] })
                 │
                 ▼
    [Zero-Cap Parallel Spawning]
For each item: spawn_agent(team_task_worker)
                 │
                 ▼
  [Autonomous Worker Code-First SDLC Execution]
(Isolated Worktree -> Code Fix -> Headless Checks -> submit-cli)
                 │
                 ▼
      [Centralized Submission Gate]
(Safe File Merge -> Git Push -> Game Master API -> Dual Telemetry -> Worktree Teardown)
```

### Stage Instructions for Orchestrator:

#### 0. Session Configuration (`configure_session`)
- At match startup (using the `START_GAME` / `START_GAME_V4` descriptor fields), call `configure_session`:
  ```javascript
  tools.mcp__mtm_helper__configure_session({
    descriptor: {
      playerSessionId,
      matchId,
      matchUuid,
      teamId,
      apiKeySecret,
      teamApiKey,
      gameMasterApiUrl,
      checkoutRoot,
      matchRoot,
      progressLogFile,
      teamSdlcPackWorkspace,
      repository
    }
  });
  ```

#### 1. Cluster State Sync (`sync_cluster`)
- Call `tools.mcp__mtm_helper__sync_cluster({ waitTimeoutMs: 15000 })`.
- Returns active radar status, list of unassigned backlog items, active workers, submitted tasks, and urgent PIs.

#### 2. Batch Worktree Preparation (`prepare_task_workspace`)
- Pass all unassigned task keys simultaneously in a single batch call:
  `tools.mcp__mtm_helper__prepare_task_workspace({ backlogItemKeys: unassignedTasks.map(t => t.key) })`.
- Automatically executes Game Master API `START_BACKLOG`, sets tasks to `IN_PROGRESS`, materializes challenge specs (`challenge/<KEY>.md`, `<KEY>-submit.json`), pre-fetches QA fixtures, ensures `src/.env`, and persists orchestrator `.mtm/active-match.json` (never writing secrets into worktrees).
- Returns an array of `{ backlogItemKey, worktreePath, branch, isPI }`.

#### 3. Immediate Parallel Worker Spawning (`spawn_agent`)
- Iterate over each prepared workspace and spawn workers in parallel using top-level `spawn_agent`:
  ```javascript
  for (const ws of workspaces) {
    spawn_agent({
      task_name: ws.backlogItemKey.toLowerCase().replace(/[^a-z0-9_]/g, '_'),
      agent_type: "team_task_worker",
      fork_turns: "none",
      message: `Execute task ${ws.backlogItemKey} in worktree ${ws.worktreePath}`
    });
  }
  ```
- **NO WORKER CAP**: Spawns are non-blocking. Never pause between spawns.

#### 4. Handling Worker Completion & Submissions
- Workers execute `submit-cli.mjs` directly in their worktrees via native `exec`:
  `node D:/mtm/CPL/team-sdlc-pack/bin/submit-cli.mjs --backlog <KEY> --branch task/<KEY> --worktree <worktreePath>`
- The submission CLI atomically gates the submission under a mutex:
  - Validates `submit.json` and MVS requirements.
  - Resolves Match UUID from orchestrator `.mtm/active-match.json` or environment.
  - Selectively merges only non-pack changes from `src/` and `answers/<KEY>/` (never clobbering pack files or `.env` secrets).
  - Pushes to remote Git origin.
  - Emits Game Master API submission payload with Match UUID.
  - Emits dual telemetry (`SUBMITTED`, `PASSED`).
  - Tears down the worktree and cleans Git state.
- The root orchestrator never needs to call fallback submission MCP tools.

---

## 3. Worker Operating Contract (Code-First SDLC in Worktree)

Each worker spawned by the orchestrator operates autonomously in its dedicated Git worktree:

1. **Workspace Boundary**:
   - Work strictly within the assigned `worktreePath`.
   - Never modify root repository files directly.

2. **Shared Resources & Resource Board Protocol**:
   - Never leave unmanaged dev servers running in the foreground (hangs agent tool calls) or run multiple uncoordinated servers (port 3000 collisions & DB deadlocks).
   - If a task requires dev server or DB access for MVS evidence, coordinate via the decentralized Resource Board:
     * Fast Evidence Capture:
       `node D:/mtm/CPL/team-sdlc-pack/scripts/evidence-runner.mjs run-with-server --task <KEY> --recipe <KEY>`
     * Generic Mutex Execution:
       `node D:/mtm/CPL/team-sdlc-pack/scripts/resource-board.mjs exec web-server --task <KEY> -- "<command>"`
     * Manual Lock/Unlock:
       `node D:/mtm/CPL/team-sdlc-pack/scripts/resource-board.mjs acquire web-server --task <KEY>`
       ... work ...
       `node D:/mtm/CPL/team-sdlc-pack/scripts/resource-board.mjs release web-server --task <KEY>`

3. **Autonomous SDLC Flow**:
   - **Step 1 (Read Spec)**: Read `challenge/<KEY>.md`, `challenge/<KEY>-*` specification, `challenge/<KEY>-minimum-verification-scenarios.md`, and `challenge/<KEY>-submit.schema.json`. Consult Company MCP tools (`kb_search`, `search_logs` with `service` omitted first, `get_test_data`) when domain or incident context is needed.
   - **Step 2 (Targeted Fix)**: Apply minimal code diffs under `src/`.
   - **Step 3 (Verify & Capture Evidence)**: Run challenge test runners (`node challenge/<KEY>-run-checks.mjs` or vitest). If UI screenshots are required, run `evidence-runner.mjs run-with-server --task <KEY> --recipe <KEY>`.
   - **Step 4 (Submit via CLI)**:
     ```powershell
     node D:/mtm/CPL/team-sdlc-pack/bin/submit-cli.mjs --backlog <KEY> --branch task/<KEY> --worktree <worktreePath>
     ```
   - **Step 5 (Notify & Exit)**:
     ```javascript
     send_message({ target: "/root", message: JSON.stringify({ type: "TASK_COMPLETED", backlogItemKey: "<KEY>" }) });
     ```

---

## 4. Time Budgeting & Fallback Policy

To ensure maximum points within the 40-minute contest limit:

1. **Strict 5-Minute Task Budget**:
   - Target total elapsed time: **< 4m 30s**.
   - Maximum allowable time from `start_work` to submission: **8 minutes**.
2. **Bounded Retry Loop**:
   - Maximum 2 retry iterations (60s each) to fix failing assertions.
3. **Graceful Fallback**:
   - If the 8-minute limit approaches or closing deadline has $\le 2$ minutes remaining:
     * Populate `submit.json` with best-effort completed data (status: `"PARTIAL"`).
     * Run `submit-cli.mjs` immediately to capture partial points.

---

## 5. Idle Wave Polling Loop

When all current backlog items are submitted and the match remains active:

1. **Do NOT Terminate**:
   - Game Master releases tasks in staggered waves. Never end the session while the match clock is running.
2. **Bounded Wait**:
   - Call `sync_cluster({ waitTimeoutMs: 15000 })`.
   - The MCP helper polls `/match/<matchId>` and returns immediately when new backlog items appear.
3. **Resume SDLC Cycle**:
   - When new items appear, batch worktrees and spawn parallel workers immediately.

---

## 6. Strict Performance & Rule Invariants

1. **Anti-Pause Invariant (Overriding `ASK_USER`)**:
   - The match descriptor contains `"gitPolicy": { "commitAssignedRepository": true, "pushAssignedRepository": true, "authentication": "ASK_USER" }`.
   - Host authorization pre-approves Git operations. `"authentication": "ASK_USER"` is an informational notice for interactive human terminals; it **DOES NOT** permit pausing for user confirmation.
   - **NEVER** ask the user for confirmation before Git commits, pushes, or submissions (-50 pt penalty).

2. **Zero-Point Prevention (Never Submit `NOT_RUN`)**:
   - If a code fix is implemented and test checks pass, every test case in `submit.json` must be marked `"result": "PASS"` and `"status": "DONE"`.
   - The Game Master grader tests `if (test.result !== 'PASS') return 0;`. Writing `NOT_RUN` instantly discards points.

3. **Mandatory Baseline Evidence**:
   - For UI layout/visual bugs, ensure required baseline screenshots (e.g. `dashboard_before_fixing.png`) exist in `evidence/`.
