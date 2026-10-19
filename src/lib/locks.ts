// Locks on published addresses: document links (/docs/<name>, the resume included) and page
// addresses (/blog/<slug>, /projects/<slug>, /hire) that have gone out into the world (a resume, a
// paper, a shared link) and so must never change. The CMS can edit every field, so the guard is the
// build: src/config/locks.json records each locked address and, for a document link, the entry it
// belongs to. A build whose content renames, clears, moves or deletes one fails with a message
// saying what changed, and the live site stays as it was.
//
// Read by astro.config.mjs (the check), scripts/lock.mjs (adding newly published addresses) and the
// docs route (every locked name must resolve). Plain Node: no Astro APIs, so it runs before the
// content layer exists.
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';

export const LOCKS_PATH = 'src/config/locks.json';

export interface Locks {
  /** Document link name -> the entry it belongs to, as `<collection>/<slug>`. */
  docs: Record<string, string>;
  /** Page addresses, e.g. `/blog/fibre-optic-shm`. */
  pages: string[];
}

export interface Published {
  docs: Map<string, string>;
  pages: Set<string>;
}

interface Entry {
  slug: string;
  data: Record<string, unknown>;
}

/** Entries of one collection: each folder's index.md front matter. */
function entries(contentDir: string, collection: string): Entry[] {
  const dir = join(contentDir, collection);
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((slug) => existsSync(join(dir, slug, 'index.md')))
    .sort()
    .map((slug) => {
      const text = readFileSync(join(dir, slug, 'index.md'), 'utf8');
      const front = text.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? '';
      return { slug, data: (parse(front) ?? {}) as Record<string, unknown> };
    });
}

/** Every document link and page address the content publishes right now. */
export function collectPublished(contentDir: string): Published {
  const docs = new Map<string, string>();
  const pages = new Set<string>();

  for (const { slug, data } of entries(contentDir, 'works')) {
    pages.add(`/projects/${slug}`);
    for (const doc of (data.documents as { permalink?: string }[] | undefined) ?? []) {
      if (doc?.permalink) docs.set(doc.permalink, `works/${slug}`);
    }
  }
  for (const { slug, data } of entries(contentDir, 'awards')) {
    if (typeof data.permalink === 'string' && data.permalink) docs.set(data.permalink, `awards/${slug}`);
  }
  // The /hire page's resume, and the page itself.
  for (const { slug, data } of entries(contentDir, 'hire')) {
    if (typeof data.permalink === 'string' && data.permalink && data.resume) docs.set(data.permalink, `hire/${slug}`);
    pages.add('/hire');
  }
  // A draft is not built, so it publishes no page.
  for (const { slug, data } of entries(contentDir, 'log')) {
    if (data.draft !== true) pages.add(`/blog/${slug}`);
  }
  return { docs, pages };
}

/** What a locked address's owner is called in a message: "project mechanical-watch". */
function owner(entry: string): string {
  const [collection, slug] = entry.split('/');
  return `${collection === 'awards' ? 'award' : collection === 'works' ? 'project' : collection === 'hire' ? 'hire page' : collection} "${slug}"`;
}

/** One plain sentence per locked address that the content no longer honours. */
export function findLockViolations(locks: Locks, published: Published): string[] {
  const out: string[] = [];
  for (const [name, entry] of Object.entries(locks.docs)) {
    const now = published.docs.get(name);
    if (!now) {
      out.push(
        `/docs/${name} is locked to ${owner(entry)}, but nothing uses the permanent link name "${name}" any more. ` +
          `Put "${name}" back in that ${owner(entry).split(' ')[0]}'s Permanent link name.`,
      );
    } else if (now !== entry) {
      out.push(
        `/docs/${name} is locked to ${owner(entry)}, but the name "${name}" is now on ${owner(now)}. ` +
          `Move it back to ${owner(entry)} and give the other document a new name.`,
      );
    }
  }
  for (const page of locks.pages) {
    if (!published.pages.has(page)) {
      out.push(`${page} is locked, but no published entry has that address any more (renamed, deleted or turned into a draft). Restore it.`);
    }
  }
  return out;
}

/** Checks the built site: every locked page and document link is really there. */
export function findMissingOutput(locks: Locks, distDir: string): string[] {
  const out: string[] = [];
  for (const page of locks.pages) {
    if (!existsSync(join(distDir, page, 'index.html'))) out.push(`${page} is locked, but the build produced no page there.`);
  }
  const docsDir = join(distDir, 'docs');
  const built = existsSync(docsDir) ? readdirSync(docsDir) : [];
  for (const name of Object.keys(locks.docs)) {
    // A file at /docs/<name>.<ext>, or a forwarding page at /docs/<name>/ for an external document.
    if (!built.some((f) => f === name || f.startsWith(`${name}.`))) out.push(`/docs/${name} is locked, but the build produced nothing there.`);
  }
  return out;
}

/** The whole report, as the build prints it. */
export function formatLockReport(problems: string[]): string {
  return [
    `Locked addresses changed, so the site was not built and the live site is unchanged.`,
    ...problems.map((p) => `  - ${p}`),
    `Published links are listed in ${LOCKS_PATH}. To retire one on purpose, remove it from that file in its own commit.`,
  ].join('\n');
}

/**
 * Adds every published address that is not locked yet. Never removes or rebinds a lock: that is
 * a deliberate edit to the lock file, not something publishing can do.
 */
export function addNewLocks(locks: Locks, published: Published): { locks: Locks; added: string[] } {
  const docs = { ...locks.docs };
  const pages = [...locks.pages];
  const added: string[] = [];
  for (const [name, entry] of [...published.docs].sort(([a], [b]) => a.localeCompare(b))) {
    if (!(name in docs)) {
      docs[name] = entry;
      added.push(`/docs/${name}`);
    }
  }
  for (const page of [...published.pages].sort()) {
    if (!pages.includes(page)) {
      pages.push(page);
      added.push(page);
    }
  }
  return { locks: { docs, pages }, added };
}

export function readLocks(root: string): Locks {
  const path = join(root, LOCKS_PATH);
  if (!existsSync(path)) return { docs: {}, pages: [] };
  const raw = JSON.parse(readFileSync(path, 'utf8')) as Partial<Locks>;
  return { docs: raw.docs ?? {}, pages: raw.pages ?? [] };
}

export function writeLocks(root: string, locks: Locks): void {
  const ordered = { $comment: LOCKS_COMMENT, docs: locks.docs, pages: locks.pages };
  writeFileSync(join(root, LOCKS_PATH), `${JSON.stringify(ordered, null, 2)}\n`);
}

const LOCKS_COMMENT =
  'Published addresses that must never change. The build fails if the content renames, clears, moves or deletes one. ' +
  'New ones are added automatically after each deploy (scripts/lock.mjs). To retire one on purpose, delete its line in its own commit.';
