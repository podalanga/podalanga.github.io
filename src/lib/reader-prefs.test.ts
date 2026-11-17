import { describe, expect, it } from 'vitest';
import { SIZES, bumpSize, cssVars, defaults, isDefault, parse, serialize } from './reader-prefs';

describe('reader prefs', () => {
  it('falls back to the defaults for anything unusable', () => {
    expect(parse(null)).toEqual(defaults());
    expect(parse('{oops')).toEqual(defaults());
    expect(parse('7')).toEqual(defaults());
    expect(parse(JSON.stringify({ size: 99, width: 'huge' }))).toEqual(defaults());
  });

  it('round-trips and carries the resolved CSS values', () => {
    const p = { size: 3, width: 'wide' as const };
    expect(parse(serialize(p))).toEqual(p);
    expect(JSON.parse(serialize(p))).toMatchObject({ scale: SIZES[3], measure: '50rem' });
    expect(cssVars(defaults())).toEqual({ scale: 1, measure: '40rem' });
  });

  it('steps the size and stops at the ends', () => {
    let p = defaults();
    for (let i = 0; i < 10; i++) p = bumpSize(p, 1);
    expect(p.size).toBe(SIZES.length - 1);
    for (let i = 0; i < 10; i++) p = bumpSize(p, -1);
    expect(p.size).toBe(0);
  });

  it('knows when it is at the defaults', () => {
    expect(isDefault(defaults())).toBe(true);
    expect(isDefault({ size: 2, width: 'default' })).toBe(false);
  });
});
