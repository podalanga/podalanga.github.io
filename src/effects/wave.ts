// Pure per-cell delay math shared by theme-wipe.ts (radial wave from the toggle button) and
// page-glitch.ts (horizontal stagger of a top->bottom sweep). No DOM/Math.random access, so the
// delay formulas themselves stay unit-testable; callers supply the per-cell random sample.

export const COVER_MAX_DELAY = 0.55;
export const COVER_RANDOM_SPREAD = 0.25;
export const COVER_FLICKER = 0.18;

export const REVEAL_RANDOM_SPREAD = 0.35;
export const REVEAL_FLICKER = 0.12;

export const GLITCH_DURATION = 0.35;
export const GLITCH_MAX_DELAY = 0.12;
export const GLITCH_RANDOM_SPREAD = 0.08;

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

/** Euclidean distance from (x, y) to the origin, normalized by maxDist and clamped to [0, 1]. */
export function normalizedDist(x: number, y: number, originX: number, originY: number, maxDist: number): number {
  if (maxDist <= 0) return 0;
  return clamp01(Math.hypot(x - originX, y - originY) / maxDist);
}

/** Farthest a cell can be from (originX, originY) inside a width x height viewport (a corner). */
export function maxDistanceFromOrigin(originX: number, originY: number, width: number, height: number): number {
  const corners: Array<[number, number]> = [
    [0, 0],
    [width, 0],
    [0, height],
    [width, height],
  ];
  return Math.max(...corners.map(([cx, cy]) => Math.hypot(cx - originX, cy - originY)));
}

/** Cover-pass per-cell delay (seconds): grows with distance from the wipe origin, jittered by `rand`. */
export function coverDelay(distFrac: number, rand: number): number {
  return clamp01(distFrac) * COVER_MAX_DELAY + clamp01(rand) * COVER_RANDOM_SPREAD;
}

/** Reveal-pass per-cell delay (seconds): pure jitter, no distance term (per §6.2). */
export function revealDelay(rand: number): number {
  return clamp01(rand) * REVEAL_RANDOM_SPREAD;
}

/** Page-glitch per-column delay (seconds): a horizontal analogue of coverDelay for the sweep band. */
export function glitchColumnDelay(colFrac: number, rand: number): number {
  return clamp01(colFrac) * GLITCH_MAX_DELAY + clamp01(rand) * GLITCH_RANDOM_SPREAD;
}
