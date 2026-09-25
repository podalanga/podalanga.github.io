import { describe, expect, it } from 'vitest';
import { site } from './site';

describe('site config', () => {
  it('has a well-formed url with no trailing slash', () => {
    expect(site.url).toBe('https://podalanga.github.io');
    expect(site.url.endsWith('/')).toBe(false);
  });

  it('exposes exactly the 4 nav entries in order', () => {
    expect(site.nav.map((n) => n.label)).toEqual(['PROFILE', 'PROJECTS', 'ARCHIVE', 'BLOG']);
  });
});

describe('seo config', () => {
  it('names the person in the default title and description', () => {
    expect(site.title).toContain(site.person.name);
    expect(site.description).toContain(site.person.name);
    expect(site.description.length).toBeLessThanOrEqual(160);
  });

  it('has no duplicate keywords', () => {
    expect(new Set(site.keywords).size).toBe(site.keywords.length);
  });
});
