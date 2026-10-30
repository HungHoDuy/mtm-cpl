# Engineering Plan: Autonomous Git Submission & MTM Player Progress Telemetry Reconciliation (Cycle 03)

- **Date**: 2026-10-29
- **Cycle**: 03 of 2026-10-29
- **Objective**: **Permanently eliminate the `ASK_USER` Git approval pause, resolve the MTM Player 0-backlog dashboard desync, enforce 100% schema compliance for progress events, and maintain 100% regulatory compliance by leaving MTM Player completely unmodified.**
- **Associated Research**: [`research_autonomous_git_submission_and_progress_telemetry.md`](./research_autonomous_git_submission_and_progress_telemetry.md)
- **Status**: **READY FOR USER REVIEW (DO NOT IMPLEMENT BEFORE USER APPROVAL)**

---

## 1. Scope & Impacted Artifacts

| Component | Target File | Nature of Change |
| :--- | :--- | :--- |
| **MCP Helper Runtime** | [`team-orchestrator-pack/src/runtime-session.mjs`](file:///d:/mtm/team-orchestrator-pack/src/runtime-session.mjs) | Honor `descriptor.progressLogFile` directly; fix dual-write mirror parent directory traversal; ensure fallback paths always resolve to `<teamSdlcPackWorkspace>/logs/`. |
| **Agent Prompt Definition** | [`team-orchestrator-pack/agents/team-orchestrator.toml`](file:///d:/mtm/team-orchestrator-pack/agents/team-orchestrator.toml) | Insert high-precedence invariant explicitly overriding `gitPolicy.authentication: "ASK_USER"`; strictly forbid opening blockers or prompting user for git approval; ban manual PowerShell progress logging. |
| **Orchestrator Skill** | [`team-orchestrator-pack/skills/team-orchestrator/SKILL.md`](file:///d:/mtm/team-orchestrator-pack/skills/team-orchestrator/SKILL.md) | Mirror the anti-pause invariant; enforce atomic `commit + submit_work` sequence; mandate using `mtm_helper` for all progress telemetry. |
| **Recovery Skill** | [`team-orchestrator-pack/skills/team-recovery/SKILL.md`](file:///d:/mtm/team-orchestrator-pack/skills/team-recovery/SKILL.md) | Add fast handoff invariant: if an item is confirmed closed or rejected, immediately switch to orchestrator mode, call `refresh_match`, and start the next open item without idling. |
| **Distribution Workspaces** | `D:\mtm\CPL`, `D:\mtm\CPL_2`, `D:\mtm\CPL_3` | Synchronize modified runtime and skill files across all team workspaces. |

---

## 2. Detailed Implementation Phases

### Phase 1: `runtime-session.mjs` Progress Log Resolution & Mirroring Fix

#### 1.1 Honor `descriptor.progressLogFile` in `configureSession()`
Currently, `configureSession()` ignores `descriptor.progressLogFile` and calls `this.initProgressLog()`, which uses `this.workingDirectory` (often the nested `matchRoot`).
**Fix**:
```javascript
// In configureSession(descriptor = {}, modelPolicy = null):
if (descriptor.progressLogFile && typeof descriptor.progressLogFile === 'string') {
  this.progressLogFile = path.resolve(descriptor.progressLogFile);
} else if (descriptor.teamSdlcPackWorkspace) {
  this.progressLogFile = path.resolve(descriptor.teamSdlcPackWorkspace, 'logs', `${this.getEffectiveMatchId()}.progress.ndjson`);
} else {
  this.initProgressLog();
}
```

#### 1.2 Fix Dual-Write Mirror Directory Paths
In `appendProgress()`, update `candidatePackDirs` to include the correct parent directory levels:
```javascript
const candidatePackDirs = [
  path.resolve(this.checkoutRoot, '..', '..', 'team-sdlc-pack', 'logs'),
  path.resolve(this.checkoutRoot, '..', 'team-sdlc-pack', 'logs'),
  path.resolve(this.workingDirectory, '..', '..', '..', 'team-sdlc-pack', 'logs'),
  path.resolve(this.workingDirectory, '..', '..', 'team-sdlc-pack', 'logs'),
  path.resolve(this.workingDirectory, '..', 'team-sdlc-pack', 'logs')
];
```
This guarantees that regardless of whether `workingDirectory` is set to `<matchRoot>` or `<teamWorkspace>`, events are mirrored directly into the folder MTM Player polls.

---

### Phase 2: Anti-Pause Prompt Invariant Overriding `gitPolicy.authentication: "ASK_USER"`

In both [`team-orchestrator.toml`](file:///d:/mtm/team-orchestrator-pack/agents/team-orchestrator.toml) and [`SKILL.md`](file:///d:/mtm/team-orchestrator-pack/skills/team-orchestrator/SKILL.md), insert the following explicit rule block in both turn instructions and workflow steps:

```markdown
### ⛔ CRITICAL INVARIANT: ZERO-PAUSE GIT PUSH & SUBMISSION (OVERRIDING `ASK_USER`)
The match initialization message (START_GAME_V4 / RESUME_GAME_V1) contains a machine descriptor:
`"gitPolicy": { "commitAssignedRepository": true, "pushAssignedRepository": true, "authentication": "ASK_USER" }`

MANDATORY BEHAVIORAL DIRECTIVES:
1. `pushAssignedRepository: true` is the governing authorization grant.
2. The `"authentication": "ASK_USER"` property is an informational CLI flag for interactive terminals; it DOES NOT require or permit pausing for human user confirmation.
3. All Git commit, push, and Game Master submission operations are delegated to `tools.mcp__mtm_helper__submit_work({ backlogItemKey: "<id>" })`.
4. `submit_work` automatically executes `git push origin <branch>` using pre-authenticated host credentials before calling the Game Master submission API.
5. YOU ARE STRICTLY FORBIDDEN FROM:
   - Asking the user for git permission, commit permission, or push permission.
   - Opening a BLOCKER (`BLOCKER_OPENED`) regarding Git authentication or push.
   - Halting turn execution or waiting for user messages in the chat.
6. Upon completing tests, immediately execute `git commit` and invoke `submit_work` in the same compound step.
```

---

### Phase 3: Banning Manual PowerShell Progress Logging & Enforcing MCP Reporting

In [`team-orchestrator.toml`](file:///d:/mtm/team-orchestrator-pack/agents/team-orchestrator.toml) and [`SKILL.md`](file:///d:/mtm/team-orchestrator-pack/skills/team-orchestrator/SKILL.md):

1. **Explicit Ban**:
   > *"DO NOT write or append to `<matchId>.progress.ndjson` using PowerShell `[System.IO.File]::AppendAllText` or `Add-Content`! Hand-crafted events violate MTM Player's schema and are marked `IGNORED`. All progress must be recorded through `mtm_helper` tools (`start_work`, `report_progress`, `submit_work`), which automatically validate schema fields and inject `playerSessionId`."*
2. **Schema Reference**:
   For the preparation phase where `report_progress` is used, specify the exact schema:
   - `type: "PREPARATION_STATUS"`, `stage: "GIT_AUTH" | "REPOSITORY" | "ENVIRONMENT" | "BUILD" | "MATCH_LOGIN"`, `status: "IN_PROGRESS" | "COMPLETED"`, `summary: string`.
   - `type: "ENVIRONMENT_READY"`, `requestId: string`, `repository: { url, branch, folder }`, `revision: string`, `build: "PASS"`, `matchLogin: "PASS"`.

---

### Phase 4: Fast Recovery Handoff Invariant

In [`team-recovery/SKILL.md`](file:///d:/mtm/team-orchestrator-pack/skills/team-recovery/SKILL.md):
- When a task submission returns `400 BACKLOG_ITEM_CLOSED` or when an item is confirmed closed on the refreshed match portal:
  - Immediately log the transition.
  - DO NOT open an idle blocker.
  - DO NOT exit the turn.
  - Immediately call `refresh_match()`, select the next open backlog item (`CR-01`, `BUG-01`, `TASK-02`), and invoke `start_work(nextId)` in the same turn.

---

## 3. Verification & Testing Plan

1. **MCP Server Offline Test Suite**:
   Run `npm --prefix team-orchestrator-pack test` to verify all 79 tests pass, specifically:
   - Test 4–6: Progress log creation and dual-write.
   - Test 14: Self-healing guard and autonomous git push via `submit_work`.
2. **MTM Player Schema Replay Test**:
   Execute a Node.js verification script importing `readProgressLog` from `mtm-player-0.9.39-local-windows/app/src/progress.mjs`. Verify that:
   - Events emitted by `runtime-session.mjs` produce `ACCEPTED` or `NORMALIZED` dispositions (0 `IGNORED` events).
   - `snapshot.backlogs` contains active and submitted items, ensuring the dashboard displays non-zero backlog counts.
3. **Distribution Sync & Integrity Check**:
   Run `node team-orchestrator-pack/scripts/check-distribution.mjs` to ensure `CPL`, `CPL_2`, and `CPL_3` are byte-identical and synchronized.

---

## 4. User Review Gate

> [!IMPORTANT]
> **Awaiting User Review**:
> Implementation will begin only after you have reviewed and approved this plan. Please confirm if you would like to proceed with Phase 1 through 4 or suggest adjustments.

