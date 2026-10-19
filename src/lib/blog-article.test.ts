import { markdownToHtml } from 'satteri';
import { describe, expect, it } from 'vitest';
import { blogArticlePlugin } from './blog-article';

async function html(md: string, path = '/site/src/content/log/post/index.md'): Promise<string> {
  const result = await markdownToHtml(md, { hastPlugins: [blogArticlePlugin], fileURL: new URL(`file://${path}`) });
  return result.html;
}

describe('blogArticlePlugin', () => {
  it('turns an image and its "Figure N." line into a numbered figure', async () => {
    const out = await html('![A beam](https://example.com/a.png)\n\n_Figure 2. Focusing a **beam**._');
    expect(out).toContain('<figure class="fig" id="fig-2">');
    expect(out).toContain('<button type="button" class="fig-frame" data-zoom="" aria-label="Enlarge figure 2">');
    expect(out).toContain('<figcaption><span class="fig-no">Fig. 2</span> <span class="fig-text">Focusing a <strong>beam</strong>.</span></figcaption>');
  });

  it('numbers equations in order and leaves working lines unnumbered', async () => {
    const out = await html('> [!EQUATION]\n>\n> b = λf/a\n\n> [!CALC]\n>\n> b = 2 µm\n\n> [!EQUATION]\n>\n> I = P/A');
    expect(out).toContain('<div class="eq" id="eq-1"><div class="eq-body"><p>b = λf/a</p></div><span class="eq-no">(1)</span></div>');
    expect(out).toContain('<div class="eq eq--calc"><div class="eq-body"><p>b = 2 µm</p></div></div>');
    expect(out).toContain('id="eq-2"');
  });

  it('builds a titled example panel with nested working', async () => {
    const out = await html('> [!EXAMPLE] One watt\n>\n> Take a laser.\n>\n> > [!CALC]\n> >\n> > I = 7e6');
    expect(out).toMatch(/<section class="example"><p class="example-title">One watt<\/p>\s*<p>Take a laser.<\/p>\s*<div class="eq eq--calc">/);
  });

  it('keeps plain quotations as blockquotes', async () => {
    expect(await html('> Information is lost forever.')).toContain('<blockquote>');
  });

  // Astro derives heading ids from the text afterwards, so the text itself must not change.
  it('wraps section numbers without changing the heading text', async () => {
    const out = await html('## 3. Focusing\n\n### 3.1 The spot');
    expect(out).toContain('<h2 class="numbered"><span class="sec-no">3<span class="sec-dot">.</span></span> Focusing</h2>');
    expect(out).toContain('<h3 class="numbered"><span class="sec-no">3.1</span> The spot</h3>');
  });

  it('wraps tables in a scroll region and marks run-in paragraphs', async () => {
    const out = await html('| A |\n| --- |\n| 1 |\n\n**Lead.** Rest of it.');
    expect(out).toContain('<div class="table-wrap" tabindex="0" role="region" aria-label="Table"><table>');
    expect(out).toContain('<p class="runin"><strong>Lead.</strong> Rest of it.</p>');
  });

  it('sets plain-text subscripts, but not in code or ordinary words', async () => {
    const out = await html('Here Δλ_B and d_min, K_ε1, but not snake_case_name or `n_eff`.');
    expect(out).toContain('Δλ<sub>B</sub> and d<sub>min</sub>, K<sub>ε1</sub>, but not snake_case_name or <code>n_eff</code>.');
  });

  it('leaves Markdown outside the blog alone', async () => {
    const out = await html('## 3. Focusing', '/site/src/content/works/x/index.md');
    expect(out).not.toContain('sec-no');
  });
});
