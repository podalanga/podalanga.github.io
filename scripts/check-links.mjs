import { readFileSync, existsSync, statSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const dist = join(root, 'dist');

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (name.endsWith('.html')) out.push(full);
  }
  return out;
}

function resolveUrlToPath(url) {
  if (/^https?:\/\//.test(url) || url.startsWith('mailto:') || url.startsWith('#')) return null;
  const clean = url.split('#')[0].split('?')[0];
  if (!clean) return null;
  let target = join(dist, clean);
  if (existsSync(target) && statSync(target).isDirectory()) {
    target = join(target, 'index.html');
  } else if (!existsSync(target) && !target.endsWith('.html') && !target.match(/\.[a-z0-9]+$/i)) {
    target = `${target}.html`;
    if (!existsSync(target)) target = join(dist, clean, 'index.html');
  }
  return target;
}

const files = walk(dist);
const missing = [];

for (const file of files) {
  const html = readFileSync(file, 'utf-8');
  const matches = html.matchAll(/(?:href|src)="([^"]+)"/g);
  for (const [, url] of matches) {
    if (url.startsWith('/') === false) continue; // only check internal absolute paths
    const target = resolveUrlToPath(url);
    if (target && !existsSync(target)) {
      missing.push(`${file.replace(dist, '')} -> ${url}`);
    }
  }
}

if (missing.length > 0) {
  console.error(`Found ${missing.length} broken internal link(s):`);
  for (const m of missing) console.error(`  ${m}`);
  process.exit(1);
}

console.log(`OK — checked ${files.length} HTML files, no broken internal links.`);
