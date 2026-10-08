import { describe, expect, it } from 'vitest';
import { DEFAULT_GUIDE, DOCUMENT_KINDS, normalizeKind, pageCount } from './documents';

describe('normalizeKind', () => {
  it('maps older and informal names onto current kinds', () => {
    expect(normalizeKind('paper')).toBe('short-report');
    expect(normalizeKind('ppt')).toBe('presentation');
    expect(normalizeKind('slides')).toBe('presentation');
    expect(normalizeKind('deck')).toBe('presentation');
  });

  it('leaves current kinds and other values alone', () => {
    expect(normalizeKind('report')).toBe('report');
    expect(normalizeKind(undefined)).toBeUndefined();
    expect(normalizeKind('toString')).toBe('toString');
  });
});

describe('document kinds', () => {
  it('lists the quick reads before the full record', () => {
    expect(DOCUMENT_KINDS).toEqual(['short-report', 'report', 'presentation', 'guide', 'other']);
  });

  it('gives each reader-facing kind a default guide line', () => {
    expect(DEFAULT_GUIDE.presentation).toBe('Recommended for skimming the overall progress.');
    expect(DEFAULT_GUIDE['short-report']).toBeTruthy();
    expect(DEFAULT_GUIDE.report).toBeTruthy();
  });

  it('counts slides for a presentation and pages otherwise', () => {
    expect(pageCount('presentation', 22)).toBe('22 SLIDES');
    expect(pageCount('report', 31)).toBe('31 PP');
  });
});
