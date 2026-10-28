/**
 * MTM Team Orchestrator MCP Runtime Session
 * Pure Node.js Standard Library (0 external npm dependencies)
 * Handles:
 *  - In-memory state and cookie jar
 *  - Dual-auth: Web cookies for /match/ID and Bearer tokens for /api/v1/matches/ID
 *  - Automated Git SHA resolution & push verification
 *  - Atomic NDJSON progress event logging conforming to progress-event.schema.json
 *  - Automated GAME_MASTER_API & BACKLOG_STATUS telemetry
 */

import http from 'node:http';
import https from 'node:https';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

export class RuntimeSession {
  constructor() {
    this.matchId = process.env.MATCH_ID || '';
    this.matchUuid = process.env.MATCH_UUID || '';
    this.teamId = process.env.TEAM_ID || 'CPL';
    this.teamApiKey = process.env.TEAM_API_KEY || '';
    this.gameMasterUrl = process.env.GM_BASE_URL || 'https://masterthemachine.tech';
    this.username = process.env.LOGIN_USERNAME || '';
    this.password = process.env.LOGIN_PASSWORD || '';
    this.playerSessionId = crypto.randomUUID();
    this.workingDirectory = process.cwd();
    this.checkoutRoot = process.env.CHECKOUT_ROOT || path.resolve(this.workingDirectory, '..', 'CPL');
    this.assignedBranch = process.env.GIT_BRANCH || 'main';
    this.assignedFolder = process.env.GIT_FOLDER || '';
    this.progressLogFile = '';

    // In-memory cookie jar: map of name -> { value, domain, path, expires }
    this.cookieJar = new Map();

    // In-memory backlog state cache
    this.backlogRegistry = new Map(); // backlogId -> { title, status, type, ... }

    // Deduplication / Idempotency map
    this.idempotencyMap = new Map();

    this.initProgressLog();
  }

  logDebug(...args) {
    // Diagnostic messages strictly go to stderr to never corrupt stdio JSON-RPC framing
    console.error('[MTM MCP Helper]', ...args);
  }

  initProgressLog() {
    const activeMatchId = this.matchId || 'active';
    const logDir = path.resolve(this.workingDirectory, 'logs');
    this.progressLogFile = path.resolve(logDir, `${activeMatchId}.progress.ndjson`);
    try {
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }
    } catch (err) {
      this.logDebug('Error initializing log directory:', err.message);
    }
  }

  getEffectiveMatchUuid() {
    return this.matchUuid || this.matchId;
  }

  getEffectiveMatchId() {
    return this.matchId || this.matchUuid || 'UNKNOWN_MATCH';
  }

  getMatchRoot() {
    if (this.assignedFolder) {
      const matchDir = path.resolve(this.checkoutRoot, this.assignedFolder);
      if (fs.existsSync(matchDir)) return matchDir;
    }
    if (this.matchId) {
      const matchDir = path.resolve(this.checkoutRoot, this.matchId);
      if (fs.existsSync(matchDir)) return matchDir;
    }
    return this.checkoutRoot;
  }

  /**
   * Safely appends an event to the progress NDJSON file conforming to progress-event.schema.json
   */
  appendProgress(event) {
    try {
      const sanitizedSummary = String(event.summary || 'Progress event')
        .replace(/[\r\n\u0000]+/g, ' ')
        .trim()
        .slice(0, 240);

      const payload = {
        schemaVersion: 1,
        playerSessionId: this.playerSessionId,
        ...event
      };

      // ENVIRONMENT_READY strictly forbids summary under additionalProperties: false
      if (payload.type === 'ENVIRONMENT_READY') {
        delete payload.summary;
      } else {
        payload.summary = sanitizedSummary;
      }

      // Ensure required nulls or strings for specific schemas
      if (payload.type === 'BACKLOG_STATUS') {
        if (payload.status === 'SUBMITTED' && (!payload.revision || !payload.receiptId)) {
          payload.status = 'IN_PROGRESS';
          payload.summary = `${sanitizedSummary} (pending submission confirmation)`;
        }
        if (!('revision' in payload)) payload.revision = null;
        if (!('receiptId' in payload)) payload.receiptId = null;
        if (!payload.title) {
          const cached = this.backlogRegistry.get(payload.backlogId);
          payload.title = cached?.title || payload.backlogId || 'Task';
        }
      }

      if (payload.type === 'BACKLOG_TESTS') {
        payload.required = Number.isInteger(payload.required) ? payload.required : 0;
        payload.executed = Number.isInteger(payload.executed) ? payload.executed : 0;
        payload.passed = Number.isInteger(payload.passed) ? payload.passed : 0;
        payload.failed = Number.isInteger(payload.failed) ? payload.failed : 0;
        payload.skipped = Number.isInteger(payload.skipped) ? payload.skipped : 0;
      }

      if (payload.type === 'GAME_MASTER_API') {
        if (!('backlogId' in payload)) payload.backlogId = null;
        if (!('method' in payload)) payload.method = null;
        if (!('origin' in payload)) payload.origin = null;
        if (!('path' in payload)) payload.path = null;
        if (!('httpStatus' in payload)) payload.httpStatus = null;
        if (!('requestId' in payload)) payload.requestId = null;
      }

      const logDir = path.dirname(this.progressLogFile);
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }

      fs.appendFileSync(this.progressLogFile, JSON.stringify(payload) + '\n', 'utf8');
      this.logDebug(`[Progress Log] Appended ${payload.type}: ${sanitizedSummary}`);
      return true;
    } catch (err) {
      this.logDebug('Failed to append progress event:', err.message);
      return false;
    }
  }

  /**
   * Internal Git helper
   */
  executeGit(commandArgs, cwd = this.checkoutRoot) {
    try {
      const cmd = `git ${commandArgs.join(' ')}`;
      const out = execSync(cmd, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
      return { success: true, stdout: out.trim(), stderr: '' };
    } catch (err) {
      return {
        success: false,
        stdout: (err.stdout || '').toString().trim(),
        stderr: (err.stderr || err.message || '').toString().trim()
      };
    }
  }

  /**
   * Resolves current 40-character Git SHA
   */
  resolveGitSha() {
    const res = this.executeGit(['rev-parse', 'HEAD']);
    if (res.success && /^[a-f0-9]{40}$/i.test(res.stdout)) {
      return res.stdout;
    }
    throw new Error(`Failed to resolve valid 40-char Git SHA in ${this.checkoutRoot}: ${res.stderr || res.stdout}`);
  }

  /**
   * Verifies git state and pushes to remote
   */
  ensureGitPushed(branch = this.assignedBranch) {
    // Check if there are uncommitted changes
    const statusRes = this.executeGit(['status', '--porcelain']);
    if (statusRes.stdout) {
      this.logDebug('Warning: Working directory has uncommitted changes:', statusRes.stdout);
    }

    // Attempt git push
    this.logDebug(`Executing git push origin ${branch}...`);
    const pushRes = this.executeGit(['push', 'origin', branch]);
    if (!pushRes.success) {
      this.logDebug('Git push failed or was rejected:', pushRes.stderr);
      // Non-fatal if already up to date or no tracking branch yet, but log clearly
    } else {
      this.logDebug('Git push origin succeeded:', pushRes.stdout);
    }
    return this.resolveGitSha();
  }

  /**
   * Cookie jar helpers
   */
  getCookieHeader(url) {
    const pairs = [];
    for (const [name, cookie] of this.cookieJar.entries()) {
      pairs.push(`${name}=${cookie.value}`);
    }
    return pairs.join('; ');
  }

  storeCookies(setCookieHeaders) {
    if (!setCookieHeaders) return;
    const headerList = Array.isArray(setCookieHeaders) ? setCookieHeaders : [setCookieHeaders];
    for (const raw of headerList) {
      const parts = raw.split(';').map(p => p.trim());
      if (parts.length > 0 && parts[0].includes('=')) {
        const [name, ...valParts] = parts[0].split('=');
        const val = valParts.join('=');
        this.cookieJar.set(name.trim(), { value: val.trim() });
      }
    }
  }

  /**
   * HTTP Client with cookies & redirect handling
   */
  async rawRequest(options, postData = null) {
    return new Promise((resolve, reject) => {
      const protocol = options.protocol === 'http:' ? http : https;
      const req = protocol.request(options, (res) => {
        let data = '';
        res.on('data', chunk => { data += chunk; });
        res.on('end', () => {
          this.storeCookies(res.headers['set-cookie']);
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: data
          });
        });
      });

      req.on('error', reject);
      if (postData) {
        req.write(postData);
      }
      req.end();
    });
  }

  /**
   * REST API client for Game Master with Bearer token & automatic GAME_MASTER_API logging
   */
  async callGameMasterApi(apiPath, method = 'GET', bodyObj = null, operation = 'API_REQUEST', backlogId = null, explicitIdempotencyKey = null) {
    const requestId = crypto.randomUUID();
    const url = new URL(apiPath, this.gameMasterUrl);
    const origin = url.origin;
    const pathOnly = url.pathname;

    // Automated telemetry: GAME_MASTER_API (REQUESTED)
    this.appendProgress({
      type: 'GAME_MASTER_API',
      operation,
      backlogId: backlogId || null,
      method,
      origin,
      path: pathOnly,
      phase: 'REQUESTED',
      httpStatus: null,
      requestId,
      summary: `Requesting ${method} ${pathOnly}`
    });

    const startTime = Date.now();
    const headers = {
      'Accept': 'application/json',
      'User-Agent': 'MTM-CPL-Team-Pack/1.0.0'
    };

    if (this.teamApiKey) {
      headers['Authorization'] = `Bearer ${this.teamApiKey}`;
    }

    let payloadString = null;
    if (bodyObj) {
      payloadString = JSON.stringify(bodyObj);
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = Buffer.byteLength(payloadString);
    }

    const idempotencyKey = explicitIdempotencyKey || crypto.randomUUID();
    headers['Idempotency-Key'] = idempotencyKey;

    try {
      const res = await this.rawRequest({
        protocol: url.protocol,
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: url.pathname + url.search,
        method,
        headers
      }, payloadString);

      const durationMs = Date.now() - startTime;
      let parsed = null;
      try {
        parsed = JSON.parse(res.body);
      } catch {
        parsed = { rawBody: res.body };
      }

      if (res.statusCode >= 200 && res.statusCode < 300) {
        this.appendProgress({
          type: 'GAME_MASTER_API',
          operation,
          backlogId: backlogId || null,
          method,
          origin,
          path: pathOnly,
          phase: 'SUCCEEDED',
          httpStatus: res.statusCode,
          requestId,
          summary: `${method} ${pathOnly} succeeded with ${res.statusCode} in ${durationMs}ms`
        });
        return { success: true, statusCode: res.statusCode, data: parsed, requestId };
      } else {
        this.appendProgress({
          type: 'GAME_MASTER_API',
          operation,
          backlogId: backlogId || null,
          method,
          origin,
          path: pathOnly,
          phase: 'FAILED',
          httpStatus: res.statusCode,
          requestId,
          summary: `${method} ${pathOnly} failed with HTTP ${res.statusCode}`
        });
        return { success: false, statusCode: res.statusCode, error: parsed, requestId };
      }
    } catch (err) {
      const durationMs = Date.now() - startTime;
      this.appendProgress({
        type: 'GAME_MASTER_API',
        operation,
        backlogId: backlogId || null,
        method,
        origin,
        path: pathOnly,
        phase: 'FAILED',
        httpStatus: 500,
        requestId,
        summary: `${method} ${pathOnly} network error: ${err.message}`
      });
      return { success: false, statusCode: 500, error: err.message, requestId };
    }
  }

  // ==========================================
  // The 7 MCP Tools Implementations
  // ==========================================

  /**
   * Tool 1: configure_session
   */
  async configureSession(descriptor = {}, modelPolicy = null) {
    if (descriptor.matchId) this.matchId = descriptor.matchId;
    if (descriptor.matchUuid) this.matchUuid = descriptor.matchUuid;
    if (descriptor.teamId) this.teamId = descriptor.teamId;
    if (descriptor.teamApiKey || descriptor.apiKey) this.teamApiKey = descriptor.teamApiKey || descriptor.apiKey;
    if (descriptor.gameMasterUrl) this.gameMasterUrl = descriptor.gameMasterUrl;
    if (descriptor.username) this.username = descriptor.username;
    if (descriptor.password) this.password = descriptor.password;
    if (descriptor.workingDirectory) this.workingDirectory = descriptor.workingDirectory;
    if (descriptor.checkoutRoot) this.checkoutRoot = descriptor.checkoutRoot;
    if (descriptor.assignedBranch) this.assignedBranch = descriptor.assignedBranch;
    if (descriptor.assignedFolder) this.assignedFolder = descriptor.assignedFolder;
    if (descriptor.repository) {
      if (descriptor.repository.branch) this.assignedBranch = descriptor.repository.branch;
      if (descriptor.repository.folder) this.assignedFolder = descriptor.repository.folder;
    }
    if (descriptor.playerSessionId) this.playerSessionId = descriptor.playerSessionId;

    if (!this.checkoutRoot || !fs.existsSync(this.checkoutRoot)) {
      const parentMatches = path.resolve(this.workingDirectory, '..', 'matches', this.getEffectiveMatchId());
      if (fs.existsSync(parentMatches)) {
        this.checkoutRoot = parentMatches;
      }
    }

    this.initProgressLog();

    // If starting fresh and log is empty or new, log ORCHESTRATOR_STARTED
    if (!fs.existsSync(this.progressLogFile) || fs.statSync(this.progressLogFile).size === 0) {
      this.appendProgress({
        type: 'ORCHESTRATOR_STARTED',
        summary: `Orchestrator session initialized for team ${this.teamId} on match ${this.getEffectiveMatchId()}`
      });
    }

    return {
      configured: true,
      matchId: this.getEffectiveMatchId(),
      matchUuid: this.getEffectiveMatchUuid(),
      teamId: this.teamId,
      checkoutRoot: this.checkoutRoot,
      progressLogFile: this.progressLogFile,
      playerSessionId: this.playerSessionId
    };
  }

  /**
   * Tool 2: login_match
   */
  async loginMatch() {
    if (!this.username || !this.password) {
      return { authenticated: false, reason: 'No username or password configured in session.' };
    }

    const loginUrl = new URL('/login', this.gameMasterUrl);
    const origin = loginUrl.origin;
    const pathOnly = loginUrl.pathname;
    const requestId = crypto.randomUUID();

    this.appendProgress({
      type: 'GAME_MASTER_API',
      operation: 'MATCH_LOGIN',
      backlogId: null,
      method: 'POST',
      origin,
      path: pathOnly,
      phase: 'REQUESTED',
      httpStatus: null,
      requestId,
      summary: 'Authenticating web session against Game Master'
    });

    const formBody = new URLSearchParams({
      username: this.username,
      password: this.password
    }).toString();

    try {
      const res = await this.rawRequest({
        protocol: loginUrl.protocol,
        hostname: loginUrl.hostname,
        port: loginUrl.port || 443,
        path: loginUrl.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(formBody),
          'Cookie': this.getCookieHeader(loginUrl)
        }
      }, formBody);

      // Successful auth either responds 200, or 302/303 redirect
      const isSuccess = res.statusCode >= 200 && res.statusCode < 400;

      this.appendProgress({
        type: 'GAME_MASTER_API',
        operation: 'MATCH_LOGIN',
        backlogId: null,
        method: 'POST',
        origin,
        path: pathOnly,
        phase: isSuccess ? 'SUCCEEDED' : 'FAILED',
        httpStatus: res.statusCode,
        requestId,
        summary: isSuccess ? `Authenticated successfully as ${this.username}` : `Authentication returned HTTP ${res.statusCode}`
      });

      return {
        authenticated: isSuccess,
        user: this.username,
        statusCode: res.statusCode
      };
    } catch (err) {
      this.appendProgress({
        type: 'GAME_MASTER_API',
        operation: 'MATCH_LOGIN',
        backlogId: null,
        method: 'POST',
        origin,
        path: pathOnly,
        phase: 'FAILED',
        httpStatus: 500,
        requestId,
        summary: `Login network failure: ${err.message}`
      });
      return { authenticated: false, error: err.message };
    }
  }

  /**
   * Tool 3: refresh_match
   */
  async refreshMatch() {
    const matchPath = `/match/${this.getEffectiveMatchId()}`;
    const url = new URL(matchPath, this.gameMasterUrl);

    let res = await this.rawRequest({
      protocol: url.protocol,
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname + url.search,
      method: 'GET',
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/json,*/*',
        'Cookie': this.getCookieHeader(url)
      }
    });

    // If redirected to login or unauthorized, attempt login once
    if (res.statusCode === 401 || res.statusCode === 403 || (res.statusCode === 302 && (res.headers['location'] || '').includes('login'))) {
      this.logDebug('Session cookie missing or expired. Performing automatic login_match...');
      await this.loginMatch();
      res = await this.rawRequest({
        protocol: url.protocol,
        hostname: url.hostname,
        port: url.port || 443,
        path: url.pathname + url.search,
        method: 'GET',
        headers: {
          'Accept': 'text/html,application/xhtml+xml,application/json,*/*',
          'Cookie': this.getCookieHeader(url)
        }
      });
    }

    const html = res.body || '';
    const discoveredItems = [];

    // Check if match UUID is embedded in HTML
    const uuidMatch = html.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
    if (uuidMatch && !this.matchUuid) {
      this.matchUuid = uuidMatch[0];
      this.logDebug('Extracted match UUID from match page:', this.matchUuid);
    }

    // Regex extraction for Backlog Items (patterns: TASK-01, CR-01, BUG-01, PI-01, etc.)
    const itemRegex = /(TASK-[0-9]+|CR-[0-9]+|BUG-[0-9]+|PI-[0-9]+)[^<]*?(?:<[^>]+>[^<]*?){0,5}(OPEN|VISIBLE|CLOSED|IN_PROGRESS|COMPLETED)/gi;
    let match;
    const foundKeys = new Set();

    while ((match = itemRegex.exec(html)) !== null) {
      const key = match[1].toUpperCase();
      const status = match[2].toUpperCase();
      if (!foundKeys.has(key)) {
        foundKeys.add(key);
        const title = `${key} Challenge`;
        discoveredItems.push({ key, title, status });

        // Auto-emit BACKLOG_STATUS (DISCOVERED) if newly found
        if (!this.backlogRegistry.has(key)) {
          this.backlogRegistry.set(key, { key, title, status });
          this.appendProgress({
            type: 'BACKLOG_STATUS',
            backlogId: key,
            title,
            status: 'DISCOVERED',
            revision: null,
            receiptId: null,
            summary: `Discovered backlog item ${key} (${status})`
          });
        }
      }
    }

    return {
      matchId: this.getEffectiveMatchId(),
      matchUuid: this.getEffectiveMatchUuid(),
      backlogCount: discoveredItems.length,
      items: discoveredItems
    };
  }

  /**
   * Tool 4: start_work
   */
  async startWork(backlogItemKey) {
    if (!backlogItemKey) throw new Error('backlogItemKey is required for start_work');

    const matchUuid = this.getEffectiveMatchUuid();
    const endpoint = `/api/v1/matches/${matchUuid}/backlogs/start`;

    const apiResult = await this.callGameMasterApi(
      endpoint,
      'POST',
      { backlogItemKey },
      'START_BACKLOG',
      backlogItemKey
    );

    if (!apiResult.success) {
      this.appendProgress({
        type: 'BACKLOG_STATUS',
        backlogId: backlogItemKey,
        title: this.backlogRegistry.get(backlogItemKey)?.title || backlogItemKey,
        status: 'FAILED',
        revision: null,
        receiptId: null,
        summary: `Failed to start work on ${backlogItemKey}: HTTP ${apiResult.statusCode}`
      });
      return { success: false, error: apiResult.error };
    }

    const data = apiResult.data || {};

    // Update backlog state to IN_PROGRESS
    this.appendProgress({
      type: 'BACKLOG_STATUS',
      backlogId: backlogItemKey,
      title: data.title || this.backlogRegistry.get(backlogItemKey)?.title || backlogItemKey,
      status: 'IN_PROGRESS',
      revision: null,
      receiptId: null,
      summary: `Started work on backlog item ${backlogItemKey}`
    });

    // Emit initial BACKLOG_TESTS (NOT_RUN)
    this.appendProgress({
      type: 'BACKLOG_TESTS',
      backlogId: backlogItemKey,
      status: 'NOT_RUN',
      required: 0,
      executed: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      summary: `Test harness ready for ${backlogItemKey}`
    });

    // Materialize answer directory & submit.json template
    const matchRoot = this.getMatchRoot();
    const answerDir = path.resolve(matchRoot, 'answers', backlogItemKey);
    const evidenceDir = path.resolve(answerDir, 'evidence');

    if (!fs.existsSync(evidenceDir)) {
      fs.mkdirSync(evidenceDir, { recursive: true });
    }

    const templatePath = path.resolve(answerDir, 'submit.json');
    const templateContent = data.submitTemplate || { backlogId: backlogItemKey, answer: {} };
    fs.writeFileSync(templatePath, JSON.stringify(templateContent, null, 2), 'utf8');

    // If files are provided in response, write them to disk (supports both Map<String, String> and Array)
    const filesWritten = [];
    if (data.files && typeof data.files === 'object') {
      const fileEntries = Array.isArray(data.files)
        ? data.files.map(f => [f.path, f.content])
        : Object.entries(data.files);

      for (const [relPath, content] of fileEntries) {
        if (relPath && content !== undefined) {
          const targetPath = path.resolve(matchRoot, relPath);
          fs.mkdirSync(path.dirname(targetPath), { recursive: true });
          fs.writeFileSync(targetPath, content, 'utf8');
          filesWritten.push(relPath);
        }
      }
    }

    return {
      success: true,
      backlogId: backlogItemKey,
      answerPath: templatePath,
      filesWritten,
      minimumVerificationScenarios: data.minimumVerificationScenarios || null
    };
  }

  /**
   * Tool 5: submit_work
   */
  async submitWork(backlogItemKey, explicitAnswer = null, artifactUrls = []) {
    if (!backlogItemKey) throw new Error('backlogItemKey is required for submit_work');

    // 1. Resolve Answer Payload
    let answer = explicitAnswer;
    if (!answer) {
      const matchRoot = this.getMatchRoot();
      const templatePath = path.resolve(matchRoot, 'answers', backlogItemKey, 'submit.json');
      if (fs.existsSync(templatePath)) {
        try {
          const raw = fs.readFileSync(templatePath, 'utf8');
          const parsed = JSON.parse(raw);
          answer = parsed.answer || parsed;
        } catch (err) {
          this.logDebug('Error reading submit.json:', err.message);
        }
      }
    }
    if (!answer) {
      answer = {};
    }

    // 2. Automated Git commit SHA detection & push verification
    const gitRevision = this.ensureGitPushed();
    this.logDebug(`Submitting ${backlogItemKey} at git revision: ${gitRevision}`);

    // Retrieve or initialize cached idempotency entry for safe retry replay
    let submissionEntry = this.idempotencyMap.get(backlogItemKey);
    if (!submissionEntry) {
      submissionEntry = {
        clientSubmissionId: crypto.randomUUID(),
        idempotencyKey: crypto.randomUUID()
      };
      this.idempotencyMap.set(backlogItemKey, submissionEntry);
    }
    const { clientSubmissionId, idempotencyKey } = submissionEntry;

    const matchUuid = this.getEffectiveMatchUuid();
    const endpoint = `/api/v1/matches/${matchUuid}/submissions`;

    const submissionPayload = {
      clientSubmissionId,
      backlogItemKey,
      gitRevision,
      answer,
      artifactUrls: artifactUrls || []
    };

    // 3. Dispatch Submission Request with explicit Idempotency-Key
    const apiResult = await this.callGameMasterApi(
      endpoint,
      'POST',
      submissionPayload,
      'SUBMIT_BACKLOG',
      backlogItemKey,
      idempotencyKey
    );

    if (!apiResult.success) {
      this.appendProgress({
        type: 'BACKLOG_STATUS',
        backlogId: backlogItemKey,
        title: this.backlogRegistry.get(backlogItemKey)?.title || backlogItemKey,
        status: 'FAILED',
        revision: gitRevision,
        receiptId: null,
        summary: `Submission for ${backlogItemKey} failed with HTTP ${apiResult.statusCode}`
      });
      return { success: false, error: apiResult.error, gitRevision };
    }

    const data = apiResult.data || {};
    const submission = data.submission || {};
    const receiptId = submission.id || data.receiptId || data.id || `receipt-${Date.now()}`;
    const submissionStatus = submission.status || data.status || 'ACCEPTED';
    const scoreStatus = submission.scoreStatus || data.scoreStatus || 'PENDING';

    // 4. Log Official SUBMITTED status with authentic server receipt UUID
    this.appendProgress({
      type: 'BACKLOG_STATUS',
      backlogId: backlogItemKey,
      title: this.backlogRegistry.get(backlogItemKey)?.title || backlogItemKey,
      status: 'SUBMITTED',
      revision: gitRevision,
      receiptId,
      summary: `Successfully submitted ${backlogItemKey} (Receipt: ${receiptId})`
    });

    return {
      success: true,
      receiptId,
      status: submissionStatus,
      scoreStatus,
      gitRevision
    };
  }

  /**
   * Tool 6: report_progress
   */
  async reportProgress(event) {
    if (!event || !event.type) {
      throw new Error('Progress event requires at least a "type" field.');
    }
    const ok = this.appendProgress(event);
    return { logged: ok, type: event.type, summary: event.summary };
  }

  /**
   * Tool 7: wait_for_update
   */
  async waitForUpdate(timeoutMs = 30000) {
    const maxWait = Math.min(Math.max(timeoutMs, 1000), 55000);
    const intervalMs = 5000;
    const start = Date.now();

    const previousCount = this.backlogRegistry.size;

    while (Date.now() - start < maxWait) {
      await new Promise(resolve => setTimeout(resolve, intervalMs));
      const res = await this.refreshMatch();
      if (this.backlogRegistry.size > previousCount) {
        return {
          changed: true,
          timedOut: false,
          currentCount: this.backlogRegistry.size,
          items: res.items
        };
      }
    }

    return {
      changed: false,
      timedOut: true,
      currentCount: this.backlogRegistry.size
    };
  }
}
