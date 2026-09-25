// @ts-check
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { defineConfig } from 'astro/config';
import sitemap, { ChangeFreqEnum } from '@astrojs/sitemap';

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

// https://astro.build/config
export default defineConfig({
  site: SITE,
  trailingSlash: 'ignore',
  integrations: [
    sitemap({
      filter: (page) => !page.includes('/admin') && !page.includes('/blog/tag/'),
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
