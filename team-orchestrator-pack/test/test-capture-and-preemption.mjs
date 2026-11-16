import assert from 'node:assert';
import { RuntimeSession } from '../src/runtime-session.mjs';

console.log('======================================================');
console.log(' MTM Unified Preemption Test Suite');
console.log('======================================================\n');

// --- Swarm PI Prioritization in getClusterSnapshot ---
console.log('--- Swarm PI Prioritization in getClusterSnapshot ---');
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
