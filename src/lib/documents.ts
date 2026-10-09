import { extOf, isExternal } from './files';

/** Document kinds in display order: the quick read first, the full record after it. */
export const DOCUMENT_KINDS = ['short-report', 'report', 'presentation', 'guide', 'other'] as const;

export type DocumentKind = (typeof DOCUMENT_KINDS)[number];

export const DOCUMENT_LABEL: Record<DocumentKind, string> = {
  'short-report': 'SHORT REPORT',
  report: 'REPORT',
  presentation: 'PRESENTATION',
  guide: 'GUIDE',
  other: 'DOCUMENT',
};

/** Who each kind is for, used when a document has no guide line of its own. */
export const DEFAULT_GUIDE: Partial<Record<DocumentKind, string>> = {
  'short-report': 'Recommended if you want to skim, e.g. recruiters.',
  report: 'Recommended if you want to study every detail.',
  presentation: 'Recommended for skimming the overall progress.',
};

const ALIASES: Record<string, DocumentKind> = {
  paper: 'short-report',
  ppt: 'presentation',
  slides: 'presentation',
  deck: 'presentation',
};

/** Maps older or informal names (a "paper", a "ppt") onto the current kinds. */
export function normalizeKind(kind: unknown): unknown {
  return typeof kind === 'string' && Object.hasOwn(ALIASES, kind) ? ALIASES[kind] : kind;
}

/** "12 PP" for a document, "22 SLIDES" for a presentation. */
export function pageCount(kind: DocumentKind, pages: number): string {
  return `${pages} ${kind === 'presentation' ? 'SLIDES' : 'PP'}`;
}

/** A permanent link name: lowercase words joined by hyphens, e.g. "rovio-short-report". */
export const PERMALINK_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

interface Linkable {
  file: string;
  permalink?: string;
}

/** The file name a document is published under in /docs, or null if it has no permanent link. */
function permalinkFile(doc: Linkable): string | null {
  if (!doc.permalink || isExternal(doc.file)) return null;
  return `${doc.permalink}.${extOf(doc.file).toLowerCase()}`;
}

/**
 * Where a document is linked from. A named one lives at /docs/<name>.<ext> and keeps that address
 * through every re-upload; an unnamed or external one is linked as uploaded.
 */
export function documentHref(doc: Linkable): string {
  const name = permalinkFile(doc);
  return name ? `/docs/${name}` : doc.file;
}

/**
 * One /docs route per named document. Throws on a name used twice, and on any `required` name
 * (one already printed elsewhere, e.g. on the resume) that no document carries any more.
 */
export function permalinkRoutes(documents: Linkable[], required: readonly string[] = []): { name: string; file: string }[] {
  const routes = new Map<string, { name: string; file: string }>();
  for (const doc of documents) {
    const name = permalinkFile(doc);
    if (!name || !doc.permalink) continue;
    if (routes.has(doc.permalink)) {
      throw new Error(`Permanent link name "${doc.permalink}" is used by two documents: ${routes.get(doc.permalink)!.file} and ${doc.file}`);
    }
    routes.set(doc.permalink, { name, file: doc.file });
  }
  const missing = required.filter((name) => !routes.has(name));
  if (missing.length > 0) {
    throw new Error(`Permanent link name(s) in use but no longer on any document: ${missing.join(', ')}`);
  }
  return [...routes.values()];
}
