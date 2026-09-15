// Page transition glitch (§6.3): a short red glyph band sweeps top->bottom on `astro:before-swap`,
// masking the ClientRouter DOM swap underneath. Disabled entirely under reduced motion (falls back
// to the router's default instant swap). Registered once for the session (not per astro:page-load):
// there is only ever one `astro:before-swap` listener for the app's lifetime.
import { buildGlyphAtlas, intensityToLevel } from './ascii/glyph-atlas';
import { computeGrid } from './ascii/grid';
import { GLITCH_DURATION, GLITCH_MAX_DELAY, glitchColumnDelay } from './wave';
import { prefersReducedMotion } from '../lib/reduced-motion';

const BAND_HEIGHT_FRAC = 0.14;
const TRAVEL_DUR = GLITCH_DURATION - GLITCH_MAX_DELAY;

/** Sets up the persistent before-swap listener. Returns a destroy fn (unused in normal operation;
 *  provided for symmetry/testability). */
export function initPageGlitch(): () => void {
  function onBeforeSwap(): void {
    if (prefersReducedMotion()) return;
    runGlitch();
  }
  document.addEventListener('astro:before-swap', onBeforeSwap);
  return () => document.removeEventListener('astro:before-swap', onBeforeSwap);
}

function runGlitch(): void {
  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  Object.assign(canvas.style, {
    position: 'fixed',
    inset: '0',
    zIndex: '9997',
    pointerEvents: 'none',
    width: '100vw',
    height: '100vh',
  });
  document.body.appendChild(canvas);

  const grid = computeGrid(window.innerWidth, window.innerHeight, window.devicePixelRatio);
  canvas.width = grid.width;
  canvas.height = grid.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    canvas.remove();
    return;
  }

  const atlas = buildGlyphAtlas(14, '#ff3333');
  const { cols, rows, cellSize, dpr } = grid;
  const bandHeight = window.innerHeight * BAND_HEIGHT_FRAC;
  const totalTravel = window.innerHeight + bandHeight * 2;

  const colDelays = new Float32Array(cols);
  for (let c = 0; c < cols; c++) {
    colDelays[c] = glitchColumnDelay(cols > 1 ? c / (cols - 1) : 0, Math.random());
  }

  const start = performance.now();
  let raf = 0;

  function finish(): void {
    cancelAnimationFrame(raf);
    window.clearTimeout(failsafe);
    canvas.remove();
  }

  // Failsafe: never leave the band stuck on screen if a frame callback stalls.
  const failsafe = window.setTimeout(finish, (GLITCH_DURATION + 0.2) * 1000);

  function frame(now: number): void {
    if (!ctx) return;
    const t = (now - start) / 1000;

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

    let allDone = true;
    for (let col = 0; col < cols; col++) {
      const localT = t - colDelays[col];
      if (localT < 0) {
        allDone = false;
        continue;
      }
      const frac = Math.min(1, localT / TRAVEL_DUR);
      if (frac < 1) allDone = false;

      const bandTop = -bandHeight + frac * totalTravel;
      const rowStart = Math.max(0, Math.floor(bandTop / cellSize));
      const rowEnd = Math.min(rows, Math.ceil((bandTop + bandHeight) / cellSize));
      const px = col * cellSize;
      for (let row = rowStart; row < rowEnd; row++) {
        const py = row * cellSize;
        const glyphIndex = Math.floor(Math.random() * atlas.glyphs.length);
        const level = intensityToLevel(0.7 + Math.random() * 0.3);
        atlas.draw(ctx, glyphIndex, level, px, py);
      }
    }

    ctx.restore();

    if (allDone) {
      finish();
      return;
    }
    raf = requestAnimationFrame(frame);
  }

  raf = requestAnimationFrame(frame);
}
