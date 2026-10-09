import { describe, expect, it } from 'vitest';
import {
  DEFAULT_GUIDE,
  DOCUMENT_KINDS,
  PERMALINK_PATTERN,
  documentHref,
  normalizeKind,
  pageCount,
  permalinkRoutes,
} from './documents';

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

describe('documentHref', () => {
  it('publishes a named local document under /docs, whatever the upload is called', () => {
    expect(documentHref({ file: '/media/attachments/Final v3 (2).PDF', permalink: 'rovio-report' })).toBe('/docs/rovio-report.pdf');
  });

  it('forwards a named external document from /docs', () => {
    expect(documentHref({ file: 'https://www.canva.com/design/x/edit', permalink: 'zbot-deck' })).toBe('/docs/zbot-deck/');
  });

  it('leaves unnamed documents at their own address', () => {
    expect(documentHref({ file: '/media/attachments/rovio-report.pdf' })).toBe('/media/attachments/rovio-report.pdf');
    expect(documentHref({ file: 'https://www.canva.com/design/x/edit' })).toBe('https://www.canva.com/design/x/edit');
  });
});

describe('permalinkRoutes', () => {
  const docs = [
    { file: '/media/attachments/a.pdf', permalink: 'rovio-report' },
    { file: '/media/attachments/b.pdf' },
    { file: 'https://example.com/deck', permalink: 'deck' },
  ];

  it('lists one route per named document, uploaded or external', () => {
    expect(permalinkRoutes(docs)).toEqual([
      { name: 'rovio-report.pdf', file: '/media/attachments/a.pdf', external: false },
      { name: 'deck', file: 'https://example.com/deck', external: true },
    ]);
  });

  it('refuses an upload and an external link sharing a name', () => {
    expect(() => permalinkRoutes([...docs, { file: '/media/attachments/c.pdf', permalink: 'deck' }])).toThrow(/deck/);
  });

  it('refuses two documents with the same name', () => {
    expect(() => permalinkRoutes([...docs, { file: '/media/attachments/c.pdf', permalink: 'rovio-report' }])).toThrow(
      /rovio-report/,
    );
  });

  it('refuses to drop a name that is already in use elsewhere', () => {
    expect(() => permalinkRoutes(docs, ['watch-report'])).toThrow(/watch-report/);
    expect(permalinkRoutes(docs, ['rovio-report', 'deck'])).toHaveLength(2);
  });
});

describe('PERMALINK_PATTERN', () => {
  it('accepts lowercase words joined by hyphens only', () => {
    expect(PERMALINK_PATTERN.test('rovio-short-report')).toBe(true);
    expect(PERMALINK_PATTERN.test('3r-arm')).toBe(true);
    expect(PERMALINK_PATTERN.test('Rovio Report')).toBe(false);
    expect(PERMALINK_PATTERN.test('rovio.pdf')).toBe(false);
    expect(PERMALINK_PATTERN.test('')).toBe(false);
  });
});
