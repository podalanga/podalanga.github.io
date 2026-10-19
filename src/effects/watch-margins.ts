// Watch margins: a column of glyphs down each edge of the screen. Each column grows from the top
// with scroll progress (a few cells are always shown, so it is there from the first screen) and
// stops short of the footer. The glyphs never settle: they churn slowly while the page is still
// and faster while it scrolls. Every few seconds one column spells out a line from Nineteen
// Eighty-Four somewhere along its length; the line holds still and bright while the noise around
// it keeps moving, then scrambles back into the noise.
//
// Purely decorative (`aria-hidden`), wide screens only (WatchMargins.astro hides it below 900px).
// Under reduced motion the columns still follow the page and the footer, but nothing moves on its
// own: the glyphs are fixed and no lines appear.
import { scrambleFrame } from './scramble';
import { prefersReducedMotion } from '../lib/reduced-motion';

const GLYPHS = '!<>-_\\/[]{}=+*^?#$%&01';
export const PHRASES = [
  'THERE IS NO ESCAPE',
  'BIG BROTHER IS WATCHING YOU',
  'WAR IS PEACE',
  'FREEDOM IS SLAVERY',
  'IGNORANCE IS STRENGTH',
  'WHO CONTROLS THE PAST CONTROLS THE FUTURE',
  'THE THOUGHT POLICE',
  'DOUBLETHINK',
  'NOTHING WAS YOUR OWN',
  'WE ARE THE DEAD',
];

/** Cells shown before any scrolling, so the columns are visible from the first screen. */
export const MIN_CELLS = 14;
const TICK_MS = 70;
/** Share of glyphs replaced per tick: a slow simmer when still, a boil while scrolling. */
const CHURN_IDLE = 0.04;
const CHURN_SCROLLING = 0.18;
/** A scroll event within this long counts as scrolling. */
const SCROLLING_MS = 250;
/** Gap between lines, chosen at random in this range; the first comes sooner. */
const LINE_GAP_MS: [number, number] = [5000, 11000];
const FIRST_LINE_MS: [number, number] = [2500, 5000];
export const RESOLVE_MS = 700;
export const HOLD_MS = 3500;
export const DECAY_MS = 700;
/** Gap kept between the footer and the bottom of a column. */
const FOOTER_GAP_PX = 16;
const EDGE_GAP_PX = 12;

export function randomGlyph(): string {
  return GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
}

/** Replaces roughly `rate` of the glyphs in place. */
export function churn(glyphs: string[], rate: number, pick: () => string = randomGlyph, rand: () => number = Math.random): void {
  for (let i = 0; i < glyphs.length; i++) {
    if (rand() < rate) glyphs[i] = pick();
  }
}

/** How many cells a column shows: its share of the page read, but never fewer than `min`. */
export function visibleCells(progress: number, cells: number, min = MIN_CELLS): number {
  return Math.min(cells, Math.max(min, Math.round(progress * cells)));
}

/** A line that fits in `room` cells, or undefined if none does. */
export function pickPhrase(room: number, rand: () => number = Math.random): string | undefined {
  const fits = PHRASES.filter((p) => p.length <= room);
  return fits.length ? fits[Math.floor(rand() * fits.length)] : undefined;
}

export type LinePhase = { phase: 'resolving' | 'decaying'; t: number } | { phase: 'holding' } | { phase: 'gone' };

/** Where a line is in its life, `elapsed` ms after it began. */
export function linePhase(elapsed: number): LinePhase {
  if (elapsed < RESOLVE_MS) return { phase: 'resolving', t: elapsed / RESOLVE_MS };
  if (elapsed < RESOLVE_MS + HOLD_MS) return { phase: 'holding' };
  if (elapsed < RESOLVE_MS + HOLD_MS + DECAY_MS) return { phase: 'decaying', t: (elapsed - RESOLVE_MS - HOLD_MS) / DECAY_MS };
  return { phase: 'gone' };
}

export interface ColumnText {
  before: string;
  said: string;
  after: string;
  head: string;
}

/**
 * The text of a column showing `filled` cells: dim noise, then `said` (the line, as far as it has
 * resolved) at `offset`, more dim noise, and the bright leading glyph. A line that no longer fits
 * (the column shrank as the footer came in) is left out.
 */
export function columnFrame(glyphs: string[], filled: number, said = '', offset = 0): ColumnText {
  const n = Math.max(0, Math.min(filled, glyphs.length));
  if (n === 0) return { before: '', said: '', after: '', head: '' };
  const body = glyphs.slice(0, n - 1);
  if (!said || offset < 0 || offset + said.length > body.length) {
    return { before: body.join(''), said: '', after: '', head: glyphs[n - 1] };
  }
  return {
    before: body.slice(0, offset).join(''),
    said,
    after: body.slice(offset + said.length).join(''),
    head: glyphs[n - 1],
  };
}

function between([lo, hi]: [number, number]): number {
  return lo + Math.random() * (hi - lo);
}

interface Line {
  text: string;
  offset: number;
  start: number;
}

interface Column {
  el: HTMLElement;
  before: HTMLElement;
  said: HTMLElement;
  after: HTMLElement;
  head: HTMLElement;
  glyphs: string[];
  line?: Line;
}

export function initWatchMargins(): () => void {
  const root = document.querySelector<HTMLElement>('[data-watch-margins]');
  if (!root) return () => {};

  const columns: Column[] = Array.from(root.querySelectorAll<HTMLElement>('[data-watch-column]')).map((el) => ({
    el,
    before: el.querySelector<HTMLElement>('.before')!,
    said: el.querySelector<HTMLElement>('.said')!,
    after: el.querySelector<HTMLElement>('.after')!,
    head: el.querySelector<HTMLElement>('.head')!,
    glyphs: [],
  }));
  if (columns.length === 0) return () => {};

  const reduced = prefersReducedMotion();
  const footer = document.querySelector<HTMLElement>('.site-footer');
  let cellPx = 0;
  let cells = 0;
  let filled = 0;
  let lastScroll = -Infinity;
  let nextLineAt = performance.now() + between(FIRST_LINE_MS);
  let nextColumn = 0;
  let timer = 0;
  let raf = 0;

  /** Height of one stacked glyph, from the font as rendered. */
  function measureCell(): void {
    const probe = columns[0].before;
    const sample = 'M'.repeat(40);
    probe.textContent = sample;
    cellPx = probe.getBoundingClientRect().height / sample.length;
    probe.textContent = '';
  }

  function progress(): number {
    const doc = document.documentElement;
    const scrollable = doc.scrollHeight - window.innerHeight;
    return scrollable > 0 ? Math.min(1, Math.max(0, window.scrollY / scrollable)) : 0;
  }

  /** Sizes the columns: from under the header down to the footer's top or the screen's bottom. */
  function layout(): void {
    const footerTop = footer ? footer.getBoundingClientRect().top : Infinity;
    const bottom = Math.max(EDGE_GAP_PX, window.innerHeight - footerTop + FOOTER_GAP_PX);
    for (const c of columns) c.el.style.bottom = `${bottom}px`;
    const height = columns[0].el.getBoundingClientRect().height;
    cells = cellPx > 0 ? Math.max(0, Math.floor(height / cellPx)) : 0;
    for (const c of columns) {
      while (c.glyphs.length < cells) c.glyphs.push(randomGlyph());
    }
    filled = visibleCells(progress(), cells);
  }

  function lineText(line: Line, now: number): string {
    const state = linePhase(now - line.start);
    if (state.phase === 'holding' || reduced) return line.text;
    if (state.phase === 'gone') return '';
    const chars = line.text.split('');
    return scrambleFrame(chars, state.phase === 'resolving' ? state.t : 1 - state.t, randomGlyph);
  }

  function paint(now: number): void {
    for (const c of columns) {
      if (c.line && linePhase(now - c.line.start).phase === 'gone') c.line = undefined;
      const frame = columnFrame(c.glyphs, filled, c.line ? lineText(c.line, now) : '', c.line?.offset);
      if (c.before.textContent !== frame.before) c.before.textContent = frame.before;
      if (c.said.textContent !== frame.said) c.said.textContent = frame.said;
      if (c.after.textContent !== frame.after) c.after.textContent = frame.after;
      if (c.head.textContent !== frame.head) c.head.textContent = frame.head;
    }
  }

  /** Starts a line on the next column when one is due and neither column is showing one. */
  function maybeSpeak(now: number): void {
    if (now < nextLineAt || columns.some((c) => c.line)) return;
    const column = columns[nextColumn % columns.length];
    const room = filled - 1;
    const text = pickPhrase(room);
    if (!text) {
      nextLineAt = now + 2000;
      return;
    }
    nextColumn += 1;
    column.line = { text, offset: Math.floor(Math.random() * (room - text.length + 1)), start: now };
    nextLineAt = now + RESOLVE_MS + HOLD_MS + DECAY_MS + between(LINE_GAP_MS);
  }

  function tick(): void {
    if (document.hidden || document.documentElement.classList.contains('eye-pending')) return;
    const now = performance.now();
    const rate = now - lastScroll < SCROLLING_MS ? CHURN_SCROLLING : CHURN_IDLE;
    for (const c of columns) churn(c.glyphs, rate);
    maybeSpeak(now);
    paint(now);
  }

  function update(): void {
    raf = 0;
    if (document.documentElement.classList.contains('eye-pending')) return;
    layout();
    paint(performance.now());
  }

  function schedule(): void {
    if (!raf) raf = requestAnimationFrame(update);
  }

  function onScroll(): void {
    lastScroll = performance.now();
    schedule();
  }

  function onResize(): void {
    measureCell();
    schedule();
  }

  measureCell();
  update();
  if (!reduced) timer = window.setInterval(tick, TICK_MS);
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onResize, { passive: true });
  window.addEventListener('eye:done', schedule);

  return () => {
    cancelAnimationFrame(raf);
    window.clearInterval(timer);
    window.removeEventListener('scroll', onScroll);
    window.removeEventListener('resize', onResize);
    window.removeEventListener('eye:done', schedule);
  };
}
