# Technical Specification & Research: MCP Helper Component

- **Date**: 2026-10-27
- **Project**: Master The Machine (MTM) — AI Fest 2026
- **Team**: CPL (`CPL_digital_cuder`)
- **Focus**: **MCP Helper Component Only** (`bin/runtime-server.mjs` & `src/runtime-session.mjs`)
- **Status**: Decision Proposal for User Approval (No code until plan is signed off)

---

## 1. Verified Prerequisites & Identity Check

The team identity in [`team-pack-info.json`](file:///d:/mtm/team-orchestrator-pack/team-pack-info.json) has been configured:
```json
{
  "schemaVersion": 1,
  "version": "1.0.0",
  "teamId": "CPL",
  "teamName": "CPL Team"
}
```
- [x] Exactly 4 required fields present.
- [x] `teamId` matches the registered team code `CPL`.
- [x] `version` matches `package.json` and `team-runtime.json` (`1.0.0`).

---

## 2. Role & Architecture of the MCP Component

The MCP Helper acts as the **runtime execution bridge** between the Codex agent and the competition infrastructure.

```
Codex CLI (Subagent / LLM)
       │
       │ (JSON-RPC 2.0 over stdio)
       ▼
┌─────────────────────────────────────────────────────────────┐
│ bin/runtime-server.mjs (Transport & Protocol Dispatcher)     │
│ - Newline-delimited JSON-RPC framing on process.stdin/out   │
│ - Request / Response ID matching                            │
│ - Methods: initialize, tools/list, tools/call               │
│ - Strict Rule: stderr for debug logs, stdout for JSON-RPC    │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ src/runtime-session.mjs (State, Networking & Telemetry)     │
│ ├── In-Memory Store: tokens, cookies, matchUuid, paths      │
│ ├── Game Master API Client: Start work & Submit with retry   │
│ ├── Web Session Manager: /match projection & cookie auth    │
│ ├── Git Helper: auto git rev-parse HEAD & remote push check │
│ └── Progress Logger: atomic append to .progress.ndjson      │
└─────────────────────────────────────────────────────────────┘
```

### Why the MCP Helper is Mission-Critical
1. **Prevents -50 Point Penalties**: If the agent crashes or encounters unhandled JSON-RPC errors, human intervention costs -50 points. The MCP helper must be crash-proof.
2. **Eliminates Git SHA Errors**: Submissions require the full 40-character commit SHA at the root of the JSON body. If the LLM hallucinates an old SHA or submits before pushing, the Grader fails with 0 points.
3. **Automates Mandatory Telemetry**: The competition rules strictly require logging `GAME_MASTER_API (REQUESTED)` immediately before every HTTP request and `(SUCCEEDED/FAILED)` immediately after. Doing this inside the helper guarantees compliance.

---

## 3. Detailed Specification of the 7 MCP Tools

### Tool 1: `configure_session`
- **Purpose**: Initializes the in-memory session when MTM Player spawns the agent.
- **Input Schema**:
  ```json
  {
    "type": "object",
    "properties": {
      "descriptor": { "type": "object", "description": "Preparation or Game descriptor from player" },
      "modelPolicy": { "type": "object", "description": "Optional model policy rules" }
    },
    "required": ["descriptor"]
  }
  ```
- **Internal Logic**:
  1. Parses and stores `playerSessionId`, `matchId`, `matchUuid`, `teamId`, `username`, `password`, `teamBearerKey`, `progressLogFile`, `checkoutRoot`, `matchRoot`, and `allowedMatchOrigins`.
  2. Ensures target log directory exists (`team-sdlc-pack/logs/`).
  3. Validates path boundaries to ensure working directories stay within the assigned team workspace.
- **Output**: `{ "status": "CONFIGURED", "matchId": "TISTL6MV", "mode": "PREPARATION" | "GAME" }`

---

### Tool 2: `login_match`
- **Purpose**: Establishes an authenticated web session cookie on `masterthemachine.tech` so the agent can read `/match/<matchId>`.
- **Input Schema**: `{ "type": "object", "properties": {} }`
- **Internal Logic**:
  1. Uses stored `username` and `password` from the session.
  2. Submits login to the Game Master authentication handler.
  3. Captures and stores session cookies in memory.
  4. Returns a sanitized status string without printing credentials.
- **Output**: `{ "authenticated": true, "user": "CPL_digital_cuder" }`

---

### Tool 3: `refresh_match`
- **Purpose**: Fetches the live match page `/match/<matchId>` using stored session cookies to discover new backlog items and state transitions.
- **Input Schema**: `{ "type": "object", "properties": {} }`
- **Internal Logic**:
  1. Requests `https://masterthemachine.tech/match/<matchId>`.
  2. If session cookie expired (HTTP 401/403), auto-calls `login_match()` and retries once.
  3. Parses visible backlog items, their statuses (`VISIBLE`, `OPEN`, `CLOSED`), types (`TASK`, `CR`, `BUG`, `PI`), and remaining deadlines.
  4. During active match play, automatically emits `BACKLOG_STATUS (DISCOVERED)` to `<matchId>.progress.ndjson` for any newly discovered item.
- **Output**: JSON array of current backlog items with their keys, titles, types, and open/deadline statuses.

---

### Tool 4: `start_work`
- **Purpose**: Declares active work on a backlog item and retrieves the official submission template and verification scenarios.
- **Input Schema**:
  ```json
  {
    "type": "object",
    "properties": {
      "backlogItemKey": { "type": "string", "description": "Backlog item ID, e.g. TASK-01, CR-02, PI-01" }
    },
    "required": ["backlogItemKey"]
  }
  ```
- **Internal Logic**:
  1. Appends `GAME_MASTER_API (REQUESTED)` to `<matchId>.progress.ndjson`.
  2. Calls `POST /api/v1/matches/{matchUuid}/backlogs/start` with `Authorization: Bearer <TEAM_API_KEY>`.
  3. Appends `GAME_MASTER_API (SUCCEEDED)` upon response.
  4. Appends `BACKLOG_STATUS (IN_PROGRESS)` and `BACKLOG_TESTS (NOT_RUN)` to the progress log.
  5. Automatically creates answer directories:
     - `<matchRoot>/answers/<backlogItemKey>/`
     - `<matchRoot>/answers/<backlogItemKey>/evidence/`
  6. Materializes the initial `submitTemplate` into `<matchRoot>/answers/<backlogItemKey>/submit.json`.
  7. If response contains `files`, writes them out to `<matchRoot>`.
- **Output**: `{ "backlogId": "TASK-01", "submitTemplate": {...}, "minimumVerificationScenarios": {...}, "filesWritten": [...] }`

---

### Tool 5: `submit_work`
- **Purpose**: Submits the final code revision and answer template for official grading.
- **Input Schema**:
  ```json
  {
    "type": "object",
    "properties": {
      "backlogItemKey": { "type": "string", "description": "Backlog item ID" },
      "answer": { "type": "object", "description": "Optional answer payload (reads answers/<id>/submit.json if omitted)" },
      "artifactUrls": { "type": "array", "items": { "type": "string" }, "description": "Optional evidence URLs" }
    },
    "required": ["backlogItemKey"]
  }
  ```
- **Internal Logic**:
  1. **Git SHA Detection**: Executes `git rev-parse HEAD` in `checkoutRoot` to read the exact 40-character commit hash.
  2. **Push Verification**: Runs `git status --porcelain` and checks if local HEAD is pushed to `origin/<branch>`. If not pushed, issues a Git push.
  3. Resolves `answer` (from parameter or reading `<matchRoot>/answers/<backlogItemKey>/submit.json`).
  4. Generates an `Idempotency-Key` (UUID) and `clientSubmissionId` (UUID).
  5. Appends `GAME_MASTER_API (REQUESTED)` to the progress log.
  6. Calls `POST /api/v1/matches/{matchUuid}/submissions` with `gitRevision` placed at the root of the JSON body.
  7. If network drops or times out, safely retries with the **exact same `Idempotency-Key` and body**.
  8. Appends `GAME_MASTER_API (SUCCEEDED)` and `BACKLOG_STATUS (SUBMITTED)` containing the official `receiptId` and `revision` SHA.
- **Output**: `{ "receiptId": "...", "status": "ACCEPTED", "scoreStatus": "PENDING", "gitRevision": "..." }`

---

### Tool 6: `report_progress`
- **Purpose**: Appends custom progress events (`PREPARATION_STATUS`, `ENVIRONMENT_READY`, `BACKLOG_TESTS`, `BLOCKER_OPENED`, etc.) to the progress log.
- **Input Schema**:
  ```json
  {
    "type": "object",
    "properties": {
      "type": { "type": "string", "description": "Event type from schema" },
      "stage": { "type": "string" },
      "status": { "type": "string" },
      "summary": { "type": "string" },
      "extra": { "type": "object" }
    },
    "required": ["type", "summary"]
  }
  ```
- **Internal Logic**:
  1. Merges `schemaVersion: 1` and `playerSessionId: session.playerSessionId`.
  2. Validates against schema definitions (no missing required fields).
  3. Appends a single line (JSON + newline UTF-8) to `progressLogFile`.
- **Output**: `{ "logged": true, "type": "ENVIRONMENT_READY" }`

---

### Tool 7: `wait_for_update`
- **Purpose**: Allows Codex to enter a bounded sleep loop waiting for new backlog waves without burning tokens or exiting.
- **Input Schema**:
  ```json
  {
    "type": "object",
    "properties": {
      "timeoutMs": { "type": "integer", "maximum": 55000, "default": 30000 }
    }
  }
  ```
- **Internal Logic**:
  1. Polls `/match/<matchId>` periodically (or waits for `timeoutMs`).
  2. Returns immediately if new backlog items appear or if an item status changes.
  3. Returns `{ "changed": false, "timedOut": true }` if no changes occur within the timeout.
- **Output**: `{ "changed": true, "newItems": ["PI-01"] }`

---

## 4. Architectural Trade-Offs & Decisions for MCP

### Decision Point 1: Dependency Strategy
- **Option A (Recommended)**: **Pure Node.js Standard Library (0 Dependencies)**
  - Uses `node:http`, `node:https`, `node:crypto`, `node:child_process`, `node:fs`, `node:readline`.
  - **Pros**: 0 npm installs, 0 risk of missing packages on competition day, instant startup, ~30MB memory.
  - **Cons**: Write basic JSON-RPC framing (~60 lines).
- **Option B**: Official `@modelcontextprotocol/sdk` via NPM.
  - **Pros**: Standard SDK classes.
  - **Cons**: Adds `node_modules` dependency; guide advises against external dependencies.

### Decision Point 2: Git SHA & Push Automation
- **Option A (Recommended)**: **Fully Automated in `submit_work`**
  - Helper inspects `git rev-parse HEAD` and checks remote push status automatically.
  - **Pros**: Prevents human/LLM SHA hallucinations, eliminates risk of submitting unpushed code.
  - **Cons**: Requires helper to execute `git` child process.
- **Option B**: Manual LLM Git Handling
  - Agent must run `git log`, copy string, and pass `gitRevision`.
  - **Pros**: Simpler helper logic.
  - **Cons**: High risk of hallucinated or truncated SHAs causing 0 points.

### Decision Point 3: Dual-Auth Handling (Cookies vs. Bearer)
- **Option A (Recommended)**: **In-Memory Cookie Jar + Bearer Client in Helper**
  - Helper stores session cookie for `/match` page reads and Bearer token for Start/Submit API.
  - Auto-refreshes cookie if session expires.
  - **Pros**: Agent never deals with cookie headers or web auth; tokens never leak to disk.
  - **Cons**: Requires basic cookie extraction logic in Node.js.
- **Option B**: Pass Bearer token only, ignore web session.
  - **Pros**: Simpler networking.
  - **Cons**: Cannot inspect `/match/<matchId>` or discover unannounced backlog waves.

### Decision Point 4: Telemetry Responsibility
- **Option A (Recommended)**: **Automated Pre/Post Logging in Helper**
  - Helper automatically writes `GAME_MASTER_API (REQUESTED)` before network calls and `(SUCCEEDED/FAILED)` after.
  - **Pros**: Guarantees 100% compliance with contest logging rules without wasting agent turns.
  - **Cons**: Helper handles log file I/O directly.
- **Option B**: Require Agent to explicitly call `report_progress` before and after every API call.
  - **Pros**: Helper does fewer background tasks.
  - **Cons**: Agent will occasionally forget to log `REQUESTED` before `SUCCEEDED`, causing telemetry violations.

---

## 5. Summary Decision Table for User Approval

| # | Feature / Area | Proposed Design | Your Approval |
| :---: | :--- | :--- | :---: |
| **1** | **Dependencies** | Pure Node.js Built-ins (0 npm dependencies) | [x] Approved |
| **2** | **Git Automation** | Automatic `git rev-parse HEAD` & push verification inside `submit_work` | [x] Approved |
| **3** | **Auth Architecture**| In-memory dual client (Cookie jar for web session + Bearer token for REST) | [x] Approved |
| **4** | **Telemetry Logging**| Automated pre/post `GAME_MASTER_API` & `BACKLOG_STATUS` logging inside helper | [x] Approved |
| **5** | **Tool Suite** | The 7 tools specified above (`configure_session`, `login_match`, `refresh_match`, `start_work`, `submit_work`, `report_progress`, `wait_for_update`) | [x] Approved |

---

## 6. Next Steps (Upon Approval)

1. Review and approve the 5 decision points above.
2. We will generate the formal **Implementation Plan artifact**.
3. Upon plan approval, we will implement `src/runtime-session.mjs` and `bin/runtime-server.mjs`.

