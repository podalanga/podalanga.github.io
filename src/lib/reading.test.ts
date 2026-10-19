import { describe, expect, it } from 'vitest';
import { plainMarkdown, readingStats, tableOfContents } from './reading';

describe('readingStats', () => {
  it('counts the words a reader reads, not markup, URLs or image alt text', () => {
    const md = [
      '## 1. Title here',
      '',
      'Read [this link](https://example.com/a/b) now.',
      '',
      '![a long alt text that is never read inline](./x.png)',
      '',
      '> [!EQUATION]',
      '>',
      '> **b ≈ λ f / a**',
      '',
      '| A | B |',
      '| --- | --- |',
      '| one | two |',
    ].join('\n');
    const stats = readingStats(md);
    // 1. Title here (3) / Read this link now (4) / b λ f a (4) / A B one two (4)
    expect(stats.words).toBe(15);
    expect(stats.figures).toBe(1);
    expect(stats.minutes).toBe(1);
  });

  it('rounds reading time up', () => {
    expect(readingStats('word '.repeat(231)).minutes).toBe(2);
  });
});

describe('tableOfContents', () => {
  it('keeps h2 and h3 and splits off section numbers', () => {
    const toc = tableOfContents([
      { depth: 1, slug: 'top', text: 'Top' },
      { depth: 2, slug: '3-focusing', text: '3. Focusing' },
      { depth: 3, slug: '31-spot', text: '3.1 The spot' },
      { depth: 4, slug: 'deep', text: 'Deep' },
      { depth: 3, slug: 'references', text: 'References' },
    ]);
    expect(toc).toEqual([
      { id: '3-focusing', depth: 2, number: '3', text: 'Focusing' },
      { id: '31-spot', depth: 3, number: '3.1', text: 'The spot' },
      { id: 'references', depth: 3, number: undefined, text: 'References' },
    ]);
  });
});

describe('plainMarkdown', () => {
  it('drops bare markers and keeps titles as bold lines', () => {
    const md = ['> [!EQUATION]', '>', '> b = λf/a', '', '> [!EXAMPLE] One watt', '>', '> > [!CALC]', '> >', '> > I = 7e6'].join('\n');
    expect(plainMarkdown(md)).toBe(['> b = λf/a', '', '> **One watt**', '>', '> > I = 7e6'].join('\n'));
  });
});
