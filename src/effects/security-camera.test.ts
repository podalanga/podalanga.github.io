import { describe, expect, it } from 'vitest';
import { cameraAngle, normalizeAngle } from './security-camera';

// Matches the asymptotes in security-camera.ts.
const MIN_ANGLE = -32;
const MAX_ANGLE = 38;

// The rest direction the art is drawn in (pivot -> lens), from security-camera-art.ts:
// PIVOT {col: 23.5, row: 14.5}, LENS {col: 44, row: 4}, CHAR_W_EM 0.6 -> up and to the right.
const REST = (Math.atan2(4.5 - 14.5, (44.5 - 23.5) * 0.6) * 180) / Math.PI;

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

  it('turns the head up when the cursor is above the rest direction', () => {
    expect(cameraAngle(REST, ...at(REST - 25))).toBeLessThan(0);
  });

  it('turns the head down when the cursor is below the rest direction', () => {
    expect(cameraAngle(REST, ...at(REST + 25))).toBeGreaterThan(0);
  });

  it('stays inside the asymptotes for every cursor direction', () => {
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
