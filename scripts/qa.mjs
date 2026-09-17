// Self-verification QA runner (§14.2). Captures screenshots against a running
// `npm run preview` server, checks for console errors and horizontal overflow.
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const BASE_URL = process.env.QA_BASE_URL ?? 'http://localhost:4321';
const PHASE = process.env.QA_PHASE ?? 'phase2';
const OUT_DIR = path.join('qa-artifacts', 'screenshots', PHASE);

const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
];

const THEMES = ['dark', 'light'];

const ROUTES = ['/', '/projects', '/projects/zbot', '/archive', '/blog', '/blog/signal-acquired', '/404'];

async function shootRoute(browser, route, viewport, theme) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();

  const errors = [];
  page.on('pageerror', (err) => errors.push(String(err)));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  await page.addInitScript((t) => {
    try {
      localStorage.setItem('pdl:theme', t);
      // fast eye-loader timeline (~0.9s) so route screenshots show page content,
      // not the boot loader — the loader itself is exercised by runEyeLoaderChecks()
      localStorage.setItem('pdl:eye-seen', '1');
    } catch {
      /* ignore */
    }
  }, theme);

  await page.goto(new URL(route, BASE_URL).toString(), { waitUntil: 'networkidle' });
  await page
    .evaluate(() => new Promise((resolve) => {
      if (!document.documentElement.classList.contains('eye-pending')) return resolve();
      window.addEventListener('eye:done', () => resolve(), { once: true });
      setTimeout(resolve, 5000);
    }))
    .catch(() => {});

  // give the header nav's scramble-in (§6.4, 600ms) time to resolve before capturing —
  // otherwise fast pages (short scroll, quick networkidle) catch it mid-animation.
  await page.waitForTimeout(700);

  // scroll through the full page first so native `loading="lazy"` images have
  // fired their network request before the full-page screenshot captures them
  await page.evaluate(async () => {
    const step = window.innerHeight;
    const total = document.documentElement.scrollHeight;
    for (let y = 0; y < total; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 60));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForLoadState('networkidle');

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth
  );

  const slug = route === '/' ? 'index' : route.replace(/\//g, '_');
  const file = path.join(OUT_DIR, `${slug}__${viewport.name}__${theme}.png`);
  await page.screenshot({ path: file, fullPage: true });

  await context.close();

  return { route, viewport: viewport.name, theme, overflow, errors, file };
}

async function runEyeLoaderChecks(browser) {
  const dir = path.join(OUT_DIR, 'loader');
  await mkdir(dir, { recursive: true });
  const problems = [];

  // 1) First visit: full (~3.2s) sequence — grab mid-frames at ~1.0s and ~2.0s.
  {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    await page.goto(new URL('/', BASE_URL).toString());
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(dir, 'full__t1.0s.png') });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(dir, 'full__t2.0s.png') });
    const seen = await page.evaluate(() => localStorage.getItem('pdl:eye-seen'));
    if (seen !== '1') problems.push('first visit did not set pdl:eye-seen');
    await page.waitForFunction(() => !document.documentElement.classList.contains('eye-pending'), undefined, {
      timeout: 5000,
    });
    if (errors.length) problems.push('full sequence console errors: ' + errors.join(' | '));
    await context.close();
  }

  // 2) Second visit (same storage state carried via a fresh context + injected flag):
  //    fast (~0.9s) timeline should finish quickly.
  {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    await page.addInitScript(() => localStorage.setItem('pdl:eye-seen', '1'));
    const start = Date.now();
    await page.goto(new URL('/', BASE_URL).toString());
    await page.waitForFunction(() => !document.documentElement.classList.contains('eye-pending'), undefined, {
      timeout: 3000,
    });
    const elapsed = Date.now() - start;
    await page.screenshot({ path: path.join(dir, 'fast__done.png') });
    if (elapsed > 2500) problems.push(`fast timeline took ${elapsed}ms, expected well under full 3.2s`);
    await context.close();
  }

  // 3) Skip via keypress during the full sequence.
  {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    const start = Date.now();
    await page.goto(new URL('/', BASE_URL).toString());
    await page.waitForTimeout(300);
    await page.keyboard.press('Space');
    await page.waitForFunction(() => !document.documentElement.classList.contains('eye-pending'), undefined, {
      timeout: 3000,
    });
    const elapsed = Date.now() - start;
    await page.screenshot({ path: path.join(dir, 'skip__done.png') });
    if (elapsed > 2500) problems.push(`skip took ${elapsed}ms, expected to short-circuit well under 3.2s`);
    await context.close();
  }

  // 4) Reduced motion: static frame, no loader animation.
  {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(new URL('/', BASE_URL).toString());
    await page.waitForTimeout(200);
    await page.screenshot({ path: path.join(dir, 'reduced-motion__mid.png') });
    await page.waitForFunction(() => !document.documentElement.classList.contains('eye-pending'), undefined, {
      timeout: 3000,
    });
    await page.screenshot({ path: path.join(dir, 'reduced-motion__done.png') });
    await context.close();
  }

  // 5) No content flash: JS disabled — content must render (loader script never runs, no eye-pending).
  {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto(new URL('/', BASE_URL).toString());
    const hidden = await page.evaluate(() => document.documentElement.classList.contains('eye-pending'));
    if (hidden) problems.push('eye-pending present with JS disabled — content would be hidden with no way to unblock it');
    await page.screenshot({ path: path.join(dir, 'no-js.png') });
    await context.close();
  }

  for (const p of problems) console.log(`[FAIL] eye-loader: ${p}`);
  console.log(`eye-loader checks: ${problems.length ? problems.length + ' problem(s)' : 'ok'} -> ${dir}`);
  return problems;
}

async function runThemeWipeChecks(browser) {
  const dir = path.join(OUT_DIR, 'theme-wipe');
  await mkdir(dir, { recursive: true });
  const problems = [];

  // 1) Mid-flood + after screenshots, both directions; theme persists across reload.
  {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    await page.addInitScript(() => {
      localStorage.setItem('pdl:eye-seen', '1');
    });
    await page.goto(new URL('/', BASE_URL).toString(), { waitUntil: 'networkidle' });

    const before = await page.evaluate(() => document.documentElement.dataset.theme);
    await page.click('#theme-toggle');
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(dir, 'mid-flood__dark-to-light.png') });
    await page.waitForTimeout(1300);
    await page.screenshot({ path: path.join(dir, 'after__dark-to-light.png') });
    const after = await page.evaluate(() => document.documentElement.dataset.theme);
    if (after === before) problems.push('theme did not change after clicking #theme-toggle');

    await page.reload({ waitUntil: 'networkidle' });
    const persisted = await page.evaluate(() => document.documentElement.dataset.theme);
    if (persisted !== after) problems.push(`theme did not persist across reload (was ${after}, is ${persisted})`);

    // toggle back (light -> dark), confirm the reverse direction also floods correctly.
    await page.waitForFunction(() => !document.documentElement.classList.contains('eye-pending'), undefined, {
      timeout: 5000,
    });
    await page.click('#theme-toggle');
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(dir, 'mid-flood__light-to-dark.png') });
    await page.waitForTimeout(1300);
    await page.screenshot({ path: path.join(dir, 'after__light-to-dark.png') });

    if (errors.length) problems.push('theme wipe console errors: ' + errors.join(' | '));
    await context.close();
  }

  // 2) Reduced motion: theme still changes, no long-running animation expected.
  {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.addInitScript(() => localStorage.setItem('pdl:eye-seen', '1'));
    await page.goto(new URL('/', BASE_URL).toString(), { waitUntil: 'networkidle' });
    const before = await page.evaluate(() => document.documentElement.dataset.theme);
    await page.click('#theme-toggle');
    await page.waitForTimeout(400);
    const after = await page.evaluate(() => document.documentElement.dataset.theme);
    if (after === before) problems.push('reduced-motion: theme did not change after toggle click');
    await page.screenshot({ path: path.join(dir, 'reduced-motion__after.png') });
    await context.close();
  }

  // 3) JS disabled: toggle is a plain button (no-op without JS), page must still render fine.
  {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto(new URL('/', BASE_URL).toString());
    const hasButton = await page.evaluate(() => !!document.getElementById('theme-toggle'));
    if (!hasButton) problems.push('no-js: #theme-toggle button missing from HTML');
    await page.screenshot({ path: path.join(dir, 'no-js.png') });
    await context.close();
  }

  // 4) 10 soft navigations across pages: no leaked RAF/listeners manifesting as duplicate
  //    overlay canvases, no console errors, toggle still works on the 10th page.
  {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    await page.addInitScript(() => localStorage.setItem('pdl:eye-seen', '1'));
    await page.goto(new URL('/', BASE_URL).toString(), { waitUntil: 'networkidle' });

    const cycle = ['/projects', '/archive', '/blog', '/'];
    for (let i = 0; i < 10; i++) {
      const href = cycle[i % cycle.length];
      await page.click(`nav a[href="${href}"], nav a[href="${href}/"]`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(100);
    }

    const canvasCount = await page.evaluate(() => document.querySelectorAll('canvas').length);
    if (canvasCount > 1) problems.push(`expected at most 1 lingering canvas after 10 navs, found ${canvasCount}`);

    await page.click('#theme-toggle');
    await page.waitForTimeout(1500);
    const themeAfter = await page.evaluate(() => document.documentElement.dataset.theme);
    if (!themeAfter) problems.push('theme toggle did not respond after 10 navigations');

    if (errors.length) problems.push('10-navigation console errors: ' + errors.join(' | '));
    await context.close();
  }

  for (const p of problems) console.log(`[FAIL] theme-wipe: ${p}`);
  console.log(`theme-wipe checks: ${problems.length ? problems.length + ' problem(s)' : 'ok'} -> ${dir}`);
  return problems;
}

async function waitForEyeDone(page) {
  await page.waitForFunction(() => !document.documentElement.classList.contains('eye-pending'), undefined, {
    timeout: 5000,
  });
}

async function runTerminalChecks(browser) {
  const dir = path.join(OUT_DIR, 'terminal');
  await mkdir(dir, { recursive: true });
  const problems = [];

  // 1) Backtick opens, commands work, Esc closes + a11y (focus trap, redaction has real text).
  {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    await page.addInitScript(() => localStorage.setItem('pdl:eye-seen', '1'));
    await page.goto(new URL('/projects/zbot', BASE_URL).toString(), { waitUntil: 'networkidle' });
    await waitForEyeDone(page);
    await page.waitForTimeout(200);

    await page.keyboard.press('Backquote');
    await page.waitForTimeout(150);
    const open = await page.evaluate(() => document.getElementById('terminal')?.classList.contains('open'));
    if (!open) problems.push('backtick did not open the terminal');
    const focused = await page.evaluate(() => document.activeElement?.id);
    if (focused !== 'terminal-input') problems.push(`terminal did not focus its input on open (focused: ${focused})`);
    await page.screenshot({ path: path.join(dir, 'open.png') });

    async function run(cmd) {
      await page.fill('#terminal-input', cmd);
      await page.keyboard.press('Enter');
      await page.waitForTimeout(80);
    }

    await run('help');
    await run('ls works');
    const logText = await page.evaluate(() => document.getElementById('terminal-log')?.textContent ?? '');
    if (!logText.includes('ZBOT')) problems.push("'ls works' output missing ZBOT codename");
    await run('cat zbot');
    if (!(await page.evaluate(() => document.getElementById('terminal-log')?.textContent?.includes('/projects/zbot'))))
      problems.push("'cat zbot' output missing the work link");
    await page.screenshot({ path: path.join(dir, 'after-commands.png') });

    // Tab wraps within the panel (close button -> input -> close button); DOM/tab order has
    // the close button first, so tabbing from the input (last) should wrap back to it.
    await page.evaluate(() => document.getElementById('terminal-input')?.focus());
    await page.keyboard.press('Tab');
    const afterTab = await page.evaluate(() => document.activeElement?.id);
    if (afterTab !== 'terminal-close') problems.push(`Tab from input did not wrap to close button (got ${afterTab})`);
    await page.keyboard.press('Tab');
    const afterTab2 = await page.evaluate(() => document.activeElement?.id);
    if (afterTab2 !== 'terminal-input') problems.push(`Tab from close button did not move to input (got ${afterTab2})`);

    await run('open archive');
    await page.waitForTimeout(500);
    await page.waitForLoadState('networkidle');
    const url = page.url();
    if (!url.endsWith('/archive/') && !url.endsWith('/archive')) problems.push(`'open archive' did not navigate (at ${url})`);

    if (errors.length) problems.push('terminal console errors: ' + errors.join(' | '));
    await context.close();
  }

  // 2) Esc closes.
  {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    await page.addInitScript(() => localStorage.setItem('pdl:eye-seen', '1'));
    await page.goto(new URL('/', BASE_URL).toString(), { waitUntil: 'networkidle' });
    await waitForEyeDone(page);
    await page.keyboard.press('Backquote');
    await page.waitForTimeout(150);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(150);
    const open = await page.evaluate(() => document.getElementById('terminal')?.classList.contains('open'));
    if (open) problems.push('Esc did not close the terminal');
    await context.close();
  }

  // 3) Redaction: real text is in the accessible name even while visually barred.
  {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    await page.addInitScript(() => localStorage.setItem('pdl:eye-seen', '1'));
    await page.goto(new URL('/', BASE_URL).toString(), { waitUntil: 'networkidle' });
    await waitForEyeDone(page);
    const label = await page.evaluate(() => document.querySelector('[data-redact]')?.getAttribute('aria-label'));
    if (!label) problems.push('redacted element missing an aria-label with the real text');
    await page.hover('[data-redact]');
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(dir, 'redacted-hover.png') });
    await context.close();
  }

  // 4) Konami code triggers the flash.
  {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    await page.addInitScript(() => localStorage.setItem('pdl:eye-seen', '1'));
    await page.goto(new URL('/', BASE_URL).toString(), { waitUntil: 'networkidle' });
    await waitForEyeDone(page);
    for (const key of ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a']) {
      await page.keyboard.press(key);
    }
    await page.waitForTimeout(200);
    const flashed = await page.evaluate(() => !!document.getElementById('konami-flash'));
    if (!flashed) problems.push('konami code did not trigger the flash overlay');
    await page.screenshot({ path: path.join(dir, 'konami.png') });
    await context.close();
  }

  for (const p of problems) console.log(`[FAIL] terminal: ${p}`);
  console.log(`terminal checks: ${problems.length ? problems.length + ' problem(s)' : 'ok'} -> ${dir}`);
  return problems;
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const browser = await chromium.launch({ channel: 'chrome', headless: true });

  const results = [];
  for (const route of ROUTES) {
    for (const viewport of VIEWPORTS) {
      for (const theme of THEMES) {
        results.push(await shootRoute(browser, route, viewport, theme));
      }
    }
  }

  const loaderProblems = await runEyeLoaderChecks(browser);
  const themeWipeProblems = await runThemeWipeChecks(browser);
  const terminalProblems = await runTerminalChecks(browser);

  await browser.close();

  let failed = false;
  for (const r of results) {
    const problems = [];
    if (r.overflow) problems.push('horizontal overflow at ' + r.viewport);
    if (r.errors.length) problems.push('console errors: ' + r.errors.join(' | '));
    const status = problems.length ? 'FAIL' : 'ok';
    if (problems.length) failed = true;
    console.log(`[${status}] ${r.route} ${r.viewport} ${r.theme} -> ${r.file}`);
    for (const p of problems) console.log(`   - ${p}`);
  }

  if (loaderProblems.length) failed = true;
  if (themeWipeProblems.length) failed = true;
  if (terminalProblems.length) failed = true;

  if (failed) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
