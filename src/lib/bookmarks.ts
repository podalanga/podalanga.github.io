// Reader bookmarks for blog posts: saved posts, bookmarked sections and where each post was left.
// Pure logic only (no DOM, no storage), so it is unit-tested; src/effects/bookmarks.ts does the I/O.
// Everything lives in the reader's own browser under one localStorage key; nothing is sent anywhere.

export const BOOKMARKS_KEY = 'pdl:bookmarks';

/** Where a reader was in a post: the section they were in and how far through the article. */
export interface Progress {
  id: string;
  label: string;
  /** 0 to 1, as `readProgress` in reading.ts reports it. */
  ratio: number;
  at: string;
}

export interface Bookmarks {
  v: 1;
  /** slug -> ISO time it was saved. */
  posts: Record<string, string>;
  /** slug -> heading ids. */
  sections: Record<string, string[]>;
  progress: Record<string, Progress>;
}

const MAX_SECTIONS_PER_POST = 200;
const MAX_POSTS = 500;
/** Below this the reader has barely started; above this they finished. Neither is worth resuming. */
export const RESUME_MIN = 0.05;
export const RESUME_MAX = 0.95;

export function empty(): Bookmarks {
  return { v: 1, posts: {}, sections: {}, progress: {} };
}

const isRecord = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);
const isString = (x: unknown): x is string => typeof x === 'string' && x.length > 0 && x.length <= 300;

/** Reads what storage returned, keeping only well-formed entries. Never throws. */
export function parse(raw: string | null): Bookmarks {
  if (!raw) return empty();
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return empty();
  }
  if (!isRecord(data) || data.v !== 1) return empty();

  const out = empty();
  if (isRecord(data.posts)) {
    for (const [slug, at] of Object.entries(data.posts)) if (isString(at)) out.posts[slug] = at;
  }
  if (isRecord(data.sections)) {
    for (const [slug, ids] of Object.entries(data.sections)) {
      if (!Array.isArray(ids)) continue;
      const kept = ids.filter(isString).slice(0, MAX_SECTIONS_PER_POST);
      if (kept.length > 0) out.sections[slug] = kept;
    }
  }
  if (isRecord(data.progress)) {
    for (const [slug, p] of Object.entries(data.progress)) {
      if (!isRecord(p) || !isString(p.id) || typeof p.ratio !== 'number' || !Number.isFinite(p.ratio)) continue;
      out.progress[slug] = {
        id: p.id,
        label: typeof p.label === 'string' ? p.label.slice(0, 200) : '',
        ratio: clamp01(p.ratio),
        at: isString(p.at) ? p.at : '',
      };
    }
  }
  return out;
}

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

export function isSaved(b: Bookmarks, slug: string): boolean {
  return slug in b.posts;
}

export function togglePost(b: Bookmarks, slug: string, now: string): Bookmarks {
  const posts = { ...b.posts };
  if (slug in posts) delete posts[slug];
  else if (Object.keys(posts).length < MAX_POSTS) posts[slug] = now;
  return { ...b, posts };
}

export function sectionsOf(b: Bookmarks, slug: string): string[] {
  return b.sections[slug] ?? [];
}

export function toggleBookmarkedSection(b: Bookmarks, slug: string, id: string): Bookmarks {
  const current = sectionsOf(b, slug);
  const next = current.includes(id)
    ? current.filter((x) => x !== id)
    : [...current, id].slice(0, MAX_SECTIONS_PER_POST);
  const sections = { ...b.sections };
  if (next.length > 0) sections[slug] = next;
  else delete sections[slug];
  return { ...b, sections };
}

export function recordProgress(
  b: Bookmarks,
  slug: string,
  at: { id: string; label: string; ratio: number },
  now: string,
): Bookmarks {
  return { ...b, progress: { ...b.progress, [slug]: { id: at.id, label: at.label, ratio: clamp01(at.ratio), at: now } } };
}

/** True when the reader stopped part-way: worth showing "In progress" for. */
export function inProgress(b: Bookmarks, slug: string): boolean {
  const p = b.progress[slug];
  return !!p && p.ratio > RESUME_MIN && p.ratio < RESUME_MAX;
}

/** The place to offer "Continue from…". A link that already points at a section wins over it. */
export function resumePoint(b: Bookmarks, slug: string, hash: string): Progress | undefined {
  if (hash && hash !== '#') return undefined;
  return inProgress(b, slug) ? b.progress[slug] : undefined;
}

/** Forgets posts that no longer exist (renamed or deleted), so the store cannot grow forever. */
export function prune(b: Bookmarks, validSlugs: string[]): Bookmarks {
  const keep = new Set(validSlugs);
  const only = <T>(r: Record<string, T>) => Object.fromEntries(Object.entries(r).filter(([slug]) => keep.has(slug)));
  return { ...b, posts: only(b.posts), sections: only(b.sections), progress: only(b.progress) };
}
