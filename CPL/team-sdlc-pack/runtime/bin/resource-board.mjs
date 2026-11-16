#!/usr/bin/env node
/**
 * Resource Board & Mutex Coordinator for Distributed MTM Task Workers
 * 
 * Provides a decentralized, repository-agnostic notification board for shared
 * hardware/software resources (e.g. web-server, database, submission-gate).
 * 
 * Protocol:
 * 1. Before touching a shared resource (server, database), workers check the board.
 * 2. If occupied, the worker waits in queue until it becomes free or TTL expires.
 * 3. Once free, worker claims the resource and posts an announcement to the board.
 * 4. When finished, worker marks the resource free and leaves a release announcement.
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PACK_ROOT = path.resolve(__dirname, '..');
const BOARD_PATH = path.basename(PACK_ROOT) === 'team-sdlc-pack'
  ? path.resolve(PACK_ROOT, '..', '.mtm', 'resource-board.json')
  : path.resolve(PACK_ROOT, '.mtm', 'resource-board.json');

export class ResourceBoard {
  constructor(explicitBoardPath = null) {
    this.boardPath = explicitBoardPath || this.resolveBoardPath();
    this.lockDir = path.dirname(this.boardPath);
    this.boardLockFile = path.resolve(this.lockDir, 'resource-board.internal.lock');
    this.ensureInitialized();
  }

  resolveBoardPath() {
    if (process.env.MTM_RESOURCE_BOARD_PATH) {
      return path.resolve(process.env.MTM_RESOURCE_BOARD_PATH);
    }
    return BOARD_PATH;
  }

  normalizeResourceName(resourceName) {
    const clean = String(resourceName || '').trim().toLowerCase();
    if (clean === 'server' || clean === 'dev-server') {
      return 'web-server';
    }
    return String(resourceName || '').trim();
  }

  ensureInitialized() {
    try {
      if (!fs.existsSync(this.lockDir)) {
        fs.mkdirSync(this.lockDir, { recursive: true });
      }
      if (!fs.existsSync(this.boardPath)) {
        const initial = {
          schemaVersion: 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          resources: {},
          history: []
        };
        fs.writeFileSync(this.boardPath, JSON.stringify(initial, null, 2), 'utf8');
      }
    } catch (_) {}
  }

  // Atomic file lock for reading/writing resource-board.json safely across processes
  withInternalLock(fn) {
    const start = Date.now();
    const timeoutMs = 15000;
    let lockFd = null;

    while (Date.now() - start < timeoutMs) {
      try {
        lockFd = fs.openSync(this.boardLockFile, 'wx');
        break;
      } catch (err) {
        if (err.code === 'EEXIST') {
          // Check for stale internal lock (> 10s)
          try {
            const stat = fs.statSync(this.boardLockFile);
            if (Date.now() - stat.mtimeMs > 10000) {
              fs.unlinkSync(this.boardLockFile);
              continue;
            }
          } catch (_) {}
          // Short sleep
          const waitEnd = Date.now() + 50;
          while (Date.now() < waitEnd) {}
        } else {
          throw err;
        }
      }
    }

    if (!lockFd) {
      throw new Error(`Failed to acquire internal board lock after ${timeoutMs}ms.`);
    }

    try {
      return fn();
    } finally {
      try {
        fs.closeSync(lockFd);
        fs.unlinkSync(this.boardLockFile);
      } catch (_) {}
    }
  }

  readBoard() {
    try {
      if (fs.existsSync(this.boardPath)) {
        const content = fs.readFileSync(this.boardPath, 'utf8');
        return JSON.parse(content);
      }
    } catch (_) {}
    return {
      schemaVersion: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      resources: {},
      history: []
    };
  }

  writeBoard(board) {
    board.updatedAt = new Date().toISOString();
    const tmp = `${this.boardPath}.${crypto.randomUUID()}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(board, null, 2), 'utf8');
    fs.renameSync(tmp, this.boardPath);
  }

  /**
   * Acquire a shared resource. Waits if another worker is actively using it.
   */
  async acquire(resourceName, options = {}) {
    resourceName = this.normalizeResourceName(resourceName);
    const {
      workerId = `worker-${process.pid}`,
      task = 'UNKNOWN_TASK',
      ttlMs = 90000,
      waitTimeoutMs = 120000,
      message = 'Claimed resource for task execution'
    } = options;

    const startWait = Date.now();
    let attempt = 0;

    while (Date.now() - startWait < waitTimeoutMs) {
      attempt++;
      let acquired = false;
      let currentHolder = null;

      this.withInternalLock(() => {
        const board = this.readBoard();
        const current = board.resources[resourceName];
        const now = Date.now();

        const isBusy = current && current.status === 'BUSY';
        const isExpired = current && current.expiresAt && new Date(current.expiresAt).getTime() < now;

        if (!isBusy || isExpired) {
          // Free or expired: claim it!
          const expiresAt = new Date(now + ttlMs).toISOString();
          const claimRecord = {
            status: 'BUSY',
            claimedBy: workerId,
            task,
            pid: process.pid,
            claimedAt: new Date(now).toISOString(),
            expiresAt,
            ttlMs,
            message
          };

          board.resources[resourceName] = claimRecord;
          board.history.unshift({
            at: new Date(now).toISOString(),
            action: 'ACQUIRE',
            resource: resourceName,
            workerId,
            task,
            message: isExpired ? `Auto-reclaimed expired lock from ${current?.claimedBy}: ${message}` : message
          });
          if (board.history.length > 20) board.history.pop();

          this.writeBoard(board);
          acquired = true;
        } else {
          currentHolder = current;
        }
      });

      if (acquired) {
        console.log(`[ResourceBoard] [ACQUIRED] "${resourceName}" claimed by ${workerId} (${task}) for ${ttlMs / 1000}s. Notice posted.`);
        return { success: true, resource: resourceName, workerId, task };
      }

      const elapsed = Math.floor((Date.now() - startWait) / 1000);
      const remainingSec = currentHolder ? Math.max(0, Math.floor((new Date(currentHolder.expiresAt).getTime() - Date.now()) / 1000)) : '?';
      if (attempt % 6 === 1) {
        console.log(`[ResourceBoard] [WAITING] "${resourceName}" is currently BUSY (holder: ${currentHolder?.task || currentHolder?.claimedBy}, expires in ~${remainingSec}s). Waiting in queue... (${elapsed}s elapsed)`);
      }

      await new Promise(r => setTimeout(r, 600));
    }

    throw new Error(`[ResourceBoard] Timeout waiting for resource "${resourceName}" after ${waitTimeoutMs / 1000}s.`);
  }

  /**
   * Release a shared resource, notifying waiting workers.
   */
  release(resourceName, options = {}) {
    resourceName = this.normalizeResourceName(resourceName);
    const {
      workerId = `worker-${process.pid}`,
      task = 'UNKNOWN_TASK',
      force = false,
      message = 'Resource is now free'
    } = options;

    let released = false;

    this.withInternalLock(() => {
      const board = this.readBoard();
      const current = board.resources[resourceName];

      if (!current || current.status === 'FREE') {
        released = true;
        return;
      }

      if (!force && current.claimedBy && current.claimedBy !== workerId && current.task !== task) {
        console.warn(`[ResourceBoard] Notice: Resource "${resourceName}" was held by ${current.claimedBy} (${current.task}), not ${workerId}. Releasing anyway.`);
      }

      const now = new Date().toISOString();
      board.resources[resourceName] = {
        status: 'FREE',
        claimedBy: null,
        task: null,
        pid: null,
        claimedAt: null,
        expiresAt: null,
        releasedAt: now,
        releasedBy: workerId,
        message
      };

      board.history.unshift({
        at: now,
        action: 'RELEASE',
        resource: resourceName,
        workerId,
        task,
        message
      });
      if (board.history.length > 20) board.history.pop();

      this.writeBoard(board);
      released = true;
    });

    console.log(`[ResourceBoard] [RELEASED] "${resourceName}" marked FREE by ${workerId} (${task}). Board updated.`);
    return { success: released, resource: resourceName, status: 'FREE' };
  }

  /**
   * Returns current status of all resources on the board.
   */
  getStatus(resourceName = null) {
    const board = this.readBoard();
    if (resourceName) {
      resourceName = this.normalizeResourceName(resourceName);
      return board.resources[resourceName] || { status: 'FREE', claimedBy: null };
    }
    return board;
  }

  /**
   * Safe execution wrapper: acquires resource, executes command, and guarantees release.
   */
  async execWithLock(resourceName, options, childCmd) {
    resourceName = this.normalizeResourceName(resourceName);
    await this.acquire(resourceName, options);
    try {
      const exitCode = await new Promise((resolve, reject) => {
        const proc = spawn(childCmd, {
          shell: true,
          stdio: 'inherit',
          cwd: options.cwd || process.cwd(),
          env: process.env
        });
        proc.on('close', code => resolve(code));
        proc.on('error', err => reject(err));
      });
      return exitCode;
    } finally {
      this.release(resourceName, options);
    }
  }
}

// CLI Interface
function parseCliArgs() {
  const args = process.argv.slice(2);
  const command = args[0] || 'status';
  const resource = args[1] || 'web-server';
  const options = {
    workerId: `worker-${process.pid}`,
    task: 'UNKNOWN_TASK',
    ttlMs: 90000,
    waitTimeoutMs: 120000,
    message: '',
    cmd: ''
  };

  for (let i = 2; i < args.length; i++) {
    const a = args[i];
    if (a === '--task' || a === '-t') options.task = args[++i];
    else if (a === '--worker' || a === '-w') options.workerId = args[++i];
    else if (a === '--ttl') options.ttlMs = parseInt(args[++i], 10) * 1000;
    else if (a === '--timeout') options.waitTimeoutMs = parseInt(args[++i], 10) * 1000;
    else if (a === '--message' || a === '-m') options.message = args[++i];
    else if (a === '--cmd' || a === '-c') options.cmd = args[++i];
    else if (a === '--force') options.force = true;
    else if (a === '--') {
      options.cmd = args.slice(i + 1).join(' ');
      break;
    }
  }

  return { command, resource, options };
}

async function main() {
  const { command, resource, options } = parseCliArgs();
  const board = new ResourceBoard();

  if (command === 'acquire') {
    await board.acquire(resource, options);
    process.exit(0);
  } else if (command === 'release') {
    board.release(resource, options);
    process.exit(0);
  } else if (command === 'status') {
    const status = board.getStatus(resource === 'all' ? null : resource);
    console.log(JSON.stringify(status, null, 2));
    process.exit(0);
  } else if (command === 'exec') {
    if (!options.cmd) {
      console.error('[ResourceBoard Error] --cmd "<command>" or "-- <command>" is required for exec.');
      process.exit(1);
    }
    const code = await board.execWithLock(resource, options, options.cmd);
    process.exit(code || 0);
  } else {
    console.error(`Unknown command: ${command}`);
    process.exit(1);
  }
}

if (process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]))) {
  main().catch(err => {
    console.error(`[ResourceBoard Error]: ${err.message}`);
    process.exit(1);
  });
}

