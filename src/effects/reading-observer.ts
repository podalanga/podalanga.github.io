// The blog post's reading observer. The post index rail (PostIndex.astro) reports where the reader
// is: the current section, how far through the article they are and how long they have been on the
// page. The clock only runs while the tab is visible; leaving the tab retitles it until the reader
// returns, and reaching the end fills in the closing line with the time spent. Nothing is stored or
// sent anywhere: every figure lives in this page's memory and is gone on the next navigation.
//
// Progressive enhancement: without JS the rail is a plain list of links and the readouts stay blank.

const AWAY_TITLE = 'We noticed you left.';

/** `m:ss` under an hour, `h:mm:ss` beyond it. */
export function formatClock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}

/** "7 minutes and 42 seconds", for the closing line. */
export function formatDuration(ms: number): string {
  const total = Math.max(1, Math.round(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  const part = (n: number, unit: string) => `${n} ${unit}${n === 1 ? '' : 's'}`;
  if (m === 0) return part(s, 'second');
  if (s === 0) return part(m, 'minute');
  return `${part(m, 'minute')} and ${part(s, 'second')}`;
}

/**
 * Share of the article read, 0 to 1: how far the bottom of the viewport has travelled through the
 * article's box. 0 before its top reaches the bottom of the screen, 1 once its end is in view.
 */
export function readProgress(articleTop: number, articleHeight: number, viewportHeight: number): number {
  if (articleHeight <= 0) return 0;
  return Math.min(1, Math.max(0, (viewportHeight - articleTop) / articleHeight));
}

/** Index of the section being read: the last heading whose top has passed the reading line. */
export function activeIndex(headingTops: number[], readingLine: number): number {
  let active = -1;
  headingTops.forEach((top, i) => {
    if (top <= readingLine) active = i;
  });
  return active;
}

export function initReadingObserver(): () => void {
  const body = document.querySelector<HTMLElement>('[data-article-body]');
  if (!body) return () => {};

  const links = Array.from(document.querySelectorAll<HTMLAnchorElement>('[data-index-link]'));
  const ids = [...new Set(links.map((a) => a.hash.slice(1)))];
  const headings = ids.map((id) => document.getElementById(id)).filter((h): h is HTMLElement => !!h);
  const sectionOut = document.querySelectorAll<HTMLElement>('[data-read-section]');
  const percentOut = document.querySelectorAll<HTMLElement>('[data-read-percent]');
  const clockOut = document.querySelectorAll<HTMLElement>('[data-read-clock]');
  const progressBars = document.querySelectorAll<HTMLElement>('[data-read-progress]');
  const closing = document.querySelector<HTMLElement>('[data-read-closing]');
  const end = document.querySelector<HTMLElement>('[data-article-end]');

  const pageTitle = document.title;
  let visibleSince = document.visibilityState === 'visible' ? performance.now() : 0;
  let accumulated = 0;
  let current = -2;
  let frame = 0;
  let closed = false;

  const elapsed = () => accumulated + (visibleSince ? performance.now() - visibleSince : 0);

  function setText(nodes: NodeListOf<HTMLElement>, value: string): void {
    nodes.forEach((n) => {
      if (n.textContent !== value) n.textContent = value;
    });
  }

  function update(): void {
    frame = 0;
    // The loader veil holds scrolling; nothing has been read until it lifts.
    if (document.documentElement.classList.contains('eye-pending')) return;

    const rect = body!.getBoundingClientRect();
    const progress = readProgress(rect.top, rect.height, window.innerHeight);
    setText(percentOut, `${Math.round(progress * 100)}%`);
    progressBars.forEach((bar) => bar.style.setProperty('--read', String(progress)));

    const line = window.innerHeight * 0.3;
    const index = activeIndex(
      headings.map((h) => h.getBoundingClientRect().top),
      line,
    );
    if (index !== current) {
      current = index;
      const id = headings[index]?.id;
      // An h3 marks its parent h2 as well, so the open chapter stays lit in the index.
      const activeLink = links.find((a) => a.hash === `#${id}`);
      const parentId = activeLink?.dataset.parent;
      links.forEach((a) => {
        const hash = a.hash.slice(1);
        a.toggleAttribute('data-active', hash === id);
        a.closest('li')?.toggleAttribute('data-open', hash === id || hash === parentId);
        if (hash === id) a.setAttribute('aria-current', 'location');
        else a.removeAttribute('aria-current');
      });
      setText(sectionOut, activeLink?.dataset.label ?? 'Opening');
    }
  }

  function schedule(): void {
    if (!frame) frame = requestAnimationFrame(update);
  }

  function tick(): void {
    setText(clockOut, formatClock(elapsed()));
  }

  function onVisibility(): void {
    if (document.visibilityState === 'hidden') {
      if (visibleSince) accumulated += performance.now() - visibleSince;
      visibleSince = 0;
      document.title = AWAY_TITLE;
    } else {
      visibleSince = performance.now();
      document.title = pageTitle;
      tick();
    }
  }

  const endObserver =
    end && closing
      ? new IntersectionObserver((entries) => {
          if (closed || !entries.some((e) => e.isIntersecting)) return;
          closed = true;
          closing.textContent = `You read this in ${formatDuration(elapsed())}. Noted.`;
          closing.hidden = false;
        })
      : undefined;
  if (end) endObserver?.observe(end);

  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule, { passive: true });
  window.addEventListener('eye:done', schedule);
  document.addEventListener('visibilitychange', onVisibility);
  const clock = window.setInterval(tick, 1000);
  tick();
  update();

  return () => {
    cancelAnimationFrame(frame);
    window.clearInterval(clock);
    endObserver?.disconnect();
    window.removeEventListener('scroll', schedule);
    window.removeEventListener('resize', schedule);
    window.removeEventListener('eye:done', schedule);
    document.removeEventListener('visibilitychange', onVisibility);
    if (document.title === AWAY_TITLE) document.title = pageTitle;
  };
}
