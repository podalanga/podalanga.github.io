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

const ROUTES = ['/', '/works', '/works/zbot', '/archive', '/log', '/log/signal-acquired', '/404'];

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

  if (failed) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
