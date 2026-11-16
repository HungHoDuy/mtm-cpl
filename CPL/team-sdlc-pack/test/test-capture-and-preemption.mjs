import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import {
  getTableRow,
  getFirstText,
  selectTab,
  dumpPageDiagnostics,
  createCapturePage
} from '../scripts/capture-client.mjs';
import { RuntimeSession } from '../src/runtime-session.mjs';

console.log('======================================================');
console.log(' MTM Capture Client & Unified Preemption Test Suite');
console.log('======================================================\n');

// --- Test Suite 1: Scoped Locator & Diagnostic Helpers ---
console.log('--- Test Suite 1: Generic Scoped Locator Helpers ---');

let clickCalled = false;
let waitForCalled = false;
const mockLocator = {
  first: () => mockLocator,
  filter: (opts) => {
    assert(opts.hasText === 'Acme Corp', 'filter honored hasText');
    return mockLocator;
  },
  waitFor: async () => { waitForCalled = true; },
  click: async () => { clickCalled = true; }
};

const mockPage = {
  url: () => 'http://127.0.0.1:3000/accounting',
  title: async () => 'Accounting | FreelanceOS',
  locator: (selector) => {
    if (selector.includes('role="tab"')) {
      return {
        allTextContents: async () => ['Overview', 'Invoices', 'Payments', 'Reports']
      };
    }
    if (selector.includes('button')) {
      return {
        allTextContents: async () => ['Filter', 'Export CSV', 'New invoice']
      };
    }
    if (selector.includes('h1')) {
      return {
        allTextContents: async () => ['Invoices & Billing']
      };
    }
    return mockLocator;
  },
  getByText: (text, opts) => {
    assert(opts.exact === true, 'getFirstText enforces exact: true');
    return mockLocator;
  },
  getByRole: (role, opts) => {
    assert(role === 'tab', 'selectTab searches role="tab"');
    assert(opts.name.test('Invoices'), 'selectTab regex matches Invoices');
    return mockLocator;
  },
  waitForTimeout: async () => {}
};

// 1. getTableRow
const row = getTableRow(mockPage, 'Acme Corp');
assert(row === mockLocator, 'getTableRow returned scoped locator');
console.log('[PASS] getTableRow scopes to row with hasText filter');

// 2. getFirstText
const textLoc = getFirstText(mockPage, 'paid');
assert(textLoc === mockLocator, 'getFirstText returned exact locator');
console.log('[PASS] getFirstText enforces exact match without strict mode crash');

// 3. selectTab
await selectTab(mockPage, 'Invoices');
assert(waitForCalled && clickCalled, 'selectTab waited and clicked tab');
console.log('[PASS] selectTab locates and activates tab cleanly');

// 4. dumpPageDiagnostics
let errorLogged = false;
const origError = console.error;
console.error = () => {
  errorLogged = true;
};
await dumpPageDiagnostics(mockPage);
console.error = origError;
assert(errorLogged, 'dumpPageDiagnostics printed diagnostics to stderr');
console.log('[PASS] dumpPageDiagnostics successfully captures rendered page context');

// --- Test Suite 2: Non-Blocking Concurrent Capture (PI Non-Interference) ---
console.log('\n--- Test Suite 2: Non-Blocking Concurrent Capture ---');
const lockTestFile = path.resolve(process.cwd(), '.URGENT_PI_LOCK');
fs.writeFileSync(lockTestFile, JSON.stringify({ activeIncident: 'PI-01' }), 'utf8');

try {
  // Proves createCapturePage does NOT abort with [CRITICAL HALT] when .URGENT_PI_LOCK exists
  let haltedByLock = false;
  try {
    await createCapturePage({ headless: true });
  } catch (err) {
    if (err.message && err.message.includes('CRITICAL HALT')) {
      haltedByLock = true;
    }
  }
  assert(!haltedByLock, 'createCapturePage must never halt non-PI tasks with CRITICAL HALT');
  console.log('[PASS] createCapturePage does not halt workers when concurrent PI is active');
} finally {
  if (fs.existsSync(lockTestFile)) fs.unlinkSync(lockTestFile);
}

// --- Test Suite 3: Swarm PI Prioritization in getClusterSnapshot ---
console.log('\n--- Test Suite 3: Swarm PI Prioritization in getClusterSnapshot ---');
const testSession = new RuntimeSession();
testSession.taskQueue = [
  { key: 'BUG-02', title: 'Currency bug', points: 100, type: 'BUG' },
  { key: 'PI-01', title: 'Payment Reminder Bug', points: 160, isPI: true }
];

const snapshot = testSession.getClusterSnapshot();
assert(snapshot.urgentPI !== null, 'urgentPI is detected in cluster snapshot');
assert.strictEqual(snapshot.urgentPI.key, 'PI-01', 'PI-01 is flagged as the urgent PI');
assert(snapshot.unassignedTasks.some(t => t.key === 'BUG-02'), 'BUG-02 remains available in unassignedTasks');
console.log('[PASS] getClusterSnapshot flags PI-01 as urgentPI while preserving parallel task queue');

console.log('\n======================================================');
console.log(' All Unit & Integration Tests Passed (100% Success)');
console.log('======================================================\n');
