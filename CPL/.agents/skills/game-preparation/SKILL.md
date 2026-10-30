---
name: game-preparation
description: Pre-match environment verification, git remote check, session bootstrap, and readiness telemetry for MTM Player.
---

# Game Preparation Skill (Extreme Speed Edition)

## Goal
Verify and bootstrap the execution environment before an MTM match begins within **< 90 seconds**. Establish authenticated connectivity to the Game Master portal and Git remote, bootstrap dependencies, pre-start the background dev server, cache authenticated browser session tokens (`storageState.json`), and log official readiness telemetry.

---

## 1. Pre-Flight Verification Checklist

Before signaling readiness to MTM Player, verify the following baseline prerequisites:

1. **Runtime & Toolchain**:
   - Node.js runtime is available (`node -v >= 18`).
   - Git CLI is available (`git --version`).
   - Package manager is available (`pnpm --version`).
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
   - The runtime helper automatically verifies `<matchRoot>/src/.env`, bootstrapping it from `<matchRoot>/src/.env.example` if absent (injecting PostgreSQL port 5433 credentials and a 64-character `AUTH_SECRET`).

2. **Step 2: Establish Web Portal Session**:
   - Call `login_match` to authenticate with `masterthemachine.tech`.
   - In-memory cookie jar stores session cookies for subsequent `/match/<matchId>` reads.

3. **Step 3: Initial Match State Refresh**:
   - Call `refresh_match` to verify read access to `/match/<matchId>` and discover any pre-match backlogs.

---

## 3. High-Speed Project Bootstrapping Sequence (~45 Seconds Total)

> [!IMPORTANT]
> **DO NOT run `pnpm build` during preparation!**
> Full production builds burn 114+ seconds and incur severe polling overhead. Build health is verified via `pnpm typecheck` (~8 seconds).

Execute the following sequence inside `<matchRoot>/src`:

1. **Verify Environment Configuration (`src/.env`)**:
   - Ensure `<matchRoot>/src/.env` exists. If missing, the runtime helper creates it automatically during `configure_session`.

2. **Database & Type Generation (~12 seconds)**:
   ```powershell
   Set-Location '<matchRoot>/src'
   pnpm prisma generate
   pnpm prisma migrate deploy
   pnpm db:seed
   pnpm typecheck
   ```
   *Rationale*: Generates Prisma client types, migrates PostgreSQL tables, seeds default administrative users, and verifies strict TypeScript compilation with zero errors.

3. **Detach Background Dev Server (~2 seconds)**:
   - **NEVER** run `pnpm dev` in the foreground of a tool call.
   - Launch Next.js via a detached background process with output redirected to `logs/`:
     ```powershell
     Set-Location '<matchRoot>/src'
     Start-Process pnpm -ArgumentList "dev" -RedirectStandardOutput "..\logs\dev.log" -RedirectStandardError "..\logs\dev-err.log"
     ```
   - Verify dev server readiness in one fast check:
     ```powershell
     node team-sdlc-pack/scripts/evidence-runner.mjs check-server --url http://127.0.0.1:3000
     ```

4. **Pre-Authenticate & Cache Session State (~5 seconds)**:
   - Generate `storageState.json` so all subsequent test runs and screenshot captures are pre-authenticated without hitting `/login`:
     ```powershell
     node team-sdlc-pack/scripts/evidence-runner.mjs auth-init --url http://127.0.0.1:3000 --output '<matchRoot>/storageState.json'
     ```

---

## 4. Mandatory Telemetry Logging

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
   - `summary`: `Prisma generate, migrations, seed, and environment verified`

4. **Source Build Completed**:
   - `type`: `PREPARATION_STATUS`
   - `stage`: `BUILD`
   - `status`: `COMPLETED`
   - `summary`: `Next.js typecheck passed with zero errors (fast build gate)`

5. **Match Portal Session Verified**:
   - `type`: `PREPARATION_STATUS`
   - `stage`: `MATCH_LOGIN`
   - `status`: `COMPLETED`
   - `summary`: `Match login and assigned match page access verified`

6. **Environment Ready (Final Gate)**:
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

## 5. Error Handling & Guardrails

- **Port 3000 Conflicts**: If port 3000 is occupied by an earlier match, kill the stale process using `Get-Process node | Stop-Process -Force` before launching `pnpm dev`.
- **Missing Credentials**: If `LOGIN_USERNAME` or `LOGIN_PASSWORD` are missing, log `BLOCKER_OPENED` and report configuration error immediately.
- **Git Remote Unauthorized**: If `git ls-remote` exits non-zero (HTTP 401/403), log `PREPARATION_STATUS` with status `FAILED` and clear stale Windows Credential Manager tokens before retrying.
