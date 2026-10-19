import { describe, expect, it } from 'vitest';
import { DECAY_MS, HOLD_MS, MIN_CELLS, PHRASES, RESOLVE_MS, churn, columnFrame, linePhase, pickPhrase, visibleCells } from './watch-margins';

const glyphs = 'abcdefghijklmnop'.split('');

describe('columnFrame', () => {
  it('shows nothing for an empty column', () => {
    expect(columnFrame(glyphs, 0)).toEqual({ before: '', said: '', after: '', head: '' });
  });

  it('grows from the top, with the last cell as the head', () => {
    expect(columnFrame(glyphs, 4)).toEqual({ before: 'abc', said: '', after: '', head: 'd' });
  });

  it('places a line at its offset, with noise either side', () => {
    expect(columnFrame(glyphs, 10, 'WAR', 2)).toEqual({ before: 'ab', said: 'WAR', after: 'fghi', head: 'j' });
  });

  it('drops a line that no longer fits once the column shrinks', () => {
    expect(columnFrame(glyphs, 5, 'WAR', 2)).toEqual({ before: 'abcd', said: '', after: '', head: 'e' });
  });
});

describe('visibleCells', () => {
  it('shows a minimum from the first screen, then follows the page', () => {
    expect(visibleCells(0, 60)).toBe(MIN_CELLS);
    expect(visibleCells(0.5, 60)).toBe(30);
    expect(visibleCells(1, 60)).toBe(60);
    expect(visibleCells(0, 8)).toBe(8);
  });
});

describe('pickPhrase', () => {
  it('only offers lines that fit, and nothing when none does', () => {
    expect(pickPhrase(11, () => 0)).toBe('DOUBLETHINK');
    expect(pickPhrase(5)).toBeUndefined();
    for (let i = 0; i < 20; i++) expect(pickPhrase(18)!.length).toBeLessThanOrEqual(18);
  });

  it('includes the line the user asked for', () => {
    expect(PHRASES).toContain('THERE IS NO ESCAPE');
  });
});

describe('linePhase', () => {
  it('resolves, holds, decays, then is gone', () => {
    expect(linePhase(RESOLVE_MS / 2)).toEqual({ phase: 'resolving', t: 0.5 });
    expect(linePhase(RESOLVE_MS + 10)).toEqual({ phase: 'holding' });
    expect(linePhase(RESOLVE_MS + HOLD_MS + DECAY_MS / 2)).toEqual({ phase: 'decaying', t: 0.5 });
    expect(linePhase(RESOLVE_MS + HOLD_MS + DECAY_MS)).toEqual({ phase: 'gone' });
  });
});

describe('churn', () => {
  it('replaces only the glyphs the roll picks', () => {
    const g = ['a', 'b', 'c'];
    const rolls = [0.1, 0.9, 0.1];
    churn(g, 0.5, () => '#', () => rolls.shift()!);
    expect(g).toEqual(['#', 'b', '#']);
  });
});
