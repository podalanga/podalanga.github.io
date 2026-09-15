// Ouroboros (§7.4): pauses the CSS-driven rotating glyph ring while it's offscreen. The rotation
// itself and its reduced-motion kill are pure CSS (global.css's reduced-motion block zeroes all
// animation durations) — this file only saves cycles when the footer isn't in the viewport.
export function initOuroboros(): () => void {
  const rings = Array.from(document.querySelectorAll<HTMLElement>('[data-ouroboros]'));
  if (rings.length === 0) return () => {};

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        (entry.target as HTMLElement).classList.toggle('paused', !entry.isIntersecting);
      }
    },
    { threshold: 0 },
  );
  for (const ring of rings) observer.observe(ring);

  return () => observer.disconnect();
}
