type Katex = typeof import('katex').default;
let katexPromise: Promise<Katex> | undefined;
/** KaTeX renders in the host (the sandboxed frame has no scripts, fonts or network); MathML needs no CSS. */
async function typeset(tex: string, display: boolean): Promise<string> {
  try {
    katexPromise ??= import('katex').then((m) => m.default);
    const katex = await katexPromise;
    return katex.renderToString(tex, { displayMode: display, throwOnError: false, output: 'mathml', trust: false, maxExpand: 1000 });
  } catch {
    return '';
  }
}

/** Host-side lifecycle for sandboxed, post-authored interactive iframes. */
export function initInteractiveEmbeds(): () => void {
  const iframes = Array.from(document.querySelectorAll<HTMLIFrameElement>(
    'figure.interactive-embed iframe[sandbox="allow-scripts"]',
  ));
  if (iframes.length === 0) return () => {};
  // Only iframe-window identity (not origin='null') authenticates messages: srcdoc
  // sandbox pages always have an opaque origin. Child gets no site data/API.
  const sourceMap = new Map<Window, HTMLIFrameElement>();
  for (const frame of iframes) {
    if (frame.contentWindow) sourceMap.set(frame.contentWindow, frame);
  }
  const heightCap = 2200;
  let active = true;
  const applyTheme = (frame: HTMLIFrameElement): void => {
    const theme = document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
    frame.contentWindow?.postMessage({ type: 'pdl-interactive:theme', theme }, '*');
  };
  const onMessage = (event: MessageEvent): void => {
    if (!active || !event.source || typeof event.data !== 'object' || event.data === null) return;
    const frame = sourceMap.get(event.source as Window);
    if (!frame || !frame.isConnected) return;
    const { type, height } = event.data as { type?: unknown; height?: unknown };
    if (type === 'pdl-interactive:math') {
      const { id, tex, display } = event.data as { id?: unknown; tex?: unknown; display?: unknown };
      if (typeof id !== 'number' || typeof tex !== 'string' || tex.length > 4000) return;
      void typeset(tex, display === true).then((html) => {
        if (active && frame.isConnected) frame.contentWindow?.postMessage({ type: 'pdl-interactive:math-result', id, html }, '*');
      });
      return;
    }
    if (type === 'pdl-interactive:ready') {
      applyTheme(frame);
    } else if (type === 'pdl-interactive:resize' && typeof height === 'number' && Number.isFinite(height)) {
      const next = Math.ceil(Math.min(heightCap, Math.max(160, height + 4)));
      if (Math.abs(frame.getBoundingClientRect().height - next) > 4) frame.style.height = `${next}px`;
    }
  };
  const onLoad = (event: Event) => {
    const target = event.currentTarget;
    if (target instanceof HTMLIFrameElement && target.contentWindow) {
      sourceMap.set(target.contentWindow, target);
      applyTheme(target);
    }
  };
  for (const frame of iframes) {
    frame.addEventListener('load', onLoad);
    applyTheme(frame);
  }
  const observer = new MutationObserver(() => { for (const frame of iframes) applyTheme(frame); });
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  window.addEventListener('message', onMessage);
  return () => {
    active = false;
    observer.disconnect();
    window.removeEventListener('message', onMessage);
    for (const frame of iframes) frame.removeEventListener('load', onLoad);
    sourceMap.clear();
  };
}
