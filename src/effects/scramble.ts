// Scramble text (§6.4): elements with `data-scramble` resolve left->right from random glyphs on
// first intersection, and quick-rescramble on hover (nav/links). Real text stays the accessible
// name (`aria-label`); the animated characters live in an `aria-hidden` child so screen readers
// only ever see the final text.
import { prefersReducedMotion } from '../lib/reduced-motion';

const GLYPH_POOL = '!<>-_\\/[]{}=+*^?#$%&';
const RESOLVE_MS = 600;
const HOVER_MS = 250;

function randomGlyph(): string {
  return GLYPH_POOL[Math.floor(Math.random() * GLYPH_POOL.length)];
}

/** Pure: given the final characters and animation progress [0,1], returns the frame to render.
 *  `pickGlyph` is injected so this stays deterministic/testable. */
export function scrambleFrame(finalChars: string[], progress: number, pickGlyph: () => string = randomGlyph): string {
  const clamped = Math.max(0, Math.min(1, progress));
  const resolvedCount = Math.floor(clamped * finalChars.length);
  let out = '';
  for (let i = 0; i < finalChars.length; i++) {
    const ch = finalChars[i];
    if (ch === ' ') {
      out += ' ';
    } else if (i < resolvedCount) {
      out += ch;
    } else {
      out += pickGlyph();
    }
  }
  return out;
}

interface Controller {
  el: HTMLElement;
  track: HTMLElement;
  finalText: string;
  raf: number;
  start(durationMs: number): void;
}

function setupElement(el: HTMLElement): Controller {
  const finalText = el.dataset.scramble ?? el.textContent ?? '';
  const finalChars = finalText.split('');

  el.setAttribute('aria-label', finalText);
  el.textContent = '';
  const track = document.createElement('span');
  track.setAttribute('aria-hidden', 'true');
  track.textContent = finalText;
  el.appendChild(track);

  const controller: Controller = {
    el,
    track,
    finalText,
    raf: 0,
    start(durationMs: number) {
      cancelAnimationFrame(controller.raf);

      // Lock the box to its final rendered size before scrambling: swapping in glyphs of
      // different widths (proportional display font) would otherwise reflow everything
      // after this element on every frame, producing a page-wide jitter.
      const rect = el.getBoundingClientRect();
      const originalWidth = el.style.width;
      const originalDisplay = el.style.display;
      if (getComputedStyle(el).display === 'inline') {
        el.style.display = 'inline-block';
      }
      el.style.width = `${rect.width}px`;

      const startedAt = performance.now();
      const tick = (now: number) => {
        const progress = (now - startedAt) / durationMs;
        track.textContent = scrambleFrame(finalChars, progress);
        if (progress < 1) {
          controller.raf = requestAnimationFrame(tick);
        } else {
          track.textContent = finalText;
          el.style.width = originalWidth;
          el.style.display = originalDisplay;
        }
      };
      controller.raf = requestAnimationFrame(tick);
    },
  };
  return controller;
}

/** Wires up all `[data-scramble]` elements on the current page. Returns a destroy fn. */
export function initScramble(): () => void {
  const elements = Array.from(document.querySelectorAll<HTMLElement>('[data-scramble]'));
  if (elements.length === 0) return () => {};

  const reduced = prefersReducedMotion();
  const controllers = elements.map(setupElement);

  let observer: IntersectionObserver | undefined;
  if (!reduced) {
    observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const controller = controllers.find((c) => c.el === entry.target);
          controller?.start(RESOLVE_MS);
          observer?.unobserve(entry.target);
        }
      },
      { threshold: 0.4 },
    );
    for (const c of controllers) observer.observe(c.el);
  }
  // Reduced motion: track already holds the final text from setupElement, nothing to animate.

  const hoverHandlers: Array<[HTMLElement, () => void]> = [];
  if (!reduced) {
    for (const c of controllers) {
      const link = c.el.closest('a');
      if (!link) continue;
      const handler = () => c.start(HOVER_MS);
      link.addEventListener('mouseenter', handler);
      hoverHandlers.push([link, handler]);
    }
  }

  return () => {
    observer?.disconnect();
    for (const c of controllers) cancelAnimationFrame(c.raf);
    for (const [link, handler] of hoverHandlers) link.removeEventListener('mouseenter', handler);
  };
}
