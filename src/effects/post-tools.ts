// Reading aids for a blog post: copy a section's link, text size and line width, back to top,
// section keys and the "show all answers" switch for the practice questions.
// The markup is ReaderTools.astro; the settings logic is src/lib/reader-prefs.ts. Preferences are
// kept in this browser only. Progressive enhancement: the dock stays hidden until this runs.
import { getItem, setItem } from '../lib/storage';
import { prefersReducedMotion } from '../lib/reduced-motion';
import {
  READER_KEY,
  SIZES,
  WIDTHS,
  bumpSize,
  cssVars,
  defaults,
  isDefault,
  parse,
  serialize,
  type ReaderPrefs,
  type Width,
} from '../lib/reader-prefs';
import { activeIndex } from './reading-observer';
import { announce, indexedHeadings, sectionButton, sectionLabel, sectionTools } from './heading-tools';

function isTypingTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  return /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) || el.isContentEditable;
}

export function initPostTools(): () => void {
  const body = document.querySelector<HTMLElement>('[data-article-body]');
  const dock = document.querySelector<HTMLElement>('[data-reader-dock]');
  if (!body || !dock) return () => {};

  const off: (() => void)[] = [];
  const listen = (target: EventTarget, type: string, fn: EventListener, opts?: AddEventListenerOptions) => {
    target.addEventListener(type, fn, opts);
    off.push(() => target.removeEventListener(type, fn, opts));
  };
  const behavior = (): ScrollBehavior => (prefersReducedMotion() ? 'auto' : 'smooth');
  const { headings } = indexedHeadings();

  // ---- copy a section's link ----
  for (const h of headings) {
    sectionTools(h).prepend(sectionButton('copy', `Copy link to section: ${sectionLabel(h.id)}`));
  }
  async function copyLink(id: string): Promise<void> {
    const url = `${location.origin}${location.pathname}#${id}`;
    try {
      await navigator.clipboard.writeText(url);
      announce('Link to this section copied.');
    } catch {
      // No clipboard access (an insecure page, or permission refused): put the link in the address
      // bar instead, where it can be copied by hand.
      history.replaceState(null, '', `#${id}`);
      announce('Could not copy. The link is now in the address bar.');
    }
  }
  listen(body, 'click', (e) => {
    const btn = (e.target as Element).closest<HTMLButtonElement>('[data-sec-btn="copy"]');
    const id = btn?.closest('h2, h3')?.id;
    if (btn && id) {
      void copyLink(id);
      btn.dataset.done = '';
      window.setTimeout(() => delete btn.dataset.done, 1600);
    }
  });

  // ---- reader settings ----
  const panel = dock.querySelector<HTMLElement>('[data-reader-panel]')!;
  const toggle = dock.querySelector<HTMLButtonElement>('[data-reader-toggle]')!;
  const sizeOut = dock.querySelector<HTMLElement>('[data-size-out]');
  const widthButtons = Array.from(dock.querySelectorAll<HTMLButtonElement>('[data-width]'));
  const sizeButtons = Array.from(dock.querySelectorAll<HTMLButtonElement>('[data-size]'));
  const resetBtn = dock.querySelector<HTMLButtonElement>('[data-reader-reset]');
  let prefs: ReaderPrefs = parse(getItem(READER_KEY));

  function applyPrefs(announceIt = false): void {
    const v = cssVars(prefs);
    const root = document.documentElement.style;
    root.setProperty('--reader-scale', String(v.scale));
    root.setProperty('--reader-measure', v.measure);
    if (sizeOut) sizeOut.textContent = `${Math.round(v.scale * 100)}%`;
    widthButtons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.width === prefs.width)));
    sizeButtons.forEach((b) => {
      const next = Number(b.dataset.size);
      b.disabled = next > 0 ? prefs.size >= SIZES.length - 1 : prefs.size <= 0;
    });
    if (resetBtn) resetBtn.disabled = isDefault(prefs);
    setItem(READER_KEY, serialize(prefs));
    if (announceIt) announce(`Text size ${Math.round(v.scale * 100)} percent, ${prefs.width} width.`);
  }
  sizeButtons.forEach((b) =>
    listen(b, 'click', () => {
      prefs = bumpSize(prefs, Number(b.dataset.size) > 0 ? 1 : -1);
      applyPrefs(true);
    }),
  );
  widthButtons.forEach((b) =>
    listen(b, 'click', () => {
      const w = b.dataset.width as Width;
      if (w in WIDTHS) prefs = { ...prefs, width: w };
      applyPrefs(true);
    }),
  );
  if (resetBtn) {
    listen(resetBtn, 'click', () => {
      prefs = defaults();
      applyPrefs(true);
    });
  }
  applyPrefs();

  const panelOpen = (): boolean => !panel.hidden;
  function setPanel(open: boolean, returnFocus = false): void {
    panel.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
    if (!open && returnFocus) toggle.focus();
  }
  listen(toggle, 'click', () => setPanel(!panelOpen()));
  listen(document, 'click', (e) => {
    if (panelOpen() && !dock.contains(e.target as Node)) setPanel(false);
  });

  // ---- show all answers (practice questions are sandboxed; see interactive-embed.ts) ----
  const answersRow = dock.querySelector<HTMLElement>('[data-answers-row]');
  const answers = dock.querySelector<HTMLInputElement>('[data-answers-toggle]');
  if (answersRow && answers && document.querySelector('figure.interactive-embed')) {
    answersRow.hidden = false;
    listen(answers, 'change', () => {
      window.dispatchEvent(new CustomEvent('pdl:answers', { detail: { show: answers.checked } }));
      announce(answers.checked ? 'All answers shown.' : 'Answers hidden.');
    });
  }

  // ---- back to top ----
  const top = dock.querySelector<HTMLButtonElement>('[data-to-top]');
  const showAfter = () => window.innerHeight * 1.5;
  let frame = 0;
  const syncTop = () => {
    frame = 0;
    if (top) top.hidden = window.scrollY < showAfter();
  };
  const scheduleTop = () => {
    if (!frame) frame = requestAnimationFrame(syncTop);
  };
  listen(window, 'scroll', scheduleTop, { passive: true });
  off.push(() => cancelAnimationFrame(frame));
  if (top) {
    listen(top, 'click', () => {
      window.scrollTo({ top: 0, behavior: behavior() });
      document.getElementById('main')?.focus({ preventScroll: true });
    });
  }
  syncTop();

  // ---- keys: [ ] between sections, b bookmarks the current one, ? opens the settings ----
  function goTo(step: 1 | -1): void {
    if (headings.length === 0) return;
    const line = window.innerHeight * 0.3;
    const tops = headings.map((h) => h.getBoundingClientRect().top);
    let target: HTMLElement | undefined;
    if (step === 1) target = headings.find((_, i) => tops[i] > line + 4);
    else target = [...headings].reverse().find((_, i) => tops[headings.length - 1 - i] < line - 4);
    if (!target) {
      if (step === -1) window.scrollTo({ top: 0, behavior: behavior() });
      return;
    }
    target.scrollIntoView({ behavior: behavior(), block: 'start' });
    announce(sectionLabel(target.id));
  }
  listen(document, 'keydown', (ev) => {
    const e = ev as KeyboardEvent;
    if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === 'Escape' && panelOpen()) {
      setPanel(false, true);
      return;
    }
    if (isTypingTarget(e.target) || document.querySelector('dialog[open]')) return;
    if (e.key === ']') goTo(1);
    else if (e.key === '[') goTo(-1);
    else if (e.key === '?') {
      setPanel(!panelOpen());
      if (panelOpen()) panel.querySelector<HTMLElement>('button:not(:disabled)')?.focus();
    } else if (e.key === 'b' || e.key === 'B') {
      const i = activeIndex(
        headings.map((h) => h.getBoundingClientRect().top),
        window.innerHeight * 0.3,
      );
      if (i < 0) announce('Scroll into a section first.');
      else window.dispatchEvent(new CustomEvent('pdl:bookmark-section', { detail: { id: headings[i].id } }));
    }
  });

  dock.hidden = false;
  return () => {
    off.forEach((fn) => fn());
    dock.hidden = true;
  };
}
