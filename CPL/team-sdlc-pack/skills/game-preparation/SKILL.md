---
name: game-preparation
description: Pre-match environment verification, git remote check, session bootstrap, and readiness telemetry for MTM Player.
---

# Game Preparation Skill

## Goal
Verify and bootstrap the execution environment before an MTM match begins. Establish authenticated connectivity to the Game Master portal and Git remote, verify workspace paths, and log official readiness telemetry.

---

## 1. Pre-Flight Verification Checklist

Before signaling readiness to MTM Player, verify the following baseline prerequisites:

1. **Runtime & Toolchain**:
   - Node.js runtime is available (`node -v >= 18`).
   - Git CLI is available (`git --version`).
   - Standard build tools for the target stack are functional.
2. **Directory & Workspace Boundaries**:
   - `checkoutRoot` is resolved (contains local Git repository).
   - `matchRoot` subfolder is identified. All application code editing and answers must stay strictly inside `matchRoot`.
3. **Git Remote Connectivity**:
   - Assigned remote URL matches `TEAM_REPO_URL` (e.g. `https://github.com/lqdung863/mtm-cpl`).
   - Run `git ls-remote origin` to verify credentials against remote without prompting.

---

## 2. Session Initialization Sequence

Execute the following sequence using the MCP tools:

1. **Step 1: Configure Session**:
   - Call `configure_session` with the match descriptor provided by MTM Player:
     ```json
     {
       "descriptor": {
         "playerSessionId": "<playerSessionId>",
         "matchId": "<matchId>",
         "matchUuid": "<matchUuid>",
         "teamId": "CPL",
         "teamApiKey": "<teamApiKey>",
         "checkoutRoot": "<checkoutRoot>",
         "repository": {
           "branch": "<branch>",
           "folder": "<folder>"
         }
       }
     }
     ```
   - Confirms that the session is active and NDJSON progress logging is initialized.

2. **Step 2: Establish Web Portal Session**:
   - Call `login_match` to authenticate with `masterthemachine.tech`.
   - In-memory cookie jar stores session cookies for subsequent `/match/<matchId>` reads.

3. **Step 3: Initial Match State Refresh**:
   - Call `refresh_match` to verify read access to `/match/<matchId>` and discover any pre-match backlogs.

---

## 3. Mandatory Telemetry Logging

Append official progress events conforming to `contracts/progress-event.schema.json` via `report_progress`:

1. **Git Authentication Verified**:
   - `type`: `PREPARATION_STATUS`
   - `stage`: `GIT_AUTH`
   - `status`: `COMPLETED`
   - `summary`: `Git credentials verified against remote repository`

2. **Repository & Workspace Ready**:
   - `type`: `PREPARATION_STATUS`
   - `stage`: `REPOSITORY`
   - `status`: `COMPLETED`
   - `summary`: `Repository checked out, branch and matchRoot confirmed`

3. **Runtime & Environment Initialized**:
   - `type`: `PREPARATION_STATUS`
   - `stage`: `ENVIRONMENT`
   - `status`: `COMPLETED`
   - `summary`: `Codex CLI and MCP runtime helper initialized in workspace`

4. **Environment Ready (Final Gate)**:
   - `type`: `ENVIRONMENT_READY`
   - `requestId`: `<uuid>`
   - `repository`:
     - `url`: `<repository.url>` (e.g. `https://github.com/lqdung863/mtm-cpl`)
     - `branch`: `<repository.branch>` (e.g. `main`)
     - `folder`: `<repository.folder>` (e.g. `TISTL6MV`)
   - `revision`: `<40-char-git-sha>`
   - `build`: `PASS`
   - `matchLogin`: `PASS`
   *(Note: ENVIRONMENT_READY strictly forbids `summary` under `additionalProperties: false`)*

---

## 4. Error Handling & Guardrails

- **Missing Credentials**: If `LOGIN_USERNAME` or `LOGIN_PASSWORD` are missing, log `BLOCKER_OPENED` and report configuration error immediately.
- **Git Remote Unauthorized**: If `git ls-remote` exits non-zero (HTTP 401/403), log `PREPARATION_STATUS` with status `FAILED` and clear stale Windows Credential Manager tokens before retrying.
- **Path Escape**: Under no circumstances should source files be created outside `checkoutRoot` or `matchRoot`.
