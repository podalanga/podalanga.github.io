import { describe, expect, it } from 'vitest';
import {
  empty,
  inProgress,
  isSaved,
  parse,
  prune,
  recordProgress,
  resumePoint,
  sectionsOf,
  toggleBookmarkedSection,
  togglePost,
} from './bookmarks';

const NOW = '2026-11-18T10:00:00.000Z';

describe('parse', () => {
  it('returns an empty store for missing, corrupt or wrongly-shaped data', () => {
    expect(parse(null)).toEqual(empty());
    expect(parse('{not json')).toEqual(empty());
    expect(parse('[1,2]')).toEqual(empty());
    expect(parse(JSON.stringify({ v: 2, posts: { a: NOW } }))).toEqual(empty());
  });

  it('keeps valid entries and drops malformed ones', () => {
    const raw = JSON.stringify({
      v: 1,
      posts: { good: NOW, bad: 5 },
      sections: { s: ['a', 3, 'b'], t: 'nope' },
      progress: {
        p: { id: 'x', label: 'X', ratio: 0.4, at: NOW },
        q: { id: 'x', ratio: 'half' },
      },
    });
    const b = parse(raw);
    expect(Object.keys(b.posts)).toEqual(['good']);
    expect(b.sections).toEqual({ s: ['a', 'b'] });
    expect(Object.keys(b.progress)).toEqual(['p']);
  });
});

describe('posts', () => {
  it('toggles a saved post on and off without mutating the input', () => {
    const a = empty();
    const b = togglePost(a, 'robotics', NOW);
    expect(isSaved(a, 'robotics')).toBe(false);
    expect(isSaved(b, 'robotics')).toBe(true);
    expect(isSaved(togglePost(b, 'robotics', NOW), 'robotics')).toBe(false);
  });
});

describe('sections', () => {
  it('toggles a section id and drops the slug when it empties', () => {
    const a = toggleBookmarkedSection(empty(), 'robotics', '3-jacobians');
    expect(sectionsOf(a, 'robotics')).toEqual(['3-jacobians']);
    const b = toggleBookmarkedSection(a, 'robotics', '4-forces');
    expect(sectionsOf(b, 'robotics')).toEqual(['3-jacobians', '4-forces']);
    const c = toggleBookmarkedSection(toggleBookmarkedSection(b, 'robotics', '3-jacobians'), 'robotics', '4-forces');
    expect(c.sections).toEqual({});
  });

  it('caps the number of bookmarks per post', () => {
    let b = empty();
    for (let i = 0; i < 250; i++) b = toggleBookmarkedSection(b, 'p', `s${i}`);
    expect(sectionsOf(b, 'p').length).toBe(200);
  });
});

describe('progress and resume', () => {
  it('clamps the ratio and stores the section', () => {
    const b = recordProgress(empty(), 'p', { id: 's1', label: '1 Frames', ratio: 1.7 }, NOW);
    expect(b.progress.p).toEqual({ id: 's1', label: '1 Frames', ratio: 1, at: NOW });
    expect(recordProgress(empty(), 'p', { id: 's1', label: 'x', ratio: -3 }, NOW).progress.p.ratio).toBe(0);
  });

  it('offers a resume only between 5% and 95%, and never when the URL has a hash', () => {
    const at = (ratio: number) => recordProgress(empty(), 'p', { id: 's1', label: 'One', ratio }, NOW);
    expect(resumePoint(at(0.02), 'p', '')).toBeUndefined();
    expect(resumePoint(at(0.5), 'p', '')?.id).toBe('s1');
    expect(resumePoint(at(0.97), 'p', '')).toBeUndefined();
    expect(resumePoint(at(0.5), 'p', '#4-forces')).toBeUndefined();
    expect(resumePoint(empty(), 'p', '')).toBeUndefined();
  });

  it('reports in-progress with the same thresholds', () => {
    const b = recordProgress(empty(), 'p', { id: 's', label: 's', ratio: 0.4 }, NOW);
    expect(inProgress(b, 'p')).toBe(true);
    expect(inProgress(b, 'other')).toBe(false);
  });
});

describe('prune', () => {
  it('removes slugs that no longer exist', () => {
    let b = togglePost(empty(), 'gone', NOW);
    b = togglePost(b, 'kept', NOW);
    b = toggleBookmarkedSection(b, 'gone', 'a');
    b = recordProgress(b, 'gone', { id: 'a', label: 'a', ratio: 0.5 }, NOW);
    const p = prune(b, ['kept']);
    expect(Object.keys(p.posts)).toEqual(['kept']);
    expect(p.sections).toEqual({});
    expect(p.progress).toEqual({});
  });
});
