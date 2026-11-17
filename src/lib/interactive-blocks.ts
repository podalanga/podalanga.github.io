/**
 * Universal interactive Markdown embeds.
 *
 * In a blog post, write a fenced code block with language `interactive`.
 * The fence body is a complete HTML fragment/document, with optional inline
 * <style> and <script> tags. No component registration is needed.
 *
 * SECURITY INVARIANT: post code is NEVER inserted as live parent-page HTML.
 * It is carried only as an escaped iframe srcdoc attribute, with an opaque
 * sandbox origin. The parent deliberately exposes no privileged API.
 */
import type { Element, ElementContent, Root, RootContent } from 'hast';
import { INTERACTIVE_SENTINEL } from './interactive-fence';

type Parent = Root | Element;
type NetworkMode = 'off' | 'https';
export interface InteractiveOptions { title: string; height: number; network: NetworkMode }

const MAX_SOURCE = 250_000; // 250 k characters per embed; prevent accidental multi-MB widgets
const META = /^\s*<!--\s*interactive\s*\n([\s\S]*?)\n\s*-->\s*\n?/i;

/** Optional header is a YAML-like restricted key:value block, NOT a YAML evaluator. */
export function parseInteractive(source: string): { options: InteractiveOptions; body: string } {
  const options: InteractiveOptions = {
    title: 'Interactive demonstration',
    height: 380,
    network: 'off',
  };
  const match = source.match(META);
  if (!match) return { options, body: source };
  for (const line of match[1].split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const found = trimmed.match(/^(title|height|network):\s*(.*?)\s*$/i);
    if (!found) throw new Error(`[interactive] Invalid metadata entry: ${trimmed.slice(0, 100)}`);
    const key = found[1].toLowerCase();
    const value = found[2].trim();
    if (key === 'title') options.title = value.replace(/[<>\x00-\x1f]/g, '').slice(0, 120) || options.title;
    if (key === 'height') {
      const num = Number(value);
      if (!Number.isFinite(num) || num < 150 || num > 2000 || !Number.isInteger(num)) {
        throw new Error('[interactive] height must be an integer between 150 and 2000');
      }
      options.height = num;
    }
    if (key === 'network') {
      if (value !== 'off' && value !== 'https') throw new Error('[interactive] network must be off or https');
      options.network = value;
    }
  }
  return { options, body: source.slice(match[0].length) };
}

/** Script transport uses an opaque `null` origin; source-window matching is done by the parent. */
const BRIDGE = String.raw`<script>
(()=>{
  'use strict';
  const send=()=>{
    const root=document.documentElement;
    const body=document.body;
    const h=Math.max(root.scrollHeight,body?body.scrollHeight:0);
    parent.postMessage({type:'pdl-interactive:resize',height:h},'*');
  };
  let tick=0;
  const schedule=()=>{if(tick)return;tick=requestAnimationFrame(()=>{tick=0;send()})};
  addEventListener('message',e=>{
    if(e.source!==parent||!e.data||e.data.type!=='pdl-interactive:theme')return;
    document.documentElement.dataset.theme=e.data.theme==='light'?'light':'dark';
    schedule();
  });
  addEventListener('load',schedule);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{
    if(typeof ResizeObserver==='function')new ResizeObserver(schedule).observe(document.body);
    schedule();
  });else{
    if(typeof ResizeObserver==='function'&&document.body)new ResizeObserver(schedule).observe(document.body);
    schedule();
  }
  parent.postMessage({type:'pdl-interactive:ready'},'*');
})();
</script>`;

/** CSP limits the iframe; HTTPS network access requires explicit per-block opt-in. */
export function makeInteractiveDocument(body: string, options: InteractiveOptions): string {
  if (body.length > MAX_SOURCE) {
    throw new Error(`[interactive] Block exceeds ${MAX_SOURCE} characters; split it into smaller demos.`);
  }
  const network = options.network === 'https';
  const csp = [
    "default-src 'none'",
    `script-src 'unsafe-inline'${network ? ' https:' : ''}`,
    `style-src 'unsafe-inline'${network ? ' https:' : ''}`,
    `img-src data: blob:${network ? ' https:' : ''}`,
    `font-src data:${network ? ' https:' : ''}`,
    `connect-src ${network ? 'https:' : "'none'"}`,
    "form-action 'none'",
    "base-uri 'none'",
    "object-src 'none'",
    "frame-src 'none'",
  ].join('; ');
  // Ensure no interpolation of authored code into a parent-level script or template literal.
  // CSP is in the iframe document, and the parent iframe lacks allow-same-origin.
  const head = `<!doctype html><html lang="en" data-theme="dark"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="${csp}">`;
  const baseStyle = String.raw`<style>
    :root {color-scheme:dark;--bg:#101414;--fg:#e9eeec;--muted:#b5c3c0;--accent:#df776a;}
    :root[data-theme="light"]{color-scheme:light;--bg:#f7f8f6;--fg:#182323;--muted:#52635f;--accent:#a13f34;}
    *{box-sizing:border-box}html{overflow-x:hidden}body{margin:0;padding:14px;background:var(--bg);color:var(--fg);font:15px/1.5 system-ui,sans-serif}
    button,input,select,textarea{font:inherit}button{cursor:pointer}button:focus-visible,input:focus-visible,select:focus-visible{outline:2px solid var(--accent);outline-offset:3px}
    svg{max-width:100%;height:auto}a{color:var(--accent)}.muted{color:var(--muted)}
  </style>`;
  // Complete-document fragments are intentionally disallowed. Authors write fragment markup;
  // this prevents them from inserting a second head before the CSP meta tag.
  if (/<\s*(?:!doctype|html|head|body|base|meta)\b/i.test(body)) {
    throw new Error('[interactive] Use an HTML fragment; do not add doctype, html, head, body, base or meta tags.');
  }
  return `${head}${baseStyle}</head><body>${body}${BRIDGE}</body></html>`;
}

function isElement(node: RootContent | ElementContent | undefined, tag?: string): node is Element {
  return !!node && node.type === 'element' && (!tag || node.tagName === tag);
}
function textValue(node: RootContent | ElementContent): string {
  if (node.type === 'text') return node.value;
  return node.type === 'element' ? node.children.map(textValue).join('') : '';
}
function isInteractive(pre: Element): boolean {
  if (pre.tagName !== 'pre') return false;
  const code = pre.children.find((c): c is Element => isElement(c, 'code'));
  if (!code) return false;
  const a = code.properties?.className;
  const klass = Array.isArray(a) ? a.join(' ') : String(a ?? '');
  const p = pre.properties?.className;
  const preKlass = Array.isArray(p) ? p.join(' ') : String(p ?? '');
  return textValue(code).trimStart().startsWith(INTERACTIVE_SENTINEL)
    || /(?:^|\s)language-interactive(?:\s|$)/.test(`${klass} ${preKlass}`);
}

/** Mutates the cloned HAST used only by the blogArticlePlugin. */
export function transformInteractiveBlocks(root: Root): void {
  function walk(parent: Parent): void {
    const children = parent.children as (RootContent | ElementContent)[];
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      if (!isElement(child)) continue;
      if (isInteractive(child)) {
        const code = child.children.find((c): c is Element => isElement(c, 'code'))!;
        const raw = textValue(code).trimStart();
        const source = raw.startsWith(INTERACTIVE_SENTINEL) ? raw.slice(INTERACTIVE_SENTINEL.length) : raw;
        const { options, body } = parseInteractive(source);
        const doc = makeInteractiveDocument(body, options);
        children[i] = {
          type: 'element', tagName: 'figure', properties: { className: ['interactive-embed'], dataInteractive: '' }, children: [
            { type: 'element', tagName: 'iframe', properties: {
              title: options.title,
              sandbox: 'allow-scripts',
              referrerPolicy: 'no-referrer',
              loading: 'lazy',
              srcDoc: doc,
              height: options.height,
              scrolling: 'auto',
              // No allow-same-origin, forms, downloads, top navigation, popups, etc.
            }, children: [] },
            { type: 'element', tagName: 'figcaption', properties: {}, children: [
              { type: 'text', value: `${options.title} · Interactive demonstration` },
            ] },
          ],
        } as Element;
      } else walk(child);
    }
  }
  walk(root);
}
