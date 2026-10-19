// Shapes blog Markdown into the article components the post page styles (src/styles/article.css).
// Authors keep writing plain Markdown; this turns its conventions into structure:
//
//   ![alt](./x.png) + `_Figure N. Caption._`  ->  <figure class="fig"> with a numbered caption
//   > [!EQUATION]                              ->  numbered display equation
//   > [!CALC]                                  ->  unnumbered working line (inside worked examples)
//   > [!EXAMPLE] Title                         ->  worked-example panel
//   > [!NOTE] / > [!KEY]                       ->  margin note / key statement
//   ## 3. Title, ### 3.1 Title                 ->  the number is wrapped so it can hang in the margin
//   <table>                                    ->  wrapped in a scroll box for narrow screens
//   **Lead.** run-in paragraph                 ->  class `runin`
//   λ_B, n_eff, d_min                          ->  λ<sub>B</sub>, n<sub>eff</sub>, d<sub>min</sub>
//   $x$, and $$…$$ on its own lines            ->  KaTeX, typeset at build time; a top-level display
//                                                  block is a numbered equation, one inside an
//                                                  example or [!CALC] is an unnumbered working line
//
// Only files under content/log are touched, so project pages keep their plain prose.
import type { Element, ElementContent, Root, RootContent, Text } from 'hast';
import katex from 'katex';

type Parent = Root | Element;

const FIGURE_CAPTION = /^Figure\s+(\d+)\.\s*/;
const ALERT = /^\[!(EQUATION|CALC|EXAMPLE|NOTE|KEY)\]\s*/i;
const SECTION_NUMBER = /^(\d+(?:\.\d+)*)(\.?)(\s+)/;

function el(tagName: string, properties: Element['properties'], children: ElementContent[]): Element {
  return { type: 'element', tagName, properties, children };
}

function text(value: string): Text {
  return { type: 'text', value };
}

function isElement(node: RootContent | ElementContent | undefined, tagName?: string): node is Element {
  return !!node && node.type === 'element' && (!tagName || node.tagName === tagName);
}

function isBlank(node: RootContent | ElementContent): boolean {
  return node.type === 'text' && node.value.trim() === '';
}

/** Children with the whitespace-only text nodes between block elements removed. */
function meaningful(children: ElementContent[]): ElementContent[] {
  return children.filter((c) => !isBlank(c));
}

function textContent(node: RootContent | ElementContent): string {
  if (node.type === 'text') return node.value;
  if (node.type === 'element') return node.children.map(textContent).join('');
  return '';
}

/** A paragraph holding a single image and nothing else. */
function soleImage(node: RootContent | ElementContent): Element | undefined {
  if (!isElement(node, 'p')) return undefined;
  const kids = meaningful(node.children);
  return kids.length === 1 && isElement(kids[0], 'img') ? kids[0] : undefined;
}

/** A paragraph that is only `_Figure N. …_`; returns the number and the caption's inline content. */
function figureCaption(node: RootContent | ElementContent | undefined): { n: string; content: ElementContent[] } | undefined {
  if (!node || !isElement(node, 'p')) return undefined;
  const kids = meaningful(node.children);
  if (kids.length !== 1 || !isElement(kids[0], 'em')) return undefined;
  const em = kids[0];
  const first = em.children[0];
  if (!first || first.type !== 'text') return undefined;
  const m = first.value.match(FIGURE_CAPTION);
  if (!m) return undefined;
  const rest = first.value.slice(m[0].length);
  const content = [...(rest ? [text(rest)] : []), ...em.children.slice(1)];
  return { n: m[1], content };
}

function nextMeaningfulIndex(children: RootContent[] | ElementContent[], from: number): number {
  let i = from;
  while (i < children.length && isBlank(children[i])) i++;
  return i;
}

function figures(parent: Parent): void {
  const kids = parent.children as RootContent[];
  const out: RootContent[] = [];
  for (let i = 0; i < kids.length; i++) {
    const img = soleImage(kids[i]);
    if (!img) {
      out.push(kids[i]);
      continue;
    }
    const capIndex = nextMeaningfulIndex(kids, i + 1);
    const caption = figureCaption(kids[capIndex]);
    const label = caption ? `Enlarge figure ${caption.n}` : 'Enlarge figure';
    const frame = el('button', { type: 'button', className: ['fig-frame'], dataZoom: '', ariaLabel: label }, [img]);
    const children: ElementContent[] = [frame];
    if (caption) {
      children.push(
        el('figcaption', {}, [
          el('span', { className: ['fig-no'] }, [text(`Fig. ${caption.n}`)]),
          text(' '),
          el('span', { className: ['fig-text'] }, caption.content),
        ]),
      );
      i = capIndex;
    }
    out.push(el('figure', { className: ['fig'], ...(caption && { id: `fig-${caption.n}` }) }, children));
  }
  parent.children = out as typeof parent.children;
}

function hasClass(node: Element, name: string): boolean {
  const cls: unknown = node.properties?.className;
  return (Array.isArray(cls) ? cls : String(cls ?? '').split(' ')).includes(name);
}

/** A `$$…$$` block: `<pre><code class="language-math">` (see `mathBlocksAsCode`). */
function displayMath(node: RootContent | ElementContent | undefined): string | undefined {
  if (!isElement(node, 'pre')) return undefined;
  const code = meaningful(node.children)[0];
  return isElement(code, 'code') && hasClass(code, 'language-math') ? textContent(code).trim() : undefined;
}

/** Typesets TeX with KaTeX. A formula KaTeX cannot parse is shown as its source, in red, and
 *  reported in the build log rather than failing the build. */
export function typeset(tex: string, displayMode: boolean, where = ''): RootContent {
  let html: string;
  try {
    html = katex.renderToString(tex, { displayMode, throwOnError: true, output: 'htmlAndMathml' });
  } catch (err) {
    console.warn(`[blog] KaTeX could not typeset ${JSON.stringify(tex)}${where ? ` in ${where}` : ''}: ${(err as Error).message}`);
    html = katex.renderToString(tex, { displayMode, throwOnError: false, output: 'htmlAndMathml' });
  }
  return { type: 'raw', value: html } as unknown as RootContent;
}

/** A numbered display equation. `\tag{…}` in the TeX supplies its own label instead. */
function equationBox(body: ElementContent[], tex: string | undefined, counter: { eq: number }): Element {
  if (tex && /\\tag\*?\{/.test(tex)) return el('div', { className: ['eq', 'eq--tagged'] }, [el('div', { className: ['eq-body'] }, body)]);
  counter.eq += 1;
  return el('div', { className: ['eq'], id: `eq-${counter.eq}` }, [
    el('div', { className: ['eq-body'] }, body),
    el('span', { className: ['eq-no'] }, [text(`(${counter.eq})`)]),
  ]);
}

/**
 * Reads `[!TYPE] Title` off the start of a blockquote. The marker sits on its own paragraph; any
 * words after it on that line become the title. Returns undefined for a plain quotation.
 */
function readAlert(quote: Element): { kind: string; title: ElementContent[]; body: ElementContent[] } | undefined {
  const kids = meaningful(quote.children);
  const lead = kids[0];
  if (!isElement(lead, 'p')) return undefined;
  const first = lead.children[0];
  if (!first || first.type !== 'text') return undefined;
  const m = first.value.match(ALERT);
  if (!m) return undefined;

  const rest = first.value.slice(m[0].length);
  const titleInline: ElementContent[] = [...(rest ? [text(rest)] : []), ...lead.children.slice(1)];
  const hasTitle = titleInline.some((c) => textContent(c).trim() !== '');
  return {
    kind: m[1].toUpperCase(),
    title: hasTitle ? titleInline : [],
    body: hasTitle ? kids.slice(1) : [...(titleInline.length ? [el('p', {}, titleInline)] : []), ...kids.slice(1)],
  };
}

function alerts(node: Parent, counter: { eq: number }): void {
  node.children.forEach((child, i) => {
    if (!isElement(child)) return;
    // A `$$…$$` block standing on its own in the text is a numbered equation.
    const tex = node.type === 'root' ? displayMath(child) : undefined;
    if (tex !== undefined) {
      node.children[i] = equationBox([child], tex, counter);
      return;
    }
    // Depth first, so an example's working lines are shaped before the example itself.
    alerts(child, counter);
    if (child.tagName !== 'blockquote') return;
    const alert = readAlert(child);
    if (!alert) return;

    let replacement: Element;
    switch (alert.kind) {
      case 'EQUATION':
        replacement = equationBox(alert.body, alert.body.map(displayMath).find((t) => t !== undefined), counter);
        break;
      case 'CALC':
        replacement = el('div', { className: ['eq', 'eq--calc'] }, [el('div', { className: ['eq-body'] }, alert.body)]);
        break;
      case 'EXAMPLE':
        replacement = el('section', { className: ['example'] }, [
          ...(alert.title.length ? [el('p', { className: ['example-title'] }, alert.title)] : []),
          ...alert.body,
        ]);
        break;
      case 'NOTE':
        replacement = el('aside', { className: ['note'] }, alert.body);
        break;
      default:
        replacement = el('aside', { className: ['key'] }, alert.body);
    }
    node.children[i] = replacement;
  });
}

/** Wraps `3.` / `3.1` at the start of an h2/h3 so it can hang in the margin. Text content is
 *  unchanged (the dot stays in the DOM), so heading ids and anchors keep their old values. */
function sectionNumbers(node: Parent): void {
  for (const child of node.children) {
    if (!isElement(child)) continue;
    if (child.tagName === 'h2' || child.tagName === 'h3') {
      const first = child.children[0];
      if (first?.type !== 'text') continue;
      const m = first.value.match(SECTION_NUMBER);
      if (!m) continue;
      first.value = first.value.slice(m[0].length);
      child.children.unshift(
        el('span', { className: ['sec-no'] }, [text(m[1]), ...(m[2] ? [el('span', { className: ['sec-dot'] }, [text(m[2])])] : [])]),
        text(m[3]),
      );
      child.properties = { ...child.properties, className: ['numbered'] };
    } else {
      sectionNumbers(child);
    }
  }
}

function tables(node: Parent): void {
  node.children.forEach((child, i) => {
    if (!isElement(child)) return;
    if (child.tagName === 'table') {
      node.children[i] = el('div', { className: ['table-wrap'], tabIndex: 0, role: 'region', ariaLabel: 'Table' }, [child]);
      return;
    }
    tables(child);
  });
}

/** `**Lead sentence.** Rest of the paragraph` becomes a run-in head. */
function runIns(node: Parent): void {
  for (const child of node.children) {
    if (!isElement(child)) continue;
    if (child.tagName === 'p') {
      const lead = child.children[0];
      if (isElement(lead, 'strong') && /[.:?]$/.test(textContent(lead).trim()) && child.children.length > 1) {
        child.properties = { ...child.properties, className: ['runin'] };
      }
      continue;
    }
    runIns(child);
  }
}

// A single letter (or Δ and a letter), an underscore and up to four letters or digits, standing alone: the plain-text
// subscript the posts are written with. Markdown has already taken `_emphasis_`, so any underscore
// left in a text node is literal.
const SUBSCRIPT = /(?<![\p{L}\p{N}_])(Δ?\p{L})_([\p{L}\p{N}]{1,4})(?![\p{L}\p{N}_])/gu;

function subscripts(node: Parent): void {
  const out: ElementContent[] = [];
  let changed = false;
  for (const child of node.children as ElementContent[]) {
    if (child.type === 'text' && SUBSCRIPT.test(child.value)) {
      SUBSCRIPT.lastIndex = 0;
      let last = 0;
      for (const m of child.value.matchAll(SUBSCRIPT)) {
        const at = m.index ?? 0;
        out.push(text(child.value.slice(last, at) + m[1]), el('sub', {}, [text(m[2])]));
        last = at + m[0].length;
      }
      if (last < child.value.length) out.push(text(child.value.slice(last)));
      changed = true;
      continue;
    }
    SUBSCRIPT.lastIndex = 0;
    if (isElement(child) && child.tagName !== 'code' && child.tagName !== 'pre') subscripts(child);
    out.push(child);
  }
  if (changed) node.children = out as typeof node.children;
}

/**
 * Replaces every math node with KaTeX output. Display math that is not already inside an
 * equation box (it sits in an example, a list, a quotation) becomes an unnumbered working line.
 */
function math(node: Parent, inBox: boolean, where: string): void {
  node.children.forEach((child, i) => {
    if (!isElement(child)) return;
    const tex = displayMath(child);
    if (tex !== undefined) {
      const rendered = typeset(tex, true, where) as ElementContent;
      node.children[i] = inBox ? rendered : el('div', { className: ['eq', 'eq--calc'] }, [el('div', { className: ['eq-body'] }, [rendered])]);
      return;
    }
    if (child.tagName === 'code' && hasClass(child, 'math-inline')) {
      node.children[i] = typeset(textContent(child), false, where) as ElementContent;
      return;
    }
    math(child, inBox || hasClass(child, 'eq-body'), where);
  });
}

export function transformArticle(tree: Root, where = ''): void {
  figures(tree);
  alerts(tree, { eq: 0 });
  sectionNumbers(tree);
  tables(tree);
  runIns(tree);
  subscripts(tree);
  math(tree, false, where);
}

/**
 * Copies the read-only, lazily materialised tree the processor hands over into plain objects the
 * transforms can mutate. Only the fields hast content actually uses are carried across.
 */
function clone(node: Readonly<Root | RootContent>): Root | RootContent {
  const copy: Record<string, unknown> = { type: node.type };
  if ('tagName' in node) copy.tagName = node.tagName;
  if ('properties' in node) copy.properties = { ...node.properties };
  if ('value' in node) copy.value = node.value;
  if ('name' in node) copy.name = node.name;
  if ('children' in node) copy.children = Array.from(node.children, (c) => clone(c as RootContent));
  return copy as unknown as Root | RootContent;
}

/**
 * Mdast plugin: turns each `$$…$$` block into a code block in the language `math`. Astro's syntax
 * highlighter runs before the article plugin and skips `math` code blocks, but it only recognises
 * them by that language, which Sätteri's own math blocks do not carry; without this, Shiki would
 * colour the TeX as plain code before KaTeX ever saw it.
 */
export const mathBlocksAsCode = {
  name: 'math-blocks-as-code',
  math(node: { value: string }, ctx: { replaceNode(node: unknown, next: unknown): void }) {
    ctx.replaceNode(node, { type: 'code', lang: 'math', meta: null, value: node.value });
  },
};

/**
 * Hast plugin for Astro's Sätteri Markdown processor. It runs once per document, swaps the whole
 * root for the shaped one, and only for blog posts. Astro's own image and heading-id passes run
 * after it, so images inside figures are still optimised and heading ids come from unchanged text.
 */
export const blogArticlePlugin = {
  name: 'blog-article',
  before(root: Readonly<Root>, ctx: { fileURL: URL | undefined; replaceNode(node: unknown, next: unknown): void }) {
    const path = ctx.fileURL ? decodeURIComponent(ctx.fileURL.pathname) : '';
    if (!path.includes('/content/log/')) return;
    const next = clone(root) as Root;
    transformArticle(next, path.slice(path.indexOf('/content/log/') + 1));
    ctx.replaceNode(root, next);
  },
};
