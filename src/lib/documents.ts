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
