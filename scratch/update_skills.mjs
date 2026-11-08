import fs from 'fs';

const updatedSection = `## 2. Balanced SDLC Loop: Urgent PI Preemption vs. Verified Backlog Engineering

> [!IMPORTANT]
> **Contest Submission Invariant: Submissions are Single-Shot and Final!**
> On Game Master Server, once a backlog item is submitted and accepted, **replacement submissions are strictly rejected with \`HTTP 409 ALREADY_SUBMITTED\`**.
> - **For Production Incidents (\`PI\`)**: Extreme speed is critical and fully handled by autonomous radar preemption + pre-crawled logs (solve in 1–2 turns).
> - **For Standard Backlog Items (\`BUG\`, \`CR\`, \`TASK\`)**: Speed must never compromise correctness (~4–5 minutes per item is optimal in a 40-minute match). Never submit blind! Always inspect evidence before calling \`submit_work\`.

---

### A. Workflow for Production Incidents (\`PI-01\`, etc.)
1. **Radar Auto-Preemption**: When \`.URGENT_PI_LOCK\` appears or any tool returns \`URGENT_ALERT\`, immediately call \`get_next_task()\`.
2. All incident logs are pre-crawled into \`answers/<PI>/evidence/\`.
3. Inspect the logs, identify root cause, write \`submit.json\`, and call \`submit_work()\`.
4. Radar automatically resumes your suspended task with zero turn latency.

---

### B. Workflow for Standard Backlog Items (\`BUG\`, \`CR\`, \`TASK\`)

Follow the **Robust 4-Turn Verified Loop**:

\`\`\`
[Turn 1: Discovery & Planning]
       │  • Call get_next_task()
       │  • Read challenge/<id>-minimum-verification-scenarios.md
       │  • Map exact required evidence files, statuses (e.g. PARTIAL, SENT), and data values
       ▼
[Turn 2: Targeted Implementation & Unit Tests]
       │  • Apply targeted code fix in src/ via edit_file
       │  • Run pnpm test / vitest: ensure zero failures and ≥ 13 tests pass
       ▼
[Turn 3: Fixture Execution, UI Capture & Report Generation]
       │  • Run seed script & Playwright capture.mjs using enhanced capture-client.mjs
       │  • Run challenge report script (e.g. prisma/report-<id>.ts) to produce report file
       │  • ⚠️ DO NOT CALL submit_work IN THIS TURN!
       ▼
[Turn 4: MANDATORY Pre-Submission Evidence Verification Gate & Submit]
       │  • Read the generated report on disk (currency-report.txt, layout-report.json, etc.)
       │  • Verify all fields, amounts, and statuses match the MVS requirements!
       │  • If any field is missing or 0: fix script/data BEFORE submitting!
       │  • When 100% verified: call submit_work({ backlogItemKey: "<id>", status: "DONE" })
\`\`\`

---

### Detailed Stage Instructions:

#### Stage 1: Get Next Task & Requirement Mapping (Turn 1)
1. Call \`get_next_task()\`:
   - Retrieves the top-priority backlog item. The item is pre-started on Game Master (\`IN_PROGRESS\`), answers folders are initialized, and challenge fixtures/seeds are linked.
2. Read the verification test runner (\`challenge/<id>-minimum-verification-scenarios.md\` and \`challenge/<id>-run-checks.mjs\`).
3. Note exact expected outputs:
   - Specific statuses expected (e.g., \`PARTIAL\` vs \`SENT\` vs \`PAID\`).
   - Minor units calculations (e.g., \`total_minor\` and \`paid_minor\`).
   - Required evidence filenames (e.g., \`tc-01-vnd-invoice.png\`, \`currency-report.txt\`).
4. **Company Knowledge Base**: Use \`kb_search({ query: "..." })\` if authoritative accounting, currency, or export rules are needed (\`KB-FIN-01\`, \`KB-EXP-01\`).

#### Stage 2: Code Diagnosis & Implementation (Turn 2)
1. Read targeted components or API routes in \`src/\`.
2. Apply minimal, precise edits in \`src/\` via \`edit_file\`.
3. Run existing unit tests (\`pnpm test\`) to ensure no regressions and verify at least 13 tests pass.

#### Stage 3: Evidence Generation with Enhanced \`capture-client.mjs\` (Turn 3)
1. Run seed fixtures if provided:
   \`\`\`powershell
   pnpm tsx prisma/seed-<id>.ts ../answers/<id>/evidence/<id>-test-data.json
   \`\`\`
2. Write and execute \`<matchRoot>/answers/<backlogId>/capture.mjs\` using the enhanced, generic helpers from \`capture-client.mjs\`:
   \`\`\`javascript
   import {
     createCapturePage,
     selectTab,
     selectRadixOption,
     fillFormField,
     submitModalOrDialog,
     getTableRow,
     resolveEvidencePath,
     dumpPageDiagnostics
   } from '../../team-sdlc-pack/scripts/capture-client.mjs';

   const { browser, page } = await createCapturePage();
   try {
     await page.goto('http://127.0.0.1:3000/accounting');
     await selectTab(page, 'Invoices');

     // 1. Generic Radix select by text or regex (handles dynamic loading & skips placeholders)
     await selectRadixOption(page, '#invCompany', 'Mekong Logistics CPL');
     await fillFormField(page, 'Line 1 description', 'Monthly retainer');
     await fillFormField(page, 'Line 1 quantity', 2);
     await fillFormField(page, /unit price/i, '24680');
     await submitModalOrDialog(page, 'Create draft');

     // 2. Issue invoice & capture screenshot
     const row = getTableRow(page, 'Mekong Logistics CPL');
     await row.getByRole('button', { name: 'Issue', exact: true }).click();
     await page.screenshot({ path: resolveEvidencePath('<id>', 'tc-01-vnd-invoice.png'), fullPage: true });

     // 3. Payments: select company, then select dynamic invoice matching /INV/
     await selectTab(page, 'Payments');
     await page.getByRole('button', { name: 'Record payment', exact: true }).click();
     await selectRadixOption(page, '#payCompany', 'Mekong Logistics CPL');
     // Matches /INV/i or picks first real invoice, never 'No specific invoice'
     await selectRadixOption(page, '#payInvoice', /INV/i);
     await fillFormField(page, '#payAmount', '15000');
     await submitModalOrDialog(page, 'Record payment');
     await page.screenshot({ path: resolveEvidencePath('<id>', 'tc-02-vnd-payment.png'), fullPage: true });
   } catch (err) {
     await dumpPageDiagnostics(page);
     throw err;
   } finally {
     await browser.close();
   }
   \`\`\`
3. Run the official report script to generate the text/json evidence report:
   \`\`\`powershell
   pnpm tsx prisma/report-<id>.ts ../answers/<id>/evidence/<id>-test-data.json ../answers/<id>/evidence/currency-report.txt
   \`\`\`
4. **CRITICAL**: Do **NOT** call \`submit_work\` in this turn! Proceed to Turn 4.

#### Stage 4: MANDATORY Evidence Inspection & Atomic Submission (Turn 4)
1. **Inspect Evidence on Disk**: Read the generated report:
   \`\`\`powershell
   Get-Content ../answers/<backlogId>/evidence/currency-report.txt
   \`\`\`
2. **Verify Against MVS Criteria**:
   - Check status (e.g. \`vnd_invoice_status: PARTIAL\`).
   - Check paid amount (e.g. \`vnd_invoice_paid_minor: 15000\`, not 0).
   - If any value is wrong: do **NOT** submit. Fix \`capture.mjs\` or code and re-generate.
3. **Atomic Packaging & Submission**:
   Once verified, call:
   \`\`\`javascript
   await tools.mcp__mtm_helper__submit_work({ backlogItemKey: "<backlogId>", status: "DONE" });
   \`\`\`
   - \`submit_work\` automatically sanitizes evidence files, generates \`submit.json\`, stages \`src/\` and \`answers/\`, commits, pushes, and posts to Game Master.
4. Confirm receipt returned with status \`ACCEPTED\`.`;

const updatedBans = `1. **BANNED: Blind Batch Submission**:
   - **NEVER** run the evidence generation script and \`submit_work\` in the same tool invocation or turn.
   - Always inspect the report file on disk in a separate step before calling \`submit_work\`. Submissions are irreversible on Game Master.
2. **BANNED: Fragile \`.last().click()\` or \`.first().click()\` on Un-Awaited Portals**:
   - Never click \`.last()\` on dynamic Radix select portals. Use \`selectRadixOption(page, trigger, matcher)\` which waits for non-placeholder options or pattern matching (e.g. \`/INV/i\`).
3. **BANNED: Uncached Playwright Cold Starts & 30,000ms Timeouts**:
   - Always use \`capture-client.mjs\` (\`createCapturePage\`) which attaches cached \`storageState.json\` and host Chrome.
4. **BANNED: \`view_image\` Tool Calls During Active Matches**:
   - Do not call \`view_image\` to inspect screenshot PNGs. DOM assertions and test report text are authoritative.
5. **BANNED: Foreground Dev Servers**:
   - Never launch \`pnpm dev\` in the foreground. It runs detached in the background.
6. **MANDATORY: Working Directory Anchoring**:
   - PowerShell command blocks must begin with \`Set-Location '<matchRoot>/src'\` or execute with \`cwd: <matchRoot>/src\`.
7. **ANTI-PAUSE DIRECTIVE**:
   - \`pushAssignedRepository: true\` is pre-approved by host authorization. Never pause or ask user for Git push permission in chat.`;

const paths = [
  'D:/mtm/CPL/.agents/skills/team-orchestrator/SKILL.md',
  'D:/mtm/CPL/team-sdlc-pack/skills/team-orchestrator/SKILL.md',
  'D:/mtm/CPL/team-sdlc-pack/runtime/skills/team-orchestrator/SKILL.md',
  'D:/mtm/team-orchestrator-pack/skills/team-orchestrator/SKILL.md'
];

for (const p of paths) {
  if (!fs.existsSync(p)) continue;
  let text = fs.readFileSync(p, 'utf8');

  // Replace Section 2
  const s2Start = text.indexOf('## 2. The Strict 3-Turn "Code-First" SDLC Loop');
  const s3Start = text.indexOf('## 3. Strict Performance Invariants & Tool Bans');
  if (s2Start !== -1 && s3Start !== -1) {
    text = text.slice(0, s2Start) + updatedSection + '\n\n---\n\n' + text.slice(s3Start);
  }

  // Replace Banned rules 1-5 in Section 3
  const b1Idx = text.indexOf('1. **BANNED: Uncached Playwright Cold Starts');
  const bEndIdx = text.indexOf('6. **ZERO-POINT PREVENTION');
  if (b1Idx !== -1 && bEndIdx !== -1) {
    text = text.slice(0, b1Idx) + updatedBans + '\n' + text.slice(bEndIdx);
  }

  fs.writeFileSync(p, text, 'utf8');
  console.log('Successfully updated:', p);
}

