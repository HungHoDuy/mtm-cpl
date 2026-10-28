#!/usr/bin/env node
/**
 * MTM Team Orchestrator MCP Runtime Server
 * Pure Node.js Standard Library (0 external npm dependencies)
 * Implements JSON-RPC 2.0 over Stdio conforming to Model Context Protocol (MCP)
 */

import readline from 'node:readline';
import { RuntimeSession } from '../src/runtime-session.mjs';

const session = new RuntimeSession();

function logDebug(...args) {
  console.error('[MTM MCP Server]', ...args);
}

function sendResponse(id, result) {
  const message = {
    jsonrpc: '2.0',
    id,
    result
  };
  process.stdout.write(JSON.stringify(message) + '\n');
}

function sendError(id, code, message, data = null) {
  const errorObj = { code, message };
  if (data) errorObj.data = data;
  const msg = {
    jsonrpc: '2.0',
    id,
    error: errorObj
  };
  process.stdout.write(JSON.stringify(msg) + '\n');
}

const TOOLS_DEFINITIONS = [
  {
    name: 'configure_session',
    description: 'Configures or updates session parameters (matchId, matchUuid, teamId, apiKey, username, password, workingDirectory, checkoutRoot).',
    inputSchema: {
      type: 'object',
      properties: {
        descriptor: {
          type: 'object',
          description: 'Match & environment configuration descriptor object'
        },
        modelPolicy: {
          type: 'object',
          description: 'Optional LLM model policy configuration'
        }
      }
    }
  },
  {
    name: 'login_match',
    description: 'Authenticates web session against the Game Master portal to enable viewing match and backlog items.',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'refresh_match',
    description: 'Visits the live match page to discover current match status and backlog items, automatically emitting DISCOVERED events.',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'start_work',
    description: 'Declares active work on a backlog item, fetches verification scenarios and templates, creates answers folders, and sets task to IN_PROGRESS.',
    inputSchema: {
      type: 'object',
      properties: {
        backlogItemKey: {
          type: 'string',
          description: 'Backlog item key (e.g. TASK-01, CR-01, PI-01)'
        }
      },
      required: ['backlogItemKey']
    }
  },
  {
    name: 'submit_work',
    description: 'Verifies git status, resolves full 40-char SHA, submits final answer to Game Master, and records SUBMITTED event with receipt.',
    inputSchema: {
      type: 'object',
      properties: {
        backlogItemKey: {
          type: 'string',
          description: 'Backlog item key (e.g. TASK-01)'
        },
        answer: {
          type: 'object',
          description: 'Optional answer payload (reads answers/<key>/submit.json if omitted)'
        },
        artifactUrls: {
          type: 'array',
          items: { type: 'string' },
          description: 'Optional evidence URLs'
        }
      },
      required: ['backlogItemKey']
    }
  },
  {
    name: 'report_progress',
    description: 'Appends a formal progress event conforming to progress-event.schema.json to the progress NDJSON log.',
    inputSchema: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          description: 'Event type (e.g. PREPARATION_STATUS, ENVIRONMENT_READY, BACKLOG_TESTS)'
        },
        summary: {
          type: 'string',
          description: 'Short single-line description (required for all events except ENVIRONMENT_READY where summary is forbidden)'
        },
        stage: { type: 'string' },
        status: { type: 'string' },
        revision: { type: 'string' },
        build: { type: 'string' },
        matchLogin: { type: 'string' },
        backlogId: { type: 'string' },
        required: { type: 'integer' },
        executed: { type: 'integer' },
        passed: { type: 'integer' },
        failed: { type: 'integer' },
        skipped: { type: 'integer' }
      },
      required: ['type']
    }
  },
  {
    name: 'wait_for_update',
    description: 'Waits boundedly for new backlog items or match changes without consuming tokens.',
    inputSchema: {
      type: 'object',
      properties: {
        timeoutMs: {
          type: 'integer',
          description: 'Timeout in milliseconds (default 30000, max 55000)',
          default: 30000
        }
      }
    }
  }
];

async function handleToolCall(name, args = {}) {
  switch (name) {
    case 'configure_session':
      return await session.configureSession(args.descriptor, args.modelPolicy);
    case 'login_match':
      return await session.loginMatch();
    case 'refresh_match':
      return await session.refreshMatch();
    case 'start_work':
      return await session.startWork(args.backlogItemKey);
    case 'submit_work':
      return await session.submitWork(args.backlogItemKey, args.answer, args.artifactUrls);
    case 'report_progress':
      return await session.reportProgress(args);
    case 'wait_for_update':
      return await session.waitForUpdate(args.timeoutMs);
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

async function processMessage(msg) {
  if (!msg || typeof msg !== 'object') return;

  const { id, method, params } = msg;

  // Notifications (no id)
  if (id === undefined || id === null) {
    if (method === 'notifications/initialized') {
      logDebug('Client initialized notification received.');
    }
    return;
  }

  try {
    switch (method) {
      case 'initialize': {
        logDebug('Received initialize request from client.');
        sendResponse(id, {
          protocolVersion: '2024-11-05',
          capabilities: {
            tools: {}
          },
          serverInfo: {
            name: 'mtm-helper',
            version: '1.0.0'
          }
        });
        break;
      }

      case 'ping': {
        sendResponse(id, {});
        break;
      }

      case 'tools/list': {
        logDebug('Listing 7 available MCP tools.');
        sendResponse(id, {
          tools: TOOLS_DEFINITIONS
        });
        break;
      }

      case 'tools/call': {
        const toolName = params?.name;
        const toolArgs = params?.arguments || {};
        logDebug(`Calling tool: ${toolName}`);

        try {
          const result = await handleToolCall(toolName, toolArgs);
          sendResponse(id, {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2)
              }
            ]
          });
        } catch (err) {
          logDebug(`Tool execution error [${toolName}]:`, err.message);
          sendResponse(id, {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ error: err.message, stack: err.stack }, null, 2)
              }
            ],
            isError: true
          });
        }
        break;
      }

      default: {
        logDebug(`Method not found: ${method}`);
        sendError(id, -32601, `Method not found: ${method}`);
        break;
      }
    }
  } catch (err) {
    logDebug('Unhandled error processing message:', err.message);
    sendError(id, -32603, `Internal error: ${err.message}`);
  }
}

// Start stdio interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

rl.on('line', (line) => {
  const trimmed = line.trim();
  if (!trimmed) return;
  try {
    const json = JSON.parse(trimmed);
    processMessage(json);
  } catch (err) {
    logDebug('JSON parse error from stdin:', err.message, 'Raw:', trimmed);
    sendError(null, -32700, `Parse error: ${err.message}`);
  }
});

rl.on('close', () => {
  logDebug('Stdin stream closed. Exiting runtime server.');
  process.exit(0);
});

logDebug('MTM MCP Runtime Server running on stdio.');
