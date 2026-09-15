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
    } catch {
      /* ignore */
    }
  }, theme);

  await page.goto(new URL(route, BASE_URL).toString(), { waitUntil: 'networkidle' });

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

  if (failed) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
