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

// The head art is a long diagonal wedge from the pivot, not a compact blob: swinging it far toward
// the negative end stretches that long axis into an unrecognizable streak, while the positive side
// stays compact and clean. Hence the asymmetric limits.
//
// These are *asymptotes*, not a hard clamp. The camera sits in the footer's bottom-left corner, so
// following the cursor across a full viewport spans well over 90 degrees of direction — far more
// than the range the art can actually rotate through. A hard clamp turned most of the screen into a
// dead zone where the head sat frozen at a limit while the cursor kept moving, which is exactly
// what "the camera doesn't follow the pointer" looked like. Squashing the delta through `tanh`
// instead keeps the mapping strictly monotonic: every cursor direction maps to a distinct angle, so
// the head always visibly responds, while never quite reaching the angle where the wedge breaks.
const MIN_ANGLE = -32;
const MAX_ANGLE = 38;
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
  return Math.sign(delta) * limit * Math.tanh(Math.abs(delta) / limit);
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
