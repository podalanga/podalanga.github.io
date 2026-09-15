// Redaction reveal (§7.2): `[data-redact]` elements show a solid bar over decorative text by
// default; hover/focus/tap scrambles the bar into the real text, then reverts on leave/blur.
// The real text is always in the DOM (`aria-hidden="false"` text node) — the bar is purely visual.
import { scrambleFrame } from './scramble';
import { prefersReducedMotion } from '../lib/reduced-motion';

const REVEAL_MS = 300;

function setupElement(el: HTMLElement): () => void {
  const finalText = el.dataset.redact ?? el.textContent ?? '';
  const finalChars = finalText.split('');
  const textEl = el.querySelector<HTMLElement>('.redact-text');
  if (!textEl) return () => {};

  let raf = 0;

  function reveal(): void {
    el.classList.add('revealed');
    if (prefersReducedMotion()) {
      textEl!.textContent = finalText;
      return;
    }
    cancelAnimationFrame(raf);
    const start = performance.now();
    const tick = (now: number) => {
      const progress = (now - start) / REVEAL_MS;
      textEl!.textContent = scrambleFrame(finalChars, progress);
      if (progress < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
  }

  function hide(): void {
    cancelAnimationFrame(raf);
    el.classList.remove('revealed');
    textEl!.textContent = finalText;
  }

  function toggle(): void {
    el.classList.contains('revealed') ? hide() : reveal();
  }

  el.addEventListener('pointerenter', reveal);
  el.addEventListener('pointerleave', hide);
  el.addEventListener('focus', reveal);
  el.addEventListener('blur', hide);
  el.addEventListener('click', toggle);

  return () => {
    cancelAnimationFrame(raf);
    el.removeEventListener('pointerenter', reveal);
    el.removeEventListener('pointerleave', hide);
    el.removeEventListener('focus', reveal);
    el.removeEventListener('blur', hide);
    el.removeEventListener('click', toggle);
  };
}

/** Wires up all `[data-redact]` elements on the current page. Returns a destroy fn. */
export function initRedacted(): () => void {
  const elements = Array.from(document.querySelectorAll<HTMLElement>('[data-redact]'));
  const teardowns = elements.map(setupElement);
  return () => teardowns.forEach((fn) => fn());
}
