// Theme flood wipe (§6.2): a radial ASCII wave from the toggle button covers the screen in the
// target theme's background color, flips `data-theme`, then a second wave reveals it underneath.
import { buildGlyphAtlas, intensityToLevel } from './ascii/glyph-atlas';
import { computeGrid } from './ascii/grid';
import {
  COVER_FLICKER,
  COVER_MAX_DELAY,
  COVER_RANDOM_SPREAD,
  REVEAL_FLICKER,
  REVEAL_RANDOM_SPREAD,
  coverDelay,
  maxDistanceFromOrigin,
  normalizedDist,
  revealDelay,
} from './wave';
import { setItem } from '../lib/storage';
import { prefersReducedMotion } from '../lib/reduced-motion';

type Theme = 'dark' | 'light';

// Mirrors src/styles/tokens.css's `:root` / `[data-theme='light']` color tokens. The wipe needs
// the *target* theme's colors before `data-theme` flips, so they're duplicated here rather than
// read from computed style (which would only reflect the theme currently applied to <html>).
const THEME_COLORS: Record<Theme, { bg: string; signal: string }> = {
  dark: { bg: '#0a0a0a', signal: '#ff3333' },
  light: { bg: '#f2f0eb', signal: '#d90000' },
};

const COVER_DUR = COVER_MAX_DELAY + COVER_RANDOM_SPREAD + COVER_FLICKER;
const REVEAL_DUR = REVEAL_RANDOM_SPREAD + REVEAL_FLICKER;

let wiping = false;

function currentTheme(): Theme {
  return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
}

function applyTheme(next: Theme): void {
  document.documentElement.dataset.theme = next;
  setItem('pdl:theme', next);
  document.dispatchEvent(new CustomEvent('theme:changed', { detail: next }));
}

function syncButton(button: HTMLButtonElement): void {
  const isLight = currentTheme() === 'light';
  button.setAttribute('aria-pressed', String(isLight));
  button.setAttribute('aria-label', isLight ? 'Switch to dark theme' : 'Switch to light theme');
  const icon = button.querySelector('.icon');
  if (icon) icon.textContent = isLight ? '◎' : '◉';
}

/** Registers the toggle's click handler + aria sync for the current page. Returns a destroy fn. */
export function initThemeWipe(): () => void {
  const button = document.getElementById('theme-toggle') as HTMLButtonElement | null;
  if (!button) return () => {};

  syncButton(button);

  function onClick(): void {
    if (wiping) return;
    const next: Theme = currentTheme() === 'light' ? 'dark' : 'light';
    const rect = button!.getBoundingClientRect();
    const originX = rect.left + rect.width / 2;
    const originY = rect.top + rect.height / 2;

    if (prefersReducedMotion()) {
      runReducedMotionWipe(button!, next);
    } else {
      runWipe(button!, next, originX, originY);
    }
  }

  function onThemeChanged(): void {
    syncButton(button!);
  }

  button.addEventListener('click', onClick);
  document.addEventListener('theme:changed', onThemeChanged);

  return () => {
    button.removeEventListener('click', onClick);
    document.removeEventListener('theme:changed', onThemeChanged);
  };
}

function createOverlayCanvas(zIndex: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  Object.assign(canvas.style, {
    position: 'fixed',
    inset: '0',
    zIndex: String(zIndex),
    pointerEvents: 'none',
    width: '100vw',
    height: '100vh',
  });
  document.body.appendChild(canvas);
  return canvas;
}

function runWipe(button: HTMLButtonElement, next: Theme, originX: number, originY: number): void {
  wiping = true;
  button.setAttribute('aria-disabled', 'true');

  const canvas = createOverlayCanvas(9998);
  const grid = computeGrid(window.innerWidth, window.innerHeight, window.devicePixelRatio);
  canvas.width = grid.width;
  canvas.height = grid.height;
  const ctx = canvas.getContext('2d');

  function cleanup(): void {
    canvas.remove();
    button.removeAttribute('aria-disabled');
    wiping = false;
  }

  if (!ctx) {
    applyTheme(next);
    cleanup();
    return;
  }

  const colors = THEME_COLORS[next];
  const glyphSize = 14;
  const bgAtlas = buildGlyphAtlas(glyphSize, colors.bg);
  const signalAtlas = buildGlyphAtlas(glyphSize, colors.signal);

  const { cols, rows, cellSize, dpr } = grid;
  const maxDist = maxDistanceFromOrigin(originX, originY, window.innerWidth, window.innerHeight);

  const cellCount = cols * rows;
  const coverRand = new Float32Array(cellCount);
  const revealRand = new Float32Array(cellCount);
  for (let i = 0; i < cellCount; i++) {
    coverRand[i] = Math.random();
    revealRand[i] = Math.random();
  }

  let phase: 'cover' | 'reveal' = 'cover';
  let phaseStart = performance.now();
  let themed = false;
  let raf = 0;

  function frame(now: number): void {
    if (!ctx) return;
    const t = (now - phaseStart) / 1000;

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

    let idx = 0;
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++, idx++) {
        const px = col * cellSize + cellSize / 2;
        const py = row * cellSize + cellSize / 2;

        if (phase === 'cover') {
          const df = normalizedDist(px, py, originX, originY, maxDist);
          const tau = t - coverDelay(df, coverRand[idx]);
          if (tau < 0) continue;
          if (tau < COVER_FLICKER) {
            const level = intensityToLevel(tau / COVER_FLICKER);
            const glyphIndex = Math.floor(Math.random() * bgAtlas.glyphs.length);
            bgAtlas.draw(ctx, glyphIndex, level, px - cellSize / 2, py - cellSize / 2);
          } else {
            ctx.fillStyle = colors.bg;
            ctx.fillRect(px - cellSize / 2, py - cellSize / 2, cellSize, cellSize);
          }
        } else {
          const tau = t - revealDelay(revealRand[idx]);
          if (tau < 0) {
            ctx.fillStyle = colors.bg;
            ctx.fillRect(px - cellSize / 2, py - cellSize / 2, cellSize, cellSize);
          } else if (tau < REVEAL_FLICKER) {
            const level = intensityToLevel(1 - tau / REVEAL_FLICKER);
            const glyphIndex = Math.floor(Math.random() * signalAtlas.glyphs.length);
            signalAtlas.draw(ctx, glyphIndex, level, px - cellSize / 2, py - cellSize / 2);
          }
          // else: fully revealed; cell left transparent, new theme shows through.
        }
      }
    }

    ctx.restore();

    if (phase === 'cover' && t >= COVER_DUR) {
      if (!themed) {
        applyTheme(next);
        themed = true;
      }
      phase = 'reveal';
      phaseStart = now;
    } else if (phase === 'reveal' && t >= REVEAL_DUR) {
      cancelAnimationFrame(raf);
      cleanup();
      return;
    }

    raf = requestAnimationFrame(frame);
  }

  raf = requestAnimationFrame(frame);
}

function runReducedMotionWipe(button: HTMLButtonElement, next: Theme): void {
  wiping = true;
  button.setAttribute('aria-disabled', 'true');

  const overlay = document.createElement('div');
  overlay.setAttribute('aria-hidden', 'true');
  Object.assign(overlay.style, {
    position: 'fixed',
    inset: '0',
    zIndex: '9998',
    pointerEvents: 'none',
    background: THEME_COLORS[next].bg,
    opacity: '0',
    transition: 'opacity 0.1s linear',
  });
  document.body.appendChild(overlay);

  requestAnimationFrame(() => {
    overlay.style.opacity = '1';
  });

  window.setTimeout(() => {
    applyTheme(next);
    overlay.style.opacity = '0';
    window.setTimeout(() => {
      overlay.remove();
      button.removeAttribute('aria-disabled');
      wiping = false;
    }, 120);
  }, 100);
}
