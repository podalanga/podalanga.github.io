// Reading figures for a blog post, computed from its Markdown source at build time.

const WORDS_PER_MINUTE = 230;

export interface ReadingStats {
  words: number;
  minutes: number;
  figures: number;
}

export interface TocEntry {
  id: string;
  depth: 2 | 3;
  /** The section number the heading starts with ("3", "3.1"), if any. */
  number?: string;
  text: string;
}

/** Markdown reduced to the words a reader actually reads. */
function proseOf(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ') // images: the alt text is not read inline
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // links keep their text
    .replace(/\[![A-Z]+\]/gi, ' ') // article markers such as [!EQUATION]
    .replace(/^\s*\|?\s*:?-{3,}.*$/gm, ' ') // table rules
    .replace(/[#>*_|`]/g, ' ');
}

export function readingStats(markdown: string): ReadingStats {
  const words = proseOf(markdown).split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
  return {
    words,
    minutes: Math.max(1, Math.ceil(words / WORDS_PER_MINUTE)),
    figures: (markdown.match(/!\[[^\]]*\]\([^)]*\)/g) ?? []).length,
  };
}

/** Sections for the post index: h2 and h3 only, with any leading "3." / "3.1" split off. */
export function tableOfContents(headings: { depth: number; slug: string; text: string }[]): TocEntry[] {
  return headings
    .filter((h): h is { depth: 2 | 3; slug: string; text: string } => h.depth === 2 || h.depth === 3)
    .map((h) => {
      const m = h.text.match(/^(\d+(?:\.\d+)*)\.?\s+(.*)$/);
      return { id: h.slug, depth: h.depth, number: m?.[1], text: m ? m[2] : h.text };
    });
}

/**
 * The post's Markdown with the article markers (`> [!EQUATION]` and friends) taken out, for plain
 * text outputs such as /llms-full.txt. A marker's title is kept as a bold line.
 */
export function plainMarkdown(markdown: string): string {
  const lines = markdown.split('\n');
  const out: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^((?:>\s?)+)\[![A-Z]+\]\s*(.*)$/i);
    if (!m) {
      out.push(lines[i]);
      continue;
    }
    if (m[2]) {
      out.push(`${m[1]}**${m[2]}**`);
    } else if (/^(?:>\s?)+$/.test(lines[i + 1] ?? '')) {
      i++; // the empty quote line after a bare marker
    }
  }
  return out.join('\n');
}
