import { describe, expect, it } from 'vitest';
import { MARKER, DECAY_MS, HOLD_MS, PHRASES, RESOLVE_MS, churn, columnFrame, linePhase, pickPhrase, visibleCells } from './watch-margins';

const glyphs = 'abcdefghijklmnop'.split('');

describe('columnFrame', () => {
  it('shows nothing for an empty column', () => {
    expect(columnFrame(glyphs, 0)).toEqual({ before: '', said: '', after: '', head: '' });
  });

  it('grows from the top and ends in the dot', () => {
    expect(columnFrame(glyphs, 1)).toEqual({ before: '', said: '', after: '', head: MARKER });
    expect(columnFrame(glyphs, 4)).toEqual({ before: 'abc', said: '', after: '', head: MARKER });
  });

  it('places a line at its offset, with noise either side', () => {
    expect(columnFrame(glyphs, 10, 'WAR', 2)).toEqual({ before: 'ab', said: 'WAR', after: 'fghi', head: MARKER });
  });

  it('drops a line that no longer fits once the column shrinks', () => {
    expect(columnFrame(glyphs, 5, 'WAR', 2)).toEqual({ before: 'abcd', said: '', after: '', head: MARKER });
  });
});

describe('visibleCells', () => {
  it('starts empty at the top of the page and follows it to the end', () => {
    expect(visibleCells(0, 60)).toBe(0);
    expect(visibleCells(0.01, 60)).toBe(1);
    expect(visibleCells(0.5, 60)).toBe(30);
    expect(visibleCells(1, 60)).toBe(60);
  });
});

describe('pickPhrase', () => {
  it('only offers lines that fit, and nothing when none does', () => {
    expect(pickPhrase(11, () => 0)).toBe('DOUBLETHINK');
    expect(pickPhrase(5)).toBeUndefined();
    for (let i = 0; i < 20; i++) expect(pickPhrase(18)!.length).toBeLessThanOrEqual(18);
  });

  it('never gives a column the line the other column is showing', () => {
    for (let i = 0; i < 20; i++) expect(pickPhrase(11, Math.random, 'DOUBLETHINK')).toBeUndefined();
    for (let i = 0; i < 50; i++) expect(pickPhrase(99, Math.random, 'WAR IS PEACE')).not.toBe('WAR IS PEACE');
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
