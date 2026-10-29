# Engineering Implementation Plan: Company MCP Integration & Autonomous Submission Hardening

- **Session Date**: 2026-10-29
- **Target Pack**: [`team-orchestrator-pack`](file:///d:/mtm/team-orchestrator-pack) (and installed runtime in [`D:\mtm\CPL`](file:///d:/mtm/CPL))
- **Objective**: Implement automated QA fixture retrieval via the remote Company MCP Server (`/api/v1/mcp/<MATCH_ID>`), proxy `kb_search` and `get_test_data` into `mtm_helper`, configure auto-approval to prevent Git push halts, and verify zero-token offline test coverage.

---

## 1. Proposed Code Changes

### Step 1: Update `RuntimeSession` ([`runtime-session.mjs`](file:///d:/mtm/team-orchestrator-pack/src/runtime-session.mjs))
1. **Remote Company MCP Client Helper**:
   - Add method `callCompanyMcpTool(name, args)` that sends an MCP JSON-RPC 2.0 `tools/call` POST request to `${this.gameMasterUrl || 'https://masterthemachine.tech'}/api/v1/mcp/${this.matchId}` with `Authorization: Bearer ${this.apiKey}`.
2. **Auto-Ingest Fixture in `startWork(backlogItemKey)`**:
   - Immediately after writing files from `apiResult.data.files`, call `callCompanyMcpTool('get_test_data', { backlogItemKey })`.
   - If a fixture is returned, write it automatically to:
     `answers/${backlogItemKey}/evidence/${backlogItemKey.toLowerCase()}-test-data.json`.
   - If remote Company MCP is unreachable or item has no fixture, fallback to generating a compliant fixture if `seed-*.ts` exists.
3. **Knowledge Base Search Helper**:
   - Add method `searchKnowledgeBase(query)` that forwards `kb_search` to the Company MCP server and returns articles.

### Step 2: Expose New Tools in `RuntimeServer` ([`runtime-server.mjs`](file:///d:/mtm/team-orchestrator-pack/bin/runtime-server.mjs))
1. Add `get_test_data` to `TOOLS_DEFINITIONS`:
   - Inputs: `{ backlogItemKey: string }`
   - Description: Retrieves official QA fixture from the Company MCP server.
2. Add `kb_search` to `TOOLS_DEFINITIONS`:
   - Inputs: `{ query: string }`
   - Description: Searches Solova internal finance knowledge base for accounting, currency, and export standards.
3. Update `handleToolCall` to route `get_test_data` and `kb_search` to session methods.

### Step 3: Hardened Orchestrator Directives ([`team-orchestrator.toml`](file:///d:/mtm/team-orchestrator-pack/agents/team-orchestrator.toml) & [`AGENTS.md`](file:///d:/mtm/CPL/AGENTS.md))
1. Add explicit anti-pause rule:
   > *"NEVER stop to ask the user for Git push permission or submission authorization. Calling `mtm_helper.submit_work` automatically performs `git push` and submits to Game Master."*
2. Instruct agents to consult `kb_search` for accounting and export rules (e.g. `KB-EXP-01` for CSV BOM, `KB-FIN-01` for minor units).

### Step 4: Distribution & Unit Tests
1. Update [`test-mcp-server.mjs`](file:///d:/mtm/team-orchestrator-pack/test/test-mcp-server.mjs):
   - Add tests verifying `get_test_data` and `kb_search` tool definitions and proxy dispatch with mock loopback server.
   - Verify that `start_work` automatically creates `answers/<backlogId>/evidence/<backlogId_lower>-test-data.json`.
2. Reinstall updated pack into [`D:\mtm\CPL`](file:///d:/mtm/CPL).
3. Verify with `check-distribution.mjs`.

---

## 2. Verification Checklist

- [ ] `node test-mcp-server.mjs` passes 100% of unit tests.
- [ ] `node test-orchestrator-skills.mjs` passes 100% of skill checks.
- [ ] `check-distribution.mjs` confirms 0 distribution errors.
- [ ] Live probe against Match `F7A89OFT` Company MCP succeeds.

