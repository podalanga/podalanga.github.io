import { describe, expect, it } from 'vitest';
import { PHRASES, churn, columnFrame, shouldSpeak } from './watch-margins';

const glyphs = 'abcdefghij'.split('');

describe('columnFrame', () => {
  it('shows nothing before the page is scrolled', () => {
    expect(columnFrame(glyphs, 0)).toEqual({ trail: '', head: '' });
  });

  it('grows from the top, with the last cell as the head', () => {
    expect(columnFrame(glyphs, 4)).toEqual({ trail: 'abc', head: 'd' });
    expect(columnFrame(glyphs, 99)).toEqual({ trail: 'abcdefghi', head: 'j' });
  });

  it('ends the column with a phrase when it fits, and falls back to noise when it does not', () => {
    expect(columnFrame(glyphs, 8, 'WAR')).toEqual({ trail: 'abcde', head: 'WAR' });
    expect(columnFrame(glyphs, 2, 'WAR')).toEqual({ trail: 'a', head: 'b' });
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

describe('shouldSpeak', () => {
  const phrase = 'WAR IS PEACE';
  it('waits for the second pause, never repeats, and needs room', () => {
    expect(shouldSpeak(1, false, 100, phrase, 0)).toBe(false);
    expect(shouldSpeak(2, false, 100, phrase, 0)).toBe(true);
    expect(shouldSpeak(3, true, 100, phrase, 0)).toBe(false);
    expect(shouldSpeak(2, false, phrase.length, phrase, 0)).toBe(false);
    expect(shouldSpeak(2, false, 100, phrase, 0.9)).toBe(false);
  });

  it('includes the line the user asked for', () => {
    expect(PHRASES).toContain('THERE IS NO ESCAPE');
  });
});
