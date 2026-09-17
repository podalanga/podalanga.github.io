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

/**
 * Per-character advance widths of `text` as currently rendered inside `node`.
 *
 * Measured with a Range rather than by rendering each character alone, so the
 * widths include real kerning and the sum over a word matches its natural width.
 */
function measureCharWidths(node: Text, length: number): number[] {
  const range = document.createRange();
  const widths: number[] = [];
  for (let i = 0; i < length; i++) {
    range.setStart(node, i);
    range.setEnd(node, i + 1);
    widths.push(range.getBoundingClientRect().width);
  }
  range.detach();
  return widths;
}

interface Controller {
  el: HTMLElement;
  track: HTMLElement;
  finalText: string;
  raf: number;
  start(durationMs: number): void;
  stop(): void;
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

  /** Put the plain, naturally-kerned text back. This is the resting state. */
  function restPlainText() {
    track.textContent = finalText;
  }

  const controller: Controller = {
    el,
    track,
    finalText,
    raf: 0,
    stop() {
      cancelAnimationFrame(controller.raf);
      controller.raf = 0;
      restPlainText();
    },
    start(durationMs: number) {
      cancelAnimationFrame(controller.raf);
      restPlainText();

      // Glyphs from the pool are not the same width as the characters they stand in
      // for, so letting them flow normally re-wraps the element mid-animation — a
      // three-line headline snapping to two lines and back, every few frames. Give
      // every character a cell pinned to its own final advance width: the glyphs then
      // swap inside fixed boxes, word widths never change, and the line breaks stay
      // exactly where they land in the final text.
      const textNode = track.firstChild as Text | null;
      const widths =
        textNode && textNode.nodeType === Node.TEXT_NODE
          ? measureCharWidths(textNode, finalChars.length)
          : [];

      // Zero widths mean the element isn't rendered (display:none, detached). Nothing
      // to measure and nothing anyone can see — leave the final text in place.
      if (widths.length !== finalChars.length || widths.every((w) => w === 0)) {
        restPlainText();
        return;
      }

      const cells: Array<HTMLSpanElement | null> = [];
      const frag = document.createDocumentFragment();
      for (let i = 0; i < finalChars.length; i++) {
        if (finalChars[i] === ' ') {
          // Real spaces, so the browser still breaks lines at the same points.
          frag.appendChild(document.createTextNode(' '));
          cells.push(null);
          continue;
        }
        const cell = document.createElement('span');
        cell.textContent = finalChars[i];
        cell.style.display = 'inline-block';
        cell.style.width = `${widths[i]}px`;
        cell.style.textAlign = 'center';
        frag.appendChild(cell);
        cells.push(cell);
      }
      track.textContent = '';
      track.appendChild(frag);

      const startedAt = performance.now();
      const tick = (now: number) => {
        const progress = (now - startedAt) / durationMs;
        const frame = scrambleFrame(finalChars, progress);
        for (let i = 0; i < cells.length; i++) {
          const cell = cells[i];
          if (cell && cell.textContent !== frame[i]) cell.textContent = frame[i];
        }
        if (progress < 1) {
          controller.raf = requestAnimationFrame(tick);
        } else {
          controller.raf = 0;
          // Back to a single text node: the cells were a scaffold for the animation,
          // and plain text keeps the final wordmark properly kerned.
          restPlainText();
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
  let cancelled = false;

  // On a cold load the webfont may still be swapping in. Measuring cells against
  // the fallback face would pin every character to the wrong width, so wait for the
  // real face before any scramble runs. `fonts.ready` is already resolved on warm
  // loads, so this costs nothing there.
  const fontsReady: Promise<unknown> = document.fonts?.ready ?? Promise.resolve();

  if (!reduced) {
    void fontsReady.then(() => {
      if (cancelled) return;
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
    });
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
    cancelled = true;
    observer?.disconnect();
    for (const c of controllers) c.stop();
    for (const [link, handler] of hoverHandlers) link.removeEventListener('mouseenter', handler);
  };
}
