// @ts-check
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { defineConfig } from 'astro/config';
import sitemap, { ChangeFreqEnum } from '@astrojs/sitemap';
import { satteri } from '@astrojs/markdown-satteri';
import { blogArticlePlugin, mathBlocksAsCode } from './src/lib/blog-article.ts';
import { collectPublished, findLockViolations, findMissingOutput, formatLockReport, readLocks } from './src/lib/locks.ts';
import { findPhonesInSite } from './src/lib/privacy.ts';
import { fileURLToPath } from 'node:url';

const SITE = 'https://podalanga.github.io';

/**
 * Sitemap <lastmod> per page, read straight from content frontmatter (the config runs before
 * content collections exist). Projects use their end (else start) date, posts `updated` (else
 * `date`); every other page falls back to the build date.
 */
function contentDates() {
  /** @type {Map<string, Date>} */
  const dates = new Map();
  /** @param {string} dir @param {string} route @param {string[]} keys */
  const collect = (dir, route, keys) => {
    if (!existsSync(dir)) return;
    for (const slug of readdirSync(dir)) {
      const file = `${dir}/${slug}/index.md`;
      if (!existsSync(file)) continue;
      const front = readFileSync(file, 'utf8').split('---')[1] ?? '';
      for (const key of keys) {
        const m = front.match(new RegExp(`^${key}:\\s*["']?(\\d{4}-\\d{2}-\\d{2})`, 'm'));
        if (m) {
          dates.set(`${SITE}${route}/${slug}`, new Date(m[1]));
          break;
        }
      }
    }
  };
  collect('./src/content/works', '/projects', ['end', 'start']);
  collect('./src/content/log', '/blog', ['updated', 'date']);
  return dates;
}

const lastmod = contentDates();
// Listing pages change when their newest entry does; a build date would churn on every deploy.
const newest = new Date(Math.max(...[...lastmod.values()].map((d) => d.getTime()), 0));
const buildDate = lastmod.size > 0 ? newest : new Date();

/**
 * Published addresses must never change (src/config/locks.json, src/lib/locks.ts). The content is
 * checked before anything is built and the output after: a build fails rather than ship a moved or
 * missing locked link, so the live site keeps its last good version. The dev server only warns.
 * @returns {import('astro').AstroIntegration}
 */
function lockedAddresses() {
  const root = fileURLToPath(new URL('.', import.meta.url));
  return {
    name: 'locked-addresses',
    hooks: {
      'astro:config:setup': ({ command, logger }) => {
        if (command === 'preview') return;
        const problems = findLockViolations(readLocks(root), collectPublished(`${root}src/content`));
        if (problems.length === 0) return;
        if (command === 'dev') logger.warn(formatLockReport(problems));
        else throw new Error(formatLockReport(problems));
      },
      'astro:build:done': ({ dir }) => {
        const problems = findMissingOutput(readLocks(root), fileURLToPath(dir));
        if (problems.length > 0) throw new Error(formatLockReport(problems));
      },
    },
  };
}

/**
 * No phone number ships on a page: every page and text file the build writes is read as a visitor
 * would see it, and any phone number or tel: link fails the build (the digits are masked in the
 * message). PDFs are censored separately, in the CMS and again in the deploy.
 * @returns {import('astro').AstroIntegration}
 */
function noPhoneNumbers() {
  return {
    name: 'no-phone-numbers',
    hooks: {
      'astro:build:done': ({ dir }) => {
        const found = findPhonesInSite(fileURLToPath(dir));
        if (found.length > 0) {
          throw new Error(['A phone number would be published, so the site was not built:', ...found.map((f) => `  - ${f}`)].join('\n'));
        }
      },
    },
  };
}

// https://astro.build/config
export default defineConfig({
  site: SITE,
  // Outside node_modules so the deploy workflow can keep encoded images between builds
  // (npm ci wipes node_modules); only new or changed images are encoded again.
  cacheDir: './.cache/astro',
  trailingSlash: 'ignore',
  markdown: {
    // Blog posts get figures, numbered equations and worked-example panels (src/lib/blog-article.ts).
    // `$…$` and `$$…$$` parse as math, which that plugin typesets with KaTeX.
    processor: satteri({ features: { math: true }, mdastPlugins: [mathBlocksAsCode], hastPlugins: [blogArticlePlugin] }),
  },
  integrations: [
    lockedAddresses(),
    noPhoneNumbers(),
    sitemap({
      filter: (page) => !page.includes('/admin') && !page.includes('/blog/tag/') && !page.includes('/docs/'),
      serialize(item) {
        const path = item.url.replace(/\/$/, '');
        const date = lastmod.get(path) ?? buildDate;
        const isHome = path === SITE;
        return {
          ...item,
          lastmod: date.toISOString(),
          changefreq: isHome ? ChangeFreqEnum.WEEKLY : ChangeFreqEnum.MONTHLY,
          priority: isHome ? 1.0 : path.includes('/projects') ? 0.8 : 0.6,
        };
      },
    }),
  ],
});
