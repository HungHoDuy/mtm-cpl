import assert from 'node:assert';
import path from 'node:path';
import fs from 'node:fs';
import { RuntimeSession } from 'file:///D:/mtm/team-orchestrator-pack/src/runtime-session.mjs';

async function runTest() {
  console.log('--- TEST: Match Status Gate for Radar Auto-Start ---');

  const testDir = path.resolve('D:/mtm/scratch/mock_gate_workspace');
  fs.mkdirSync(path.resolve(testDir, 'logs'), { recursive: true });
  fs.mkdirSync(path.resolve(testDir, 'matches', 'TESTMATCH', 'answers'), { recursive: true });

  const session = new RuntimeSession();
  session.workingDirectory = testDir;
  session.matchId = 'TESTMATCH';
  session.checkoutRoot = path.resolve(testDir, 'matches', 'TESTMATCH');

  // Mock match status file: PREPARING
  const statusFile = path.resolve(testDir, 'logs', 'TESTMATCH.match-status.ndjson');
  fs.writeFileSync(statusFile, JSON.stringify({ type: 'MATCH_STATUS', status: 'PREPARING' }) + '\n');

  assert.strictEqual(session.getMatchStatus(), 'PREPARING');
  console.log('✅ Test 1 Passed: getMatchStatus correctly detects PREPARING.');

  // Mock refreshMatch returning 2 OPEN items
  session.refreshMatch = async () => ({
    matchId: 'TESTMATCH',
    matchUuid: '00000000-0000-0000-0000-000000000000',
    backlogCount: 2,
    items: [
      { key: 'BUG-01', title: 'Test Bug 1', status: 'OPEN', points: 100, hasDeadline: false },
      { key: 'BUG-02', title: 'Test Bug 2', status: 'OPEN', points: 100, hasDeadline: true }
    ]
  });

  let apiStartCalls = [];
  session.startWork = async (key, isAutoStart) => {
    apiStartCalls.push({ key, isAutoStart });
    return { success: true };
  };

  // Run pollAndSyncBacklog during PREPARING
  console.log('\n[Test 2] Polling during PREPARING...');
  await session.pollAndSyncBacklog();

  assert.strictEqual(apiStartCalls.length, 0, 'Must NOT call startWork API during PREPARING!');
  assert.strictEqual(session.startedKeys.size, 0, 'startedKeys must remain empty during PREPARING!');
  assert.ok(fs.existsSync(path.resolve(session.checkoutRoot, 'answers', 'BUG-01')), 'Local folders should be pre-materialized');
  assert.ok(fs.existsSync(path.resolve(session.checkoutRoot, 'answers', 'BUG-02')), 'Local folders should be pre-materialized');
  console.log('✅ Test 2 Passed: PREPARING pre-materializes folders but skips API call cleanly.');

  // Now transition match status to IN_PROGRESS
  console.log('\n[Test 3] Polling after transition to IN_PROGRESS...');
  fs.appendFileSync(statusFile, JSON.stringify({ type: 'MATCH_STATUS', status: 'IN_PROGRESS' }) + '\n');
  assert.strictEqual(session.getMatchStatus(), 'IN_PROGRESS');

  await session.pollAndSyncBacklog();

  assert.strictEqual(apiStartCalls.length, 2, 'Must auto-start both OPEN items in parallel upon IN_PROGRESS!');
  assert.ok(session.startedKeys.has('BUG-01'), 'BUG-01 must be tracked in startedKeys');
  assert.ok(session.startedKeys.has('BUG-02'), 'BUG-02 must be tracked in startedKeys');
  console.log('✅ Test 3 Passed: Both items auto-started on Game Master immediately upon IN_PROGRESS!');

  // Cleanup
  fs.rmSync(testDir, { recursive: true, force: true });
  console.log('\n🎉 ALL MATCH STATUS GATE TESTS PASSED!');
}

runTest().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});

