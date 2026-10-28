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
    assert(tools.length === 7, `Server exposed exactly 7 tools (found ${tools.length})`);

    const expectedTools = [
      'configure_session',
      'login_match',
      'refresh_match',
      'start_work',
      'submit_work',
      'report_progress',
      'wait_for_update'
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
