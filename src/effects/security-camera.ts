// Footer security camera: turns the ASCII head toward the cursor by writing a single `--angle`
// (degrees) custom property that drives the head layer's `rotate()` in SecurityCamera.astro. The
// art is drawn pointing up-and-right, so the rest angle (computed from the art grid at build time
// and handed over as `data-rest-angle`) is subtracted from the cursor's angle, keeping `--angle` at
// 0 when the cursor sits over the drawn resting direction. The head chases the target angle on
// every animation frame with a JS, delta-time-based ease rather than a CSS `transition` — a CSS
// transition retargets from whatever was last painted, so under any jank it silently falls behind
// or leaps ahead of where the cursor actually is; driving it from `now - lastFrameTime` each frame
// means the eased angle only ever depends on real elapsed time, never on how many frames got
// dropped. Paused via IntersectionObserver while the footer is offscreen, and skipped entirely
// under prefers-reduced-motion, where the camera just stays in its drawn pose; the ASCII art itself
// needs no JS at all, so no-JS visitors still see a static camera.
import { prefersReducedMotion } from '../lib/reduced-motion';

// The head follows the cursor exactly: `--angle` is the cursor's direction from the pivot minus
// the direction the art is drawn pointing. The camera sits in the footer's bottom-left corner, so
// the cursor can be anywhere from straight up (about 52 degrees above the drawn direction) round
// to below horizontal; every direction in that span is tracked 1:1, so the lens points right at
// the cursor. An earlier version squashed every turn through `limit * tanh(delta / limit)` with
// limits of -32/+38 degrees, which is only 1:1 for tiny turns: the head trailed the cursor by 5
// degrees at 30 and by 15-20 near straight up.
//
// Past a knee at KNEE of each limit (directions the cursor can only reach far below the camera)
// the turn eases toward the limit along a smooth tail, continuous in angle and slope with the 1:1
// part. It is an asymptote, not a hard clamp, so the head never freezes in a dead zone.
const MIN_ANGLE = -60;
const MAX_ANGLE = 60;
const KNEE = 0.9;
const EASE_TAU_MS = 60; // ~3*TAU (180ms) to settle, matching the old CSS transition's feel
const SETTLE_EPSILON = 0.01;

export function normalizeAngle(deg: number): number {
  let a = deg % 360;
  if (a <= -180) a += 360;
  else if (a > 180) a -= 360;
  return a;
}

/**
 * Head rotation, in degrees, for a cursor at (dx, dy) relative to the pivot (screen axes: +y down).
 * Pure — the unit tests drive this directly.
 */
export function cameraAngle(restAngle: number, dx: number, dy: number): number {
  const delta = normalizeAngle((Math.atan2(dy, dx) * 180) / Math.PI - restAngle);
  const limit = delta < 0 ? -MIN_ANGLE : MAX_ANGLE;
  const knee = KNEE * limit;
  const size = Math.abs(delta);
  if (size <= knee) return delta;
  // x / (1 + x): slope 1 where it meets the 1:1 part, and short of the limit for any finite turn
  // (tanh saturates to exactly 1 in floating point, which would bring the dead zone back).
  const room = limit - knee;
  const x = (size - knee) / room;
  return Math.sign(delta) * (knee + (room * x) / (1 + x));
}

interface Rig {
  camera: HTMLElement;
  pivot: HTMLElement;
  restAngle: number;
  currentAngle: number;
}

function buildRigs(cameras: HTMLElement[]): Rig[] {
  return cameras
    .map((camera) => {
      const pivot = camera.querySelector<HTMLElement>('[data-camera-pivot]');
      if (!pivot) return null;
      const restAngle = Number.parseFloat(camera.dataset.restAngle ?? '');
      if (!Number.isFinite(restAngle)) return null;
      return { camera, pivot, restAngle, currentAngle: 0 };
    })
    .filter((rig): rig is Rig => rig !== null);
}

export function initSecurityCamera(): () => void {
  const cameras = Array.from(document.querySelectorAll<HTMLElement>('[data-security-camera]'));
  if (cameras.length === 0) return () => {};

  if (prefersReducedMotion()) return () => {};

  // No deferred measurement any more: the rest angle comes from the art grid (see
  // SecurityCamera.astro), and the pivot's on-screen position is read fresh every frame via
  // getBoundingClientRect(), so nothing here depends on fonts or layout having settled first.
  const rigs = buildRigs(cameras);
  if (rigs.length === 0) return () => {};

  let active = false;
  let raf = 0;
  let lastFrameTime = 0;
  let hasCursor = false;
  let clientX = 0;
  let clientY = 0;

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) active = entry.isIntersecting;
      schedule();
    },
    { threshold: 0 },
  );
  for (const camera of cameras) observer.observe(camera);

  function targetAngle(rig: Rig): number {
    // The pivot marker is a 0x0 box, so its rect's top-left *is* its centre.
    const rect = rig.pivot.getBoundingClientRect();
    return cameraAngle(rig.restAngle, clientX - rect.left, clientY - rect.top);
  }

  function tick(now: number): void {
    raf = 0;
    const dt = lastFrameTime ? now - lastFrameTime : 0;
    lastFrameTime = now;
    const alpha = dt > 0 ? 1 - Math.exp(-dt / EASE_TAU_MS) : 1;

    let settled = true;
    for (const rig of rigs) {
      const target = targetAngle(rig);
      rig.currentAngle += (target - rig.currentAngle) * alpha;
      rig.camera.style.setProperty('--angle', rig.currentAngle.toFixed(2));
      if (Math.abs(target - rig.currentAngle) > SETTLE_EPSILON) settled = false;
    }

    if (active && hasCursor && !settled) {
      raf = window.requestAnimationFrame(tick);
    } else {
      lastFrameTime = 0;
    }
  }

  function schedule(): void {
    if (!active || !hasCursor || raf) return;
    raf = window.requestAnimationFrame(tick);
  }

  function onMouseMove(e: MouseEvent): void {
    hasCursor = true;
    clientX = e.clientX;
    clientY = e.clientY;
    schedule();
  }

  function onScroll(): void {
    schedule();
  }

  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('scroll', onScroll, { passive: true });

  return () => {
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('scroll', onScroll);
    if (raf) window.cancelAnimationFrame(raf);
    observer.disconnect();
  };
}
