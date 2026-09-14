import { describe, expect, it } from 'vitest';
import { site } from './site';

describe('site config', () => {
  it('has a well-formed url with no trailing slash', () => {
    expect(site.url).toBe('https://podalanga.github.io');
    expect(site.url.endsWith('/')).toBe(false);
  });

  it('exposes exactly the 4 nav entries in order', () => {
    expect(site.nav.map((n) => n.label)).toEqual(['INDEX', 'WORKS', 'ARCHIVE', 'LOG']);
  });
});
