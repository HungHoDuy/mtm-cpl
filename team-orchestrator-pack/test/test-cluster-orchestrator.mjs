/**
 * Integration Test Suite: Multi-Worker Swarm & Dynamic Schema Gate
 */

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { RuntimeSession } from '../src/runtime-session.mjs';

async function runTests() {
  console.log('======================================================');
  console.log('  Testing Multi-Worker Swarm & Dynamic Schema Gate    ');
  console.log('======================================================');

  const session = new RuntimeSession();
  const testRoot = path.resolve('d:/mtm/scratch/test_cluster_env');
  if (fs.existsSync(testRoot)) {
    try {
      execSync(`git -C "${testRoot}" worktree prune`, { stdio: 'ignore' });
      fs.rmSync(testRoot, { recursive: true, force: true });
    } catch (_) {}
  }
  fs.mkdirSync(testRoot, { recursive: true });

  // Initialize a mock git repository for testing
  execSync(`git -C "${testRoot}" init -b main`, { stdio: 'ignore' });
  execSync(`git -C "${testRoot}" config user.name "Test Runner"`, { stdio: 'ignore' });
  execSync(`git -C "${testRoot}" config user.email "test@example.com"`, { stdio: 'ignore' });

  // Create minimal repo structure
  fs.mkdirSync(path.resolve(testRoot, 'src', 'node_modules'), { recursive: true });
  fs.writeFileSync(path.resolve(testRoot, 'src', 'node_modules', 'dummy.txt'), 'installed', 'utf8');
  fs.writeFileSync(path.resolve(testRoot, 'src', '.env'), 'AUTH_SECRET=12345678901234567890123456789012\n', 'utf8');
  fs.writeFileSync(path.resolve(testRoot, 'README.md'), '# Test Repo\n', 'utf8');

  // Create schemas for Actual Budget (TASK-08) and FreelanceOS (BUG-09)
  fs.mkdirSync(path.resolve(testRoot, 'challenge'), { recursive: true });

  const task08Schema = {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    title: 'TASK-08 submission',
    type: 'object',
    additionalProperties: false,
    required: ['schemaVersion', 'backlogId', 'status', 'evidenceFiles', 'cases', 'sourceChanges'],
    properties: {
      schemaVersion: { const: 1 },
      backlogId: { const: 'TASK-08' },
      status: { enum: ['DONE', 'PARTIAL', 'BLOCKED'] },
      evidenceFiles: { type: 'array', items: { type: 'string' } },
      cases: { type: 'array' },
      sourceChanges: { type: 'array' }
    }
  };
  fs.writeFileSync(path.resolve(testRoot, 'challenge', 'TASK-08-submit.schema.json'), JSON.stringify(task08Schema, null, 2), 'utf8');

  const task08Starter = {
    schemaVersion: 1,
    backlogId: 'TASK-08',
    status: 'DONE',
    evidenceFiles: [],
    cases: [{ file: 'test.csv', title: 'sample', rules: [] }],
    sourceChanges: ['src/import.js']
  };
  fs.writeFileSync(path.resolve(testRoot, 'challenge', 'TASK-08-submit.json'), JSON.stringify(task08Starter, null, 2), 'utf8');

  const bug09Schema = {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    title: 'BUG-09 submission',
    type: 'object',
    additionalProperties: false,
    required: ['schemaVersion', 'backlogId', 'status', 'evidenceFiles', 'testResults', 'engineeringRecord'],
    properties: {
      schemaVersion: { const: 1 },
      backlogId: { const: 'BUG-09' },
      status: { enum: ['DONE', 'PARTIAL', 'BLOCKED'] },
      evidenceFiles: { type: 'array', items: { type: 'string' } },
      testResults: { type: 'array' },
      engineeringRecord: { type: 'object' }
    }
  };
  fs.writeFileSync(path.resolve(testRoot, 'challenge', 'BUG-09-submit.schema.json'), JSON.stringify(bug09Schema, null, 2), 'utf8');

  // Initial git commit
  execSync(`git -C "${testRoot}" add .`, { stdio: 'ignore' });
  execSync(`git -C "${testRoot}" commit -m "initial commit"`, { stdio: 'ignore' });

  // Point session to testRoot
  session.checkoutRoot = testRoot;
  session.assignedBranch = 'main';

  // ============================================================
  // Test 1: Dynamic Schema Sanitization on TASK-08 (Actual Budget)
  // ============================================================
  console.log('\n[Test 1] Verifying Dynamic Schema Sanitization on Actual Budget schema (TASK-08)...');
  const task08AnswerDir = path.resolve(testRoot, 'answers', 'TASK-08', 'evidence');
  fs.mkdirSync(task08AnswerDir, { recursive: true });
  fs.writeFileSync(path.resolve(task08AnswerDir, 'import-log.txt'), 'sample log', 'utf8');

  // Pre-populate with illegal testResults and engineeringRecord
  const dirtyDoc = {
    schemaVersion: 1,
    backlogId: 'TASK-08',
    status: 'DONE',
    evidenceFiles: ['evidence/import-log.txt'],
    testResults: [{ id: 'TC-01', result: 'PASS' }],
    engineeringRecord: { analysis: 'dirty' }
  };
  fs.writeFileSync(path.resolve(testRoot, 'answers', 'TASK-08', 'submit.json'), JSON.stringify(dirtyDoc, null, 2), 'utf8');

  const sanitized08 = session.packAndSanitizeSubmission('TASK-08', null, 'DONE', testRoot);
  assert.strictEqual(sanitized08.doc.schemaVersion, 1);
  assert.strictEqual(sanitized08.doc.backlogId, 'TASK-08');
  assert.strictEqual(sanitized08.doc.testResults, undefined, 'testResults MUST be deleted because schema has additionalProperties: false');
  assert.strictEqual(sanitized08.doc.engineeringRecord, undefined, 'engineeringRecord MUST be deleted because schema has additionalProperties: false');
  assert.ok(Array.isArray(sanitized08.doc.cases), 'cases must be preserved from starter template');
  assert.ok(Array.isArray(sanitized08.doc.sourceChanges), 'sourceChanges must be preserved from starter template');
  console.log('  [✓] Passed! Illegal properties stripped, required fields preserved.');

  // ============================================================
  // Test 2: Dynamic Schema Sanitization on BUG-09 (FreelanceOS)
  // ============================================================
  console.log('\n[Test 2] Verifying Dynamic Schema Sanitization on FreelanceOS schema (BUG-09)...');
  const bug09AnswerDir = path.resolve(testRoot, 'answers', 'BUG-09', 'evidence');
  fs.mkdirSync(bug09AnswerDir, { recursive: true });
  fs.writeFileSync(path.resolve(bug09AnswerDir, 'test-report.txt'), 'report', 'utf8');

  const sanitized09 = session.packAndSanitizeSubmission('BUG-09', null, 'DONE', testRoot);
  assert.strictEqual(sanitized09.doc.backlogId, 'BUG-09');
  assert.ok(Array.isArray(sanitized09.doc.testResults), 'testResults must be present for FreelanceOS schema');
  assert.ok(typeof sanitized09.doc.engineeringRecord === 'object', 'engineeringRecord must be present for FreelanceOS schema');
  console.log('  [✓] Passed! testResults and engineeringRecord correctly populated when allowed.');

  // ============================================================
  // Test 3: prepareTaskWorkspace & Worktree Isolation
  // ============================================================
  console.log('\n[Test 3] Verifying prepareTaskWorkspace & git worktree creation...');
  const wtResult = await session.prepareTaskWorkspace('TASK-08');
  assert.ok(wtResult.success);
  assert.ok(fs.existsSync(wtResult.worktreePath), 'Worktree directory must exist on disk');
  assert.ok(fs.existsSync(path.join(wtResult.worktreePath, 'src', 'node_modules')), 'node_modules junction must be linked into worktree');
  assert.ok(fs.existsSync(path.join(wtResult.worktreePath, 'src', '.env')), '.env must be copied into worktree');
  assert.ok(fs.existsSync(path.join(wtResult.worktreePath, 'answers', 'TASK-08', 'evidence')), 'evidence dir must exist in worktree');
  assert.ok(session.clusterWorkers.has('TASK-08'), 'TASK-08 must be registered in clusterWorkers');
  console.log('  [✓] Passed! Worktree created with directory junctions, .env, and cluster registration.');

  // ============================================================
  // Test 4: getClusterSnapshot & syncCluster
  // ============================================================
  console.log('\n[Test 4] Verifying getClusterSnapshot & syncCluster...');
  session.taskQueue = [
    { key: 'CR-07', type: 'CR', points: 100 },
    { key: 'PI-03', type: 'PI', points: 80 }
  ];
  const snapshot = session.getClusterSnapshot();
  assert.strictEqual(snapshot.totalActiveWorkers, 1, 'Total active workers must be 1 (TASK-08)');
  assert.strictEqual(snapshot.activeWorkers[0].key, 'TASK-08');
  assert.strictEqual(snapshot.urgentPI?.key, 'PI-03', 'Urgent PI must be identified');
  assert.ok(snapshot.unassignedTasks.some(t => t.key === 'CR-07'), 'CR-07 must be in unassignedTasks');
  console.log('  [✓] Passed! Cluster snapshot correctly reflects queue, workers, and urgent PI.');

  // ============================================================
  // Test 5: Clean Worktree Teardown
  // ============================================================
  console.log('\n[Test 5] Cleaning up test worktrees and scratch repo...');
  try {
    execSync(`git -C "${testRoot}" worktree remove "${wtResult.worktreeRoot}" --force`, { stdio: 'ignore' });
    execSync(`git -C "${testRoot}" branch -D task/TASK-08`, { stdio: 'ignore' });
  } catch (_) {}
  session.clusterWorkers.clear();
  console.log('  [✓] Passed! Worktrees cleaned up successfully.');

  console.log('\n======================================================');
  console.log('  ALL INTEGRATION TESTS PASSED (5/5) [✓]              ');
  console.log('======================================================');
}

runTests().catch(err => {
  console.error('\n[FATAL TEST FAILURE]:', err);
  process.exit(1);
});

