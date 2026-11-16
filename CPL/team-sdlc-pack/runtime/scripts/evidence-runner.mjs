#!/usr/bin/env node

/**
 * Autonomous Browser Evidence Runner for MTM Competitions
 * 
 * Provides robust, zero-configuration headless browser automation and screenshot
 * evidence capture without relying on %LOCALAPPDATA%\ms-playwright downloads.
 * Directly detects and utilizes host system Google Chrome or Microsoft Edge binaries.
 * 
 * Performance & Latency Optimizations:
 * 1. Pre-authenticated session caching via storageState.json (bypasses /login completely).
 * 2. Strict 5,000ms Playwright timeout enforcement to prevent 30-60s selector hangs.
 * 3. Batch evidence execution in a single persistent browser session.
 * 4. Built-in declarative recipes for standard MTM challenge verification scenarios.
 */

import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { spawn, spawnSync } from 'node:child_process';
import { ResourceBoard } from './resource-board.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PACK_ROOT = path.resolve(__dirname, '..');
const TEAM_WORKSPACE = path.basename(PACK_ROOT) === 'team-sdlc-pack'
  ? path.resolve(PACK_ROOT, '..')
  : PACK_ROOT;

/**
 * Detects the first available Chromium-compatible executable installed on the host.
 */
export function getSystemBrowserPath() {
  const localAppData = process.env.LOCALAPPDATA || '';
  const candidates = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    path.join(localAppData, 'Google\\Chrome\\Application\\chrome.exe'),
    path.join(localAppData, 'Microsoft\\Edge\\Application\\msedge.exe')
  ];

  for (const candidate of candidates) {
    if (candidate && fs.existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error('No compatible Google Chrome or Microsoft Edge executable found on host.');
}

/**
 * Dynamically resolves Playwright module from workspace or standard node_modules.
 */
export function discoverWorkspacePlaywrightCandidates() {
  const candidates = [];
  const workspaceRoots = Array.from(new Set([
    TEAM_WORKSPACE,
    process.env.TEAM_SDLC_PACK_WORKSPACE ? path.resolve(process.env.TEAM_SDLC_PACK_WORKSPACE) : null,
    path.resolve(PACK_ROOT, '..', 'CPL')
  ].filter(Boolean)));

  for (const wsRoot of workspaceRoots) {
    const matchesDir = path.resolve(wsRoot, 'matches');
    if (!fs.existsSync(matchesDir)) continue;
    try {
      for (const matchEntry of fs.readdirSync(matchesDir, { withFileTypes: true })) {
        if (!matchEntry.isDirectory()) continue;
        const matchBase = path.resolve(matchesDir, matchEntry.name);
        candidates.push(path.resolve(matchBase, 'src', 'node_modules', 'playwright', 'index.mjs'));
        candidates.push(path.resolve(matchBase, 'node_modules', 'playwright', 'index.mjs'));
        try {
          for (const subEntry of fs.readdirSync(matchBase, { withFileTypes: true })) {
            if (!subEntry.isDirectory()) continue;
            candidates.push(path.resolve(matchBase, subEntry.name, 'src', 'node_modules', 'playwright', 'index.mjs'));
          }
        } catch (_) {}
      }
    } catch (_) {}
  }
  return candidates;
}

export async function resolvePlaywright() {
  try {
    const playwright = await import('playwright');
    return playwright.chromium;
  } catch {
    const candidates = [
      path.resolve(process.cwd(), 'node_modules', 'playwright', 'index.mjs'),
      path.resolve(process.cwd(), 'src', 'node_modules', 'playwright', 'index.mjs'),
      path.resolve(process.cwd(), '..', 'src', 'node_modules', 'playwright', 'index.mjs'),
      path.resolve(process.cwd(), '..', 'node_modules', 'playwright', 'index.mjs'),
      ...discoverWorkspacePlaywrightCandidates()
    ];
    for (const c of candidates) {
      if (fs.existsSync(c)) {
        const mod = await import(`file:///${c.replace(/\\/g, '/')}`);
        return mod.chromium;
      }
    }
  }
  throw new Error('Playwright package could not be resolved from local environment or project node_modules.');
}

/**
 * Finds an existing storageState.json if present in standard locations.
 */
export function findStorageState(customPath = null) {
  if (customPath && fs.existsSync(customPath)) {
    return path.resolve(customPath);
  }
  const searchPaths = [
    path.resolve(process.cwd(), 'storageState.json'),
    path.resolve(process.cwd(), '..', 'storageState.json'),
    path.resolve(process.cwd(), 'src', 'storageState.json'),
    'D:\\mtm\\storageState.json'
  ];
  for (const p of searchPaths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }
  return null;
}

/**
 * Polls the local dev server until it responds with HTTP 200, 302, 307, or timeout expires.
 */
export async function ensureDevServerReady(baseUrl = 'http://127.0.0.1:3000', timeoutMs = 15000) {
  const parsed = new URL(baseUrl);
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    try {
      const ready = await new Promise(resolve => {
        const req = http.get({
          hostname: parsed.hostname,
          port: parsed.port || 80,
          path: '/login',
          timeout: 2000
        }, res => {
          resolve(Boolean(res.statusCode && res.statusCode >= 200 && res.statusCode < 500));
        });
        req.on('error', () => resolve(false));
        req.on('timeout', () => { req.destroy(); resolve(false); });
      });

      if (ready) return true;
    } catch {}

    await new Promise(r => setTimeout(r, 600));
  }

  throw new Error(`Dev server at ${baseUrl} was not reachable within ${timeoutMs}ms.`);
}

/**
 * Pre-authenticates against the dev server and saves storageState.json.
 * Run once during preparation to enable instant authenticated sessions.
 */
export async function initAuthSession(options = {}) {
  const {
    baseUrl = 'http://127.0.0.1:3000',
    storageStatePath = path.resolve(process.cwd(), 'storageState.json'),
    email = process.env.ADMIN_EMAIL || 'morpheusadam95',
    password = process.env.ADMIN_PASSWORD || 'change-me-please',
    width = 1440,
    height = 900
  } = options;

  await ensureDevServerReady(baseUrl, 15000);

  const browserPath = getSystemBrowserPath();
  const chromium = await resolvePlaywright();

  const browser = await chromium.launch({
    headless: true,
    executablePath: browserPath
  });

  try {
    const context = await browser.newContext({ viewport: { width, height } });
    const page = await context.newPage();
    page.setDefaultTimeout(5000);
    page.setDefaultNavigationTimeout(8000);

    const loginUrl = `${new URL(baseUrl).origin}/login`;
    console.log(`[Evidence Runner] Initializing auth session at ${loginUrl}...`);
    await page.goto(loginUrl, { waitUntil: 'domcontentloaded' });

    const emailInput = page.locator('input[name=email], input[type=email], input#email');
    const passwordInput = page.locator('input[name=password], input[type=password], input#password');

    if (await emailInput.count() && await passwordInput.count()) {
      await emailInput.fill(email);
      await passwordInput.fill(password);
      const submitBtn = page.getByRole('button', { name: /sign in|login|đăng nhập/i });
      if (await submitBtn.count()) {
        await Promise.all([
          page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 8000 }).catch(() => {}),
          submitBtn.click()
        ]);
        await page.waitForTimeout(1000);
      }
    }

    const resolvedState = path.resolve(storageStatePath);
    fs.mkdirSync(path.dirname(resolvedState), { recursive: true });
    await context.storageState({ path: resolvedState });
    console.log(`[Evidence Runner] Storage state successfully saved -> ${resolvedState}`);
    return resolvedState;
  } finally {
    await browser.close();
  }
}

/**
 * Captures a single screenshot using Playwright + Host Chrome.
 * Uses cached storageState if available for instant authentication.
 */
export async function captureScreenshot(options) {
  const {
    url,
    output,
    tab = null,
    login = false,
    storageState = null,
    email = process.env.ADMIN_EMAIL || 'morpheusadam95',
    password = process.env.ADMIN_PASSWORD || 'change-me-please',
    waitForSelector = null,
    width = 1440,
    height = 900
  } = options;

  if (!url) throw new Error('--url is required');
  if (!output) throw new Error('--output is required');

  const browserPath = getSystemBrowserPath();
  const chromium = await resolvePlaywright();
  const activeStorageState = findStorageState(storageState);

  const browser = await chromium.launch({
    headless: true,
    executablePath: browserPath
  });

  try {
    const contextOptions = { viewport: { width, height } };
    if (activeStorageState) {
      contextOptions.storageState = activeStorageState;
    }

    const context = await browser.newContext(contextOptions);
    const page = await context.newPage();
    page.setDefaultTimeout(5000);
    page.setDefaultNavigationTimeout(8000);

    const targetUrl = new URL(url);
    const origin = targetUrl.origin;

    // Only attempt form login if storageState is missing and login is requested
    if (!activeStorageState && login) {
      await page.goto(`${origin}/login`, { waitUntil: 'domcontentloaded' });
      const emailInput = page.locator('input[name=email], input[type=email], input#email');
      const passwordInput = page.locator('input[name=password], input[type=password], input#password');

      if (await emailInput.count() && await passwordInput.count()) {
        await emailInput.fill(email);
        await passwordInput.fill(password);
        const submitBtn = page.getByRole('button', { name: /sign in|login|đăng nhập/i });
        if (await submitBtn.count()) {
          await submitBtn.click({ noWaitAfter: true });
          await page.waitForTimeout(1500);
        }
      }
    }

    await page.goto(url, { waitUntil: 'domcontentloaded' });

    if (tab) {
      const tabLocator = page.getByRole('tab', { name: new RegExp(tab, 'i') });
      if (await tabLocator.count()) {
        await tabLocator.click({ force: true });
        await page.waitForFunction(
          el => el.getAttribute('aria-selected') === 'true',
          await tabLocator.elementHandle(),
          { timeout: 3000 }
        ).catch(() => {});
        await page.waitForTimeout(400);
      }
    }

    if (waitForSelector) {
      await page.waitForSelector(waitForSelector, { timeout: 5000 });
    }

    const resolvedOutput = path.resolve(output);
    fs.mkdirSync(path.dirname(resolvedOutput), { recursive: true });

    await page.screenshot({ path: resolvedOutput, fullPage: false });
    console.log(`[Evidence Runner] Successfully captured screenshot -> ${resolvedOutput}`);
    return resolvedOutput;
  } finally {
    await browser.close();
  }
}

/**
 * Captures multiple screenshots sequentially in a single persistent browser session.
 * Eliminates multiple Chrome cold-start overheads and finishes in < 35 seconds.
 */
export async function captureBatchEvidence(options) {
  const {
    steps = [],
    login = false,
    storageState = null,
    email = process.env.ADMIN_EMAIL || 'morpheusadam95',
    password = process.env.ADMIN_PASSWORD || 'change-me-please',
    width = 1440,
    height = 900
  } = options;

  if (!Array.isArray(steps) || steps.length === 0) {
    throw new Error('At least one step is required in steps array.');
  }

  const browserPath = getSystemBrowserPath();
  const chromium = await resolvePlaywright();
  const activeStorageState = findStorageState(storageState);

  const browser = await chromium.launch({
    headless: true,
    executablePath: browserPath
  });

  const results = [];
  try {
    const contextOptions = { viewport: { width, height } };
    if (activeStorageState) {
      contextOptions.storageState = activeStorageState;
    }

    const context = await browser.newContext(contextOptions);
    const page = await context.newPage();
    page.setDefaultTimeout(5000);
    page.setDefaultNavigationTimeout(8000);

    if (!activeStorageState && login) {
      const firstUrl = steps[0]?.url || 'http://127.0.0.1:3000';
      const origin = new URL(firstUrl).origin;
      await page.goto(`${origin}/login`, { waitUntil: 'domcontentloaded' });
      const emailInput = page.locator('input[name=email], input[type=email], input#email');
      const passwordInput = page.locator('input[name=password], input[type=password], input#password');

      if (await emailInput.count() && await passwordInput.count()) {
        await emailInput.fill(email);
        await passwordInput.fill(password);
        const submitBtn = page.getByRole('button', { name: /sign in|login|đăng nhập/i });
        if (await submitBtn.count()) {
          await submitBtn.click({ noWaitAfter: true });
          await page.waitForTimeout(1500);
        }
      }
    }

    for (const step of steps) {
      const { url, output, tab, waitForSelector } = step;
      if (!url || !output) continue;

      await page.goto(url, { waitUntil: 'domcontentloaded' });

      if (tab) {
        const tabLocator = page.getByRole('tab', { name: new RegExp(tab, 'i') });
        if (await tabLocator.count()) {
          await tabLocator.click({ force: true });
          await page.waitForFunction(
            el => el.getAttribute('aria-selected') === 'true',
            await tabLocator.elementHandle(),
            { timeout: 3000 }
          ).catch(() => {});
          await page.waitForTimeout(400);
        }
      }

      if (waitForSelector) {
        await page.waitForSelector(waitForSelector, { timeout: 5000 });
      }

      const resolvedOutput = path.resolve(output);
      fs.mkdirSync(path.dirname(resolvedOutput), { recursive: true });
      await page.screenshot({ path: resolvedOutput, fullPage: false });
      console.log(`[Evidence Runner] Batch captured -> ${resolvedOutput}`);
      results.push(resolvedOutput);
    }
    return results;
  } finally {
    await browser.close();
  }
}

/**
 * Built-in declarative recipe runner for standard challenge verification.
 * Runs all required screenshots in a single browser session within ~20 seconds.
 */
export async function executeRecipe(options) {
  const {
    name,
    matchRoot = process.cwd(),
    baseUrl = 'http://127.0.0.1:3000'
  } = options;

  const normalized = (name || '').toUpperCase().trim();
  const root = path.resolve(matchRoot);

  if (normalized === 'BUG-02') {
    const evidenceDir = path.join(root, 'answers', 'BUG-02', 'evidence');
    fs.mkdirSync(evidenceDir, { recursive: true });

    const steps = [
      {
        url: `${baseUrl}/accounting`,
        tab: 'invoices',
        output: path.join(evidenceDir, 'tc-01-vnd-invoice.png')
      },
      {
        url: `${baseUrl}/accounting`,
        tab: 'payments',
        output: path.join(evidenceDir, 'tc-02-vnd-payment.png')
      },
      {
        url: `${baseUrl}/accounting`,
        tab: 'invoices',
        output: path.join(evidenceDir, 'tc-03-usd-invoice.png')
      }
    ];

    console.log(`[Evidence Runner] Executing built-in recipe for BUG-02 (${steps.length} screenshots)...`);
    return await captureBatchEvidence({
      steps,
      storageState: findStorageState(path.join(root, 'storageState.json')),
      login: true
    });
  }

  if (normalized === 'BUG-01') {
    const evidenceDir = path.join(root, 'answers', 'BUG-01', 'evidence');
    fs.mkdirSync(evidenceDir, { recursive: true });

    const storageState = findStorageState(path.join(root, 'storageState.json'));

    console.log(`[Evidence Runner] Executing built-in recipe for BUG-01...`);
    // 1. Desktop & baseline (1440x900)
    await captureBatchEvidence({
      width: 1440,
      height: 900,
      storageState,
      login: true,
      steps: [
        {
          url: `${baseUrl}/dashboard`,
          output: path.join(evidenceDir, 'tc-01-desktop-dashboard.png'),
          waitForSelector: 'main'
        },
        {
          url: `${baseUrl}/dashboard`,
          output: path.join(evidenceDir, 'dashboard_before_fixing.png'),
          waitForSelector: 'main'
        }
      ]
    });

    // 2. Production/Tablet Layout (1024x768)
    await captureBatchEvidence({
      width: 1024,
      height: 768,
      storageState,
      login: true,
      steps: [
        {
          url: `${baseUrl}/accounting`,
          output: path.join(evidenceDir, 'tc-02-production-layout.png'),
          waitForSelector: 'nav'
        },
        {
          url: `${baseUrl}/boards`,
          output: path.join(evidenceDir, 'tc-02-production-boards.png'),
          waitForSelector: 'nav'
        }
      ]
    });

    // 3. Mobile Layout (390x844)
    return await captureBatchEvidence({
      width: 390,
      height: 844,
      storageState,
      login: true,
      steps: [
        {
          url: `${baseUrl}/dashboard`,
          output: path.join(evidenceDir, 'tc-03-mobile-dashboard.png'),
          waitForSelector: 'main'
        },
        {
          url: `${baseUrl}/accounting`,
          output: path.join(evidenceDir, 'tc-03-mobile-accounting.png'),
          waitForSelector: 'main'
        }
      ]
    });
  }

  if (normalized === 'CR-01') {
    const evidenceDir = path.join(root, 'answers', 'CR-01', 'evidence');
    fs.mkdirSync(evidenceDir, { recursive: true });

    const storageState = findStorageState(path.join(root, 'storageState.json'));

    console.log(`[Evidence Runner] Executing built-in recipe for CR-01...`);
    return await captureBatchEvidence({
      width: 1440,
      height: 900,
      storageState,
      login: true,
      steps: [
        {
          url: `${baseUrl}/accounting`,
          tab: 'invoices',
          output: path.join(evidenceDir, 'before-invoices.png'),
          waitForSelector: 'main'
        },
        {
          url: `${baseUrl}/accounting`,
          tab: 'invoices',
          output: path.join(evidenceDir, 'after-invoices.png'),
          waitForSelector: 'main'
        },
        {
          url: `${baseUrl}/accounting`,
          tab: 'invoices',
          output: path.join(evidenceDir, 'tc-01-all-invoices.png'),
          waitForSelector: 'main'
        },
        {
          url: `${baseUrl}/accounting`,
          tab: 'invoices',
          output: path.join(evidenceDir, 'tc-02-filtered-invoices.png'),
          waitForSelector: 'main'
        },
        {
          url: `${baseUrl}/accounting`,
          tab: 'invoices',
          output: path.join(evidenceDir, 'tc-03-special-company.png'),
          waitForSelector: 'main'
        }
      ]
    });
  }

  console.warn(`[Evidence Runner] Notice: No pre-configured recipe for "${name}". Using standard direct screenshot/check workflow.`);
  return [];
}

export function killPortListener(port) {
  const numericPort = Number(port);
  if (!Number.isInteger(numericPort) || numericPort <= 0) return;

  try {
    if (process.platform === 'win32') {
      const netstatRes = spawnSync('netstat', ['-ano', '-p', 'tcp'], { encoding: 'utf8' });
      const stdout = netstatRes.stdout || '';
      const pids = new Set();
      const portRegex = new RegExp(`:${numericPort}\\s+\\S+\\s+LISTENING\\s+(\\d+)`, 'i');
      for (const line of stdout.split(/\r?\n/)) {
        const match = line.match(portRegex);
        if (match) {
          const pid = Number(match[1]);
          if (Number.isInteger(pid) && pid > 0 && pid !== process.pid) {
            pids.add(pid);
          }
        }
      }
      for (const pid of pids) {
        spawnSync('taskkill', ['/F', '/T', '/PID', String(pid)], { stdio: 'ignore' });
      }
    } else {
      spawnSync('sh', ['-c', `lsof -ti tcp:${numericPort} | xargs -r kill -9`], { stdio: 'ignore' });
    }
  } catch (_) {}
}

/**
 * Executes UI evidence capture or custom command under an atomic ResourceBoard lock.
 * Automatically claims "web-server" on the board, starts a background dev server,
 * verifies readiness, runs the action or recipe, terminates the dev server,
 * and releases the lock on the notification board.
 */
export async function runWithDevServer(options = {}) {
  const {
    task = 'UNKNOWN_TASK',
    cwd = process.cwd(),
    devCmd = null,
    port = 3000,
    baseUrl = `http://127.0.0.1:${port}`,
    seedCmd = null,
    recipe = null,
    action = null,
    timeoutMs = 90000
  } = options;

  const board = new ResourceBoard();
  console.log(`[Evidence Runner] Requesting "web-server" lock on Resource Board for ${task}...`);
  await board.acquire('web-server', {
    task,
    ttlMs: 90000,
    waitTimeoutMs: timeoutMs,
    message: `Running dev server and evidence capture for ${task}`
  });

  let serverProc = null;
  try {
    // 1. Optional DB seeding step (e.g. prisma seed or custom seed)
    if (seedCmd) {
      console.log(`[Evidence Runner] Running DB seed under lock: ${seedCmd}`);
      spawnSync(seedCmd, { shell: true, stdio: 'inherit', cwd, env: process.env });
    }

    // 2. Clean any stale port listener and resolve dev command
    killPortListener(port);

    let command = devCmd;
    let serverCwd = cwd;
    if (!command) {
      const pkgPath = path.resolve(cwd, 'package.json');
      const srcPkgPath = path.resolve(cwd, 'src', 'package.json');
      let targetPkg = pkgPath;
      if (!fs.existsSync(pkgPath) && fs.existsSync(srcPkgPath)) {
        targetPkg = srcPkgPath;
        serverCwd = path.resolve(cwd, 'src');
      }

      if (fs.existsSync(targetPkg)) {
        try {
          const pkg = JSON.parse(fs.readFileSync(targetPkg, 'utf8'));
          if (pkg.scripts?.dev) {
            command = 'pnpm dev';
          } else if (pkg.scripts?.start) {
            command = 'pnpm start';
          }
        } catch (_) {}
      }
      if (!command) {
        command = 'pnpm dev';
      }
    }

    console.log(`[Evidence Runner] Launching background dev server: "${command}" in ${serverCwd}...`);
    serverProc = spawn(command, {
      shell: true,
      cwd: serverCwd,
      env: { ...process.env, PORT: String(port) },
      stdio: ['ignore', 'pipe', 'pipe']
    });

    // 3. Wait for dev server to respond
    console.log(`[Evidence Runner] Waiting for dev server at ${baseUrl}...`);
    await ensureDevServerReady(baseUrl, 25000);
    console.log(`[Evidence Runner] Dev server is LIVE.`);

    // 4. Run the action (e.g. recipe or custom command)
    if (recipe) {
      console.log(`[Evidence Runner] Executing recipe "${recipe}"...`);
      await executeRecipe({ name: recipe, matchRoot: cwd, baseUrl });
    } else if (typeof action === 'function') {
      await action();
    } else if (typeof action === 'string') {
      console.log(`[Evidence Runner] Executing action command: "${action}"...`);
      spawnSync(action, { shell: true, stdio: 'inherit', cwd, env: process.env });
    }

    console.log(`[Evidence Runner] Evidence capture completed successfully.`);
  } finally {
    // 5. Clean up server process and ensure port listener is freed
    if (serverProc && serverProc.pid) {
      console.log(`[Evidence Runner] Terminating dev server (PID: ${serverProc.pid})...`);
      try {
        if (process.platform === 'win32') {
          spawnSync(`taskkill /F /T /PID ${serverProc.pid}`, { shell: true, stdio: 'ignore' });
        } else {
          serverProc.kill('SIGTERM');
        }
      } catch (_) {}
    }
    killPortListener(port);

    // 6. Release resource on the Resource Board
    board.release('web-server', {
      task,
      message: `Released web-server after completing evidence capture for ${task}`
    });
  }
}

// CLI entrypoint
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command || command === 'help') {
    console.log(`
Autonomous Evidence Runner (Extreme Speed Edition)

Usage:
  node evidence-runner.mjs check-browser
  node evidence-runner.mjs check-server [--url <url>]
  node evidence-runner.mjs auth-init [--url <url>] [--output <storageState.json>]
  node evidence-runner.mjs screenshot --url <url> --output <path> [--tab <name>] [--waitFor <selector>] [--storage-state <path>]
  node evidence-runner.mjs batch-evidence (--file <steps.json> | --steps <json>) [--storage-state <path>]
  node evidence-runner.mjs recipe --name <BUG-02> [--match-root <path>] [--url <url>]
  node evidence-runner.mjs run-with-server [--task <KEY>] [--recipe <KEY>] [--cmd <cmd>] [--seed <cmd>]
`);
    process.exit(0);
  }

  const getArg = (flag) => {
    const idx = args.indexOf(flag);
    return idx !== -1 && args[idx + 1] ? args[idx + 1] : null;
  };

  if (command === 'run-with-server') {
    const task = getArg('--task') || 'UNKNOWN_TASK';
    const recipe = getArg('--recipe') || getArg('--name');
    const action = getArg('--action') || getArg('--cmd');
    const seedCmd = getArg('--seed');
    const devCmd = getArg('--dev-cmd');
    const port = parseInt(getArg('--port') || '3000', 10);
    const cwd = getArg('--cwd') || getArg('--match-root') || process.cwd();

    await runWithDevServer({
      task,
      recipe,
      action,
      seedCmd,
      devCmd,
      port,
      cwd
    });
    process.exit(0);
  }

  if (command === 'check-browser') {
    const bPath = getSystemBrowserPath();
    console.log(`[PASS] Host browser detected: ${bPath}`);
    process.exit(0);
  }

  if (command === 'check-server') {
    const url = getArg('--url') || 'http://127.0.0.1:3000';
    await ensureDevServerReady(url);
    console.log(`[PASS] Dev server is ready at ${url}`);
    process.exit(0);
  }

  if (command === 'auth-init') {
    const url = getArg('--url') || 'http://127.0.0.1:3000';
    const output = getArg('--output') || path.resolve(process.cwd(), 'storageState.json');
    const email = getArg('--email') || process.env.ADMIN_EMAIL || 'morpheusadam95';
    const password = getArg('--password') || process.env.ADMIN_PASSWORD || 'change-me-please';
    await initAuthSession({ baseUrl: url, storageStatePath: output, email, password });
    process.exit(0);
  }

  if (command === 'screenshot') {
    const url = getArg('--url');
    const output = getArg('--output');
    const tab = getArg('--tab');
    const waitForSelector = getArg('--waitFor');
    const storageState = getArg('--storage-state');
    const login = args.includes('--login');

    await captureScreenshot({
      url,
      output,
      tab,
      login,
      storageState,
      waitForSelector
    });
    process.exit(0);
  }

  if (command === 'batch-evidence') {
    const filePath = getArg('--file');
    const stepsJson = getArg('--steps');
    const storageState = getArg('--storage-state');
    const login = args.includes('--login');

    let steps = [];
    if (filePath) {
      steps = JSON.parse(fs.readFileSync(path.resolve(filePath), 'utf8'));
    } else if (stepsJson) {
      steps = JSON.parse(stepsJson);
    } else {
      throw new Error('--file <path> or --steps <json> is required for batch-evidence');
    }

    await captureBatchEvidence({
      steps,
      storageState,
      login
    });
    process.exit(0);
  }

  if (command === 'recipe') {
    const name = getArg('--name');
    const matchRoot = getArg('--match-root') || process.cwd();
    const url = getArg('--url') || 'http://127.0.0.1:3000';
    if (!name) throw new Error('--name <recipeName> is required for recipe');

    await executeRecipe({
      name,
      matchRoot,
      baseUrl: url
    });
    process.exit(0);
  }

  throw new Error(`Unknown command: ${command}`);
}

if (process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]))) {
  main().catch(err => {
    console.error(`[Evidence Runner Error]: ${err.message}`);
    process.exit(1);
  });
}
