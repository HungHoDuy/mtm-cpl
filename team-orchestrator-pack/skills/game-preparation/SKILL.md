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
   - The runtime helper automatically verifies `<matchRoot>/src/.env`, bootstrapping it from `<matchRoot>/src/.env.example` if absent (injecting PostgreSQL port 5433 credentials and a 64-character `AUTH_SECRET`).

2. **Step 2: Establish Web Portal Session**:
   - Call `login_match` to authenticate with `masterthemachine.tech`.
   - In-memory cookie jar stores session cookies for subsequent `/match/<matchId>` reads.

3. **Step 3: Initial Match State Refresh**:
   - Call `refresh_match` to verify read access to `/match/<matchId>` and discover any pre-match backlogs.

---

## 3. Deterministic Project Bootstrapping Sequence (Zero-Drift)

Before emitting the final `ENVIRONMENT_READY` telemetry event, the agent or runtime must guarantee that the cloned repository inside `matchRoot` is fully configured, built, and verified.

Execute the following sequence inside `matchRoot`:

1. **Verify Environment Configuration (`src/.env`)**:
   - Ensure `<matchRoot>/src/.env` exists and contains valid `DATABASE_URL`, `TEST_DATABASE_URL`, and `AUTH_SECRET` (minimum 32 characters).
   - If missing, the runtime helper creates it automatically during `configure_session`, or it can be copied from `.env.example` with:
     * `DATABASE_URL="postgresql://freelanceos:freelanceos_secret@127.0.0.1:5433/freelanceos?schema=public"`
     * `TEST_DATABASE_URL="postgresql://freelanceos:freelanceos_secret@127.0.0.1:5433/freelanceos_test?schema=public"`
     * `AUTH_SECRET` set to a minimum 32-character string.

2. **Generate Prisma Client Types**:
   - Run `pnpm prisma generate` inside `<matchRoot>/src`.
   - *Rationale*: Fresh Git clones do not contain generated Prisma client artifacts. Without this step, TypeScript compilation in seed scripts (`prisma/seed.ts:333`) fails strict mode typechecking (`tx` implicitly has `any` type).

3. **Compile & Build Application**:
   - Run `<matchRoot>/prepare-source.ps1` (or `pnpm build` in `<matchRoot>/src`).
   - Verifies that Next.js and TypeScript compile with zero errors (`build: PASS`).

4. **Deploy Migrations & Seed Database**:
   - Run `pnpm prisma migrate deploy` in `<matchRoot>/src`.
   - Run `pnpm db:seed` in `<matchRoot>/src`.
   - Populates database tables and initial fixture data.

5. **Execute Doctor Verification**:
   - Run `<matchRoot>/doctor.ps1`.
   - Verify output concludes with: `Environment status: READY`.
   - If `doctor.ps1` reports `NOT_READY`, inspect the reported check failure before proceeding.

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
   - `summary`: `Next.js and TypeScript compiled successfully with zero errors`

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

- **Missing Credentials**: If `LOGIN_USERNAME` or `LOGIN_PASSWORD` are missing, log `BLOCKER_OPENED` and report configuration error immediately.
- **Git Remote Unauthorized**: If `git ls-remote` exits non-zero (HTTP 401/403), log `PREPARATION_STATUS` with status `FAILED` and clear stale Windows Credential Manager tokens before retrying.
- **Path Escape**: Under no circumstances should source files be created outside `checkoutRoot` or `matchRoot`.
