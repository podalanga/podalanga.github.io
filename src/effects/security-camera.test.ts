import { describe, expect, it } from 'vitest';
import { cameraAngle, normalizeAngle } from './security-camera';
import { LENS, PIVOT, housingAxis, onAxis } from './security-camera-art';

// Matches the bounds in security-camera.ts.
const MIN_ANGLE = -32;
const MAX_ANGLE = 38;
const KNEE = 0.9;

// The direction the housing is drawn pointing, as SecurityCamera.astro computes it.
const AXIS = housingAxis(0.6);
const REST = AXIS.angle;

/** Cursor offset (screen axes, +y down) at `deg` from the pivot. */
const at = (deg: number): [number, number] => [
  Math.cos((deg * Math.PI) / 180) * 500,
  Math.sin((deg * Math.PI) / 180) * 500,
];

describe('normalizeAngle', () => {
  it('leaves angles already in range alone', () => {
    expect(normalizeAngle(0)).toBe(0);
    expect(normalizeAngle(-179)).toBe(-179);
    expect(normalizeAngle(180)).toBe(180);
  });

  it('wraps past the half turn', () => {
    expect(normalizeAngle(190)).toBeCloseTo(-170);
    expect(normalizeAngle(-190)).toBeCloseTo(170);
    expect(normalizeAngle(540)).toBeCloseTo(180);
  });
});

describe('cameraAngle', () => {
  it('is 0 when the cursor lies along the drawn resting direction', () => {
    expect(cameraAngle(REST, ...at(REST))).toBeCloseTo(0, 6);
  });

  it('points exactly at the cursor everywhere inside its bounds', () => {
    for (let d = Math.ceil(KNEE * MIN_ANGLE); d <= Math.floor(KNEE * MAX_ANGLE); d += 1) {
      expect(cameraAngle(REST, ...at(REST + d))).toBeCloseTo(d, 6);
    }
  });

  it('runs the centre line, not the pivot direction, through the cursor', () => {
    // The line sits `offset` from the pivot; after the turn the cursor must lie on it.
    const offset = -40;
    for (const [dx, dy] of [
      [300, -200],
      [500, -60],
      [400, -250],
      [120, -90],
    ] as const) {
      const turn = cameraAngle(REST, dx, dy, offset);
      const a = ((REST + turn) * Math.PI) / 180;
      const cross = Math.cos(a) * dy - Math.sin(a) * dx;
      const along = Math.cos(a) * dx + Math.sin(a) * dy;
      expect(cross).toBeCloseTo(offset, 6);
      expect(along).toBeGreaterThan(0);
    }
  });

  it('turns the head up when the cursor is above the rest direction', () => {
    expect(cameraAngle(REST, ...at(REST - 25))).toBeLessThan(0);
  });

  it('turns the head down when the cursor is below the rest direction', () => {
    expect(cameraAngle(REST, ...at(REST + 25))).toBeGreaterThan(0);
  });

  it('stays inside its bounds for every cursor direction', () => {
    for (let deg = -180; deg <= 180; deg += 1) {
      const angle = cameraAngle(REST, ...at(deg));
      expect(angle).toBeGreaterThan(MIN_ANGLE);
      expect(angle).toBeLessThan(MAX_ANGLE);
    }
  });

  it('never goes flat: the head keeps moving even far past the limits', () => {
    // The old hard clamp made these identical, which is what left dead zones on screen.
    const far = cameraAngle(REST, ...at(REST + 80));
    const farther = cameraAngle(REST, ...at(REST + 120));
    expect(farther).toBeGreaterThan(far);

    const up = cameraAngle(REST, ...at(REST - 80));
    const higher = cameraAngle(REST, ...at(REST - 120));
    expect(higher).toBeLessThan(up);
  });

  it('is monotonic in the cursor direction across the useful sweep', () => {
    let prev = -Infinity;
    for (let offset = -150; offset <= 150; offset += 5) {
      const angle = cameraAngle(REST, ...at(REST + offset));
      expect(angle).toBeGreaterThan(prev);
      prev = angle;
    }
  });

  it('handles the wrap point behind the camera without flipping sign mid-sweep', () => {
    // A cursor direction that only normalizes into range after the +-180 wrap.
    expect(cameraAngle(REST, ...at(REST + 179))).toBeGreaterThan(0);
    expect(cameraAngle(REST, ...at(REST - 179))).toBeLessThan(0);
  });

  it('tracks near the identity for small deflections', () => {
    // Close to rest the mapping should barely compress, so the head reads as truly following.
    expect(cameraAngle(REST, ...at(REST + 5))).toBeCloseTo(5, 0);
    expect(cameraAngle(REST, ...at(REST - 5))).toBeCloseTo(-5, 0);
  });
});

describe('housingAxis', () => {
  it('runs along the housing, nearly level, not up the steep pivot -> lens line', () => {
    const pivotToLens = (Math.atan2(LENS.row + 0.5 - PIVOT.row, (LENS.col + 0.5 - PIVOT.col) * 0.6) * 180) / Math.PI;
    expect(AXIS.angle).toBeGreaterThan(-15);
    expect(AXIS.angle).toBeLessThan(0);
    expect(AXIS.angle - pivotToLens).toBeGreaterThan(20);
  });

  it('puts the lens on the centre line', () => {
    const lens = onAxis(AXIS, (LENS.col + 0.5) * 0.6, LENS.row + 0.5);
    const r = (AXIS.angle * Math.PI) / 180;
    expect(Math.cos(r) * (lens.y - AXIS.y) - Math.sin(r) * (lens.x - AXIS.x)).toBeCloseTo(0, 9);
    expect(Math.hypot(lens.x - (LENS.col + 0.5) * 0.6, lens.y - (LENS.row + 0.5))).toBeLessThan(1.5);
  });
});
