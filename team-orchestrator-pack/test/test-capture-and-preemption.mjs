import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  getTableRow,
  getFirstText,
  selectTab,
  dumpPageDiagnostics,
  createCapturePage
} from '../scripts/capture-client.mjs';
import { RuntimeSession } from '../src/runtime-session.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const packRoot = path.resolve(__dirname, '..');

console.log('======================================================');
console.log(' MTM Capture Client & Unified Preemption Test Suite');
console.log('======================================================\n');

// --- Test Suite 1: Scoped Locator & Diagnostic Helpers ---
console.log('--- Test Suite 1: Generic Scoped Locator Helpers ---');

// Mock page object
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
console.error = (msg) => {
  errorLogged = true;
};
await dumpPageDiagnostics(mockPage);
console.error = origError;
assert(errorLogged, 'dumpPageDiagnostics printed diagnostics to stderr');
console.log('[PASS] dumpPageDiagnostics successfully captures rendered page context');

// --- Test Suite 2: Fail-Fast PI Lock in createCapturePage ---
console.log('\n--- Test Suite 2: Fail-Fast PI Lock Circuit Breaker ---');
const lockTestFile = path.resolve(process.cwd(), '.URGENT_PI_LOCK');
fs.writeFileSync(lockTestFile, JSON.stringify({ activeIncident: 'PI-01' }), 'utf8');

try {
  let thrown = false;
  try {
    await createCapturePage();
  } catch (err) {
    thrown = true;
    assert(err.message.includes('CRITICAL HALT'), 'Error message contains CRITICAL HALT');
    assert(err.message.includes('PRODUCT INCIDENT'), 'Error message warns about Product Incident');
  }
  assert(thrown, 'createCapturePage threw fail-fast error when .URGENT_PI_LOCK exists');
  console.log('[PASS] createCapturePage immediately aborts execution when PI lock is present');
} finally {
  if (fs.existsSync(lockTestFile)) fs.unlinkSync(lockTestFile);
}

// --- Test Suite 3: 1-Turn Atomic Preemption in getNextTask ---
console.log('\n--- Test Suite 3: 1-Turn Atomic Preemption in getNextTask ---');
const testSession = new RuntimeSession();
testSession.currentActiveItem = 'BUG-02';
testSession.taskQueue = [
  { key: 'PI-01', title: 'Payment Reminder Bug', points: 160, isPI: true }
];

// Mock git execution
testSession.executeGit = (args) => {
  if (args[0] === 'status') return { success: true, stdout: ' M src/index.ts\n' };
  if (args[0] === 'stash' && args[1] === 'push') return { success: true, stdout: 'Saved working directory' };
  if (args[0] === 'stash' && args[1] === 'pop') return { success: true, stdout: 'Dropped refs/stash@{0}' };
  return { success: true, stdout: '' };
};

// Mock startWork to avoid external network calls
testSession.startWork = async (key) => ({ success: true });
testSession.autoLinkChallengeFixtures = () => {};

// Call getNextTask
const nextRes = await testSession.getNextTask();
assert(nextRes.hasTask === true, 'getNextTask returned task');
assert(nextRes.task.key === 'PI-01', 'getNextTask returned PI-01 as top priority');
assert(testSession.currentActiveItem === 'PI-01', 'currentActiveItem switched to PI-01');
assert(testSession.preemptionStack.length === 1, 'preemptionStack recorded suspended task');
assert(testSession.preemptionStack[0].suspendedTaskKey === 'BUG-02', 'suspendedTaskKey is BUG-02');
assert(testSession.preemptionStack[0].stashed === true, 'stashed flag is true');
console.log('[PASS] getNextTask atomically stashes BUG-02 and activates PI-01 in 1 single turn');

console.log('\n======================================================');
console.log(' All Unit & Integration Tests Passed (100% Success)');
console.log('======================================================\n');

