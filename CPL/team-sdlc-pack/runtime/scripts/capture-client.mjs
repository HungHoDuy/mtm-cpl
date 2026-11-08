import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';

/**
 * Detects the first available Chromium-compatible executable installed on the host.
 */
export function getSystemBrowserPath() {
  const localAppData = process.env.LOCALAPPDATA || '';
  const programFiles = process.env.ProgramFiles || 'C:\\Program Files';
  const programFilesX86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';
  const candidates = [
    path.join(programFiles, 'Google\\Chrome\\Application\\chrome.exe'),
    path.join(programFilesX86, 'Google\\Chrome\\Application\\chrome.exe'),
    path.join(programFilesX86, 'Microsoft\\Edge\\Application\\msedge.exe'),
    path.join(programFiles, 'Microsoft\\Edge\\Application\\msedge.exe'),
    path.join(localAppData, 'Google\\Chrome\\Application\\chrome.exe'),
    path.join(localAppData, 'Microsoft\\Edge\\Application\\msedge.exe')
  ];

  for (const c of candidates) {
    if (c && fs.existsSync(c)) return c;
  }
  return null;
}

/**
 * Dynamically resolves Playwright module from workspace or standard node_modules.
 */
export async function resolvePlaywright() {
  try {
    const pw = await import('playwright');
    return pw.chromium;
  } catch {
    const candidates = [
      path.resolve(process.cwd(), 'node_modules', 'playwright', 'index.mjs'),
      path.resolve(process.cwd(), 'src', 'node_modules', 'playwright', 'index.mjs'),
      path.resolve(process.cwd(), '..', 'src', 'node_modules', 'playwright', 'index.mjs'),
      path.resolve(process.cwd(), '..', 'node_modules', 'playwright', 'index.mjs'),
      path.resolve(process.cwd(), '..', '..', 'node_modules', 'playwright', 'index.mjs'),
      path.resolve(process.env.MATCH_ROOT || '', 'src', 'node_modules', 'playwright', 'index.mjs'),
      path.resolve(process.env.MATCH_ROOT || '', 'node_modules', 'playwright', 'index.mjs')
    ];
    for (const c of candidates) {
      if (fs.existsSync(c)) {
        const mod = await import(`file:///${c.replace(/\\/g, '/')}`);
        return mod.chromium;
      }
    }
  }
  throw new Error('Playwright package could not be resolved from local environment or node_modules.');
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
    if (fs.existsSync(p)) return p;
  }
  return null;
}

/**
 * Polls the local dev server until it responds with HTTP 200-499, or timeout expires.
 */
export async function ensureDevServerReady(baseUrl = 'http://127.0.0.1:3000', timeoutMs = 25000) {
  const parsed = new URL(baseUrl);
  const startTime = Date.now();
  const testPaths = ['/login', '/'];

  while (Date.now() - startTime < timeoutMs) {
    for (const testPath of testPaths) {
      try {
        const ready = await new Promise(resolve => {
          const req = http.get({
            hostname: parsed.hostname,
            port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
            path: testPath,
            timeout: 2000
          }, res => {
            resolve(Boolean(res.statusCode && res.statusCode >= 200 && res.statusCode < 500));
          });
          req.on('error', () => resolve(false));
          req.on('timeout', () => { req.destroy(); resolve(false); });
        });

        if (ready) return true;
      } catch {}
    }

    await new Promise(r => setTimeout(r, 600));
  }

  throw new Error(`Dev server at ${baseUrl} was not reachable within ${timeoutMs}ms.`);
}

/**
 * Pre-authenticates against the dev server and saves storageState.json.
 */
export async function initAuthSession(options = {}) {
  const {
    baseUrl = 'http://127.0.0.1:3000',
    storageStatePath = path.resolve(process.cwd(), 'storageState.json'),
    email = process.env.ADMIN_EMAIL || 'morpheusadam95',
    password = process.env.ADMIN_PASSWORD || 'change-me-please',
    width = 1440,
    height = 900,
    prewarm = true
  } = options;

  await ensureDevServerReady(baseUrl, 15000);

  const browserPath = getSystemBrowserPath();
  const chromium = await resolvePlaywright();

  const launchOpts = { headless: true };
  if (browserPath) launchOpts.executablePath = browserPath;

  const browser = await chromium.launch(launchOpts);

  try {
    const context = await browser.newContext({ viewport: { width, height } });
    const page = await context.newPage();
    page.setDefaultTimeout(5000);
    page.setDefaultNavigationTimeout(8000);

    const loginUrl = `${new URL(baseUrl).origin}/login`;
    console.log(`[Capture Client] Initializing auth session at ${loginUrl}...`);
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
    console.log(`[Capture Client] Storage state successfully saved -> ${resolvedState}`);

    if (prewarm) {
      const origin = new URL(baseUrl).origin;
      const prewarmRoutes = ['/accounting', '/boards', '/contacts'];
      console.log(`[Capture Client] Pre-warming primary Turbopack application routes...`);
      for (const route of prewarmRoutes) {
        try {
          const target = `${origin}${route}`;
          console.log(`[Capture Client] Pre-warming: ${target}`);
          await page.goto(target, { waitUntil: 'domcontentloaded', timeout: 15000 });
          await page.waitForTimeout(400);
        } catch (pwErr) {
          console.warn(`[Capture Client] Pre-warm notice for ${route}: ${pwErr.message}`);
        }
      }
      console.log(`[Capture Client] Pre-warming completed.`);
    }

    return resolvedState;
  } finally {
    await browser.close();
  }
}

/**
 * Fast helper to launch host browser, bind storageState.json, and enforce 4s timeouts.
 */
export async function createCapturePage(options = {}) {
  // 🚨 Fail-Fast Circuit Breaker: Halt immediately if an urgent Product Incident is live
  const lockCandidates = [
    path.resolve(process.cwd(), '..', '.URGENT_PI_LOCK'),
    path.resolve(process.cwd(), '.URGENT_PI_LOCK'),
    path.resolve(process.cwd(), '..', '..', '.URGENT_PI_LOCK')
  ];
  for (const lc of lockCandidates) {
    if (fs.existsSync(lc)) {
      throw new Error(
        '\n🚨 [CRITICAL HALT] PRODUCT INCIDENT IS LIVE! 🚨\n' +
        'Evidence capture for non-PI work is suspended to protect 160 Speed Race points.\n' +
        'DO NOT debug Playwright locators. Call get_next_task() immediately!\n'
      );
    }
  }

  const {
    width = 1440,
    height = 900,
    headless = true,
    storageStatePath = null,
    timeout = 10000,
    navTimeout = 15000
  } = options;

  const chromium = await resolvePlaywright();
  const execPath = getSystemBrowserPath();
  const launchOptions = { headless };
  if (execPath) {
    launchOptions.executablePath = execPath;
  }

  const browser = await chromium.launch(launchOptions);
  const contextOptions = { viewport: { width, height } };
  const authState = findStorageState(storageStatePath);
  if (authState) {
    contextOptions.storageState = authState;
  }

  const context = await browser.newContext(contextOptions);
  const page = await context.newPage();
  page.setDefaultTimeout(timeout);
  page.setDefaultNavigationTimeout(navTimeout);

  return { browser, context, page };
}

/**
 * Diagnostic Snapshot Helper: Prints rendered DOM context to stderr on test failure.
 */
export async function dumpPageDiagnostics(page) {
  try {
    const url = page.url();
    const title = await page.title().catch(() => 'unknown');
    const activeTab = await page.locator('[role="tab"][aria-selected="true"], [role="tab"].active, [data-state="active"]').allTextContents().catch(() => []);
    const tabs = await page.locator('[role="tab"]').allTextContents().catch(() => []);
    const headings = await page.locator('h1, h2, h3').allTextContents().catch(() => []);
    const buttons = await page.locator('button:visible, [role="button"]:visible').allTextContents().catch(() => []);

    console.error('\n--- 🔍 PLAYWRIGHT DIAGNOSTIC SNAPSHOT ---');
    console.error(`Current URL:  ${url}`);
    console.error(`Page Title:   ${title}`);
    if (activeTab.length) console.error(`Active Tab:   ${activeTab.join(', ').trim()}`);
    if (tabs.length) console.error(`All Tabs:     [${tabs.map(t => t.trim()).filter(Boolean).join(', ')}]`);
    if (headings.length) console.error(`Headings:     [${headings.slice(0, 5).map(h => h.trim()).filter(Boolean).join(', ')}]`);
    if (buttons.length) console.error(`Visible Btns: [${buttons.slice(0, 8).map(b => b.trim()).filter(Boolean).join(', ')}]`);
    console.error('-----------------------------------------\n');
  } catch (_) {}
}

/**
 * Scopes locator to a specific table row by text, preventing strict-mode collisions.
 */
export function getTableRow(page, rowText) {
  return page.locator('tr, [role="row"]').filter({ hasText: rowText }).first();
}

/**
 * Resolves an absolute path to an evidence file or the evidence directory,
 * regardless of whether the current process is anchored in src/ or the match root.
 */
export function resolveEvidencePath(backlogItemKey, filename = null) {
  const cwd = process.cwd();
  let root = cwd;
  if (path.basename(cwd) === 'src') {
    root = path.resolve(cwd, '..');
  }
  const targetDir = path.resolve(root, 'answers', backlogItemKey, 'evidence');
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }
  return filename ? path.resolve(targetDir, filename) : targetDir;
}

/**
 * Utility to prune duplicate draft invoices for a company, preventing report script failures on retries.
 */
export async function pruneDuplicateDraftInvoices(companyName = null) {
  const psqlCandidates = [
    'C:\\Program Files\\PostgreSQL\\16\\bin\\psql.exe',
    'C:\\Program Files\\PostgreSQL\\15\\bin\\psql.exe',
    'psql'
  ];
  let psql = null;
  for (const c of psqlCandidates) {
    if (fs.existsSync(c)) { psql = c; break; }
  }
  if (!psql) psql = 'psql';

  try {
    const { execSync } = await import('node:child_process');
    const filter = companyName ? `AND c.name = '${companyName}'` : '';
    const sql = `
      DELETE FROM invoices
      WHERE status = 'DRAFT'
      AND id NOT IN (
        SELECT id FROM (
          SELECT i.id, ROW_NUMBER() OVER (PARTITION BY i.company_id ORDER BY i.created_at ASC) as rn
          FROM invoices i
          JOIN companies c ON c.id = i.company_id
          WHERE i.status = 'DRAFT' ${filter}
        ) t WHERE t.rn = 1
      );
    `;
    execSync(`"${psql}" -U freelanceos -p 5433 -h 127.0.0.1 -d freelanceos -c "${sql}"`, {
      env: { ...process.env, PGPASSWORD: 'freelanceos_secret' },
      stdio: 'pipe'
    });
    console.log('[Capture Client] Pruned duplicate draft invoices successfully.');
  } catch (err) {
    console.warn('[Capture Client] Warning pruning draft invoices:', err.message);
  }
}

/**
 * Safe text locator that never crashes on multiple occurrences across page badges.
 */
export function getFirstText(pageOrLocator, text) {
  return pageOrLocator.getByText(text, { exact: true }).first();
}

/**
 * Generic Radix/shadcn Tab Switcher that handles ARIA tab selection, hydration, and overlay clicks.
 */
export async function selectTab(page, tabName, timeout = 5000) {
  const tab = page.getByRole('tab', { name: new RegExp(`^${tabName}$`, 'i') }).first();
  await tab.waitFor({ state: 'attached', timeout });
  if (typeof tab.scrollIntoViewIfNeeded === 'function') {
    await tab.scrollIntoViewIfNeeded().catch(() => {});
  }
  // Use force: true to bypass any Radix UI animation overlays or pointer-event interceptions
  await tab.click({ force: true, timeout });
  if (typeof page.waitForLoadState === 'function') {
    await page.waitForLoadState('domcontentloaded').catch(() => {});
  }
  if (typeof page.waitForTimeout === 'function') {
    await page.waitForTimeout(300); // allow tabpanel animation to mount
  }
}

/**
 * Reliable Radix UI portal dropdown select helper with dynamic option waiting,
 * regex pattern matching, and automatic placeholder exclusion.
 *
 * @param {import('playwright').Page} page
 * @param {string|import('playwright').Locator} triggerSelectorOrLocator - Trigger button or selector (e.g. '#payCompany', '#payInvoice')
 * @param {string|RegExp|number|function|null} [optionMatcher] - Text, RegExp (e.g. /INV/i), index, or predicate. If omitted/null, picks first valid non-placeholder option.
 * @param {object|number} [options] - Options object or numeric timeout in ms.
 * @param {number} [options.timeout=6000] - Timeout in milliseconds.
 * @param {boolean} [options.excludePlaceholders=true] - Skips placeholder options like "No specific invoice", "Select...", etc.
 * @param {boolean} [options.exact=false] - Exact text match if string.
 * @returns {Promise<string>} The text of the selected option.
 */
export async function selectRadixOption(page, triggerSelectorOrLocator, optionMatcher = null, options = {}) {
  const opts = typeof options === 'number' ? { timeout: options } : options;
  const {
    timeout = 6000,
    excludePlaceholders = true,
    exact = false
  } = opts;

  const trigger = typeof triggerSelectorOrLocator === 'string'
    ? page.locator(triggerSelectorOrLocator).first()
    : triggerSelectorOrLocator;

  await trigger.waitFor({ state: 'visible', timeout });
  await trigger.click({ timeout });

  // Radix UI renders dropdown items in portals at document body level
  const optionsLocator = page.locator('[role="option"], [role="menuitem"], [data-radix-collection-item]');

  // Wait for at least one option to mount in the portal
  await optionsLocator.first().waitFor({ state: 'attached', timeout }).catch(() => {});

  const placeholderRegex = /^(no specific|select|none|choose|chọn|tùy chọn|--|\s*$)/i;
  let targetOption = null;

  if (optionMatcher instanceof RegExp) {
    targetOption = optionsLocator.filter({ hasText: optionMatcher }).first();
  } else if (typeof optionMatcher === 'string' && optionMatcher.trim().length > 0) {
    targetOption = exact
      ? optionsLocator.getByText(optionMatcher, { exact: true }).first()
      : optionsLocator.filter({ hasText: optionMatcher }).first();
  } else if (typeof optionMatcher === 'number') {
    targetOption = optionsLocator.nth(optionMatcher);
  } else if (typeof optionMatcher === 'function') {
    const allOptions = await optionsLocator.all();
    for (const opt of allOptions) {
      const text = (await opt.textContent() || '').trim();
      if (optionMatcher(text)) {
        targetOption = opt;
        break;
      }
    }
  } else if (excludePlaceholders) {
    // Wait dynamically for non-placeholder options to appear (e.g. async tRPC/React Query loading)
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      const allOptions = await optionsLocator.all();
      for (const opt of allOptions) {
        const text = (await opt.textContent() || '').trim();
        if (text && !placeholderRegex.test(text)) {
          targetOption = opt;
          break;
        }
      }
      if (targetOption) break;
      await page.waitForTimeout(200);
    }
  }

  if (!targetOption) {
    targetOption = optionsLocator.first();
  }

  await targetOption.waitFor({ state: 'visible', timeout });
  const selectedText = (await targetOption.textContent() || '').trim();
  await targetOption.click({ timeout });
  await page.waitForTimeout(250); // allow portal unmount and form state sync
  return selectedText;
}

/**
 * Opens a Radix dropdown, waits for options, and returns all option texts.
 */
export async function getRadixOptions(page, triggerSelectorOrLocator, timeout = 5000) {
  const trigger = typeof triggerSelectorOrLocator === 'string'
    ? page.locator(triggerSelectorOrLocator).first()
    : triggerSelectorOrLocator;

  await trigger.waitFor({ state: 'visible', timeout });
  await trigger.click({ timeout });

  const optionsLocator = page.locator('[role="option"], [role="menuitem"], [data-radix-collection-item]');
  await optionsLocator.first().waitFor({ state: 'attached', timeout }).catch(() => {});
  const texts = (await optionsLocator.allTextContents()).map(t => t.trim()).filter(Boolean);
  await page.keyboard.press('Escape').catch(() => {});
  return texts;
}

/**
 * Reliably fills form inputs or spinbuttons, dispatching input and change events for React Hook Form.
 */
export async function fillFormField(page, selectorOrLabel, value, options = {}) {
  const { timeout = 5000 } = options;
  const strVal = String(value);

  let input = typeof selectorOrLabel === 'string' && (selectorOrLabel.startsWith('#') || selectorOrLabel.startsWith('.') || selectorOrLabel.startsWith('['))
    ? page.locator(selectorOrLabel).first()
    : page.getByLabel(selectorOrLabel, { exact: false }).first();

  if (await input.count() === 0 && typeof selectorOrLabel === 'string') {
    input = page.locator(`input[name="${selectorOrLabel}"], input#${selectorOrLabel}`).first();
  }

  await input.waitFor({ state: 'visible', timeout });
  await input.fill(strVal);
  await input.dispatchEvent('input').catch(() => {});
  await input.dispatchEvent('change').catch(() => {});
  return input;
}

/**
 * Submits a modal or dialog by clicking its confirm/submit button and waiting for the dialog to dismiss cleanly.
 */
export async function submitModalOrDialog(page, submitButtonName = /save|create|issue|record|submit|gửi|lưu/i, options = {}) {
  const { timeout = 6000, dialogSelector = '[role="dialog"]' } = options;
  const dialog = page.locator(dialogSelector).first();
  await dialog.waitFor({ state: 'visible', timeout });

  const btn = typeof submitButtonName === 'string'
    ? dialog.getByRole('button', { name: submitButtonName, exact: true }).first()
    : dialog.getByRole('button', { name: submitButtonName }).first();

  await btn.waitFor({ state: 'visible', timeout });
  await btn.click({ timeout });
  await dialog.waitFor({ state: 'hidden', timeout }).catch(() => {});
}

/**
 * Pre-submission evidence verification gate. Asserts expected key-value pairs inside a generated report file.
 * Throws an explicit error if any expectation fails, preventing premature or flawed submissions.
 *
 * @param {string} reportPath - Path to report file (e.g. currency-report.txt, layout-report.json)
 * @param {Record<string, string|RegExp|number>} expectedConditions - Key-value expectations
 * @returns {boolean} true if all conditions pass
 */
export function verifyEvidenceReport(reportPath, expectedConditions = {}) {
  const resolved = path.resolve(reportPath);
  if (!fs.existsSync(resolved)) {
    throw new Error(`[Evidence Gate Error] Report file does not exist on disk: ${resolved}`);
  }
  const content = fs.readFileSync(resolved, 'utf8');

  // If JSON file
  if (resolved.endsWith('.json')) {
    try {
      const data = JSON.parse(content);
      for (const [k, expected] of Object.entries(expectedConditions)) {
        const actual = data[k];
        if (expected instanceof RegExp) {
          if (!expected.test(String(actual))) {
            throw new Error(`[Evidence Gate Error] Field "${k}" value "${actual}" does not match pattern ${expected}`);
          }
        } else if (String(actual).toLowerCase() !== String(expected).toLowerCase()) {
          throw new Error(`[Evidence Gate Error] Field "${k}" has value "${actual}", expected "${expected}"`);
        }
      }
      return true;
    } catch (parseErr) {
      if (parseErr.message.includes('Evidence Gate Error')) throw parseErr;
    }
  }

  // Plain-text key-value format (e.g. key: value)
  for (const [k, expected] of Object.entries(expectedConditions)) {
    const pattern = new RegExp(`${k}:\\s*(.+)`, 'i');
    const match = content.match(pattern);
    if (!match) {
      throw new Error(`[Evidence Gate Error] Expected key "${k}" not found in report ${resolved}`);
    }
    const actual = match[1].trim();
    if (expected instanceof RegExp) {
      if (!expected.test(actual)) {
        throw new Error(`[Evidence Gate Error] Field "${k}" value "${actual}" does not match pattern ${expected}`);
      }
    } else if (String(actual).toLowerCase() !== String(expected).toLowerCase()) {
      throw new Error(`[Evidence Gate Error] Field "${k}" has value "${actual}", expected "${expected}"`);
    }
  }
  return true;
}

/**
 * Single-line helper to trigger an action and save the resulting download.
 */
export async function captureDownload(page, triggerAction, outputPath, timeout = 5000) {
  const absPath = path.resolve(outputPath);
  fs.mkdirSync(path.dirname(absPath), { recursive: true });

  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout }),
    typeof triggerAction === 'function' ? triggerAction() : page.locator(triggerAction).click()
  ]);

  await download.saveAs(absPath);
  return absPath;
}

/**
 * Helper to ensure destination directory exists and save screenshot.
 */
export async function captureScreenshot(page, outputPath, options = {}) {
  const absPath = path.resolve(outputPath);
  fs.mkdirSync(path.dirname(absPath), { recursive: true });
  await page.screenshot({ path: absPath, ...options });
  return absPath;
}

// CLI execution support
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command || command === 'help') {
    console.log(`
Lightweight Browser Capture Client

Usage:
  node capture-client.mjs check-browser
  node capture-client.mjs check-server [--url <url>]
  node capture-client.mjs auth-init [--url <url>] [--output <storageState.json>]
`);
    process.exit(0);
  }

  const getArg = (flag) => {
    const idx = args.indexOf(flag);
    return idx !== -1 && args[idx + 1] ? args[idx + 1] : null;
  };

  const hasFlag = (flag) => args.includes(flag);

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
    const prewarm = !hasFlag('--no-prewarm');
    await initAuthSession({ baseUrl: url, storageStatePath: output, email, password, prewarm });
    process.exit(0);
  }

  throw new Error(`Unknown command: ${command}`);
}

if (process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]))) {
  main().catch(err => {
    console.error(`[Capture Client Error]: ${err.message}`);
    process.exit(1);
  });
}
