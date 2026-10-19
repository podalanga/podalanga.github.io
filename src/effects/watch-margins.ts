// Watch margins: a column of glyphs down each edge of the screen that grows from the top as the
// page is scrolled, reaching the bottom at the end of the page. The glyphs churn only while the
// page is moving and go still once it stops; now and then, when the reader pauses, the head of
// one column resolves into a line from Nineteen Eighty-Four and holds until they scroll on.
//
// Purely decorative (`aria-hidden`), wide screens only (WatchMargins.astro hides it below 900px).
// Under reduced motion the columns still grow with the page, but the glyphs never change and a
// line appears without its scramble.
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

/** Milliseconds after the last scroll event before the page counts as still. */
const SETTLE_MS = 400;
/** The glyphs churn at this interval while scrolling, not every frame: calmer, and cheaper. */
const CHURN_MS = 70;
const CHURN_RATE = 0.18;
/** Chance that a pause brings a phrase up. */
const PHRASE_CHANCE = 1 / 8;
const RESOLVE_MS = 700;

export function randomGlyph(): string {
  return GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
}

/** Replaces roughly `rate` of the glyphs in place. */
export function churn(glyphs: string[], rate: number, pick: () => string = randomGlyph, rand: () => number = Math.random): void {
  for (let i = 0; i < glyphs.length; i++) {
    if (rand() < rate) glyphs[i] = pick();
  }
}

/**
 * Splits a column showing `filled` cells into its dim trail and its bright head. The head is the
 * last glyph, or the phrase (ending at the last cell) when one is showing and fits.
 */
export function columnFrame(glyphs: string[], filled: number, phrase?: string): { trail: string; head: string } {
  const n = Math.max(0, Math.min(filled, glyphs.length));
  if (phrase && n >= phrase.length) {
    return { trail: glyphs.slice(0, n - phrase.length).join(''), head: phrase };
  }
  if (n === 0) return { trail: '', head: '' };
  return { trail: glyphs.slice(0, n - 1).join(''), head: glyphs[n - 1] };
}

/**
 * Decides whether a pause brings up a phrase: never on the first pause, never twice in a row, and
 * only if the column has grown long enough to hold it.
 */
export function shouldSpeak(pauses: number, spokeLast: boolean, room: number, phrase: string, roll: number): boolean {
  return pauses > 1 && !spokeLast && room >= phrase.length + 2 && roll < PHRASE_CHANCE;
}

interface Column {
  trail: HTMLElement;
  head: HTMLElement;
  glyphs: string[];
  phrase?: string;
}

export function initWatchMargins(): () => void {
  const root = document.querySelector<HTMLElement>('[data-watch-margins]');
  if (!root) return () => {};

  const columns: Column[] = Array.from(root.querySelectorAll<HTMLElement>('[data-watch-column]')).map((el) => ({
    trail: el.querySelector<HTMLElement>('.trail')!,
    head: el.querySelector<HTMLElement>('.head')!,
    glyphs: [],
  }));
  if (columns.length === 0) return () => {};

  const reduced = prefersReducedMotion();
  let cells = 0;
  let filled = 0;
  let pauses = 0;
  let spokeLast = false;
  let settleTimer = 0;
  let churnTimer = 0;
  let raf = 0;
  let resolveRaf = 0;

  /** How many glyph cells fit down a column, measured from the font as rendered. */
  function measure(): void {
    const probe = columns[0].trail;
    const sample = 'M'.repeat(40);
    probe.textContent = sample;
    const cell = probe.getBoundingClientRect().height / sample.length;
    probe.textContent = '';
    const height = columns[0].trail.parentElement!.getBoundingClientRect().height;
    cells = cell > 0 ? Math.max(0, Math.floor(height / cell)) : 0;
    for (const c of columns) {
      while (c.glyphs.length < cells) c.glyphs.push(randomGlyph());
      c.glyphs.length = cells;
    }
  }

  function progress(): number {
    const doc = document.documentElement;
    const scrollable = doc.scrollHeight - window.innerHeight;
    return scrollable > 0 ? Math.min(1, Math.max(0, window.scrollY / scrollable)) : 0;
  }

  function paint(): void {
    for (const c of columns) {
      const { trail, head } = columnFrame(c.glyphs, filled, c.phrase);
      if (c.trail.textContent !== trail) c.trail.textContent = trail;
      // While a phrase is resolving, its own animation owns the head.
      if (!resolveRaf && c.head.textContent !== head) c.head.textContent = head;
    }
  }

  function update(): void {
    raf = 0;
    if (document.documentElement.classList.contains('eye-pending')) return;
    filled = Math.round(progress() * cells);
    paint();
  }

  function schedule(): void {
    if (!raf) raf = requestAnimationFrame(update);
  }

  function speak(): void {
    pauses += 1;
    const column = columns[pauses % columns.length];
    // Only lines that fit in the column as grown so far; short ones surface early in a page.
    const fits = PHRASES.filter((p) => p.length + 2 <= filled);
    const phrase = fits[Math.floor(Math.random() * fits.length)] ?? PHRASES[0];
    if (!shouldSpeak(pauses, spokeLast, filled, phrase, Math.random())) {
      spokeLast = false;
      return;
    }
    spokeLast = true;
    column.phrase = phrase;
    paint();
    if (reduced) {
      column.head.textContent = phrase;
      return;
    }
    const chars = phrase.split('');
    const start = performance.now();
    const step = (now: number) => {
      const t = (now - start) / RESOLVE_MS;
      column.head.textContent = scrambleFrame(chars, t, randomGlyph);
      resolveRaf = t < 1 ? requestAnimationFrame(step) : 0;
      if (!resolveRaf) paint();
    };
    resolveRaf = requestAnimationFrame(step);
  }

  function onScroll(): void {
    schedule();
    // Moving again: any phrase dissolves back into the noise.
    if (resolveRaf) {
      cancelAnimationFrame(resolveRaf);
      resolveRaf = 0;
    }
    for (const c of columns) c.phrase = undefined;

    if (!reduced && !churnTimer) {
      churnTimer = window.setInterval(() => {
        for (const c of columns) churn(c.glyphs, CHURN_RATE);
        paint();
      }, CHURN_MS);
    }
    window.clearTimeout(settleTimer);
    settleTimer = window.setTimeout(() => {
      window.clearInterval(churnTimer);
      churnTimer = 0;
      speak();
    }, SETTLE_MS);
  }

  function onResize(): void {
    measure();
    schedule();
  }

  measure();
  update();
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onResize, { passive: true });
  window.addEventListener('eye:done', schedule);

  return () => {
    cancelAnimationFrame(raf);
    cancelAnimationFrame(resolveRaf);
    window.clearInterval(churnTimer);
    window.clearTimeout(settleTimer);
    window.removeEventListener('scroll', onScroll);
    window.removeEventListener('resize', onResize);
    window.removeEventListener('eye:done', schedule);
  };
}
