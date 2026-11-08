import { RuntimeSession } from 'file:///d:/mtm/CPL/team-sdlc-pack/src/runtime-session.mjs';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

async function runTests() {
  console.log('--- TEST SUITE: Background Radar, Priority Queue & Preemption Engine ---');

  const session = new RuntimeSession();

  // Test 1: isPI dynamic checking (zero hardcoding)
  console.log('\n[Test 1] Verifying dynamic isPI() detection...');
  assert.strictEqual(session.isPI('PI-01'), true, 'PI-01 should be PI');
  assert.strictEqual(session.isPI('pi-02'), true, 'pi-02 should be PI');
  assert.strictEqual(session.isPI('PI-99'), true, 'PI-99 should be PI');
  assert.strictEqual(session.isPI('CR-01'), false, 'CR-01 should not be PI');
  assert.strictEqual(session.isPI('BUG-02'), false, 'BUG-02 should not be PI');
  assert.strictEqual(session.isPI('TASK-03'), false, 'TASK-03 should not be PI');
  console.log('✅ Test 1 Passed: Dynamic PI detection is 100% verified without hardcoded keys.');

  // Test 2: computeUrgencyRank formula
  console.log('\n[Test 2] Verifying computeUrgencyRank formula...');
  const piTask = { key: 'PI-02', points: 160, hasDeadline: false, deadlineMinutes: null };
  const urgentBug = { key: 'BUG-02', points: 100, hasDeadline: true, deadlineMinutes: 10 };
  const lateBug = { key: 'BUG-03', points: 100, hasDeadline: true, deadlineMinutes: 30 };
  const highPointCR = { key: 'CR-01', points: 200, hasDeadline: false, deadlineMinutes: null };
  const standardTask = { key: 'TASK-04', points: 30, hasDeadline: false, deadlineMinutes: null };

  const piScore = session.computeUrgencyRank(piTask);
  const urgentBugScore = session.computeUrgencyRank(urgentBug);
  const lateBugScore = session.computeUrgencyRank(lateBug);
  const crScore = session.computeUrgencyRank(highPointCR);
  const taskScore = session.computeUrgencyRank(standardTask);

  console.log(`Scores: PI=${piScore}, UrgentBug=${urgentBugScore}, LateBug=${lateBugScore}, HighCR=${crScore}, Task=${taskScore}`);
  assert.ok(piScore > urgentBugScore, 'PI must strictly outrank urgent bug');
  assert.ok(urgentBugScore > lateBugScore, '10m deadline must strictly outrank 30m deadline');
  assert.ok(lateBugScore > crScore, 'Deadlines must strictly outrank non-deadline high CR');
  assert.ok(crScore > taskScore, '200pt CR must strictly outrank 30pt task');
  console.log('✅ Test 2 Passed: Urgency scoring satisfies exact competition priorities.');

  // Test 3: Priority Queue Sorting
  console.log('\n[Test 3] Verifying Queue Sorting...');
  session.backlogRegistry.set('TASK-04', standardTask);
  session.backlogRegistry.set('CR-01', highPointCR);
  session.backlogRegistry.set('BUG-03', lateBug);
  session.backlogRegistry.set('BUG-02', urgentBug);
  session.backlogRegistry.set('PI-02', piTask);

  const sorted = Array.from(session.backlogRegistry.values()).sort((a, b) => session.computeUrgencyRank(b) - session.computeUrgencyRank(a));
  const sortedKeys = sorted.map(s => s.key);
  console.log('Sorted Queue Keys:', sortedKeys);
  assert.deepStrictEqual(sortedKeys, ['PI-02', 'BUG-02', 'BUG-03', 'CR-01', 'TASK-04']);
  console.log('✅ Test 3 Passed: Priority queue order is deterministic and correct.');

  // Test 4: Preemption Guard (Only stash if non-PI)
  console.log('\n[Test 4] Verifying Preemption Guard when current task is PI...');
  session.currentActiveItem = 'PI-01';
  const preemptAttempt = await session.preemptWork('PI-02');
  assert.strictEqual(preemptAttempt.success, false, 'Preemption should be rejected if active item is already a PI');
  assert.strictEqual(preemptAttempt.stashed, false);
  console.log('Preempt response:', preemptAttempt.message);
  console.log('✅ Test 4 Passed: Active PI is properly protected against preemption.');

  // Test 5: Preemption on Non-PI Task
  console.log('\n[Test 5] Verifying Preemption on Non-PI Task (CR-01)...');
  session.currentActiveItem = 'CR-01';
  const validPreempt = await session.preemptWork('PI-01');
  assert.strictEqual(validPreempt.success, true, 'Preemption on CR-01 should succeed');
  assert.strictEqual(validPreempt.activeTask, 'PI-01');
  assert.strictEqual(validPreempt.suspendedTask, 'CR-01');
  assert.strictEqual(session.currentActiveItem, 'PI-01');
  assert.strictEqual(session.preemptionStack.length, 1);
  console.log('✅ Test 5 Passed: Non-PI task is cleanly suspended onto preemption stack.');

  // Test 6: Background Radar Start and Stop
  console.log('\n[Test 6] Verifying Background Radar timer mechanics...');
  session.matchId = 'MOCK_TEST_MATCH';
  session.startBackgroundRadar(100);
  assert.strictEqual(session.radarActive, true, 'Radar should be active');
  assert.ok(session.radarTimer !== null, 'Radar timer must be initialized');
  session.stopBackgroundRadar();
  assert.strictEqual(session.radarActive, false, 'Radar should be inactive after stop');
  assert.strictEqual(session.radarTimer, null, 'Radar timer should be null');
  console.log('✅ Test 6 Passed: Radar lifecycle start/stop works cleanly.');

  console.log('\n🎉 ALL 6 UNIT AND COMPONENT TESTS PASSED PERFECTLY!');
}

runTests().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
