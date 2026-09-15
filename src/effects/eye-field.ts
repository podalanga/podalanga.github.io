// Pure intensity field for the ASCII Orwell Eye loader. No DOM/Math.random access —
// deterministic in (nx, ny, t, state) so it can be unit-tested. nx, ny are aspect-corrected,
// viewport-centered coordinates roughly in [-1, 1].

export const EYE_W = 0.62;
export const EYE_H = 0.26;
export const IRIS_RADIUS = 0.13;
export const PUPIL_BASE_RADIUS = 0.045;
const LID_EDGE_EPS = 0.02;

export interface EyeFieldState {
  /** 0 = fully closed, 1 = fully open */
  openness: number;
  pupilX: number;
  pupilY: number;
}

function frac(n: number): number {
  return n - Math.floor(n);
}

/** Deterministic pseudo-noise in [0, 1) — no Math.random, so the field stays pure/testable. */
function noise2(x: number, y: number, t: number): number {
  return frac(Math.sin(x * 12.9898 + y * 78.233 + t * 0.37) * 43758.5453);
}

export function pupilRadius(t: number): number {
  return PUPIL_BASE_RADIUS * (1 + 0.12 * Math.sin(3 * t));
}

/** Half-height of the almond lid opening at horizontal position nx (<=0 outside the almond). */
export function lidHalfHeight(nx: number, openness: number): number {
  const ratio = nx / EYE_W;
  return EYE_H * (1 - ratio * ratio) * openness;
}

export function isInsideEye(nx: number, ny: number, openness: number): boolean {
  if (Math.abs(nx) >= EYE_W) return false;
  const halfH = lidHalfHeight(nx, openness);
  return halfH > 0 && Math.abs(ny) < halfH;
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

/** intensity(nx, ny, t, state) -> 0..1 */
export function intensity(nx: number, ny: number, t: number, state: EyeFieldState): number {
  const { openness, pupilX, pupilY } = state;
  const insideX = Math.abs(nx) < EYE_W;

  if (insideX) {
    const halfH = lidHalfHeight(nx, openness);
    if (halfH > 0) {
      const distToLid = halfH - Math.abs(ny);
      if (Math.abs(distToLid) < LID_EDGE_EPS) {
        return 1;
      }
    }
  }

  if (isInsideEye(nx, ny, openness)) {
    const dx = nx - pupilX;
    const dy = ny - pupilY;
    const r = Math.sqrt(dx * dx + dy * dy);
    const rPupil = pupilRadius(t);

    if (r < rPupil) return 0;

    if (r < IRIS_RADIUS) {
      const theta = Math.atan2(dy, dx);
      const striation = 0.55 + 0.35 * Math.sin(24 * theta + 2 * t) * (r / IRIS_RADIUS);
      return clamp01(striation);
    }

    return clamp01(0.3 + 0.06 * noise2(nx, ny, t));
  }

  const bg = 0.04 + 0.1 * noise2(nx * 0.5, ny * 0.5, t * 0.2);
  const theta = Math.atan2(ny, nx);
  const rays = 0.08 * Math.max(0, Math.cos(16 * theta));
  return clamp01(bg + rays);
}
