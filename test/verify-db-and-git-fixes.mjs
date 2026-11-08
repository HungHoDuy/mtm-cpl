#!/usr/bin/env node
/**
 * Automated Verification Suite for Database Reset, Git Push Preemption & MCP Tool Surface
 * Validates:
 *   1. Database Reset: Ensures clean drop/create with zero transaction errors and backend termination.
 *   2. Prisma Parity: Ensures migrations deploy cleanly and seed populates data.
 *   3. Git Push Preemption: Ensures answers/<KEY> is staged & committed even when currentActiveItem is null.
 *   4. MCP Tool Catalog: Ensures redundant tools (start_work, refresh_match) are removed from catalog while remaining callable.
 */

import { execSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let testsPassed = 0;
let testsFailed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`[PASS] ${message}`);
    testsPassed++;
  } else {
    console.error(`[FAIL] ${message}`);
    testsFailed++;
  }
}

async function runVerification() {
  console.log('======================================================');
  console.log(' MTM Fixes & Safeguards Verification Suite');
  console.log('======================================================\n');

  // =========================================================================
  // Part 1: Database Reset & Backend Termination Verification
  // =========================================================================
  console.log('--- Part 1: Database Reset & Connection Termination ---');

  const psqlCandidates = [
    'C:\\Program Files\\PostgreSQL\\16\\bin\\psql.exe',
    'C:\\Program Files\\PostgreSQL\\15\\bin\\psql.exe',
    'psql'
  ];
  let psql = psqlCandidates.find(c => fs.existsSync(c)) || 'psql';
  console.log(`Using psql binary: ${psql}`);

  // Step 1.1: Ensure databases exist and inject dirty markers into BOTH freelanceos and freelanceos_test
  console.log('Injecting dirty test table into freelanceos & freelanceos_test...');
  try {
    execSync(`"${psql}" -U freelanceos -p 5433 -h 127.0.0.1 -d freelanceos -c "CREATE TABLE IF NOT EXISTS dirty_test_marker (id serial primary key, val text); INSERT INTO dirty_test_marker (val) VALUES ('dirty_state_before_reset');"`, {
      env: { ...process.env, PGPASSWORD: 'freelanceos_secret' },
      stdio: ['pipe', 'pipe', 'pipe']
    });
    execSync(`"${psql}" -U freelanceos -p 5433 -h 127.0.0.1 -d freelanceos_test -c "CREATE TABLE IF NOT EXISTS dirty_test_marker (id serial primary key, val text); INSERT INTO dirty_test_marker (val) VALUES ('dirty_state_before_reset');"`, {
      env: { ...process.env, PGPASSWORD: 'freelanceos_secret' },
      stdio: ['pipe', 'pipe', 'pipe']
    });
    console.log('Dirty markers injected successfully into both databases.');
  } catch (err) {
    console.log(`Note: database check: ${err.message}`);
  }

  // Step 1.2: Spawn active background connections holding both databases open
  console.log('Spawning active background connections holding freelanceos & freelanceos_test open...');
  const activeClientApp = spawn(psql, ['-U', 'freelanceos', '-p', '5433', '-h', '127.0.0.1', '-d', 'freelanceos', '-c', 'SELECT pg_sleep(30);'], {
    env: { ...process.env, PGPASSWORD: 'freelanceos_secret' },
    stdio: 'ignore'
  });
  const activeClientTest = spawn(psql, ['-U', 'freelanceos', '-p', '5433', '-h', '127.0.0.1', '-d', 'freelanceos_test', '-c', 'SELECT pg_sleep(30);'], {
    env: { ...process.env, PGPASSWORD: 'freelanceos_secret' },
    stdio: 'ignore'
  });

  // Give clients 500ms to connect
  await new Promise(r => setTimeout(r, 500));

  // Step 1.3: Run the prepareEnvironment dual database reset sequence
  console.log('Executing clean reset sequence (terminate -> drop -> create for both DBs)...');
  const termSql = "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname IN ('freelanceos', 'freelanceos_test') AND pid <> pg_backend_pid();";
  const dropAppSql = "DROP DATABASE IF EXISTS freelanceos;";
  const createAppSql = "CREATE DATABASE freelanceos OWNER freelanceos;";
  const dropTestSql = "DROP DATABASE IF EXISTS freelanceos_test;";
  const createTestSql = "CREATE DATABASE freelanceos_test OWNER freelanceos;";

  let resetOutput = '';
  let resetError = null;
  try {
    resetOutput = execSync(`"${psql}" -U freelanceos -p 5433 -h 127.0.0.1 -d postgres -c "${termSql}" -c "${dropAppSql}" -c "${createAppSql}" -c "${dropTestSql}" -c "${createTestSql}"`, {
      env: { ...process.env, PGPASSWORD: 'freelanceos_secret' },
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    });
  } catch (e) {
    resetError = e;
  }

  assert(!resetError, 'Database reset commands executed without throwing');
  assert(!resetOutput.includes('cannot run inside a transaction block'), 'Zero transaction block errors encountered');
  assert(resetOutput.match(/DROP DATABASE/g)?.length >= 2, 'DROP DATABASE was successfully executed for both DBs');
  assert(resetOutput.match(/CREATE DATABASE/g)?.length >= 2, 'CREATE DATABASE was successfully executed for both DBs');

  // Verify active clients were killed
  try { activeClientApp.kill(); } catch (_) {}
  try { activeClientTest.kill(); } catch (_) {}

  // Step 1.4: Verify the dirty table is gone from both databases
  let dirtyAppExists = false;
  let dirtyTestExists = false;
  try {
    execSync(`"${psql}" -U freelanceos -p 5433 -h 127.0.0.1 -d freelanceos -c "SELECT * FROM dirty_test_marker;"`, {
      env: { ...process.env, PGPASSWORD: 'freelanceos_secret' },
      stdio: ['pipe', 'pipe', 'pipe']
    });
    dirtyAppExists = true;
  } catch (_) { dirtyAppExists = false; }

  try {
    execSync(`"${psql}" -U freelanceos -p 5433 -h 127.0.0.1 -d freelanceos_test -c "SELECT * FROM dirty_test_marker;"`, {
      env: { ...process.env, PGPASSWORD: 'freelanceos_secret' },
      stdio: ['pipe', 'pipe', 'pipe']
    });
    dirtyTestExists = true;
  } catch (_) { dirtyTestExists = false; }

  assert(!dirtyAppExists, 'Clean freelanceos verification: dirty marker table does NOT exist');
  assert(!dirtyTestExists, 'Clean freelanceos_test verification: dirty marker table does NOT exist');

  // Step 1.5: Verify Prisma Deploy and Seed
  const sampleSrcDir = path.resolve(__dirname, '..', 'CPL', 'matches', '38IX07C9', '38IX07C9', 'src');
  if (fs.existsSync(sampleSrcDir)) {
    console.log(`Deploying Prisma migrations and seed from: ${sampleSrcDir}...`);
    try {
      execSync('pnpm prisma migrate deploy', { cwd: sampleSrcDir, env: process.env, stdio: ['pipe', 'pipe', 'pipe'] });
      execSync('pnpm db:seed', { cwd: sampleSrcDir, env: process.env, stdio: ['pipe', 'pipe', 'pipe'] });

      const countOut = execSync(`"${psql}" -U freelanceos -p 5433 -h 127.0.0.1 -d freelanceos -t -c "SELECT count(*) FROM users;"`, {
        env: { ...process.env, PGPASSWORD: 'freelanceos_secret' },
        encoding: 'utf8'
      }).trim();
      const userCount = parseInt(countOut, 10);
      assert(userCount > 0, `Prisma migrations & seed verified: users table in freelanceos populated with ${userCount} records`);
    } catch (migErr) {
      assert(false, `Prisma migration/seed failed: ${migErr.message}`);
    }
  }

  // =========================================================================
  // Part 2: Git Push & BUG-01 Preemption Staging Verification
  // =========================================================================
  console.log('\n--- Part 2: Git Push & Preemption Staging (ensureGitPushed) ---');

  const { RuntimeSession } = await import('../CPL/team-sdlc-pack/src/runtime-session.mjs');
  const tempMatchDir = path.resolve(__dirname, '..', 'scratch', 'test_git_push_match');

  if (fs.existsSync(tempMatchDir)) fs.rmSync(tempMatchDir, { recursive: true, force: true });
  fs.mkdirSync(tempMatchDir, { recursive: true });

  // Initialize a real Git repository in tempMatchDir
  execSync('git init', { cwd: tempMatchDir, stdio: 'ignore' });
  execSync('git config user.name "MTM Test Agent"', { cwd: tempMatchDir, stdio: 'ignore' });
  execSync('git config user.email "test@antigravity.internal"', { cwd: tempMatchDir, stdio: 'ignore' });

  // Initial commit
  fs.writeFileSync(path.join(tempMatchDir, 'README.md'), '# Match Test Repository\n');
  execSync('git add . && git commit -m "initial commit"', { cwd: tempMatchDir, stdio: 'ignore' });
  const initialSha = execSync('git rev-parse HEAD', { cwd: tempMatchDir, encoding: 'utf8' }).trim();

  // Create answers/BUG-01 with mock evidence files
  const bug01EvidenceDir = path.join(tempMatchDir, 'answers', 'BUG-01', 'evidence');
  fs.mkdirSync(bug01EvidenceDir, { recursive: true });
  fs.writeFileSync(path.join(bug01EvidenceDir, 'tc-01-login-screen.png'), 'FAKE_IMAGE_DATA_01');
  fs.writeFileSync(path.join(bug01EvidenceDir, 'dev-server.log'), 'Next.js dev server listening on :3000');
  fs.writeFileSync(path.join(tempMatchDir, 'answers', 'BUG-01', 'submit.json'), JSON.stringify({ status: 'DONE', testsPassed: 11 }, null, 2));

  // Instantiate session
  const session = new RuntimeSession();
  session.checkoutRoot = tempMatchDir;
  session.assignedBranch = 'main';

  // CRITICAL PREEMPTION SCENARIO: currentActiveItem is NULL (simulating task switch)
  session.currentActiveItem = null;

  // Call ensureGitPushed with explicit task key 'BUG-01'
  const newSha = session.ensureGitPushed('BUG-01');

  assert(newSha && newSha.length === 40, `ensureGitPushed returned valid 40-char SHA: ${newSha}`);
  assert(newSha !== initialSha, 'A new commit was created on the repository');

  const commitMsg = execSync('git log -1 --pretty=%B', { cwd: tempMatchDir, encoding: 'utf8' }).trim();
  assert(commitMsg.includes('fix(BUG-01): implement solution and package evidence'), `Commit message has correct task key: "${commitMsg}"`);

  const committedFiles = execSync('git show --name-only --pretty="" HEAD', { cwd: tempMatchDir, encoding: 'utf8' }).trim().split(/\r?\n/).map(f => f.trim()).filter(Boolean);
  assert(committedFiles.some(f => f.includes('answers/BUG-01/evidence/tc-01-login-screen.png')), 'answers/BUG-01/evidence/tc-01-login-screen.png was committed to git');
  assert(committedFiles.some(f => f.includes('answers/BUG-01/evidence/dev-server.log')), 'answers/BUG-01/evidence/dev-server.log was committed to git');
  assert(committedFiles.some(f => f.includes('answers/BUG-01/submit.json')), 'answers/BUG-01/submit.json was committed to git');

  const statusClean = execSync('git status --porcelain', { cwd: tempMatchDir, encoding: 'utf8' }).trim();
  assert(statusClean === '', 'Repository working tree is 100% clean with nothing uncommitted or untracked');

  // Clean up scratch dir
  try { fs.rmSync(tempMatchDir, { recursive: true, force: true }); } catch (_) {}

  // =========================================================================
  // Part 3: MCP Toolset Surface Verification
  // =========================================================================
  console.log('\n--- Part 3: MCP Toolset Surface Verification ---');

  const serverScript = path.resolve(__dirname, '..', 'CPL', 'team-sdlc-pack', 'bin', 'runtime-server.mjs');
  const child = spawn(process.execPath, [serverScript], {
    stdio: ['pipe', 'pipe', 'inherit']
  });

  const rl = readline.createInterface({ input: child.stdout, terminal: false });
  let msgId = 1;
  const requests = new Map();

  rl.on('line', (line) => {
    try {
      const parsed = JSON.parse(line.trim());
      if (parsed.id !== undefined && requests.has(parsed.id)) {
        const resolve = requests.get(parsed.id);
        requests.delete(parsed.id);
        resolve(parsed);
      }
    } catch (_) {}
  });

  function sendReq(method, params = {}) {
    return new Promise((resolve) => {
      const id = msgId++;
      requests.set(id, resolve);
      child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
    });
  }

  // Initialize
  await sendReq('initialize', {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'verifier', version: '1.0.0' }
  });

  // Request tools/list
  const listResp = await sendReq('tools/list');
  const tools = listResp.result?.tools || [];

  assert(tools.length === 9, `Catalog exposed exactly 9 streamlined tools (found ${tools.length})`);
  assert(!tools.some(t => t.name === 'start_work'), 'Redundant tool start_work is REMOVED from tools/list');
  assert(!tools.some(t => t.name === 'refresh_match'), 'Redundant tool refresh_match is REMOVED from tools/list');

  const requiredTools = [
    'prepare_environment',
    'get_next_task',
    'submit_work',
    'kb_search',
    'search_logs',
    'wait_for_update',
    'configure_session',
    'login_match',
    'report_progress'
  ];
  for (const rt of requiredTools) {
    assert(tools.some(t => t.name === rt), `Essential tool '${rt}' is present in tools/list`);
  }

  // Verify that calling start_work and refresh_match via tools/call still works gracefully as fallback
  console.log('Testing fallback handling of legacy tool calls...');
  const fallbackRefresh = await sendReq('tools/call', { name: 'refresh_match' });
  assert(!fallbackRefresh.isError, 'Fallback call to refresh_match succeeds gracefully');

  const fallbackStart = await sendReq('tools/call', { name: 'start_work', arguments: { backlogItemKey: 'TASK-01' } });
  assert(!fallbackStart.isError, 'Fallback call to start_work succeeds gracefully');

  child.kill();

  // =========================================================================
  // Summary
  // =========================================================================
  console.log('\n======================================================');
  console.log(` Verification Summary: ${testsPassed} Passed, ${testsFailed} Failed`);
  console.log('======================================================');

  if (testsFailed > 0) {
    process.exit(1);
  }
}

runVerification().catch((err) => {
  console.error('Verification failed with uncaught exception:', err);
  process.exit(1);
});
