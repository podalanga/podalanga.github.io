/**
 * Before Astro's Shiki highlighter sees a custom `interactive` fence, rewrite
 * it to the built-in `text` language with a recognizable sentinel. This avoids
 * unsupported-language failures and preserves the exact code in HAST.
 */
export const INTERACTIVE_SENTINEL = 'PDL_INTERACTIVE_BLOCK_V1\n';

export const interactiveFenceAsText = {
  name: 'interactive-fence-as-text',
  code(node: { lang?: string | null; value: string }, ctx: { replaceNode(node: unknown, next: unknown): void }) {
    if (node.lang !== 'interactive') return;
    ctx.replaceNode(node, {
      type: 'code',
      lang: 'text',
      meta: null,
      value: INTERACTIVE_SENTINEL + node.value,
    });
  },
};
