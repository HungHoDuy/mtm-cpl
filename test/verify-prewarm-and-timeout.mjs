import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

console.log('=== TEST SUITE: Pre-Warm Routes & Playwright Timeout Verification ===\n');

// 1. Verify default timeouts in capture-client.mjs
console.log('[Test 1] Inspecting default timeouts in capture-client.mjs...');
const captureClientPath = 'D:/mtm/team-orchestrator-pack/scripts/capture-client.mjs';
assert.ok(fs.existsSync(captureClientPath), 'capture-client.mjs exists');
const captureCode = fs.readFileSync(captureClientPath, 'utf8');

assert.match(captureCode, /timeout\s*=\s*10000/, 'Default locator timeout should be 10000ms (10s)');
assert.match(captureCode, /navTimeout\s*=\s*15000/, 'Default navigation timeout should be 15000ms (15s)');
console.log('  ✓ Default locator timeout is 10,000ms');
console.log('  ✓ Default navigation timeout is 15,000ms');

// 2. Verify prewarm routes logic in capture-client.mjs
console.log('\n[Test 2] Inspecting prewarm logic in capture-client.mjs...');
assert.match(captureCode, /prewarm\s*=\s*true/, 'prewarm option defaults to true');
assert.match(captureCode, /\/accounting/, 'Pre-warms /accounting');
assert.match(captureCode, /\/boards/, 'Pre-warms /boards');
assert.match(captureCode, /\/contacts/, 'Pre-warms /contacts');
console.log('  ✓ Pre-warms /accounting, /boards, /contacts');

// 3. Verify runtime-session.mjs timeout and logging
console.log('\n[Test 3] Inspecting runtime-session.mjs timeout and logging...');
const runtimeSessionPath = 'D:/mtm/team-orchestrator-pack/src/runtime-session.mjs';
assert.ok(fs.existsSync(runtimeSessionPath), 'runtime-session.mjs exists');
const runtimeCode = fs.readFileSync(runtimeSessionPath, 'utf8');

assert.match(runtimeCode, /timeout:\s*45000/, 'auth-init timeout in runtime-session.mjs should be 45000ms');
assert.match(runtimeCode, /pre-warmed routes/, 'Logs pre-warmed routes completion');
console.log('  ✓ auth-init execSync timeout is 45,000ms');
console.log('  ✓ Pre-warmed routes debug log present');

// 4. Live Mock Dev Server Test: Test HTTP requests during auth-init
console.log('\n[Test 4] Testing live mock dev server pre-warm sequence...');

const requestedPaths = [];
const server = http.createServer((req, res) => {
  requestedPaths.push(req.url);
  if (req.url === '/login') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end('<html><body><form><input id="email" name="email"/><input id="password" name="password"/><button type="button">Sign In</button></form></body></html>');
  } else if (req.url === '/dashboard' || req.url === '/accounting' || req.url === '/boards' || req.url === '/contacts') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`<html><body><h1>${req.url}</h1></body></html>`);
  } else {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('OK');
  }
});

await new Promise(res => server.listen(0, '127.0.0.1', res));
const port = server.address().port;
const mockUrl = `http://127.0.0.1:${port}`;
console.log(`  - Mock dev server listening on ${mockUrl}`);

const tmpStorage = 'D:/mtm/scratch/test_storageState.json';
if (fs.existsSync(tmpStorage)) fs.unlinkSync(tmpStorage);

try {
  // Test with prewarm
  requestedPaths.length = 0;
  console.log('  - Executing auth-init with prewarm enabled...');
  const srcCwd = 'D:/mtm/CPL/matches/ZV98D2FF/ZV98D2FF/src';
  await execAsync(`node "${captureClientPath}" auth-init --url ${mockUrl} --output "${tmpStorage}"`, {
    cwd: srcCwd,
    timeout: 30000
  });

  assert.ok(fs.existsSync(tmpStorage), 'storageState.json was generated');
  console.log('  - Captured requested paths:', requestedPaths);
  assert.ok(requestedPaths.includes('/login'), 'Requested /login');
  assert.ok(requestedPaths.includes('/accounting'), 'Requested /accounting');
  assert.ok(requestedPaths.includes('/boards'), 'Requested /boards');
  assert.ok(requestedPaths.includes('/contacts'), 'Requested /contacts');
  console.log('  ✓ All 3 target application routes were pre-warmed successfully!');

  // Test with --no-prewarm
  if (fs.existsSync(tmpStorage)) fs.unlinkSync(tmpStorage);
  requestedPaths.length = 0;
  console.log('\n[Test 5] Testing auth-init with --no-prewarm flag...');
  await execAsync(`node "${captureClientPath}" auth-init --url ${mockUrl} --output "${tmpStorage}" --no-prewarm`, {
    cwd: srcCwd,
    timeout: 30000
  });

  assert.ok(fs.existsSync(tmpStorage), 'storageState.json was generated');
  console.log('  - Captured requested paths with --no-prewarm:', requestedPaths);
  assert.ok(requestedPaths.includes('/login'), 'Requested /login');
  assert.ok(!requestedPaths.includes('/accounting'), 'Did NOT request /accounting');
  assert.ok(!requestedPaths.includes('/boards'), 'Did NOT request /boards');
  assert.ok(!requestedPaths.includes('/contacts'), 'Did NOT request /contacts');
  console.log('  ✓ --no-prewarm cleanly skipped pre-warming as expected!');

} finally {
  server.close();
  if (fs.existsSync(tmpStorage)) fs.unlinkSync(tmpStorage);
}

console.log('\n======================================================');
console.log(' ALL 5 VERIFICATION SUITES PASSED (100% SUCCESS)');
console.log('======================================================');
