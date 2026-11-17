// Reader settings for blog posts: text size and line width. Pure logic, unit-tested.
// The stored value carries the CSS values it resolves to (`scale`, `measure`) so the tiny inline
// script in BaseLayout.astro can apply them before first paint without knowing the tables below.

export const READER_KEY = 'pdl:reader';

/** Multipliers on the article's fluid text size; index 1 is the default. */
export const SIZES = [0.9, 1, 1.1, 1.2, 1.35] as const;
export const DEFAULT_SIZE = 1;

export const WIDTHS = { narrow: '34rem', default: '40rem', wide: '50rem' } as const;
export type Width = keyof typeof WIDTHS;

export interface ReaderPrefs {
  /** Index into SIZES. */
  size: number;
  width: Width;
}

export const defaults = (): ReaderPrefs => ({ size: DEFAULT_SIZE, width: 'default' });

export function parse(raw: string | null): ReaderPrefs {
  if (!raw) return defaults();
  try {
    const data: unknown = JSON.parse(raw);
    if (typeof data !== 'object' || data === null) return defaults();
    const { size, width } = data as { size?: unknown; width?: unknown };
    return {
      size: Number.isInteger(size) && (size as number) >= 0 && (size as number) < SIZES.length ? (size as number) : DEFAULT_SIZE,
      width: typeof width === 'string' && width in WIDTHS ? (width as Width) : 'default',
    };
  } catch {
    return defaults();
  }
}

export function cssVars(p: ReaderPrefs): { scale: number; measure: string } {
  return { scale: SIZES[p.size], measure: WIDTHS[p.width] };
}

export function serialize(p: ReaderPrefs): string {
  return JSON.stringify({ ...p, ...cssVars(p) });
}

/** One step larger (+1) or smaller (-1), stopping at the ends. */
export function bumpSize(p: ReaderPrefs, delta: 1 | -1): ReaderPrefs {
  return { ...p, size: Math.min(SIZES.length - 1, Math.max(0, p.size + delta)) };
}

export const isDefault = (p: ReaderPrefs): boolean => p.size === DEFAULT_SIZE && p.width === 'default';
