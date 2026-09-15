// One-time "Big Brother wants you to try the terminal" callout under the header logo's dot
// (§ terminal discoverability — the terminal itself is otherwise only reachable via a hidden
// backtick keypress or a small footer link). Shown once, ever, the first time the eye-loader
// finishes on a visitor's very first page load; dismissed by any click/keydown or after a timeout,
// and never shown again (tracked in localStorage, same pattern as the eye-loader's own seen-flag).
import { getItem, setItem } from '../lib/storage';

const SEEN_KEY = 'pdl:terminal-hint-seen';
const AUTO_HIDE_MS = 6000;

export function initTerminalHint(): () => void {
  const hint = document.querySelector<HTMLElement>('[data-terminal-hint]');
  if (!hint) return () => {};
  if (getItem(SEEN_KEY) === '1') return () => {};

  let hideTimer = 0;
  let onDocInteract: (() => void) | undefined;

  function show(): void {
    if (getItem(SEEN_KEY) === '1') return;
    setItem(SEEN_KEY, '1');
    hint!.hidden = false;
    hideTimer = window.setTimeout(hide, AUTO_HIDE_MS);
    onDocInteract = () => hide();
    document.addEventListener('click', onDocInteract, { capture: true });
    document.addEventListener('keydown', onDocInteract, { capture: true });
  }

  function hide(): void {
    hint!.hidden = true;
    window.clearTimeout(hideTimer);
    if (onDocInteract) {
      document.removeEventListener('click', onDocInteract, { capture: true });
      document.removeEventListener('keydown', onDocInteract, { capture: true });
      onDocInteract = undefined;
    }
  }

  window.addEventListener('eye:done', show, { once: true });

  return () => {
    window.removeEventListener('eye:done', show);
    window.clearTimeout(hideTimer);
    if (onDocInteract) {
      document.removeEventListener('click', onDocInteract, { capture: true });
      document.removeEventListener('keydown', onDocInteract, { capture: true });
    }
  };
}
