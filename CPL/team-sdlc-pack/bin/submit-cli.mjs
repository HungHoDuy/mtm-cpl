#!/usr/bin/env node
/**
 * Standalone Submission CLI for Autonomous Task Workers
 * Invoked directly by workers via exec tool, bypassing subagent MCP isolation.
 */

import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { RuntimeSession } from '../src/runtime-session.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    backlogItemKey: '',
    branch: '',
    worktreePath: '',
    status: 'DONE'
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--backlog' || arg === '-b') {
      options.backlogItemKey = args[++i] || '';
    } else if (arg.startsWith('--backlog=')) {
      options.backlogItemKey = arg.split('=')[1];
    } else if (arg === '--branch') {
      options.branch = args[++i] || '';
    } else if (arg.startsWith('--branch=')) {
      options.branch = arg.split('=')[1];
    } else if (arg === '--worktree' || arg === '-w') {
      options.worktreePath = args[++i] || '';
    } else if (arg.startsWith('--worktree=')) {
      options.worktreePath = arg.split('=')[1];
    } else if (arg === '--status' || arg === '-s') {
      options.status = args[++i] || 'DONE';
    } else if (arg.startsWith('--status=')) {
      options.status = arg.split('=')[1];
    }
  }

  if (!options.backlogItemKey) {
    console.error(JSON.stringify({
      success: false,
      error: 'Missing required argument: --backlog <KEY> (e.g. --backlog BUG-01)'
    }));
    process.exit(1);
  }

  if (!options.branch) {
    options.branch = `task/${options.backlogItemKey}`;
  }

  return options;
}

async function run() {
  const options = parseArgs();
  const session = new RuntimeSession({ worktreePath: options.worktreePath });
  if (options.worktreePath) {
    session.loadActiveMatchConfig(options.worktreePath);
  }

  try {
    const matchUuid = session.getEffectiveMatchUuid();
    if (!matchUuid || matchUuid === 'UNKNOWN_MATCH') {
      console.error(JSON.stringify({
        success: false,
        error: `[submit-cli] Active matchUuid could not be resolved from worktree (${options.worktreePath || 'none'}), environment, or .mtm/active-match.json.`
      }, null, 2));
      process.exit(1);
    }

    const result = await session.submitTask(options);
    console.log(JSON.stringify({
      success: true,
      data: result
    }, null, 2));
    process.exit(0);
  } catch (err) {
    console.error(JSON.stringify({
      success: false,
      error: err.message,
      stack: err.stack
    }, null, 2));
    process.exit(1);
  }
}

run();

