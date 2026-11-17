import { describe, expect, it } from 'vitest';
import katex from 'katex';
import type { Root } from 'hast';
import { makeInteractiveDocument, parseInteractive, transformInteractiveBlocks } from './interactive-blocks';
import { interactiveFenceAsText, INTERACTIVE_SENTINEL } from './interactive-fence';

describe('generic interactive embeds', () => {
  it('uses offline mode and conservative defaults', () => {
    const out = parseInteractive('<p>Hello</p>');
    expect(out.options).toEqual({title:'Interactive demonstration',height:380,network:'off'});
  });
  it('parses metadata without arbitrary YAML evaluation', () => {
    const out = parseInteractive('<!-- interactive\ntitle: Frame animation\nheight: 420\nnetwork: https\n-->\n<p>ok</p>');
    expect(out.options).toEqual({title:'Frame animation',height:420,network:'https'});
    expect(out.body).toBe('<p>ok</p>');
    expect(() => parseInteractive('<!-- interactive\nnetwork: javascript\n-->\nx')).toThrow();
  });
  it('rejects second documents and multi-megabyte widgets', () => {
    const opt = parseInteractive('ok').options;
    expect(() => makeInteractiveDocument('<head><title>x</title></head>',opt)).toThrow();
    expect(() => makeInteractiveDocument('a'.repeat(250_001),opt)).toThrow();
  });
  it('rewrites only interactive fences before Shiki runs', () => {
    const node = {lang:'interactive',value:'<p>Sample</p>'};
    interactiveFenceAsText.code(node,{replaceNode(_old,next){Object.assign(node,next)}});
    expect(node.lang).toBe('text');
    expect(node.value.startsWith(INTERACTIVE_SENTINEL)).toBe(true);
  });
  it('creates a sandboxed srcdoc iframe and leaves regular code untouched', () => {
    const root: Root = {type:'root',children:[
      {type:'element',tagName:'pre',properties:{},children:[
        {type:'element',tagName:'code',properties:{className:['language-interactive']},children:[{type:'text',value:'<script>console.log(1)</script>'}]},
      ]},
      {type:'element',tagName:'pre',properties:{},children:[
        {type:'element',tagName:'code',properties:{className:['language-js']},children:[{type:'text',value:'const x = 1;'}]},
      ]},
    ]};
    transformInteractiveBlocks(root);
    const embed = root.children[0];
    expect(embed.type).toBe('element');
    if (embed.type !== 'element') return;
    expect(embed.tagName).toBe('figure');
    const frame = embed.children[0];
    expect(frame.type).toBe('element');
    if (frame.type !== 'element') return;
    expect(frame.properties.sandbox).toBe('allow-scripts');
    expect(frame.properties).not.toHaveProperty('allow-same-origin');
    expect(String(frame.properties.srcDoc)).toContain("default-src 'none'");
    expect(root.children[1].type).toBe('element');
  });
  it('cannot escape srcdoc as parent-page HTML', () => {
    const injected = `</iframe><script>window.pwned = true</script>`;
    const root: Root = {type:'root',children:[
      {type:'element',tagName:'pre',properties:{},children:[
        {type:'element',tagName:'code',properties:{className:['language-interactive']},children:[{type:'text',value:injected}]},
      ]},
    ]};
    transformInteractiveBlocks(root);
    const figure = root.children[0];
    if (figure.type !== 'element') throw new Error('missing figure');
    const frame = figure.children[0];
    if (frame.type !== 'element') throw new Error('missing frame');
    expect(frame.properties.srcDoc).toContain(injected);
    // The serializer must escape the srcDoc attribute. Never use `raw` HAST here.
    expect(frame.type).toBe('element');
  });
  it('themes the frame with the site tokens and carries the math bridge', () => {
    const doc = makeInteractiveDocument('<p>x</p>', parseInteractive('x').options);
    expect(doc).toContain('--bg:#0a0a0a');
    expect(doc).toContain('--accent:#ff3333');
    expect(doc).toContain('pdl-interactive:math');
  });
  it('ships a bridge script that parses, and its math delimiters typeset as MathML', () => {
    const doc = makeInteractiveDocument('<p>x</p>', parseInteractive('x').options);
    const scripts = [...doc.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
    expect(scripts.length).toBe(1);
    expect(() => new Function(scripts[0])).not.toThrow();
    const html = katex.renderToString('k_p=m\\omega_n^2-k=10,\\quad \\ddot x', { displayMode: true, output: 'mathml', throwOnError: false });
    expect(html).toContain('<math');
    expect(html).not.toContain('katex-html');
  });
});
