#!/usr/bin/env node

/**
 * Autonomous Browser Evidence Runner for MTM Competitions
 * 
 * Provides robust, zero-configuration headless browser automation and screenshot
 * evidence capture without relying on %LOCALAPPDATA%\ms-playwright downloads.
 * Directly detects and utilizes host system Google Chrome or Microsoft Edge binaries.
 */

import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';

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
 * Polls the local dev server until it responds with HTTP 200, 302, 307, or timeout expires.
 */
export async function ensureDevServerReady(baseUrl = 'http://127.0.0.1:3000', timeoutMs = 30000) {
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

    await new Promise(r => setTimeout(r, 1000));
  }

  throw new Error(`Dev server at ${baseUrl} was not reachable within ${timeoutMs}ms.`);
}

/**
 * Captures a screenshot of a specific application route using Playwright + Host Chrome.
 */
export async function captureScreenshot(options) {
  const {
    url,
    output,
    tab = null,
    login = false,
    email = 'morpheusadam95',
    password = 'change-me-please',
    waitForSelector = null,
    width = 1440,
    height = 900
  } = options;

  if (!url) throw new Error('--url is required');
  if (!output) throw new Error('--output is required');

  const browserPath = getSystemBrowserPath();
  let chromium;
  try {
    const playwright = await import('playwright');
    chromium = playwright.chromium;
  } catch {
    const candidates = [
      path.resolve(process.cwd(), 'node_modules', 'playwright', 'index.mjs'),
      path.resolve(process.cwd(), 'src', 'node_modules', 'playwright', 'index.mjs'),
      path.resolve(process.cwd(), '..', 'src', 'node_modules', 'playwright', 'index.mjs'),
      'D:\\mtm\\CPL\\matches\\TISTL6MV\\TISTL6MV\\src\\node_modules\\playwright\\index.mjs'
    ];
    for (const c of candidates) {
      if (fs.existsSync(c)) {
        const mod = await import(`file:///${c.replace(/\\/g, '/')}`);
        chromium = mod.chromium;
        break;
      }
    }
  }

  if (!chromium) {
    throw new Error('Playwright package could not be resolved from local environment or project node_modules.');
  }

  const browser = await chromium.launch({
    headless: true,
    executablePath: browserPath
  });

  try {
    const context = await browser.newContext({
      viewport: { width, height }
    });
    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    page.setDefaultNavigationTimeout(30000);

    const targetUrl = new URL(url);
    const origin = targetUrl.origin;

    if (login) {
      await page.goto(`${origin}/login`, { waitUntil: 'domcontentloaded' });
      const emailInput = page.locator('input[name=email], input[type=email]');
      const passwordInput = page.locator('input[name=password], input[type=password]');

      if (await emailInput.count() && await passwordInput.count()) {
        await emailInput.fill(email);
        await passwordInput.fill(password);
        const submitBtn = page.getByRole('button', { name: /sign in|login|đăng nhập/i });
        if (await submitBtn.count()) {
          await submitBtn.click({ noWaitAfter: true });
          await page.waitForTimeout(2000);
        }
      }
    }

    await page.goto(url, { waitUntil: 'domcontentloaded' });

    if (tab) {
      const tabLocator = page.getByRole('tab', { name: new RegExp(tab, 'i') });
      if (await tabLocator.count()) {
        await tabLocator.click({ force: true });
        await page.waitForTimeout(800);
      }
    }

    if (waitForSelector) {
      await page.waitForSelector(waitForSelector, { timeout: 10000 });
    }

    // Ensure output parent directory exists
    const resolvedOutput = path.resolve(output);
    fs.mkdirSync(path.dirname(resolvedOutput), { recursive: true });

    await page.screenshot({ path: resolvedOutput, fullPage: false });
    console.log(`[Evidence Runner] Successfully captured screenshot -> ${resolvedOutput}`);
    return resolvedOutput;
  } finally {
    await browser.close();
  }
}

// CLI entrypoint
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command || command === 'help') {
    console.log(`
Usage:
  node evidence-runner.mjs check-browser
  node evidence-runner.mjs check-server [--url <url>]
  node evidence-runner.mjs screenshot --url <url> --output <path> [--tab <name>] [--login] [--waitFor <selector>]
`);
    process.exit(0);
  }

  if (command === 'check-browser') {
    const bPath = getSystemBrowserPath();
    console.log(`[PASS] Host browser detected: ${bPath}`);
    process.exit(0);
  }

  if (command === 'check-server') {
    const urlIdx = args.indexOf('--url');
    const url = urlIdx !== -1 ? args[urlIdx + 1] : 'http://127.0.0.1:3000';
    await ensureDevServerReady(url);
    console.log(`[PASS] Dev server is ready at ${url}`);
    process.exit(0);
  }

  if (command === 'screenshot') {
    const getArg = (flag) => {
      const idx = args.indexOf(flag);
      return idx !== -1 && args[idx + 1] ? args[idx + 1] : null;
    };

    const url = getArg('--url');
    const output = getArg('--output');
    const tab = getArg('--tab');
    const waitForSelector = getArg('--waitFor');
    const login = args.includes('--login');

    await captureScreenshot({
      url,
      output,
      tab,
      login,
      waitForSelector
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
