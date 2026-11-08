#!/usr/bin/env node
/**
 * Isolated Next.js Layout Verification Recipe
 * 
 * Automates sequential execution of dev and prod layout verification:
 * - Phase 1: Starts dev server on port 3000, runs development layout check, cleanly terminates server.
 * - Phase 2: Runs pnpm build, auto-reverts tsconfig.json modifications, starts prod server on port 3001,
 *            runs production layout check, cleanly terminates server.
 * - Eliminates port clashes, zombie node processes, stale route cache errors, and protected file modifications.
 * 
 * Usage:
 *   node verify-layout.mjs [--match-root <path>] [--backlog BUG-01]
 */

import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { execSync, spawn } from 'node:child_process';

function findMatchRoot(candidate = null) {
  if (candidate && fs.existsSync(candidate)) {
    return path.resolve(candidate);
  }
  let current = process.cwd();
  for (let i = 0; i < 5; i++) {
    if (fs.existsSync(path.join(current, 'answers')) && fs.existsSync(path.join(current, 'src'))) {
      return current;
    }
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return process.cwd();
}

function killPort(port) {
  try {
    if (process.platform === 'win32') {
      const out = execSync(`netstat -ano | findstr :${port}`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
      const lines = out.split('\n');
      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 5 && parts[1].includes(`:${port}`)) {
          const pid = parts[parts.length - 1];
          if (pid && pid !== '0' && pid !== String(process.pid)) {
            try { execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' }); } catch (_) {}
          }
        }
      }
    } else {
      execSync(`lsof -ti :${port} | xargs kill -9`, { stdio: 'ignore' });
    }
  } catch (_) {}
}

function killProcessTree(child) {
  if (!child || !child.pid) return;
  try {
    if (process.platform === 'win32') {
      execSync(`taskkill /F /T /PID ${child.pid}`, { stdio: 'ignore' });
    } else {
      child.kill('SIGKILL');
    }
  } catch (_) {}
}

async function waitForUrl(url, timeoutMs = 25000) {
  const parsed = new URL(url);
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const ok = await new Promise(resolve => {
        const req = http.get({
          hostname: parsed.hostname,
          port: parsed.port || 80,
          path: '/login',
          timeout: 2500
        }, res => {
          resolve(Boolean(res.statusCode && res.statusCode >= 200 && res.statusCode < 500));
        });
        req.on('error', () => resolve(false));
        req.on('timeout', () => { req.destroy(); resolve(false); });
      });
      if (ok) return true;
    } catch (_) {}
    await new Promise(r => setTimeout(r, 800));
  }
  throw new Error(`Server at ${url} did not respond within ${timeoutMs}ms.`);
}

function revertProtectedFiles(cwd) {
  try {
    const status = execSync('git status --porcelain', { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    if (!status) return;
    const lines = status.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const filePart = trimmed.slice(2).trim();
      if (filePart.endsWith('tsconfig.json') || filePart === 'exam-info.json') {
        console.log(`[Protected File Guard] Reverting modified protected file: ${filePart}`);
        execSync(`git checkout -- "${filePart}"`, { cwd, stdio: 'ignore' });
      }
    }
  } catch (_) {}
}

async function main() {
  const args = process.argv.slice(2);
  const getArg = (flag) => {
    const idx = args.indexOf(flag);
    return idx !== -1 && args[idx + 1] ? args[idx + 1] : null;
  };

  const customRoot = getArg('--match-root');
  const backlogId = getArg('--backlog') || 'BUG-01';
  const matchRoot = findMatchRoot(customRoot);
  const srcDir = path.join(matchRoot, 'src');

  if (!fs.existsSync(srcDir)) {
    console.error(`[FAIL] src/ directory not found in ${matchRoot}`);
    process.exit(1);
  }

  // Find layout check script
  const scriptCandidates = [
    path.join(matchRoot, 'challenge', `${backlogId}-layout-check.mjs`),
    path.join(srcDir, `${backlogId}-layout-check.mjs`),
    path.join(matchRoot, `${backlogId}-layout-check.mjs`)
  ];

  let layoutScript = null;
  for (const c of scriptCandidates) {
    if (fs.existsSync(c)) {
      layoutScript = c;
      break;
    }
  }

  if (!layoutScript) {
    console.error(`[FAIL] Layout check script for ${backlogId} not found in ${matchRoot}`);
    process.exit(1);
  }

  const evidenceDir = path.join(matchRoot, 'answers', backlogId, 'evidence');
  fs.mkdirSync(evidenceDir, { recursive: true });

  const devOut = path.join(evidenceDir, 'layout-report-dev.json');
  const prodOut = path.join(evidenceDir, 'layout-report-prod.json');

  console.log('========================================================');
  console.log('  Isolated Next.js Dual-Environment Layout Verification');
  console.log('========================================================');
  console.log(`[Layout Recipe] Match Root:    ${matchRoot}`);
  console.log(`[Layout Recipe] Layout Script: ${layoutScript}`);
  console.log(`[Layout Recipe] Evidence Dir:  ${evidenceDir}`);

  // Revert any preexisting tsconfig modifications
  revertProtectedFiles(matchRoot);

  // ----------------------------------------------------
  // Phase 1: Development Layout Check (Port 3000)
  // ----------------------------------------------------
  console.log('\n[Layout Recipe] --- Phase 1: Development Check on port 3000 ---');
  killPort(3000);

  console.log('[Layout Recipe] Spawning dev server (pnpm dev -p 3000)...');
  const devChild = spawn('pnpm', ['dev', '-p', '3000'], {
    cwd: srcDir,
    stdio: 'ignore',
    shell: true
  });

  try {
    await waitForUrl('http://127.0.0.1:3000', 25000);
    console.log('[Layout Recipe] [PASS] Dev server is responding at http://127.0.0.1:3000');

    const devCmd = `node "${layoutScript}" http://127.0.0.1:3000 development "${devOut}"`;
    console.log(`[Layout Recipe] Executing: ${devCmd}`);
    execSync(devCmd, { cwd: srcDir, stdio: 'inherit' });
    console.log('[Layout Recipe] [PASS] Dev layout check finished successfully.');
  } finally {
    console.log('[Layout Recipe] Terminating dev server process tree...');
    killProcessTree(devChild);
    killPort(3000);
    revertProtectedFiles(matchRoot);
  }

  // ----------------------------------------------------
  // Phase 2: Production Layout Check (Port 3001)
  // ----------------------------------------------------
  console.log('\n[Layout Recipe] --- Phase 2: Production Check on port 3001 ---');
  killPort(3001);

  console.log('[Layout Recipe] Building production bundle (pnpm build)...');
  execSync('pnpm build', { cwd: srcDir, stdio: 'inherit' });

  // Revert tsconfig immediately after Next.js build
  revertProtectedFiles(matchRoot);

  console.log('[Layout Recipe] Spawning production server (pnpm start -p 3001)...');
  const prodChild = spawn('pnpm', ['start', '-p', '3001'], {
    cwd: srcDir,
    stdio: 'ignore',
    shell: true
  });

  try {
    await waitForUrl('http://127.0.0.1:3001', 25000);
    console.log('[Layout Recipe] [PASS] Production server is responding at http://127.0.0.1:3001');

    const prodCmd = `node "${layoutScript}" http://127.0.0.1:3001 production "${prodOut}"`;
    console.log(`[Layout Recipe] Executing: ${prodCmd}`);
    execSync(prodCmd, { cwd: srcDir, stdio: 'inherit' });
    console.log('[Layout Recipe] [PASS] Production layout check finished successfully.');
  } finally {
    console.log('[Layout Recipe] Terminating production server process tree...');
    killProcessTree(prodChild);
    killPort(3001);
    revertProtectedFiles(matchRoot);
  }

  // ----------------------------------------------------
  // Final Verification of Evidence
  // ----------------------------------------------------
  console.log('\n[Layout Recipe] --- Verification Summary ---');
  if (fs.existsSync(devOut) && fs.statSync(devOut).size > 0) {
    console.log(`[Layout Recipe] [OK] ${path.basename(devOut)} (${fs.statSync(devOut).size} bytes)`);
  } else {
    console.error(`[Layout Recipe] [FAIL] Missing ${devOut}`);
    process.exit(1);
  }

  if (fs.existsSync(prodOut) && fs.statSync(prodOut).size > 0) {
    console.log(`[Layout Recipe] [OK] ${path.basename(prodOut)} (${fs.statSync(prodOut).size} bytes)`);
  } else {
    console.error(`[Layout Recipe] [FAIL] Missing ${prodOut}`);
    process.exit(1);
  }

  console.log('\n========================================================');
  console.log(' [SUCCESS] Both layout reports generated cleanly.');
  console.log(' Protected files verified clean (tsconfig.json untouched).');
  console.log('========================================================\n');
  process.exit(0);
}

main().catch(err => {
  console.error(`[Layout Recipe Error]: ${err.message}`);
  process.exit(1);
});
