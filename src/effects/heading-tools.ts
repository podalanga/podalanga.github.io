// Shared by bookmarks.ts and post-tools.ts: the little toolbar that follows each h2/h3 of a post
// (copy link, bookmark). Whichever effect runs first creates it; the other adds its button to it.

export const ICON_LINK =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" focusable="false"><path d="M6.6 9.4l2.8-2.8M5.2 11.2a2.6 2.6 0 0 1 0-3.7l1.3-1.3M10.8 4.8a2.6 2.6 0 0 1 0 3.7L9.5 9.8" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>';
export const ICON_STAR =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" focusable="false"><path fill="none" d="M8 1.6l2 4.3 4.7.6-3.4 3.2.9 4.7L8 12l-4.2 2.4.9-4.7L1.3 6.5 6 5.9z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg>';

/** "3.2 Jacobian": the label the post index already carries for a section, else the heading text. */
export function sectionLabel(id: string): string {
  for (const a of document.querySelectorAll<HTMLAnchorElement>('[data-index-link]')) {
    if (a.hash === `#${id}`) return a.dataset.label ?? '';
  }
  return document.getElementById(id)?.textContent?.replace(/\s+/g, ' ').trim() ?? id;
}

/** The toolbar after a heading, created on first use. */
export function sectionTools(heading: HTMLElement): HTMLElement {
  const existing = heading.querySelector<HTMLElement>(':scope > .sec-tools');
  if (existing) return existing;
  // The buttons become part of the heading's content; keep its accessible name to the title alone.
  if (!heading.hasAttribute('aria-label')) heading.setAttribute('aria-label', sectionLabel(heading.id));
  const tools = document.createElement('span');
  tools.className = 'sec-tools';
  heading.append(tools);
  return tools;
}

export function sectionButton(kind: 'copy' | 'bookmark', label: string): HTMLButtonElement {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'sec-btn';
  b.dataset.secBtn = kind;
  b.setAttribute('aria-label', label);
  const icon = new DOMParser().parseFromString(kind === 'copy' ? ICON_LINK : ICON_STAR, 'image/svg+xml').documentElement;
  b.append(document.importNode(icon, true));
  if (kind === 'bookmark') b.setAttribute('aria-pressed', 'false');
  return b;
}

/** Says something to screen readers (and, in the dock, to everyone) without moving focus. */
export function announce(text: string): void {
  const live = document.querySelector<HTMLElement>('[data-tools-live]');
  if (!live) return;
  live.textContent = '';
  // A change of text is what is announced, so clear first and set on the next frame.
  requestAnimationFrame(() => {
    live.textContent = text;
  });
}

/** Headings in reading order that the post index links to. */
export function indexedHeadings(): { links: HTMLAnchorElement[]; headings: HTMLElement[] } {
  const links = Array.from(document.querySelectorAll<HTMLAnchorElement>('[data-index-link]'));
  const ids = [...new Set(links.map((a) => a.hash.slice(1)))];
  const headings = ids.map((id) => document.getElementById(id)).filter((h): h is HTMLElement => !!h);
  return { links, headings };
}
