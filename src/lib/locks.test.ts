import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { addNewLocks, collectPublished, findLockViolations, findMissingOutput, type Locks } from './locks';

function content(files: Record<string, string>): string {
  const dir = mkdtempSync(join(tmpdir(), 'locks-'));
  for (const [path, front] of Object.entries(files)) {
    mkdirSync(join(dir, path), { recursive: true });
    writeFileSync(join(dir, path, 'index.md'), `---\n${front}\n---\n\nBody.\n`);
  }
  return dir;
}

const site = {
  'works/mechanical-watch': 'title: Watch\ndocuments:\n  - { label: Report, file: /a.pdf, permalink: watch-report }\n  - label: Notes\n    file: /b.pdf',
  'awards/cswa': 'title: CSWA\npermalink: cswa-certificate',
  'log/first-post': 'title: First',
  'log/unfinished': 'title: Draft\ndraft: true',
};

const locks: Locks = {
  docs: { 'watch-report': 'works/mechanical-watch', 'cswa-certificate': 'awards/cswa' },
  pages: ['/projects/mechanical-watch', '/blog/first-post'],
};

describe('collectPublished', () => {
  it('reads document links, award links and pages, and skips drafts', () => {
    const published = collectPublished(content(site));
    expect(Object.fromEntries(published.docs)).toEqual(locks.docs);
    expect([...published.pages].sort()).toEqual(['/blog/first-post', '/projects/mechanical-watch']);
  });
});

describe('findLockViolations', () => {
  it('passes when every locked address is where it was', () => {
    expect(findLockViolations(locks, collectPublished(content(site)))).toEqual([]);
  });

  it('reports a renamed or cleared document link', () => {
    const changed = { ...site, 'works/mechanical-watch': 'title: Watch\ndocuments:\n  - { label: Report, file: /a.pdf, permalink: watch-report-v2 }' };
    const [problem] = findLockViolations(locks, collectPublished(content(changed)));
    expect(problem).toMatch(/^\/docs\/watch-report is locked to project "mechanical-watch", but nothing uses/);
  });

  it('reports a document link moved to another entry', () => {
    const moved = {
      ...site,
      'works/mechanical-watch': 'title: Watch',
      'works/trident-amr': 'title: Trident\ndocuments:\n  - { label: Report, file: /a.pdf, permalink: watch-report }',
    };
    const [problem] = findLockViolations(locks, collectPublished(content(moved)));
    expect(problem).toContain('the name "watch-report" is now on project "trident-amr"');
  });

  it('reports a deleted page, and a post turned back into a draft', () => {
    const { 'log/first-post': _, ...deleted } = site;
    expect(findLockViolations(locks, collectPublished(content(deleted)))).toEqual([
      expect.stringMatching(/^\/blog\/first-post is locked, but no published entry/),
    ]);
    const drafted = { ...site, 'log/first-post': 'title: First\ndraft: true' };
    expect(findLockViolations(locks, collectPublished(content(drafted)))).toHaveLength(1);
  });
});

describe('addNewLocks', () => {
  it('adds what is newly published and never removes or rebinds', () => {
    const grown = { ...site, 'log/second-post': 'title: Second', 'works/mechanical-watch': 'title: Watch' };
    const { locks: next, added } = addNewLocks(locks, collectPublished(content(grown)));
    expect(added).toEqual(['/blog/second-post']);
    expect(next.docs).toEqual(locks.docs);
    expect(next.pages).toEqual([...locks.pages, '/blog/second-post']);
  });
});

describe('findMissingOutput', () => {
  it('checks the built site for every locked page and document', () => {
    const dist = mkdtempSync(join(tmpdir(), 'dist-'));
    mkdirSync(join(dist, 'projects/mechanical-watch'), { recursive: true });
    writeFileSync(join(dist, 'projects/mechanical-watch/index.html'), '');
    mkdirSync(join(dist, 'docs'), { recursive: true });
    writeFileSync(join(dist, 'docs/watch-report.pdf'), '');
    expect(findMissingOutput(locks, dist)).toEqual([
      '/blog/first-post is locked, but the build produced no page there.',
      '/docs/cswa-certificate is locked, but the build produced nothing there.',
    ]);
  });
});
