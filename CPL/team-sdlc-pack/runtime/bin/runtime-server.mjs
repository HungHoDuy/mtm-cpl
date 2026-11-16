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
  /* Deprecated / Automated in prepare_task_workspace: start_work commented out to prevent manual orchestrator invocation
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
  */
  /* Deprecated / Workers submit via CLI: submit_work commented out so root orchestrator does not invoke as fallback
  {
    name: 'submit_work',
    description: 'Auto-sanitizes evidence, auto-generates/validates submit.json, commits changes, verifies git push, submits final answer to Game Master, and emits dual telemetry (SUBMITTED + BACKLOG_TESTS with status: PASSED).',
    inputSchema: {
      type: 'object',
      properties: {
        backlogItemKey: {
          type: 'string',
          description: 'Backlog item key (e.g. BUG-02, CR-01, TASK-01)'
        },
        status: {
          type: 'string',
          enum: ['DONE', 'PARTIAL', 'BLOCKED'],
          description: 'Optional submission status (default: DONE)'
        },
        engineeringRecord: {
          type: 'object',
          description: 'Optional engineering record object with analysis, changes, tests, risks, aiCollaboration'
        },
        answer: {
          type: 'object',
          description: 'Optional explicit answer payload (auto-packages answers/<key>/submit.json if omitted)'
        },
        artifactUrls: {
          type: 'array',
          items: { type: 'string' },
          description: 'Optional evidence URLs'
        },
        autoPack: {
          type: 'boolean',
          description: 'Whether to auto-scan, sanitize, and format submit.json before submission (default: true)'
        }
      },
      required: ['backlogItemKey']
    }
  },
  */
  /* Deprecated: Subagents submit directly via submit-cli.mjs in worktrees
  {
    name: 'pack_submission',
    description: 'Scans evidence, repairs space-delimited paths, auto-generates compliant submit.json and validates against competition schema without calling Game Master.',
    inputSchema: {
      type: 'object',
      properties: {
        backlogItemKey: {
          type: 'string',
          description: 'Backlog item key (e.g. BUG-02, CR-01)'
        },
        status: {
          type: 'string',
          enum: ['DONE', 'PARTIAL', 'BLOCKED'],
          description: 'Submission status (default: DONE)'
        },
        engineeringRecord: {
          type: 'object',
          description: 'Optional engineering record with analysis, changes, tests, risks, aiCollaboration'
        }
      },
      required: ['backlogItemKey']
    }
  },
  */
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
  /* Deprecated / Superseded: sync_cluster handles long-polling and cluster state updates
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
  },
  */
  {
    name: 'get_test_data',
    description: 'Retrieves official QA test data fixture for a backlog item from the company QA store.',
    inputSchema: {
      type: 'object',
      properties: {
        backlogItemKey: {
          type: 'string',
          description: 'Backlog item key (e.g. BUG-02, CR-01, TASK-01)'
        }
      },
      required: ['backlogItemKey']
    }
  },
  {
    name: 'kb_search',
    description: 'Searches the company internal knowledge base for runbooks, architecture docs, domain policies, and standards.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query keyword or topic (e.g. "architecture", "policy", "index")'
        }
      }
    }
  },
  {
    name: 'search_logs',
    description: 'Searches company service and observability logs. Omit service initially to inspect logs across all services.',
    inputSchema: {
      type: 'object',
      properties: {
        service: {
          type: 'string',
          description: 'Optional target service name filter (omit to search all services)'
        },
        query: {
          type: 'string',
          description: 'Optional query string or filter text'
        }
      },
      required: []
    }
  },
  {
    name: 'sync_cluster',
    description: 'Synchronizes cluster state for the root orchestrator dispatcher. Discovers unassigned tasks, monitors active workers, and alerts on urgent Product Incidents (PI). Supports long-polling.',
    inputSchema: {
      type: 'object',
      properties: {
        waitTimeoutMs: {
          type: 'integer',
          description: 'Long-polling timeout in milliseconds (default 15000, max 45000)',
          default: 15000
        }
      }
    }
  },
  {
    name: 'prepare_task_workspace',
    description: 'Creates isolated git worktrees for one or multiple task workers simultaneously. Links dependencies (node_modules, .yarn, .env), pre-materializes answers/<KEY>/evidence, and registers workers in the cluster. Accepts a single key or array of keys.',
    inputSchema: {
      type: 'object',
      properties: {
        backlogItemKey: {
          type: 'string',
          description: 'Single backlog item key (e.g. BUG-02)'
        },
        backlogItemKeys: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of backlog item keys to prepare concurrently (e.g. ["BUG-01", "BUG-02", "CR-01"])'
        }
      }
    }
  },
  /* Subagents submit via CLI (submit-cli.mjs): submit_task commented out from MCP tool list to prevent root fallback
  {
    name: 'submit_task',
    description: 'Centralized, mutex-locked submission gate for autonomous task workers or orchestrator. Auto-sanitizes submit.json against dynamic schema, commits worktree changes, merges into main, pushes to remote origin, posts to Game Master API, and cleans up the worktree.',
    inputSchema: {
      type: 'object',
      properties: {
        backlogItemKey: {
          type: 'string',
          description: 'Backlog item key (e.g. TASK-08, CR-07, BUG-09)'
        },
        branch: {
          type: 'string',
          description: 'Optional git branch name (default task/<KEY>)'
        },
        worktreePath: {
          type: 'string',
          description: 'Optional path to the task worktree directory'
        },
        status: {
          type: 'string',
          enum: ['DONE', 'PARTIAL', 'BLOCKED'],
          description: 'Optional submission status (default: DONE)'
        },
        engineeringRecord: {
          type: 'object',
          description: 'Optional engineering record object'
        },
        artifactUrls: {
          type: 'array',
          items: { type: 'string' },
          description: 'Optional evidence URLs'
        }
      },
      required: ['backlogItemKey']
    }
  }
  */
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
      return await session.submitTask(args);
    case 'submit_task':
      return await session.submitTask(args);
    case 'prepare_task_workspace':
      return await session.prepareTaskWorkspace(args.backlogItemKeys || args.backlogItemKey);
    case 'sync_cluster':
      return await session.syncCluster(args);
    case 'search_logs':
      return await session.searchLogs(args);
    case 'pack_submission':
      return session.packAndSanitizeSubmission(args.backlogItemKey, args.engineeringRecord, args.status);
    case 'report_progress':
      return await session.reportProgress(args);
    case 'wait_for_update':
      return await session.waitForUpdate(args.timeoutMs);
    case 'get_test_data':
      return await session.getTestData(args.backlogItemKey);
    case 'kb_search':
      return await session.searchKnowledgeBase(args.query);
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
        logDebug(`Listing ${TOOLS_DEFINITIONS.length} available MCP tools.`);
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
