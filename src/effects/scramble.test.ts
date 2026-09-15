import { describe, expect, it } from 'vitest';
import { scrambleFrame } from './scramble';

const fixedGlyph = () => '#';

describe('scrambleFrame', () => {
  it('is fully scrambled at progress 0 (non-space chars)', () => {
    expect(scrambleFrame(['A', 'B', 'C'].map((c) => c), 0, fixedGlyph)).toBe('###');
  });

  it('is fully resolved at progress 1', () => {
    expect(scrambleFrame('WORKS'.split(''), 1, fixedGlyph)).toBe('WORKS');
  });

  it('resolves left-to-right proportionally to progress', () => {
    expect(scrambleFrame('ABCDE'.split(''), 0.4, fixedGlyph)).toBe('AB###');
  });

  it('always preserves spaces regardless of progress', () => {
    expect(scrambleFrame('A B'.split(''), 0, fixedGlyph)).toBe('# #');
  });

  it('clamps progress outside [0, 1]', () => {
    expect(scrambleFrame('AB'.split(''), -1, fixedGlyph)).toBe('##');
    expect(scrambleFrame('AB'.split(''), 2, fixedGlyph)).toBe('AB');
  });
});
