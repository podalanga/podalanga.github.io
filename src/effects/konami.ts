// Konami code (§7.5): ↑↑↓↓←→←→BA triggers a full-screen 1.5s flash of the 1984 slogan, red on
// black, then fades. Session-global — registered once, not re-bound on soft navs.
import { prefersReducedMotion } from '../lib/reduced-motion';

const CODE = [
  'ArrowUp',
  'ArrowUp',
  'ArrowDown',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'ArrowLeft',
  'ArrowRight',
  'KeyB',
  'KeyA',
];
const FLASH_MS = 1500;
const FADE_MS = 300;

let progress = 0;

function isTypingTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || el.isContentEditable;
}

function trigger(): void {
  if (document.getElementById('konami-flash')) return;

  const overlay = document.createElement('div');
  overlay.id = 'konami-flash';
  overlay.setAttribute('aria-hidden', 'true');
  Object.assign(overlay.style, {
    position: 'fixed',
    inset: '0',
    zIndex: '9999',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5em',
    background: '#0a0a0a',
    color: '#ff3333',
    fontFamily: 'var(--font-display)',
    fontWeight: '800',
    textAlign: 'center',
    padding: '1rem',
    opacity: prefersReducedMotion() ? '1' : '0',
    transition: prefersReducedMotion() ? 'none' : `opacity ${FADE_MS}ms ease-out`,
    pointerEvents: 'none',
  });

  for (const line of ['WAR IS PEACE', 'FREEDOM IS SLAVERY', 'IGNORANCE IS STRENGTH']) {
    const p = document.createElement('p');
    p.textContent = line;
    p.style.margin = '0';
    p.style.fontSize = 'clamp(1.25rem, 5vw, 3rem)';
    overlay.appendChild(p);
  }

  document.body.appendChild(overlay);
  requestAnimationFrame(() => {
    overlay.style.opacity = '1';
  });

  window.setTimeout(() => {
    overlay.style.opacity = '0';
    window.setTimeout(() => overlay.remove(), prefersReducedMotion() ? 0 : FADE_MS);
  }, FLASH_MS);
}

function onKeydown(e: KeyboardEvent): void {
  if (isTypingTarget(e.target)) return;
  const expected = CODE[progress];
  if (e.code === expected) {
    progress++;
    if (progress === CODE.length) {
      progress = 0;
      trigger();
    }
  } else {
    progress = e.code === CODE[0] ? 1 : 0;
  }
}

export function initKonami(): () => void {
  document.addEventListener('keydown', onKeydown);
  return () => document.removeEventListener('keydown', onKeydown);
}
