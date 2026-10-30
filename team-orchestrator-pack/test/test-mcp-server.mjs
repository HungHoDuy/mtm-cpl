#!/usr/bin/env node
/**
 * MTM Team Orchestrator MCP Offline Test Harness
 * Simulates Codex CLI communicating over stdio JSON-RPC 2.0 with runtime-server.mjs
 * Pure Node.js Standard Library (0 external npm dependencies, $0 credit usage)
 */

import { spawn } from 'node:child_process';
import readline from 'node:readline';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const packRoot = path.resolve(__dirname, '..');
const serverScript = path.resolve(packRoot, 'bin', 'runtime-server.mjs');

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

async function runTests() {
  console.log('======================================================');
  console.log(' MTM MCP Server Offline Test Harness');
  console.log('======================================================');
  console.log(`Server Script: ${serverScript}\n`);

  const child = spawn(process.execPath, [serverScript], {
    cwd: packRoot,
    stdio: ['pipe', 'pipe', 'inherit']
  });

  const rl = readline.createInterface({
    input: child.stdout,
    terminal: false
  });

  let messageId = 1;
  const pendingRequests = new Map();

  rl.on('line', (line) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    try {
      const msg = JSON.parse(trimmed);
      if (msg.id !== undefined && pendingRequests.has(msg.id)) {
        const resolve = pendingRequests.get(msg.id);
        pendingRequests.delete(msg.id);
        resolve(msg);
      }
    } catch (err) {
      console.error('Test received non-JSON stdout:', trimmed);
    }
  });

  function sendRequest(method, params = {}) {
    return new Promise((resolve) => {
      const id = messageId++;
      pendingRequests.set(id, resolve);
      const msg = { jsonrpc: '2.0', id, method, params };
      child.stdin.write(JSON.stringify(msg) + '\n');
    });
  }

  function sendNotification(method, params = {}) {
    const msg = { jsonrpc: '2.0', method, params };
    child.stdin.write(JSON.stringify(msg) + '\n');
  }

  try {
    // Test 1: initialize handshake
    console.log('--- Test 1: Protocol Handshake (initialize) ---');
    const initRes = await sendRequest('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'codex-test-client', version: '0.1.0' }
    });

    assert(initRes.result?.protocolVersion === '2024-11-05', 'Negotiated protocol version 2024-11-05');
    assert(initRes.result?.serverInfo?.name === 'mtm-helper', 'Server name is mtm-helper');
    assert(initRes.result?.capabilities?.tools !== undefined, 'Server declares tools capability');

    // Test 2: notifications/initialized
    console.log('\n--- Test 2: Client Initialized Notification ---');
    sendNotification('notifications/initialized');
    assert(true, 'Sent notifications/initialized without errors');

    // Test 3: tools/list
    console.log('\n--- Test 3: List Tools (tools/list) ---');
    const listRes = await sendRequest('tools/list');
    const tools = listRes.result?.tools || [];
    assert(tools.length === 10, `Server exposed exactly 10 tools (found ${tools.length})`);

    const expectedTools = [
      'configure_session',
      'login_match',
      'refresh_match',
      'start_work',
      'submit_work',
      'pack_submission',
      'report_progress',
      'wait_for_update',
      'get_test_data',
      'kb_search'
    ];
    for (const t of expectedTools) {
      assert(tools.some(x => x.name === t), `Tool '${t}' is declared in tools/list`);
    }

    // Test 4: tools/call configure_session
    console.log('\n--- Test 4: Call configure_session ---');
    const testMatchId = `TEST_${Date.now().toString(36).toUpperCase()}`;
    const confRes = await sendRequest('tools/call', {
      name: 'configure_session',
      arguments: {
        descriptor: {
          matchId: testMatchId,
          teamId: 'CPL',
          checkoutRoot: path.resolve(packRoot, '..', 'CPL'),
          workingDirectory: packRoot
        }
      }
    });

    assert(!confRes.isError, 'configure_session executed without errors');
    const confContent = JSON.parse(confRes.result.content[0].text);
    assert(confContent.configured === true, 'Session configured returned true');
    assert(confContent.matchId === testMatchId, `Session registered matchId: ${testMatchId}`);

    // Test 5: tools/call report_progress
    console.log('\n--- Test 5: Call report_progress ---');
    const progRes = await sendRequest('tools/call', {
      name: 'report_progress',
      arguments: {
        type: 'PREPARATION_STATUS',
        stage: 'GIT_AUTH',
        status: 'COMPLETED',
        summary: 'Git credentials verified against remote'
      }
    });

    assert(!progRes.isError, 'report_progress executed without errors');
    const progContent = JSON.parse(progRes.result.content[0].text);
    assert(progContent.logged === true, 'report_progress returned logged: true');

    // Test 6: Verify generated progress NDJSON file
    console.log('\n--- Test 6: Verify Progress NDJSON Log Content ---');
    const expectedLogPath = path.resolve(packRoot, 'logs', `${testMatchId}.progress.ndjson`);
    assert(fs.existsSync(expectedLogPath), `Progress NDJSON file exists at: ${expectedLogPath}`);

    const logLines = fs.readFileSync(expectedLogPath, 'utf8').trim().split('\n');
    assert(logLines.length >= 2, `Log contains at least 2 events (found ${logLines.length})`);

    for (const line of logLines) {
      const parsed = JSON.parse(line);
      assert(parsed.schemaVersion === 1, `Line has schemaVersion === 1 (${parsed.type})`);
      assert(Boolean(parsed.playerSessionId), `Line has playerSessionId (${parsed.playerSessionId})`);
      assert(Boolean(parsed.summary), `Line has summary: "${parsed.summary}"`);
    }

    // Test 7: Call report_progress with ENVIRONMENT_READY (Bug #4 verification)
    console.log('\n--- Test 7: Call report_progress with ENVIRONMENT_READY ---');
    const envRes = await sendRequest('tools/call', {
      name: 'report_progress',
      arguments: {
        type: 'ENVIRONMENT_READY',
        requestId: 'req-test-env-01',
        repository: {
          url: 'https://github.com/lqdung863/mtm-cpl.git',
          branch: 'main',
          folder: 'TISTL6MV'
        },
        revision: '0123456789abcdef0123456789abcdef01234567',
        build: 'PASS',
        matchLogin: 'PASS'
      }
    });

    assert(!envRes.isError, 'report_progress ENVIRONMENT_READY executed without errors');
    let allLogLines = fs.readFileSync(expectedLogPath, 'utf8').trim().split('\n');
    let envEvent = JSON.parse(allLogLines[allLogLines.length - 1]);
    assert(envEvent.type === 'ENVIRONMENT_READY', 'Last logged event is ENVIRONMENT_READY');
    assert(!('summary' in envEvent), 'ENVIRONMENT_READY strictly omits summary property');
    assert(envEvent.build === 'PASS', 'ENVIRONMENT_READY has build === PASS');
    assert(envEvent.matchLogin === 'PASS', 'ENVIRONMENT_READY has matchLogin === PASS');

    // Test 8: Call report_progress with ENVIRONMENT_READY and explicit client-supplied summary (Bug #9 negative test)
    console.log('\n--- Test 8: Call report_progress with ENVIRONMENT_READY and explicit summary ---');
    const envWithSummaryRes = await sendRequest('tools/call', {
      name: 'report_progress',
      arguments: {
        type: 'ENVIRONMENT_READY',
        summary: 'Client-supplied summary that must be stripped by runtime',
        requestId: 'req-test-env-02',
        repository: {
          url: 'https://github.com/lqdung863/mtm-cpl.git',
          branch: 'main',
          folder: 'TISTL6MV'
        },
        revision: '0123456789abcdef0123456789abcdef01234567',
        build: 'PASS',
        matchLogin: 'PASS'
      }
    });

    assert(!envWithSummaryRes.isError, 'report_progress with summary executed without errors');
    allLogLines = fs.readFileSync(expectedLogPath, 'utf8').trim().split('\n');
    envEvent = JSON.parse(allLogLines[allLogLines.length - 1]);
    assert(envEvent.type === 'ENVIRONMENT_READY', 'Last logged event is ENVIRONMENT_READY');
    assert(!('summary' in envEvent), 'ENVIRONMENT_READY actively stripped client-supplied summary property');
    assert(envEvent.requestId === 'req-test-env-02', 'ENVIRONMENT_READY retained requestId');

    // Clean up test log file
    try {
      fs.unlinkSync(expectedLogPath);
      console.log(`Cleaned up test log: ${expectedLogPath}`);
    } catch {}

    // Test 9: Autonomous Project Environment Bootstrapping (.env synthesis)
    console.log('\n--- Test 9: Autonomous Project Environment Bootstrapping (.env synthesis) ---');
    const tempRepoDir = path.resolve(packRoot, 'temp_test_env_bootstrap');
    const tempSrcDir = path.resolve(tempRepoDir, 'src');
    fs.mkdirSync(tempSrcDir, { recursive: true });

    const mockExample = [
      'DATABASE_URL="postgresql://freelanceos:CHANGE_ME@localhost:5432/freelanceos?schema=public"',
      'TEST_DATABASE_URL="postgresql://freelanceos:CHANGE_ME@localhost:5432/freelanceos_test?schema=public"',
      'AUTH_SECRET="CHANGE_ME"',
      'NEXT_PUBLIC_APP_URL="http://localhost:3000"'
    ].join('\n');
    fs.writeFileSync(path.resolve(tempSrcDir, '.env.example'), mockExample, 'utf8');

    const envBootstrapMatchId = `TEST_ENV_${Date.now().toString(36).toUpperCase()}`;
    const bootRes = await sendRequest('tools/call', {
      name: 'configure_session',
      arguments: {
        descriptor: {
          matchId: envBootstrapMatchId,
          teamId: 'CPL',
          checkoutRoot: tempRepoDir,
          workingDirectory: packRoot,
          repository: { folder: '.' }
        }
      }
    });

    assert(!bootRes.isError, 'configure_session with mock repo executed without errors');
    const generatedEnvPath = path.resolve(tempSrcDir, '.env');
    assert(fs.existsSync(generatedEnvPath), 'Auto-bootstrapped src/.env file was synthesized');

    const envContent = fs.readFileSync(generatedEnvPath, 'utf8');
    assert(!envContent.includes('CHANGE_ME'), 'All CHANGE_ME tokens were replaced in synthesized .env');
    assert(envContent.includes('freelanceos_secret'), 'freelanceos_secret was injected into database credentials');
    
    const authSecretMatch = envContent.match(/AUTH_SECRET="([^"]+)"/);
    assert(Boolean(authSecretMatch), 'AUTH_SECRET key exists in synthesized .env');
    assert(Boolean(authSecretMatch && authSecretMatch[1].length >= 32), `AUTH_SECRET has valid minimum length (length: ${authSecretMatch?.[1]?.length || 0} >= 32)`);

    // Idempotency check: Ensure existing .env is not overwritten on subsequent calls
    fs.appendFileSync(generatedEnvPath, '\nIDEMPOTENCY_MARKER="preserved"\n');
    await sendRequest('tools/call', {
      name: 'configure_session',
      arguments: {
        descriptor: {
          matchId: envBootstrapMatchId,
          teamId: 'CPL',
          checkoutRoot: tempRepoDir,
          workingDirectory: packRoot,
          repository: { folder: '.' }
        }
      }
    });
    const recheckedContent = fs.readFileSync(generatedEnvPath, 'utf8');
    assert(recheckedContent.includes('IDEMPOTENCY_MARKER="preserved"'), 'Existing .env is preserved without clobbering');

    // Clean up temporary bootstrap directory & log
    try {
      fs.rmSync(tempRepoDir, { recursive: true, force: true });
      const envLogPath = path.resolve(packRoot, 'logs', `${envBootstrapMatchId}.progress.ndjson`);
      if (fs.existsSync(envLogPath)) fs.unlinkSync(envLogPath);
      console.log('Cleaned up mock bootstrap directory and test logs');
    } catch (err) {
      console.error('Error during cleanup:', err.message);
    }

    // Test 10: Game Master Modern Auth Handshake & Backlog Discovery
    console.log('\n--- Test 10: Game Master Modern Auth Handshake & Backlog Discovery ---');
    let mockServerLoginReceived = false;
    let mockServerOriginHeader = '';
    let mockServerContentType = '';

    const mockServer = http.createServer((req, res) => {
      const url = new URL(req.url, `http://${req.headers.host}`);
      let reqBody = '';
      req.on('data', chunk => { reqBody += chunk; });
      req.on('end', () => {
        if (url.pathname === '/api/v1/auth/login' && req.method === 'POST') {
          mockServerLoginReceived = true;
          mockServerOriginHeader = req.headers['origin'] || '';
          mockServerContentType = req.headers['content-type'] || '';
          res.writeHead(200, {
            'Content-Type': 'application/json',
            'Set-Cookie': 'gm_session=mock_auth_token_secret; Path=/; HttpOnly; SameSite=Lax'
          });
          res.end(JSON.stringify({ user: { id: 'test-user', role: 'CUDER' } }));
        } else if (url.pathname.startsWith('/match/') && req.method === 'GET') {
          const cookie = req.headers['cookie'] || '';
          if (!cookie.includes('gm_session=mock_auth_token_secret')) {
            // Unauthenticated: return masked redirect
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end('<template data-dgst="NEXT_REDIRECT;replace;/login?next=%2Fmatch%2FTEST;307;"></template><p>Loading match…</p>');
          } else {
            // Authenticated: return match page with UUID and backlog items
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end('<html><body><div>Match UUID: 4cba0152-1692-40df-a26a-942ab4868383</div><div>BUG-01 OPEN</div><div>BUG-02 OPEN</div></body></html>');
          }
        } else {
          res.writeHead(404);
          res.end('Not found');
        }
      });
    });

    await new Promise(resolve => mockServer.listen(0, '127.0.0.1', resolve));
    const mockPort = mockServer.address().port;
    const mockGmUrl = `http://127.0.0.1:${mockPort}`;

    const authMatchId = `TEST_AUTH_${Date.now().toString(36).toUpperCase()}`;
    await sendRequest('tools/call', {
      name: 'configure_session',
      arguments: {
        descriptor: {
          matchId: authMatchId,
          teamId: 'CPL',
          username: 'CPL_test_user',
          password: 'TestPassword123!',
          gameMasterUrl: mockGmUrl,
          workingDirectory: packRoot
        }
      }
    });

    const loginRes = await sendRequest('tools/call', { name: 'login_match' });
    assert(!loginRes.isError, 'login_match executed without errors');
    const loginData = JSON.parse(loginRes.result.content[0].text);
    assert(loginData.authenticated === true, 'login_match returned authenticated: true');
    assert(mockServerLoginReceived === true, 'Mock server received POST /api/v1/auth/login');
    assert(mockServerContentType.includes('application/json'), 'Auth request used application/json');
    assert(Boolean(mockServerOriginHeader), `Auth request sent Origin header (${mockServerOriginHeader})`);

    const refreshRes = await sendRequest('tools/call', { name: 'refresh_match' });
    assert(!refreshRes.isError, 'refresh_match executed without errors');
    const refreshData = JSON.parse(refreshRes.result.content[0].text);
    assert(refreshData.items?.length === 2, `refresh_match discovered exactly 2 backlog items (found ${refreshData.items?.length})`);
    assert(refreshData.items?.some(i => i.key === 'BUG-01'), 'Discovered BUG-01');
    assert(refreshData.items?.some(i => i.key === 'BUG-02'), 'Discovered BUG-02');
    assert(refreshData.matchUuid === '4cba0152-1692-40df-a26a-942ab4868383', 'Extracted 36-char match UUID 4cba0152-1692-40df-a26a-942ab4868383');

    await new Promise(resolve => mockServer.close(resolve));
    const authLogPath = path.resolve(packRoot, 'logs', `${authMatchId}.progress.ndjson`);
    if (fs.existsSync(authLogPath)) fs.unlinkSync(authLogPath);

    // Test 11: Card-Based Scraper Hardening (Immunity to Instructional Prose)
    console.log('\n--- Test 11: Card-Based Scraper Hardening (Immunity to Instructional Prose) ---');
    const mockCardServer = http.createServer((req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(`
        <html><body>
          <div class="prose">
            Create answers/BUG-01/, copy challenge/BUG-01-submit.json to answers/BUG-01/submit.json,
            and create its evidence/ child directory. Commit source, tests, evidence, and the completed submission together.
          </div>
          <div class="card-item">
            <span class="font-mono text-zinc-300">BUG-01</span>
            <span class="text-zinc-400">200 pts</span>
            <span class="rounded border px-2 py-0.5 border-emerald-800 text-emerald-200">OPEN</span>
          </div>
          <div class="card-item">
            <span class="font-mono text-zinc-300">BUG-02</span>
            <span class="text-zinc-400">150 pts</span>
            <span class="rounded border px-2 py-0.5 border-zinc-700 text-zinc-300">CLOSED</span>
          </div>
        </body></html>
      `);
    });

    await new Promise(resolve => mockCardServer.listen(0, '127.0.0.1', resolve));
    const cardPort = mockCardServer.address().port;
    const cardGmUrl = `http://127.0.0.1:${cardPort}`;

    const cardMatchId = `TEST_CARD_${Date.now().toString(36).toUpperCase()}`;
    await sendRequest('tools/call', {
      name: 'configure_session',
      arguments: {
        descriptor: {
          matchId: cardMatchId,
          teamId: 'CPL',
          username: 'CPL_test_user',
          password: 'TestPassword123!',
          gameMasterUrl: cardGmUrl,
          workingDirectory: packRoot
        }
      }
    });

    const cardRefreshRes = await sendRequest('tools/call', { name: 'refresh_match' });
    assert(!cardRefreshRes.isError, 'refresh_match with card HTML executed without errors');
    const cardRefreshData = JSON.parse(cardRefreshRes.result.content[0].text);
    assert(cardRefreshData.items?.length === 2, `Discovered exactly 2 card items (found ${cardRefreshData.items?.length})`);

    const bug01 = cardRefreshData.items.find(i => i.key === 'BUG-01');
    assert(bug01 !== undefined, 'Found BUG-01');
    assert(bug01.status === 'OPEN', `BUG-01 correctly identified as OPEN despite 'completed' in prose (got: ${bug01.status})`);

    const bug02 = cardRefreshData.items.find(i => i.key === 'BUG-02');
    assert(bug02 !== undefined, 'Found BUG-02');
    assert(bug02.status === 'CLOSED', `BUG-02 correctly identified as CLOSED (got: ${bug02.status})`);

    await new Promise(resolve => mockCardServer.close(resolve));
    const cardLogPath = path.resolve(packRoot, 'logs', `${cardMatchId}.progress.ndjson`);
    if (fs.existsSync(cardLogPath)) fs.unlinkSync(cardLogPath);

    // Test 12: Multi-Criteria Backlog Triage Sorting (PI > Expiring Deadline > Score Value)
    console.log('\n--- Test 12: Multi-Criteria Backlog Triage Sorting ---');
    const mockTriageServer = http.createServer((req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(`
        <html><body>
          <div class="card-item">
            <span class="font-mono text-zinc-300">TASK-01</span>
            <span class="text-zinc-400">100 pts</span>
            <span class="rounded border px-2 py-0.5 border-emerald-800 text-emerald-200">OPEN</span>
          </div>
          <div class="card-item">
            <span class="font-mono text-zinc-300">CR-01</span>
            <span class="text-zinc-400">300 pts</span>
            <span class="rounded border px-2 py-0.5 border-emerald-800 text-emerald-200">OPEN</span>
          </div>
          <div class="card-item">
            <span class="font-mono text-zinc-300">BUG-01</span>
            <span class="text-zinc-400">200 pts</span>
            <span class="rounded border px-2 py-0.5 border-emerald-800 text-emerald-200">OPEN</span>
          </div>
          <div class="card-item">
            <span class="font-mono text-zinc-300">BUG-02</span>
            <span class="text-zinc-400">150 pts (18m countdown deadline)</span>
            <span class="rounded border px-2 py-0.5 border-emerald-800 text-emerald-200">OPEN</span>
          </div>
          <div class="card-item">
            <span class="font-mono text-zinc-300">PI-01</span>
            <span class="text-zinc-400">250 pts</span>
            <span class="rounded border px-2 py-0.5 border-emerald-800 text-emerald-200">OPEN</span>
          </div>
        </body></html>
      `);
    });

    await new Promise(resolve => mockTriageServer.listen(0, '127.0.0.1', resolve));
    const triagePort = mockTriageServer.address().port;
    const triageGmUrl = `http://127.0.0.1:${triagePort}`;

    const triageMatchId = `TEST_TRIAGE_${Date.now().toString(36).toUpperCase()}`;
    await sendRequest('tools/call', {
      name: 'configure_session',
      arguments: {
        descriptor: {
          matchId: triageMatchId,
          teamId: 'CPL',
          username: 'CPL_test_user',
          password: 'TestPassword123!',
          gameMasterUrl: triageGmUrl,
          workingDirectory: packRoot
        }
      }
    });

    const triageRefreshRes = await sendRequest('tools/call', { name: 'refresh_match' });
    assert(!triageRefreshRes.isError, 'refresh_match for triage executed without errors');
    const triageData = JSON.parse(triageRefreshRes.result.content[0].text);
    assert(triageData.items?.length === 5, `Discovered exactly 5 items (found ${triageData.items?.length})`);

    const sortedKeys = triageData.items.map(i => i.key);
    assert(sortedKeys[0] === 'PI-01', `PI-01 is ranked #1 (highest urgency incident, got: ${sortedKeys[0]})`);
    assert(sortedKeys[1] === 'BUG-02', `BUG-02 is ranked #2 (expiring countdown deadline, got: ${sortedKeys[1]})`);
    assert(sortedKeys[2] === 'CR-01', `CR-01 is ranked #3 (300 pts, got: ${sortedKeys[2]})`);
    assert(sortedKeys[3] === 'BUG-01', `BUG-01 is ranked #4 (200 pts, got: ${sortedKeys[3]})`);
    assert(sortedKeys[4] === 'TASK-01', `TASK-01 is ranked #5 (100 pts, got: ${sortedKeys[4]})`);

    await new Promise(resolve => mockTriageServer.close(resolve));
    const triageLogPath = path.resolve(packRoot, 'logs', `${triageMatchId}.progress.ndjson`);
    if (fs.existsSync(triageLogPath)) fs.unlinkSync(triageLogPath);

    // Test 13: Dual-Write Progress Log Verification
    console.log('\n--- Test 13: Dual-Write Progress Log Verification ---');
    const dualMatchId = `TEST_DUAL_${Date.now().toString(36).toUpperCase()}`;
    const mockMatchRoot = path.resolve(packRoot, 'tmp_mock_dual');
    fs.mkdirSync(mockMatchRoot, { recursive: true });

    await sendRequest('tools/call', {
      name: 'configure_session',
      arguments: {
        descriptor: {
          matchId: dualMatchId,
          teamId: 'CPL',
          checkoutRoot: mockMatchRoot,
          workingDirectory: mockMatchRoot
        }
      }
    });

    const reportRes = await sendRequest('tools/call', {
      name: 'report_progress',
      arguments: {
        event: {
          type: 'PREPARATION_STATUS',
          stage: 'BUILD',
          status: 'COMPLETED',
          summary: 'Explicit build completion event'
        }
      }
    });
    assert(!reportRes.isError, 'report_progress executed without errors');

    const primaryLog = path.resolve(mockMatchRoot, 'logs', `${dualMatchId}.progress.ndjson`);
    assert(fs.existsSync(primaryLog), `Primary log exists at: ${primaryLog}`);
    const primaryContent = fs.readFileSync(primaryLog, 'utf8');
    assert(primaryContent.includes('Explicit build completion event'), 'Primary log received BUILD event');
    fs.rmSync(mockMatchRoot, { recursive: true, force: true });

    // Test 14: Self-Healing Submission Guard
    console.log('\n--- Test 14: Self-Healing Submission Guard ---');
    const healMatchId = `TEST_HEAL_${Date.now().toString(36).toUpperCase()}`;
    const mockHealRoot = path.resolve(packRoot, 'tmp_mock_heal');
    const prevAnswerDir = path.resolve(mockHealRoot, 'answers', 'BUG-01');
    fs.mkdirSync(prevAnswerDir, { recursive: true });
    fs.writeFileSync(path.resolve(prevAnswerDir, 'submit.json'), JSON.stringify({
      schemaVersion: 1,
      backlogId: 'BUG-01',
      status: 'DONE',
      evidenceFiles: ['evidence/test.png']
    }), 'utf8');

    let submittedItem = null;
    const mockGmServer = http.createServer((req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      if (req.url.includes('/submissions')) {
        submittedItem = 'BUG-01';
        res.end(JSON.stringify({
          submission: { id: 'rcpt-heal-01', status: 'ACCEPTED', scoreStatus: 'PENDING' }
        }));
      } else {
        res.end(JSON.stringify({ success: true, submitTemplate: {} }));
      }
    });
    await new Promise(resolve => mockGmServer.listen(0, '127.0.0.1', resolve));
    const healPort = mockGmServer.address().port;

    await sendRequest('tools/call', {
      name: 'configure_session',
      arguments: {
        descriptor: {
          matchId: healMatchId,
          matchUuid: '00000000-0000-0000-0000-000000000001',
          teamId: 'CPL',
          checkoutRoot: mockHealRoot,
          workingDirectory: mockHealRoot,
          gameMasterUrl: `http://127.0.0.1:${healPort}`,
          revision: '0123456789abcdef0123456789abcdef01234567'
        }
      }
    });

    await sendRequest('tools/call', {
      name: 'start_work',
      arguments: { backlogItemKey: 'BUG-01' }
    });

    const start2Res = await sendRequest('tools/call', {
      name: 'start_work',
      arguments: { backlogItemKey: 'BUG-02' }
    });
    assert(!start2Res.isError, 'start_work for BUG-02 executed without errors');
    assert(submittedItem === 'BUG-01', 'Self-healing guard automatically submitted predecessor BUG-01 before starting BUG-02');

    await new Promise(resolve => mockGmServer.close(resolve));
    fs.rmSync(mockHealRoot, { recursive: true, force: true });

    // Test 15: Remote Company MCP Integration (get_test_data & kb_search)
    console.log('\n--- Test 15: Remote Company MCP Integration (get_test_data & kb_search) ---');
    const mcpMatchId = `TEST_MCP_${Date.now().toString(36).toUpperCase()}`;
    const mockMcpRoot = path.resolve(packRoot, 'tmp_mock_mcp');
    fs.mkdirSync(mockMcpRoot, { recursive: true });

    let mcpToolCallReceived = null;
    const mockCompanyMcpServer = http.createServer((req, res) => {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        try {
          const parsed = JSON.parse(body);
          if (parsed.method === 'tools/call') {
            const toolName = parsed.params?.name;
            mcpToolCallReceived = toolName;
            if (toolName === 'get_test_data') {
              res.end(JSON.stringify({
                jsonrpc: '2.0',
                id: parsed.id,
                result: {
                  content: [{
                    type: 'text',
                    text: JSON.stringify({
                      fixtureId: 'MOCK-BUG-02-FIXTURE',
                      backlogItemKey: parsed.params?.arguments?.backlogItemKey,
                      description: 'Mock QA fixture for testing',
                      data: {
                        companies: [{ key: 'VND', name: 'Mock VN Corp', currency: 'VND' }]
                      }
                    })
                  }]
                }
              }));
              return;
            } else if (toolName === 'kb_search') {
              res.end(JSON.stringify({
                jsonrpc: '2.0',
                id: parsed.id,
                result: {
                  content: [{
                    type: 'text',
                    text: JSON.stringify({
                      articles: [{ id: 'KB-EXP-01', title: 'Invoice export file standard' }]
                    })
                  }]
                }
              }));
              return;
            }
          }
        } catch (e) {}
        res.end(JSON.stringify({ success: true, files: {} }));
      });
    });

    await new Promise(resolve => mockCompanyMcpServer.listen(0, '127.0.0.1', resolve));
    const mcpPort = mockCompanyMcpServer.address().port;

    await sendRequest('tools/call', {
      name: 'configure_session',
      arguments: {
        descriptor: {
          matchId: mcpMatchId,
          matchUuid: '00000000-0000-0000-0000-000000000002',
          teamId: 'CPL',
          checkoutRoot: mockMcpRoot,
          workingDirectory: mockMcpRoot,
          gameMasterUrl: `http://127.0.0.1:${mcpPort}`,
          apiKey: 'mock_test_key_123'
        }
      }
    });

    const getTestRes = await sendRequest('tools/call', {
      name: 'get_test_data',
      arguments: { backlogItemKey: 'BUG-02' }
    });
    assert(!getTestRes.isError, 'get_test_data executed without errors');
    const testDataObj = JSON.parse(getTestRes.result.content[0].text);
    assert(testDataObj.fixtureId === 'MOCK-BUG-02-FIXTURE', `get_test_data returned expected fixtureId (${testDataObj.fixtureId})`);
    assert(testDataObj.data?.companies?.[0]?.key === 'VND', 'get_test_data returned correct company fixture data');

    const kbRes = await sendRequest('tools/call', {
      name: 'kb_search',
      arguments: { query: 'KB-EXP-01' }
    });
    assert(!kbRes.isError, 'kb_search executed without errors');
    const kbObj = JSON.parse(kbRes.result.content[0].text);
    assert(kbObj.articles?.[0]?.id === 'KB-EXP-01', `kb_search returned expected article ID (${kbObj.articles?.[0]?.id})`);

    // Test 16: Auto-Fetch QA Fixture during start_work
    console.log('\n--- Test 16: Auto-Fetch QA Fixture during start_work ---');
    const startMcpRes = await sendRequest('tools/call', {
      name: 'start_work',
      arguments: { backlogItemKey: 'BUG-02' }
    });
    assert(!startMcpRes.isError, 'start_work executed without errors');
    const autoFixturePath = path.resolve(mockMcpRoot, 'answers', 'BUG-02', 'evidence', 'bug-02-test-data.json');
    assert(fs.existsSync(autoFixturePath), `Auto-fetched fixture file exists at: ${autoFixturePath}`);
    const autoFixtureContent = JSON.parse(fs.readFileSync(autoFixturePath, 'utf8'));
    assert(autoFixtureContent.fixtureId === 'MOCK-BUG-02-FIXTURE', 'Saved fixture content matches Company MCP server data');

    await new Promise(resolve => mockCompanyMcpServer.close(resolve));
    fs.rmSync(mockMcpRoot, { recursive: true, force: true });

    // Test 17: Explicit progressLogFile & teamSdlcPackWorkspace resolution
    console.log('\n--- Test 17: Explicit progressLogFile Resolution ---');
    const customMatchId = `TEST_LOG_${Date.now().toString(36).toUpperCase()}`;
    const customLogFile = path.resolve(packRoot, 'logs', `${customMatchId}.custom.ndjson`);
    const confLogRes = await sendRequest('tools/call', {
      name: 'configure_session',
      arguments: {
        descriptor: {
          matchId: customMatchId,
          progressLogFile: customLogFile,
          workingDirectory: packRoot
        }
      }
    });
    assert(!confLogRes.isError, 'configure_session with custom log file executed without errors');
    const confLogData = JSON.parse(confLogRes.result.content[0].text);
    assert(confLogData.progressLogFile === customLogFile, `progressLogFile honored explicit path (${confLogData.progressLogFile})`);
    assert(fs.existsSync(customLogFile), `Custom log file created at: ${customLogFile}`);
    fs.rmSync(customLogFile, { force: true });

  } finally {
    child.kill();
  }

  console.log('\n======================================================');
  console.log(` Test Summary: ${testsPassed} Passed, ${testsFailed} Failed`);
  console.log('======================================================');

  if (testsFailed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
