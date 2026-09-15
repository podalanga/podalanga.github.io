// Footer security camera: turns the ASCII head toward the cursor by writing a single `--angle`
// (degrees) custom property that drives the head layer's `rotate()` in SecurityCamera.astro. The
// art is drawn pointing up-and-right, so the rest angle (computed once, from the fixed pivot to
// the lens) is subtracted from the cursor's angle before clamping, keeping `--angle` at 0 when the
// cursor sits over the drawn resting direction. Clamped to roughly -40..+35 degrees so the head
// can't swing into the wall or floor. Updates are throttled to one per animation frame, paused via
// IntersectionObserver while the footer is offscreen, and skipped entirely under
// prefers-reduced-motion, where the camera just stays in its drawn pose — the ASCII art itself
// needs no JS at all, so no-JS visitors still see a static camera.
import { prefersReducedMotion } from '../lib/reduced-motion';

const MIN_ANGLE = -40;
const MAX_ANGLE = 35;

function normalizeAngle(deg: number): number {
  let a = deg % 360;
  if (a <= -180) a += 360;
  else if (a > 180) a -= 360;
  return a;
}

export function initSecurityCamera(): () => void {
  const cameras = Array.from(document.querySelectorAll<HTMLElement>('[data-security-camera]'));
  if (cameras.length === 0) return () => {};

  if (prefersReducedMotion()) return () => {};

  const rigs = cameras
    .map((camera) => {
      const pivot = camera.querySelector<HTMLElement>('[data-camera-pivot]');
      const lens = camera.querySelector<HTMLElement>('[data-camera-lens]');
      if (!pivot || !lens) return null;
      const restAngle = (Math.atan2(
        lens.offsetTop - pivot.offsetTop,
        lens.offsetLeft - pivot.offsetLeft,
      ) *
        180) /
        Math.PI;
      return { camera, pivot, restAngle };
    })
    .filter((rig): rig is { camera: HTMLElement; pivot: HTMLElement; restAngle: number } => rig !== null);
  if (rigs.length === 0) return () => {};

  let active = false;
  let raf = 0;
  let pendingClientX = 0;
  let pendingClientY = 0;

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) active = entry.isIntersecting;
    },
    { threshold: 0 },
  );
  for (const camera of cameras) observer.observe(camera);

  function apply(): void {
    raf = 0;
    for (const rig of rigs) {
      const rect = rig.pivot.getBoundingClientRect();
      const cursorAngle =
        (Math.atan2(pendingClientY - rect.top, pendingClientX - rect.left) * 180) / Math.PI;
      const delta = normalizeAngle(cursorAngle - rig.restAngle);
      const angle = Math.max(MIN_ANGLE, Math.min(MAX_ANGLE, delta));
      rig.camera.style.setProperty('--angle', angle.toFixed(2));
    }
  }

  function schedule(clientX: number, clientY: number): void {
    if (!active) return;
    pendingClientX = clientX;
    pendingClientY = clientY;
    if (!raf) raf = window.requestAnimationFrame(apply);
  }

  function onMouseMove(e: MouseEvent): void {
    schedule(e.clientX, e.clientY);
  }

  function onScroll(): void {
    schedule(pendingClientX, pendingClientY);
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
