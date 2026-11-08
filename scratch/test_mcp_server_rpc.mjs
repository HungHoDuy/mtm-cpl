import { spawn } from 'node:child_process';
import path from 'node:path';
import readline from 'node:readline';
import assert from 'node:assert';

async function testServer() {
  console.log('--- TEST SUITE: MCP Server JSON-RPC Interface ---');

  const serverPath = path.resolve('D:/mtm/CPL/team-sdlc-pack/bin/runtime-server.mjs');
  const proc = spawn('node', [serverPath], {
    stdio: ['pipe', 'pipe', 'inherit']
  });

  const rl = readline.createInterface({ input: proc.stdout, crlfDelay: Infinity });

  let idCounter = 1;
  const pendingRequests = new Map();

  rl.on('line', line => {
    if (!line.trim()) return;
    try {
      const msg = JSON.parse(line);
      if (msg.id && pendingRequests.has(msg.id)) {
        const resolve = pendingRequests.get(msg.id);
        pendingRequests.delete(msg.id);
        resolve(msg);
      }
    } catch (e) {
      console.error('Error parsing line from server:', line);
    }
  });

  function sendRpc(method, params = {}) {
    const id = idCounter++;
    return new Promise(resolve => {
      pendingRequests.set(id, resolve);
      proc.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
    });
  }

  // 1. Initialize
  console.log('\n[RPC Test 1] Sending initialize...');
  const initRes = await sendRpc('initialize');
  assert.ok(initRes.result.serverInfo.name === 'mtm-helper');
  console.log('✅ RPC Test 1 Passed: Server initialized.');

  // 2. tools/list
  console.log('\n[RPC Test 2] Sending tools/list...');
  const listRes = await sendRpc('tools/list');
  const toolNames = listRes.result.tools.map(t => t.name);
  console.log('Available tools (' + toolNames.length + '):', toolNames);
  assert.ok(toolNames.includes('get_next_task'), 'tools/list must include get_next_task');
  assert.ok(toolNames.includes('preempt_work'), 'tools/list must include preempt_work');
  assert.ok(!toolNames.includes('refresh_match'), 'refresh_match should be commented out');
  assert.ok(!toolNames.includes('start_work'), 'start_work should be commented out');
  console.log('✅ RPC Test 2 Passed: get_next_task and preempt_work registered, old tools cleanly deprecated.');

  // 3. tools/call: get_next_task
  console.log('\n[RPC Test 3] Calling get_next_task...');
  const callGetNextRes = await sendRpc('tools/call', { name: 'get_next_task', arguments: {} });
  assert.ok(callGetNextRes.result.content[0].text);
  const parsedGetNext = JSON.parse(callGetNextRes.result.content[0].text);
  console.log('get_next_task result:', parsedGetNext);
  assert.strictEqual(parsedGetNext.hasTask, false, 'Should be false when no match is active');
  console.log('✅ RPC Test 3 Passed: get_next_task responded cleanly via MCP.');

  proc.kill();
  console.log('\n🎉 ALL MCP RPC TESTS PASSED PERFECTLY!');
}

testServer().catch(err => {
  console.error('❌ MCP test failed:', err);
  process.exit(1);
});

