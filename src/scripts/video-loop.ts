// Shared loading for the looping YouTube videos on project cards and in the carousel.
//
// A YouTube player is over a megabyte of script, so it never competes with the page itself:
// a poster (the cover image, or YouTube's thumbnail) paints first, the player is only attached
// once the page has loaded and the browser is idle, and the poster fades away only when the
// player reports that it is actually playing.
import { prefersReducedMotion } from '../lib/reduced-motion';

interface NetworkInformation {
  saveData?: boolean;
  effectiveType?: string;
}

/** False under reduced motion, Data Saver, or a 2G-class connection: the poster stays. */
export function canAutoplay(): boolean {
  if (prefersReducedMotion()) return false;
  const connection = (navigator as Navigator & { connection?: NetworkInformation }).connection;
  if (connection?.saveData) return false;
  return !/(^|-)2g$/.test(connection?.effectiveType ?? '');
}

/** Runs `callback` once the page has finished loading and the browser has a quiet moment. */
export function afterLoadIdle(callback: () => void): void {
  const idle = () => {
    // Safari has no requestIdleCallback.
    if (typeof window.requestIdleCallback === 'function') window.requestIdleCallback(callback, { timeout: 2000 });
    else setTimeout(callback, 200);
  };
  if (document.readyState === 'complete') idle();
  else window.addEventListener('load', idle, { once: true });
}

function command(frame: HTMLIFrameElement, func: 'playVideo' | 'pauseVideo'): void {
  frame.contentWindow?.postMessage(JSON.stringify({ event: 'command', func, args: [] }), '*');
}

/** Gives a frame its player the first time, resumes it after that. */
export function playFrame(frame: HTMLIFrameElement): void {
  if (frame.getAttribute('src')) {
    command(frame, 'playVideo');
    return;
  }
  const url = frame.dataset.src;
  if (!url) return;
  // `origin` lets the player post its state back to this page.
  frame.src = `${url}&origin=${encodeURIComponent(window.location.origin)}`;
  frame.addEventListener('load', () => listen(frame), { once: true });
}

export function pauseFrame(frame: HTMLIFrameElement): void {
  if (frame.getAttribute('src')) command(frame, 'pauseVideo');
}

// Player state 1 is "playing". Until a frame reports it, its poster stays on top.
const PLAYING = 1;
const FALLBACK_REVEAL_MS = 4000;
const frames = new Set<HTMLIFrameElement>();

function reveal(frame: HTMLIFrameElement): void {
  frame.closest('[data-video-host]')?.classList.add('is-playing');
}

function listen(frame: HTMLIFrameElement): void {
  frames.add(frame);
  frame.contentWindow?.postMessage(JSON.stringify({ event: 'listening' }), '*');
  // A blocked or silent player still gets shown, so a visitor is never stuck on the poster
  // when the video itself did load.
  window.setTimeout(() => reveal(frame), FALLBACK_REVEAL_MS);
}

window.addEventListener('message', (event) => {
  if (typeof event.data !== 'string' || !event.origin.includes('youtube')) return;
  let data: { event?: string; info?: { playerState?: number } };
  try {
    data = JSON.parse(event.data);
  } catch {
    return;
  }
  const state = data.info?.playerState;
  if (state !== PLAYING) return;
  for (const frame of frames) {
    // Frames from a page the router has swapped away are dropped.
    if (!frame.isConnected) frames.delete(frame);
    else if (frame.contentWindow === event.source) reveal(frame);
  }
});

/** Swaps a low-resolution YouTube thumbnail for the HD one when the video has it. */
export function upgradePoster(img: HTMLImageElement): void {
  // If YouTube's image server is blocked, show the empty frame rather than a broken icon.
  const hide = () => (img.style.visibility = 'hidden');
  if (img.complete && img.naturalWidth === 0) hide();
  else img.addEventListener('error', hide, { once: true });
  const hd = img.dataset.hd;
  if (!hd) return;
  const probe = new Image();
  // A missing HD thumbnail comes back as a 120 x 90 placeholder rather than an error.
  probe.onload = () => {
    if (probe.naturalWidth > 320) img.src = hd;
  };
  probe.src = hd;
}

/**
 * Card videos: play while on screen, pause when scrolled away. The card's cover image is the
 * poster, so nothing loads at all when autoplay is off.
 */
export function initCardVideos(): void {
  // Runs on first load and again on every router page load, so frames are bound only once.
  const cardFrames = Array.from(
    document.querySelectorAll<HTMLIFrameElement>('iframe[data-card-video]:not([data-bound])'),
  );
  cardFrames.forEach((frame) => frame.setAttribute('data-bound', ''));
  if (cardFrames.length === 0 || !canAutoplay()) return;
  afterLoadIdle(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const frame = entry.target as HTMLIFrameElement;
          if (entry.isIntersecting) playFrame(frame);
          else pauseFrame(frame);
        }
      },
      { rootMargin: '200px 0px' },
    );
    cardFrames.forEach((frame) => io.observe(frame));
    document.addEventListener('astro:before-swap', () => io.disconnect(), { once: true });
  });
}
