// Orchestrates the ASCII Orwell Eye boot loader: full sequence on first visit to the home page,
// fast on repeats there, a quick hint-free flash on every other page, instant skip on input, a
// static frame under reduced motion, and a hard failsafe.
import { buildGlyphAtlas, intensityToGlyphIndex, intensityToLevel } from './ascii/glyph-atlas';
import { computeGrid, setupResize, type GridConfig } from './ascii/grid';
import { intensity, type EyeFieldState } from './eye-field';
import { getItem, setItem } from '../lib/storage';
import { prefersReducedMotion } from '../lib/reduced-motion';

const SEEN_KEY = 'pdl:eye-seen';
const FAILSAFE_MS = 5000;

type Phase = 'noise' | 'resolve' | 'watch' | 'blink' | 'dissolve' | 'done';

interface Timeline {
  noise: [number, number];
  resolve: [number, number];
  watch: [number, number];
  blink: [number, number];
  dissolve: [number, number];
}

const FULL: Timeline = {
  noise: [0, 0.6],
  resolve: [0.6, 1.4],
  watch: [1.4, 2.4],
  blink: [2.4, 2.7],
  dissolve: [2.7, 3.2],
};

const FAST: Timeline = {
  noise: [0, 0.15],
  resolve: [0.15, 0.4],
  watch: [0.4, 0.55],
  blink: [0.55, 0.7],
  dissolve: [0.7, 0.9],
};

// Non-home pages skip the terminal hint (already reachable via the header dot and footer link
// there) and don't need the runway to read it, so they get an even quicker flash than FAST.
const QUICK: Timeline = {
  noise: [0, 0.08],
  resolve: [0.08, 0.2],
  watch: [0.2, 0.3],
  blink: [0.3, 0.38],
  dissolve: [0.38, 0.5],
};

function phaseAt(t: number, timeline: Timeline): Phase {
  if (t < timeline.resolve[0]) return 'noise';
  if (t < timeline.watch[0]) return 'resolve';
  if (t < timeline.blink[0]) return 'watch';
  if (t < timeline.dissolve[0]) return 'blink';
  if (t < timeline.dissolve[1]) return 'dissolve';
  return 'done';
}

function randomHex4(): string {
  return Math.floor(Math.random() * 0x10000)
    .toString(16)
    .padStart(4, '0')
    .toUpperCase();
}

function lerp(a: number, b: number, f: number): number {
  return a + (b - a) * f;
}

export function initEyeLoader(): void {
  // This module script only ever executes once per SPA session (Astro never re-runs
  // bundled scripts after a soft nav), but the static `#eye-loader` markup is still part
  // of every page's HTML and gets reinserted on each swap. Strip it for the lifetime of
  // the session so soft navs never show a stray full-screen overlay.
  document.addEventListener('astro:after-swap', () => {
    document.getElementById('eye-loader')?.remove();
  });
  try {
    run();
  } catch {
    hardFail();
  }
}

/** Last-resort unblock: used when `run()` throws before it can set up its own `finish`. */
function hardFail(): void {
  document.documentElement.classList.remove('eye-pending');
  document.getElementById('eye-loader')?.remove();
  window.dispatchEvent(new CustomEvent('eye:done'));
}

function run(): void {
  const root = document.getElementById('eye-loader');
  const canvas = document.getElementById('eye-canvas') as HTMLCanvasElement | null;
  const caption = document.getElementById('eye-caption');
  const percent = document.getElementById('eye-percent');
  const hint = document.getElementById('eye-hint');
  if (!root || !canvas) {
    hardFail();
    return;
  }

  const isHome = root.dataset.home === '1';
  if (isHome && hint) hint.hidden = false;

  // Hard failsafe: always unblock the page even if rendering throws mid-sequence.
  const failsafe = window.setTimeout(finish, FAILSAFE_MS);
  let finished = false;
  // Assigned further down (skipped entirely on the reduced-motion path), so `finish`
  // (which can run before that point) must not read it as a `const` closed-over TDZ binding.
  let cleanupResize: (() => void) | undefined;

  function finish(): void {
    if (finished) return;
    finished = true;
    window.clearTimeout(failsafe);
    cleanupResize?.();
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('pointerdown', onSkip);
    window.removeEventListener('keydown', onSkip);
    window.removeEventListener('touchstart', onSkip);
    document.documentElement.classList.remove('eye-pending');
    root?.remove();
    window.dispatchEvent(new CustomEvent('eye:done'));
  }

  const seen = getItem(SEEN_KEY) === '1';
  if (!seen) setItem(SEEN_KEY, '1');

  if (prefersReducedMotion()) {
    runStaticFrame(canvas, finish);
    return;
  }

  const timeline = isHome ? (seen ? FAST : FULL) : QUICK;
  const subject = randomHex4();

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    finish();
    return;
  }

  const glyphAtlasSize = 14;
  const atlas = buildGlyphAtlas(glyphAtlasSize, '#ff3333');

  let grid: GridConfig = computeGrid(window.innerWidth, window.innerHeight, window.devicePixelRatio);
  cleanupResize = setupResize(canvas, (g) => {
    grid = g;
  });

  const state: EyeFieldState = { openness: 1, pupilX: 0, pupilY: 0 };
  let pupilTargetX = 0;
  let pupilTargetY = 0;
  let hasMouse = false;
  let nextSaccadeAt = 0;

  function onMouseMove(e: MouseEvent): void {
    hasMouse = true;
    const nx = ((e.clientX / window.innerWidth) * 2 - 1) * 0.5;
    const ny = ((e.clientY / window.innerHeight) * 2 - 1) * 0.3;
    pupilTargetX = Math.max(-0.35, Math.min(0.35, nx));
    pupilTargetY = Math.max(-0.12, Math.min(0.12, ny));
  }
  window.addEventListener('mousemove', onMouseMove);

  function onSkip(): void {
    skip = true;
  }
  window.addEventListener('pointerdown', onSkip);
  window.addEventListener('keydown', onSkip);
  window.addEventListener('touchstart', onSkip);

  let skip = false;
  const start = performance.now();
  let dissolveStart: number | null = null;

  function frame(now: number): void {
    if (finished) return;
    if (document.visibilityState === 'hidden') {
      requestAnimationFrame(frame);
      return;
    }

    let t = (now - start) / 1000;
    let phase: Phase;

    if (skip && dissolveStart === null) {
      // Jump straight to the fast dissolve, from wherever we were.
      dissolveStart = t;
    }

    if (dissolveStart !== null) {
      const dissolveElapsed = t - dissolveStart;
      const dissolveDur = FAST.dissolve[1] - FAST.dissolve[0];
      phase = dissolveElapsed >= dissolveDur ? 'done' : 'dissolve';
      t = FAST.dissolve[0] + Math.min(dissolveElapsed, dissolveDur);
    } else {
      phase = phaseAt(t, timeline);
    }

    if (phase === 'done') {
      finish();
      return;
    }

    // Saccades when there's no mouse input.
    if (!hasMouse && t >= nextSaccadeAt) {
      pupilTargetX = (Math.sin(t * 12.9) * 0.5 + 0.5 - 0.5) * 0.5;
      pupilTargetY = (Math.cos(t * 7.3) * 0.5 + 0.5 - 0.5) * 0.2;
      nextSaccadeAt = t + 0.9 + (t % 1) * 0.6;
    }
    state.pupilX = lerp(state.pupilX, pupilTargetX, 0.08);
    state.pupilY = lerp(state.pupilY, pupilTargetY, 0.08);

    // Blink: openness 1 -> 0 -> 1 across the blink phase.
    if (phase === 'blink') {
      const [b0, b1] = timeline.blink;
      const f = (t - b0) / (b1 - b0);
      state.openness = f < 0.5 ? 1 - f * 2 : (f - 0.5) * 2;
    } else if (phase === 'watch') {
      state.openness = 1;
    } else if (phase === 'noise' || phase === 'resolve') {
      state.openness = 1;
    } else {
      state.openness = 1;
    }

    render(phase, t);
    requestAnimationFrame(frame);
  }

  function render(phase: Phase, t: number): void {
    if (!ctx) return;
    const { cols, rows, cellSize, dpr } = grid;
    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);

    const minDim = Math.min(window.innerWidth, window.innerHeight);
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;

    // Reveal thresholds, in normalized [0,1] "arrival" progress from center outward.
    const resolveFrac =
      phase === 'noise' ? 0 : phase === 'resolve' ? (t - timeline.resolve[0]) / (timeline.resolve[1] - timeline.resolve[0]) : 1;
    const dissolveFrac = phase === 'dissolve' ? (t - timeline.dissolve[0]) / (timeline.dissolve[1] - timeline.dissolve[0]) : 0;

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const px = col * cellSize + cellSize / 2;
        const py = row * cellSize + cellSize / 2;
        const nx = ((px - cx) / minDim) * 2;
        const ny = ((py - cy) / minDim) * 2;
        const dist = Math.sqrt(nx * nx + ny * ny);

        let cellIntensity = intensity(nx, ny, t, state);

        if (phase === 'noise') {
          cellIntensity *= 0.5;
        } else if (phase === 'resolve') {
          // Cells closer to center cross their reveal threshold earlier, so the mask
          // blends in from the middle outward (the growing radius is resolveFrac * 1.4).
          const arrival = Math.min(1, dist / 1.4);
          const revealed = arrival <= resolveFrac;
          cellIntensity = revealed ? cellIntensity : cellIntensity * 0.3;
        } else if (phase === 'dissolve') {
          const dropoutSeed = Math.sin(col * 12.9898 + row * 78.233) * 43758.5453;
          const dropout = dropoutSeed - Math.floor(dropoutSeed);
          if (dropout < dissolveFrac) continue; // cell has dropped out, revealing the page
          const growingVoid = dissolveFrac * 1.6;
          if (dist < growingVoid) continue;
        }

        if (cellIntensity <= 0.02) continue;

        const level = intensityToLevel(cellIntensity);
        const reroll = Math.random() < 0.08 + 0.4 * cellIntensity;
        const glyphIndex = reroll
          ? intensityToGlyphIndex(cellIntensity + (Math.random() - 0.5) * 0.2)
          : intensityToGlyphIndex(cellIntensity);

        atlas.draw(ctx, glyphIndex, level, px - cellSize / 2, py - cellSize / 2);
      }
    }

    ctx.restore();

    if (caption) {
      caption.textContent = phase === 'watch' || phase === 'blink' ? `OBSERVATION IN PROGRESS · SUBJECT #${subject}` : '';
    }
    if (percent) {
      const pct = Math.min(100, Math.round((t / timeline.dissolve[1]) * 100));
      percent.textContent = phase === 'dissolve' ? '100%' : `${pct}%`;
    }
  }

  requestAnimationFrame(frame);
}

function runStaticFrame(canvas: HTMLCanvasElement, finish: () => void): void {
  const grid = computeGrid(window.innerWidth, window.innerHeight, window.devicePixelRatio);
  canvas.width = grid.width;
  canvas.height = grid.height;
  canvas.style.width = `${window.innerWidth}px`;
  canvas.style.height = `${window.innerHeight}px`;

  const ctx = canvas.getContext('2d');
  if (ctx) {
    const atlas = buildGlyphAtlas(14, '#ff3333');
    const { cols, rows, cellSize, dpr } = grid;
    const minDim = Math.min(window.innerWidth, window.innerHeight);
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;
    const state: EyeFieldState = { openness: 1, pupilX: 0, pupilY: 0 };

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const px = col * cellSize + cellSize / 2;
        const py = row * cellSize + cellSize / 2;
        const nx = ((px - cx) / minDim) * 2;
        const ny = ((py - cy) / minDim) * 2;
        const cellIntensity = intensity(nx, ny, 0, state);
        if (cellIntensity <= 0.02) continue;
        const level = intensityToLevel(cellIntensity);
        const glyphIndex = intensityToGlyphIndex(cellIntensity);
        atlas.draw(ctx, glyphIndex, level, px - cellSize / 2, py - cellSize / 2);
      }
    }
    ctx.restore();
  }

  const root = canvas.closest('#eye-loader') as HTMLElement | null;
  window.setTimeout(() => {
    if (root) {
      root.style.transition = 'opacity 0.3s linear';
      root.style.opacity = '0';
    }
    window.setTimeout(finish, 300);
  }, 400);
}
