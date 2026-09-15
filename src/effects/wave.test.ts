import { describe, expect, it } from 'vitest';
import {
  COVER_MAX_DELAY,
  COVER_RANDOM_SPREAD,
  GLITCH_MAX_DELAY,
  GLITCH_RANDOM_SPREAD,
  REVEAL_RANDOM_SPREAD,
  coverDelay,
  glitchColumnDelay,
  maxDistanceFromOrigin,
  normalizedDist,
  revealDelay,
} from './wave';

describe('normalizedDist', () => {
  it('is 0 at the origin', () => {
    expect(normalizedDist(10, 10, 10, 10, 100)).toBe(0);
  });

  it('clamps to 1 beyond maxDist', () => {
    expect(normalizedDist(500, 0, 0, 0, 100)).toBe(1);
  });

  it('is 0 when maxDist is 0', () => {
    expect(normalizedDist(50, 50, 0, 0, 0)).toBe(0);
  });
});

describe('maxDistanceFromOrigin', () => {
  it('is the distance to the farthest corner', () => {
    expect(maxDistanceFromOrigin(0, 0, 300, 400)).toBeCloseTo(500, 5);
  });

  it('is the same for an origin at any corner (by symmetry, opposite corner)', () => {
    expect(maxDistanceFromOrigin(300, 400, 300, 400)).toBeCloseTo(500, 5);
  });
});

describe('coverDelay', () => {
  it('is 0 at distFrac=0, rand=0', () => {
    expect(coverDelay(0, 0)).toBe(0);
  });

  it('never exceeds COVER_MAX_DELAY + COVER_RANDOM_SPREAD (spec: all delays <= 0.8s)', () => {
    expect(coverDelay(1, 1)).toBeCloseTo(COVER_MAX_DELAY + COVER_RANDOM_SPREAD, 5);
    expect(COVER_MAX_DELAY + COVER_RANDOM_SPREAD).toBeLessThanOrEqual(0.8);
  });

  it('is monotonic in distance on average (same rand sample, increasing distFrac)', () => {
    const rand = 0.5;
    const near = coverDelay(0.1, rand);
    const mid = coverDelay(0.5, rand);
    const far = coverDelay(0.9, rand);
    expect(near).toBeLessThan(mid);
    expect(mid).toBeLessThan(far);
  });
});

describe('revealDelay', () => {
  it('has no distance term and stays within [0, REVEAL_RANDOM_SPREAD]', () => {
    expect(revealDelay(0)).toBe(0);
    expect(revealDelay(1)).toBeCloseTo(REVEAL_RANDOM_SPREAD, 5);
    expect(revealDelay(0.5)).toBeCloseTo(REVEAL_RANDOM_SPREAD * 0.5, 5);
  });
});

describe('glitchColumnDelay', () => {
  it('never exceeds GLITCH_MAX_DELAY + GLITCH_RANDOM_SPREAD', () => {
    expect(glitchColumnDelay(1, 1)).toBeCloseTo(GLITCH_MAX_DELAY + GLITCH_RANDOM_SPREAD, 5);
  });

  it('is monotonic in column fraction on average', () => {
    const rand = 0.3;
    expect(glitchColumnDelay(0, rand)).toBeLessThan(glitchColumnDelay(0.5, rand));
    expect(glitchColumnDelay(0.5, rand)).toBeLessThan(glitchColumnDelay(1, rand));
  });
});
