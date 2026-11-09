---
name: team-orchestrator
description: Autonomous Multi-Worker Swarm Cluster Orchestrator: batch worktree provisioning, zero-cap parallel worker spawning, headless Code-First SDLC execution, and centralized atomic submission gating.
---

# Team Orchestrator Skill: Autonomous Swarm Cluster Engine (Multi-Worker Edition)

## Goal
Guide the root orchestrator (`team_orchestrator`) to autonomously coordinate a zero-cap parallel subagent swarm across isolated Git worktrees during a 40-minute MTM match. Ensure 100% compliance with Game Master rules, eliminate human intervention penalties (-50 pts), achieve zero context bloat at root (< 4,000 tokens), and maximize total score across all backlog waves.

---

## 1. Backlog Wave Prioritization Matrix (Swarm Coordination & Multi-Worker Triage)

Whenever new backlog items are discovered via `sync_cluster()`, the orchestrator triages and batches worktrees immediately:

1. **Priority 1: `PI` (Product Incident)**
   - Highest operational urgency. If an `urgentPI` appears, immediately prepare its workspace via `prepare_task_workspace({ backlogItemKey: urgentPI.key })` and spawn a dedicated worker before any other tasks.
2. **Priority 2: Expiring Countdown Deadlines**
   - Items with active closing timers (e.g. `BUG-02` with an active countdown clock) take next precedence.
3. **Priority 3: Highest Score / Points Value**
   - Higher point values: **300 pts > 250 pts > 200 pts > 150 pts > 100 pts**.
4. **Batch Worktree Allocation**:
   - For all unassigned tasks, execute batch workspace provisioning with `prepare_task_workspace({ backlogItemKeys: keys })`.

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

#### 1. Cluster State Sync (`sync_cluster`)
- Call `tools.mcp__mtm_helper__sync_cluster({ waitTimeoutMs: 15000 })`.
- Returns active radar status, list of unassigned backlog items, active workers, submitted tasks, and urgent PIs.

#### 2. Batch Worktree Preparation (`prepare_task_workspace`)
- If an urgent `urgentPI` is detected:
  - Immediately prepare its workspace: `tools.mcp__mtm_helper__prepare_task_workspace({ backlogItemKey: urgentPI.key })`.
  - Spawn worker immediately before anything else:
    `tools.spawn_agent({ agent_name: urgentPI.key, agent_type: "team_task_worker", prompt: "Resolve PI: " + urgentPI.key + " in worktree: " + res.worktreePath })`.
- For all remaining unassigned tasks:
  - **BATCH CALL**: Pass all keys simultaneously to avoid serial latency:
    `tools.mcp__mtm_helper__prepare_task_workspace({ backlogItemKeys: keys })`.
  - Returns an array of `{ backlogItemKey, worktreePath, branch, envPath, junctionCreated }`.

#### 3. Immediate Parallel Worker Spawning (`spawn_agent`)
- Iterate over each prepared workspace and spawn workers in parallel:
  ```javascript
  for (const ws of workspaces) {
    tools.spawn_agent({
      agent_name: ws.backlogItemKey,
      agent_type: "team_task_worker",
      prompt: `Execute task ${ws.backlogItemKey} in worktree ${ws.worktreePath}`
    });
  }
  ```
- **NO WORKER CAP**: Spawns are non-blocking. Never pause between spawns.

#### 4. Handling Worker Completion & Submissions
- Workers execute `submit-cli.mjs` directly in their worktree via native `exec`.
- Alternatively, if a worker requests root submission assistance, call:
  `tools.mcp__mtm_helper__submit_task({ backlogItemKey, branch, worktreePath })`.
- The centralized submission gate executes atomically under a mutex:
  - Validates `submit.json` and MVS requirements.
  - Selectively merges only non-pack changes from `src/` and `answers/<KEY>/` (never clobbering pack files).
  - Pushes to remote Git origin.
  - Emits Game Master API submission payload with Match UUID.
  - Emits dual telemetry (`SUBMITTED`, `PASSED`).
  - Tears down the worktree and cleans Git state.

---

## 3. Worker Operating Contract (Code-First SDLC in Worktree)

Each worker spawned by the orchestrator operates autonomously in its dedicated Git worktree:

1. **Workspace Boundary**:
   - Work strictly within the assigned `worktreePath`.
   - Never modify root repository files directly.

2. **Headless Execution Only (No Foreground Dev Servers)**:
   - **STRICTLY FORBIDDEN**: Running `pnpm dev`, `next dev`, or starting persistent servers in worktrees.
   - Run headless test runners (`node challenge/<KEY>-run-checks.mjs`, vitest, or jest).

3. **Autonomous SDLC Flow**:
   - **Step 1 (Read Spec)**: Read `challenge/<KEY>-*` specification, `challenge/<KEY>-minimum-verification-scenarios.md`, and `challenge/<KEY>-submit.schema.json`.
   - **Step 2 (Targeted Fix)**: Apply minimal code diffs under `src/`.
   - **Step 3 (Verify & Capture Evidence)**: Run headless checks and generate all required screenshot/report files in `answers/<KEY>/evidence/`.
   - **Step 4 (Submit via CLI)**:
     ```powershell
     node D:/mtm/CPL/team-sdlc-pack/bin/submit-cli.mjs --backlog <KEY> --branch task/<KEY> --worktree <worktreePath>
     ```
   - **Step 5 (Notify & Exit)**:
     ```javascript
     tools.send_message({ target: "/root", message: JSON.stringify({ type: "TASK_COMPLETED", backlogItemKey: "<KEY>" }) });
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
