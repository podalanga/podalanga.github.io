// Terminal wiring (§7.1): opens on `` ` ``/`~` (ignored while typing in a field) or the footer
// hint button, closes on Esc or its own close button. Focus-trapped while open, restores focus
// to whatever opened it. History via up/down. Delegates parsing to the pure `runCommand`.
import { runCommand, type CommandContext, type WorkSummary } from './commands';
import { prefersReducedMotion } from '../../lib/reduced-motion';

function isTypingTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || el.isContentEditable;
}

function readWorks(): WorkSummary[] {
  const script = document.getElementById('terminal-works');
  if (!script?.textContent) return [];
  try {
    return JSON.parse(script.textContent) as WorkSummary[];
  } catch {
    return [];
  }
}

export function initTerminal(): () => void {
  const panel = document.getElementById('terminal');
  const log = document.getElementById('terminal-log');
  const input = document.getElementById('terminal-input') as HTMLInputElement | null;
  const openButtons = Array.from(document.querySelectorAll<HTMLElement>('[data-terminal-open]'));
  const closeButton = document.getElementById('terminal-close');
  if (!panel || !log || !input) return () => {};

  const works = readWorks();
  const history: string[] = [];
  let historyIndex = -1;
  let lastFocused: HTMLElement | null = null;

  function print(lines: string[], className?: string): void {
    for (const line of lines) {
      const p = document.createElement('p');
      if (className) p.className = className;
      p.textContent = line;
      log!.appendChild(p);
    }
    log!.scrollTop = log!.scrollHeight;
  }

  function printInput(raw: string): void {
    const p = document.createElement('p');
    p.className = 'log-input';
    const prompt = document.createElement('span');
    prompt.className = 'log-prompt';
    prompt.textContent = '> ';
    p.append(prompt, document.createTextNode(raw));
    log!.appendChild(p);
    log!.scrollTop = log!.scrollHeight;
  }

  async function fetchVisitorIp(): Promise<string> {
    try {
      const res = await fetch('https://api.ipify.org?format=json');
      const data = await res.json();
      return typeof data?.ip === 'string' ? data.ip : 'UNKNOWN';
    } catch {
      return 'UNKNOWN';
    }
  }

  function open(): void {
    lastFocused = document.activeElement as HTMLElement | null;
    panel!.classList.add('open');
    panel!.setAttribute('aria-hidden', 'false');
    input!.focus();
  }

  function close(): void {
    panel!.classList.remove('open');
    panel!.setAttribute('aria-hidden', 'true');
    (lastFocused ?? document.body).focus?.();
  }

  function isOpen(): boolean {
    return panel!.classList.contains('open');
  }

  async function submit(): Promise<void> {
    const raw = input!.value;
    input!.value = '';
    if (raw.trim() !== '') {
      history.push(raw);
      historyIndex = history.length;
    }
    printInput(raw);

    const contextEl = document.getElementById('terminal-context') as HTMLElement | null;
    const emailUser = contextEl?.dataset.emailUser ?? '';
    const emailDomain = contextEl?.dataset.emailDomain ?? '';
    const ctx: CommandContext = {
      works,
      email: emailUser && emailDomain ? `${emailUser}@${emailDomain}` : '',
      github: contextEl?.dataset.github ?? '',
      linkedin: contextEl?.dataset.linkedin ?? '',
      currentTheme: document.documentElement.dataset.theme === 'light' ? 'light' : 'dark',
      now: new Date(),
    };

    const result = runCommand(raw, ctx);
    if (result.action?.type === 'clear') {
      log!.replaceChildren();
    } else if (result.action?.type === 'exit') {
      const ip = await fetchVisitorIp();
      print(
        [`There is no escape from this reality ${ip}`, 'Look Behind, Big Brother can see you.......'],
        'log-danger',
      );
    } else {
      print(result.lines);
    }

    if (result.action?.type === 'navigate') {
      const { href } = result.action;
      window.setTimeout(() => window.location.assign(href), prefersReducedMotion() ? 0 : 300);
    } else if (result.action?.type === 'theme') {
      const toggle = document.getElementById('theme-toggle') as HTMLButtonElement | null;
      toggle?.click();
    }
  }

  function onKeydownGlobal(e: KeyboardEvent): void {
    if (isOpen()) return;
    if ((e.key === '`' || e.key === '~') && !isTypingTarget(e.target)) {
      e.preventDefault();
      open();
    }
  }

  function onKeydownPanel(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
      return;
    }
    if (e.key === 'Tab') {
      // Only the close button and input are focusable inside the panel; trap between them.
      // DOM order is close button (in the top bar) then input (in the bottom row), so that's
      // also tab order: first = close button, last = input.
      const focusables = [closeButton, input].filter((el): el is HTMLElement => !!el);
      if (focusables.length < 2) return;
      const [first, last] = [focusables[0], focusables[focusables.length - 1]];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
      return;
    }
    if (e.key === 'ArrowUp') {
      if (history.length === 0) return;
      e.preventDefault();
      historyIndex = Math.max(0, historyIndex - 1);
      input!.value = history[historyIndex] ?? '';
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      historyIndex = Math.min(history.length, historyIndex + 1);
      input!.value = history[historyIndex] ?? '';
    }
  }

  function onFormSubmit(e: SubmitEvent): void {
    e.preventDefault();
    submit();
  }

  document.addEventListener('keydown', onKeydownGlobal);
  panel.addEventListener('keydown', onKeydownPanel);
  panel.querySelector('form')?.addEventListener('submit', onFormSubmit);
  closeButton?.addEventListener('click', close);
  for (const btn of openButtons) btn.addEventListener('click', open);

  return () => {
    document.removeEventListener('keydown', onKeydownGlobal);
    panel.removeEventListener('keydown', onKeydownPanel);
    panel.querySelector('form')?.removeEventListener('submit', onFormSubmit);
    closeButton?.removeEventListener('click', close);
    for (const btn of openButtons) btn.removeEventListener('click', open);
  };
}
