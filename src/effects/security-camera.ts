// Footer security camera: swivels its ASCII pupil toward the cursor's horizontal position via a
// `--t` CSS custom property (-1 left .. 1 right), throttled to one update per animation frame.
// Paused via IntersectionObserver while the footer is offscreen (mirrors the old ouroboros' own
// pause behavior) and skipped entirely under prefers-reduced-motion, where the pupil just stays
// centered — the ASCII art itself needs no JS at all, so no-JS visitors still see a static camera.
import { prefersReducedMotion } from '../lib/reduced-motion';

export function initSecurityCamera(): () => void {
  const cameras = Array.from(document.querySelectorAll<HTMLElement>('[data-security-camera]'));
  if (cameras.length === 0) return () => {};

  if (prefersReducedMotion()) return () => {};

  let active = false;
  let raf = 0;
  let pendingT = 0;

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) active = entry.isIntersecting;
    },
    { threshold: 0 },
  );
  for (const camera of cameras) observer.observe(camera);

  function applyT(): void {
    raf = 0;
    for (const camera of cameras) {
      const pupil = camera.querySelector<HTMLElement>('[data-camera-pupil]');
      pupil?.style.setProperty('--t', pendingT.toFixed(3));
    }
  }

  function onMouseMove(e: MouseEvent): void {
    if (!active) return;
    const t = (e.clientX / window.innerWidth) * 2 - 1;
    pendingT = Math.max(-1, Math.min(1, t));
    if (!raf) raf = window.requestAnimationFrame(applyT);
  }

  window.addEventListener('mousemove', onMouseMove);

  return () => {
    window.removeEventListener('mousemove', onMouseMove);
    if (raf) window.cancelAnimationFrame(raf);
    observer.disconnect();
  };
}
