// The boot loader's ASCII eye, drawn into a sized canvas instead of the whole viewport (the
// 404 page). Same intensity field and glyph atlas as `eye-loader.ts`, minus the boot sequence:
// it simply watches, follows the cursor and blinks now and then. Only the eye itself is drawn
// (no background noise), so the canvas has no visible edges on the page.
import { buildGlyphAtlas, intensityToGlyphIndex, intensityToLevel, type GlyphAtlas } from './ascii/glyph-atlas';
import { computeGrid, type GridConfig } from './ascii/grid';
import { EYE_W, intensity, isInsideEye, type EyeFieldState } from './eye-field';
import { prefersReducedMotion } from '../lib/reduced-motion';

const GLYPH_SIZE = 12;
// Field units from the centre to the canvas's left/right edge: a little wider than the eye.
const HALF_SPAN = EYE_W * 1.08;
const BLINK_S = 0.3;

function signalColor(): string {
  return getComputedStyle(document.documentElement).getPropertyValue('--signal').trim() || '#ff3333';
}

function setupCanvas(canvas: HTMLCanvasElement): () => void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return () => {};

  const reduced = prefersReducedMotion();
  const state: EyeFieldState = { openness: 1, pupilX: 0, pupilY: 0 };
  let atlas: GlyphAtlas = buildGlyphAtlas(GLYPH_SIZE, signalColor());
  let grid: GridConfig | undefined;
  let cssWidth = 0;
  let cssHeight = 0;

  function resize(): void {
    const rect = canvas.getBoundingClientRect();
    cssWidth = rect.width;
    cssHeight = rect.height;
    if (cssWidth === 0 || cssHeight === 0) {
      grid = undefined;
      return;
    }
    grid = computeGrid(cssWidth, cssHeight, window.devicePixelRatio);
    canvas.width = grid.width;
    canvas.height = grid.height;
  }

  function render(t: number, shimmer: boolean): void {
    if (!ctx || !grid) return;
    const { cols, rows, cellSize, dpr } = grid;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssWidth, cssHeight);

    const cx = cssWidth / 2;
    const cy = cssHeight / 2;
    const scale = HALF_SPAN / (cssWidth / 2);

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const px = col * cellSize + cellSize / 2;
        const py = row * cellSize + cellSize / 2;
        const nx = (px - cx) * scale;
        const ny = (py - cy) * scale;

        const cell = intensity(nx, ny, t, state);
        // Keep the lid outline (intensity 1) and everything inside it; drop the surrounding field.
        if (cell < 1 && !isInsideEye(nx, ny, state.openness)) continue;
        if (cell <= 0.02) continue;

        const jitter = shimmer && Math.random() < 0.08 + 0.4 * cell ? (Math.random() - 0.5) * 0.2 : 0;
        atlas.draw(
          ctx,
          intensityToGlyphIndex(cell + jitter),
          intensityToLevel(cell),
          px - GLYPH_SIZE / 2,
          py - GLYPH_SIZE / 2,
        );
      }
    }
  }

  // The glyph colour is baked into the atlas, so a theme switch needs a new one.
  const themeObserver = new MutationObserver(() => {
    atlas = buildGlyphAtlas(GLYPH_SIZE, signalColor());
    if (reduced) render(0, false);
  });
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  const resizeObserver = new ResizeObserver(() => {
    resize();
    if (reduced) render(0, false);
  });
  resizeObserver.observe(canvas);
  resize();

  if (reduced) {
    render(0, false);
    return () => {
      themeObserver.disconnect();
      resizeObserver.disconnect();
    };
  }

  let targetX = 0;
  let targetY = 0;
  let hasMouse = false;
  let nextSaccadeAt = 0;
  let nextBlinkAt = 2.5;
  let visible = true;
  let raf = 0;
  const start = performance.now();

  function onMouseMove(e: MouseEvent): void {
    hasMouse = true;
    const rect = canvas.getBoundingClientRect();
    const dx = (e.clientX - (rect.left + rect.width / 2)) / window.innerWidth;
    const dy = (e.clientY - (rect.top + rect.height / 2)) / window.innerHeight;
    targetX = Math.max(-0.35, Math.min(0.35, dx));
    targetY = Math.max(-0.12, Math.min(0.12, dy * 0.6));
  }
  window.addEventListener('mousemove', onMouseMove);

  const visibility = new IntersectionObserver((entries) => {
    visible = entries.some((entry) => entry.isIntersecting);
  });
  visibility.observe(canvas);

  function frame(now: number): void {
    raf = requestAnimationFrame(frame);
    if (!visible || document.visibilityState === 'hidden') return;

    const t = (now - start) / 1000;

    if (!hasMouse && t >= nextSaccadeAt) {
      targetX = Math.sin(t * 12.9) * 0.25;
      targetY = Math.cos(t * 7.3) * 0.1;
      nextSaccadeAt = t + 0.9 + (t % 1) * 0.6;
    }
    state.pupilX += (targetX - state.pupilX) * 0.08;
    state.pupilY += (targetY - state.pupilY) * 0.08;

    // Blink: openness 1 -> 0 -> 1, then wait a few seconds for the next one.
    if (t >= nextBlinkAt + BLINK_S) nextBlinkAt = t + 3 + (t % 1) * 3;
    const f = (t - nextBlinkAt) / BLINK_S;
    state.openness = f < 0 || f > 1 ? 1 : f < 0.5 ? 1 - f * 2 : (f - 0.5) * 2;

    render(t, true);
  }
  raf = requestAnimationFrame(frame);

  return () => {
    cancelAnimationFrame(raf);
    window.removeEventListener('mousemove', onMouseMove);
    visibility.disconnect();
    themeObserver.disconnect();
    resizeObserver.disconnect();
  };
}

/** Wires up every `canvas[data-eye-inline]` on the current page. Returns a destroy fn. */
export function initInlineEye(): () => void {
  const canvases = Array.from(document.querySelectorAll<HTMLCanvasElement>('canvas[data-eye-inline]'));
  const teardowns = canvases.map(setupCanvas);
  return () => teardowns.forEach((fn) => fn());
}
