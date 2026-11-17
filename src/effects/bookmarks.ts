// Bookmarks in the browser: the Save button on a post, a star on each section, "Continue from..."
// when a reader returns, and the Saved / In progress filter on the blog list. All state is the
// reader's own, in localStorage (see src/lib/bookmarks.ts); nothing leaves the browser.
//
// Progressive enhancement: every control this adds is hidden or absent until the script runs.
import { getItem, setItem } from '../lib/storage';
import { prefersReducedMotion } from '../lib/reduced-motion';
import {
  BOOKMARKS_KEY,
  RESUME_MIN,
  inProgress,
  isSaved,
  parse,
  prune,
  recordProgress,
  resumePoint,
  sectionsOf,
  toggleBookmarkedSection,
  togglePost,
  type Bookmarks,
} from '../lib/bookmarks';
import { activeIndex, readProgress } from './reading-observer';
import { announce, indexedHeadings, sectionButton, sectionLabel, sectionTools } from './heading-tools';

const load = (): Bookmarks => parse(getItem(BOOKMARKS_KEY));

/** Re-reads storage first, so a change made in another tab is not overwritten. */
function mutate(change: (b: Bookmarks) => Bookmarks): Bookmarks {
  const next = change(load());
  setItem(BOOKMARKS_KEY, JSON.stringify(next));
  return next;
}

// ---- a post ---------------------------------------------------------------------------------

function initPost(article: HTMLElement): () => void {
  const slug = article.dataset.postSlug;
  const body = document.querySelector<HTMLElement>('[data-article-body]');
  if (!slug || !body) return () => {};

  const off: (() => void)[] = [];
  const on = (type: string, fn: EventListener, opts?: AddEventListenerOptions) => {
    window.addEventListener(type, fn, opts);
    off.push(() => window.removeEventListener(type, fn));
  };
  let store = load();

  // Save post.
  const save = document.querySelector<HTMLButtonElement>('[data-save-post]');
  const paintSave = () => {
    if (!save) return;
    const saved = isSaved(store, slug);
    save.hidden = false;
    save.setAttribute('aria-pressed', String(saved));
    const label = save.querySelector('[data-save-label]');
    if (label) label.textContent = saved ? 'Saved' : 'Save post';
  };
  const onSave = () => {
    store = mutate((b) => togglePost(b, slug, new Date().toISOString()));
    paintSave();
    announce(isSaved(store, slug) ? 'Post saved to this browser.' : 'Post removed from saved.');
  };
  save?.addEventListener('click', onSave);
  off.push(() => save?.removeEventListener('click', onSave));

  // Section stars.
  const { links, headings } = indexedHeadings();
  const stars = new Map<string, HTMLButtonElement>();
  for (const h of headings) {
    const star = sectionButton('bookmark', `Bookmark section: ${sectionLabel(h.id)}`);
    sectionTools(h).append(star);
    stars.set(h.id, star);
  }

  const savedBox = document.querySelector<HTMLElement>('[data-saved-sections]');
  const savedList = savedBox?.querySelector<HTMLElement>('[data-saved-list]');
  const narrow = window.matchMedia('(max-width: 1099px)');

  const paintSections = () => {
    const marked = new Set(sectionsOf(store, slug));
    for (const [id, star] of stars) {
      const pressed = marked.has(id);
      star.setAttribute('aria-pressed', String(pressed));
      star.setAttribute('aria-label', `${pressed ? 'Remove bookmark from' : 'Bookmark'} section: ${sectionLabel(id)}`);
    }
    for (const a of links) a.toggleAttribute('data-bookmarked', marked.has(a.hash.slice(1)));
    if (!savedBox || !savedList) return;
    savedList.replaceChildren();
    // Listed in reading order, not in the order they were bookmarked.
    for (const h of headings) {
      if (!marked.has(h.id)) continue;
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.className = 'saved-link';
      a.href = `#${h.id}`;
      a.textContent = sectionLabel(h.id);
      a.addEventListener('click', () => {
        if (narrow.matches) document.querySelector<HTMLDetailsElement>('.index-sheet')?.removeAttribute('open');
      });
      li.append(a);
      savedList.append(li);
    }
    savedBox.hidden = savedList.children.length === 0;
  };

  const toggleSection = (id: string) => {
    store = mutate((b) => toggleBookmarkedSection(b, slug, id));
    paintSections();
    const now = sectionsOf(store, slug).includes(id);
    announce(`${now ? 'Bookmarked' : 'Removed bookmark from'} ${sectionLabel(id)}.`);
  };
  const onBodyClick = (e: MouseEvent) => {
    const star = (e.target as Element).closest<HTMLButtonElement>('[data-sec-btn="bookmark"]');
    const id = star?.closest('h2, h3')?.id;
    if (id) toggleSection(id);
  };
  body.addEventListener('click', onBodyClick);
  off.push(() => body.removeEventListener('click', onBodyClick));
  // post-tools.ts: the `b` key bookmarks the section being read.
  on('pdl:bookmark-section', (e) => {
    const id = (e as CustomEvent<{ id?: string }>).detail?.id;
    if (id) toggleSection(id);
  });

  // Where the reader stopped. Recorded only once they have scrolled, and not while barely started,
  // so opening a post and leaving again never overwrites a good place with "0%".
  let scrolled = false;
  let lastKey = '';
  const record = () => {
    if (!scrolled || document.documentElement.classList.contains('eye-pending') || headings.length === 0) return;
    const rect = body.getBoundingClientRect();
    const ratio = readProgress(rect.top, rect.height, window.innerHeight);
    if (ratio <= RESUME_MIN) return;
    const i = activeIndex(
      headings.map((h) => h.getBoundingClientRect().top),
      window.innerHeight * 0.3,
    );
    if (i < 0) return;
    const id = headings[i].id;
    const key = `${id}:${ratio.toFixed(2)}`;
    if (key === lastKey) return;
    lastKey = key;
    store = mutate((b) => recordProgress(b, slug, { id, label: sectionLabel(id), ratio }, new Date().toISOString()));
  };
  on(
    'scroll',
    () => {
      scrolled = true;
    },
    { passive: true },
  );
  on('pagehide', record);
  const onVisibility = () => {
    if (document.visibilityState === 'hidden') record();
  };
  document.addEventListener('visibilitychange', onVisibility);
  off.push(() => document.removeEventListener('visibilitychange', onVisibility));
  const timer = window.setInterval(record, 5000);
  off.push(() => window.clearInterval(timer));

  // "Continue from..." once the loader veil has lifted.
  const bar = document.querySelector<HTMLElement>('[data-resume]');
  const point = resumePoint(store, slug, location.hash);
  if (bar && point && document.getElementById(point.id)) {
    const label = bar.querySelector('[data-resume-label]');
    if (label) label.textContent = point.label || 'where you left off';
    const show = () => {
      bar.hidden = false;
    };
    if (document.documentElement.classList.contains('eye-pending')) {
      on('eye:done', show, { once: true });
    } else show();
    const hide = () => {
      bar.hidden = true;
    };
    const go = () => {
      document
        .getElementById(point.id)
        ?.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
      hide();
    };
    const goBtn = bar.querySelector('[data-resume-go]');
    const noBtn = bar.querySelector('[data-resume-dismiss]');
    goBtn?.addEventListener('click', go);
    noBtn?.addEventListener('click', hide);
    off.push(() => {
      goBtn?.removeEventListener('click', go);
      noBtn?.removeEventListener('click', hide);
      bar.hidden = true;
    });
  }

  // Changes made in another tab.
  on('storage', (e) => {
    if ((e as StorageEvent).key !== BOOKMARKS_KEY) return;
    store = load();
    paintSave();
    paintSections();
  });

  paintSave();
  paintSections();
  return () => off.forEach((fn) => fn());
}

// ---- the blog list --------------------------------------------------------------------------

type Filter = 'all' | 'saved' | 'progress';

function initList(cards: HTMLElement[]): () => void {
  let store = load();
  const bar = document.querySelector<HTMLElement>('[data-post-filter]');
  const empty = document.querySelector<HTMLElement>('[data-filter-empty]');
  let filter: Filter = 'all';

  // Only the full list can say which posts exist, so only it tidies away bookmarks for gone ones.
  if (bar) {
    store = mutate((b) => prune(b, cards.map((c) => c.dataset.postSlug ?? '')));
  }

  const paint = () => {
    let shown = 0;
    for (const card of cards) {
      const slug = card.dataset.postSlug ?? '';
      const saved = isSaved(store, slug);
      const reading = inProgress(store, slug);
      const state = card.querySelector<HTMLElement>('[data-post-state]');
      if (state) {
        const parts = [saved && 'Saved', reading && `${Math.round(store.progress[slug].ratio * 100)}% read`].filter(Boolean);
        state.textContent = parts.join(' · ');
        state.hidden = parts.length === 0;
      }
      const visible = filter === 'all' || (filter === 'saved' ? saved : reading);
      card.hidden = !visible;
      if (visible) shown++;
    }
    if (empty) {
      empty.hidden = shown > 0;
      empty.textContent =
        filter === 'saved'
          ? 'Nothing saved yet. Open a post and choose Save post.'
          : 'Nothing in progress. Posts you start reading will wait here.';
    }
  };

  const buttons = Array.from(bar?.querySelectorAll<HTMLButtonElement>('[data-filter]') ?? []);
  const onClick = (e: Event) => {
    const next = (e.currentTarget as HTMLButtonElement).dataset.filter as Filter;
    filter = next;
    buttons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.filter === next)));
    paint();
  };
  buttons.forEach((b) => b.addEventListener('click', onClick));
  if (bar) bar.hidden = false;

  const onStorage = (e: StorageEvent) => {
    if (e.key !== BOOKMARKS_KEY) return;
    store = load();
    paint();
  };
  window.addEventListener('storage', onStorage);
  paint();

  return () => {
    buttons.forEach((b) => b.removeEventListener('click', onClick));
    window.removeEventListener('storage', onStorage);
    cards.forEach((c) => {
      c.hidden = false;
    });
  };
}

export function initBookmarks(): () => void {
  const off: (() => void)[] = [];
  const article = document.querySelector<HTMLElement>('.post-layout[data-post-slug]');
  if (article) off.push(initPost(article));
  const cards = Array.from(document.querySelectorAll<HTMLElement>('.post-card[data-post-slug]'));
  if (cards.length > 0) off.push(initList(cards));
  return () => off.forEach((fn) => fn());
}
