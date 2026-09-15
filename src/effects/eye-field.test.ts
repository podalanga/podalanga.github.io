import { describe, expect, it } from 'vitest';
import { EYE_H, EYE_W, IRIS_RADIUS, intensity, isInsideEye, lidHalfHeight, pupilRadius } from './eye-field';

const OPEN: { openness: number; pupilX: number; pupilY: number } = {
  openness: 1,
  pupilX: 0,
  pupilY: 0,
};

describe('lidHalfHeight / isInsideEye', () => {
  it('is at its max at the eye center and shrinks toward the corners', () => {
    expect(lidHalfHeight(0, 1)).toBeCloseTo(EYE_H, 5);
    expect(lidHalfHeight(EYE_W * 0.9, 1)).toBeLessThan(lidHalfHeight(EYE_W * 0.5, 1));
  });

  it('collapses to zero at/beyond the horizontal extent', () => {
    expect(lidHalfHeight(EYE_W, 1)).toBeCloseTo(0, 5);
    expect(isInsideEye(EYE_W + 0.01, 0, 1)).toBe(false);
  });

  it('scales linearly with openness (blink closes the eye)', () => {
    expect(lidHalfHeight(0, 0)).toBe(0);
    expect(isInsideEye(0, 0, 0)).toBe(false);
    expect(isInsideEye(0, 0, 1)).toBe(true);
  });
});

describe('intensity', () => {
  it('returns 1.0 at the lid edge band', () => {
    const halfH = lidHalfHeight(0, 1);
    expect(intensity(0, halfH, 0, OPEN)).toBe(1);
  });

  it('is pure: identical inputs produce identical output', () => {
    const a = intensity(0.1, 0.05, 1.23, { openness: 1, pupilX: 0.02, pupilY: -0.01 });
    const b = intensity(0.1, 0.05, 1.23, { openness: 1, pupilX: 0.02, pupilY: -0.01 });
    expect(a).toBe(b);
  });

  it('is black (0) at the pupil center', () => {
    expect(intensity(0, 0, 0, OPEN)).toBe(0);
  });

  it('renders iris striations in range within the iris ring', () => {
    const r = IRIS_RADIUS * 0.7;
    const v = intensity(r, 0, 0.5, OPEN);
    expect(v).toBeGreaterThanOrEqual(0);
    expect(v).toBeLessThanOrEqual(1);
  });

  it('falls back to sclera brightness (~0.3) between iris and lid', () => {
    // a point well inside the eye, outside the iris, away from the lid edge
    const v = intensity(0.3, 0, 0.7, OPEN);
    expect(v).toBeGreaterThan(0.2);
    expect(v).toBeLessThan(0.4);
  });

  it('stays low outside the eye (background field, ignoring ray bonus)', () => {
    const v = intensity(0.9, 0.9, 0.5, OPEN);
    expect(v).toBeGreaterThanOrEqual(0);
    expect(v).toBeLessThanOrEqual(0.24);
  });

  it('pupil follows the state target, not just the eye center', () => {
    const state = { openness: 1, pupilX: 0.2, pupilY: 0.05 };
    expect(intensity(0.2, 0.05, 0, state)).toBe(0);
    expect(intensity(0, 0, 0, state)).not.toBe(0);
  });

  it('stays within [0, 1] for a scattered sample of coordinates/time', () => {
    const samples: Array<[number, number, number]> = [
      [0, 0, 0],
      [-0.5, 0.1, 2],
      [0.61, 0.01, 5],
      [1, 1, 10],
      [-1, -1, 3.14],
    ];
    for (const [nx, ny, t] of samples) {
      const v = intensity(nx, ny, t, OPEN);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });
});

describe('pupilRadius', () => {
  it('oscillates around the base radius', () => {
    const r0 = pupilRadius(0);
    expect(r0).toBeGreaterThan(0);
    expect(r0).toBeLessThan(0.1);
  });
});
