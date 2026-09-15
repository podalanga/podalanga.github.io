// Pre-rendered glyph atlas: N glyphs x M brightness levels x one color, rendered once to an
// offscreen canvas, then blitted with drawImage; never fillText per cell per frame.

export const GLYPHS = ' .·:-=+*<>/\\|[]{}01#%&$@'.split('');
export const DEFAULT_LEVELS = 8;

export interface GlyphAtlas {
  canvas: HTMLCanvasElement;
  glyphSize: number;
  levels: number;
  glyphs: string[];
  draw(ctx: CanvasRenderingContext2D, glyphIndex: number, level: number, x: number, y: number): void;
}

export function buildGlyphAtlas(
  glyphSize: number,
  color: string,
  font = 'var(--font-mono, monospace)',
  glyphs: string[] = GLYPHS,
  levels: number = DEFAULT_LEVELS,
): GlyphAtlas {
  const cols = glyphs.length;
  const canvas = document.createElement('canvas');
  canvas.width = cols * glyphSize;
  canvas.height = levels * glyphSize;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2d context unavailable');

  ctx.font = `${glyphSize}px ${font}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  for (let level = 0; level < levels; level++) {
    ctx.globalAlpha = (level + 1) / levels;
    ctx.fillStyle = color;
    for (let i = 0; i < cols; i++) {
      ctx.fillText(glyphs[i], i * glyphSize + glyphSize / 2, level * glyphSize + glyphSize / 2);
    }
  }
  ctx.globalAlpha = 1;

  return {
    canvas,
    glyphSize,
    levels,
    glyphs,
    draw(destCtx, glyphIndex, level, x, y) {
      const gi = ((glyphIndex % cols) + cols) % cols;
      const lv = Math.max(0, Math.min(levels - 1, level | 0));
      destCtx.drawImage(canvas, gi * glyphSize, lv * glyphSize, glyphSize, glyphSize, x, y, glyphSize, glyphSize);
    },
  };
}

export function intensityToLevel(intensity: number, levels: number = DEFAULT_LEVELS): number {
  return Math.max(0, Math.min(levels - 1, Math.floor(intensity * levels)));
}

export function intensityToGlyphIndex(intensity: number, glyphs: string[] = GLYPHS): number {
  return Math.max(0, Math.min(glyphs.length - 1, Math.floor(intensity * glyphs.length)));
}
