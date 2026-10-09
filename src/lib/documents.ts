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

/** The name a document is published under in /docs: "rovio-report.pdf", or a bare "zbot-deck" for an external one. */
function permalinkName(doc: Linkable): string | null {
  if (!doc.permalink) return null;
  return isExternal(doc.file) ? doc.permalink : `${doc.permalink}.${extOf(doc.file).toLowerCase()}`;
}

/**
 * Where a document is linked from. A named one lives under /docs and keeps that address through every
 * re-upload: /docs/<name>.<ext> serves an uploaded file, /docs/<name>/ forwards to an external one
 * (e.g. a Canva deck). An unnamed document is linked as it was entered.
 */
export function documentHref(doc: Linkable): string {
  const name = permalinkName(doc);
  if (!name) return doc.file;
  return isExternal(doc.file) ? `/docs/${name}/` : `/docs/${name}`;
}

export interface PermalinkRoute {
  /** Last segment of the /docs address. */
  name: string;
  /** The uploaded file under /public, or the external URL to forward to. */
  file: string;
  external: boolean;
}

/**
 * One /docs route per named document. Throws on a name used twice, and on any `required` name
 * (one already printed elsewhere, e.g. on the resume) that no document carries any more.
 */
export function permalinkRoutes(documents: Linkable[], required: readonly string[] = []): PermalinkRoute[] {
  const routes = new Map<string, PermalinkRoute>();
  for (const doc of documents) {
    const name = permalinkName(doc);
    if (!name || !doc.permalink) continue;
    if (routes.has(doc.permalink)) {
      throw new Error(`Permanent link name "${doc.permalink}" is used by two documents: ${routes.get(doc.permalink)!.file} and ${doc.file}`);
    }
    routes.set(doc.permalink, { name, file: doc.file, external: isExternal(doc.file) });
  }
  const missing = required.filter((name) => !routes.has(name));
  if (missing.length > 0) {
    throw new Error(`Permanent link name(s) in use but no longer on any document: ${missing.join(', ')}`);
  }
  return [...routes.values()];
}
