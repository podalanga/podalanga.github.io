// Keeps phone numbers off the published site. astro.config.mjs runs findPhoneNumbers over every
// page and text file the build writes and fails the build on a hit, naming the file; PDFs are
// handled by scripts/redact_phones.py. Same pattern as the PDF censor (public/admin/censor-core.js).
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const PHONE = /(?<![\d.,])(?:\(?\+\s?\d{1,3}\)?[\s-]*)?(?:\(?0\)?[\s-]*)?[6-9](?:[\s-]*\d){9}(?![\d.,])|\+\d(?:[\s()-]*\d){7,14}(?!\d)|\btel:/gi;

/** What a reader sees: the text of a page without its scripts, styles, drawings and tags. */
function visibleText(html: string): string {
  return html
    .replace(/<(script|style|svg|template)\b[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;|&#160;/g, ' ')
    .replace(/&#43;|&plus;/g, '+');
}

/** Phone numbers and tel: links in a piece of text, with the digits masked so a log never shows one. */
export function findPhoneNumbers(text: string): string[] {
  return [...text.matchAll(PHONE)].map((m) => m[0].trim().replace(/\d/g, '#'));
}

/** Files under `dir` (html, txt, xml, json) whose text carries a phone number, with what was found. */
export function findPhonesInSite(dir: string): string[] {
  const out: string[] = [];
  const walk = (d: string) => {
    for (const entry of readdirSync(d, { withFileTypes: true })) {
      const path = join(d, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (/\.(html|txt|xml|json|webmanifest)$/.test(entry.name)) {
        const raw = readFileSync(path, 'utf8');
        const text = entry.name.endsWith('.html') ? visibleText(raw) + (/\btel:/i.test(raw) ? ' tel:' : '') : raw;
        const hits = findPhoneNumbers(text);
        if (hits.length) out.push(`${path}: ${[...new Set(hits)].join(', ')}`);
      }
    }
  };
  walk(dir);
  return out;
}
