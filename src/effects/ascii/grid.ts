// Shared cell-grid sizing for canvas ASCII effects: clamp(10px, 1.1vw, 16px) cells,
// DPR capped at 2, debounced resize.

const MIN_CELL_PX = 10;
const MAX_CELL_PX = 16;
const CELL_VW_RATIO = 0.011;
export const MAX_DPR = 2;

export interface GridConfig {
  cellSize: number; // CSS px
  cols: number;
  rows: number;
  dpr: number;
  width: number; // canvas backing-store px
  height: number;
}

export function computeCellSize(viewportWidth: number): number {
  return Math.min(MAX_CELL_PX, Math.max(MIN_CELL_PX, viewportWidth * CELL_VW_RATIO));
}

export function computeGrid(cssWidth: number, cssHeight: number, devicePixelRatio: number): GridConfig {
  const dpr = Math.min(MAX_DPR, Math.max(1, devicePixelRatio || 1));
  const cellSize = computeCellSize(cssWidth);
  const cols = Math.max(1, Math.ceil(cssWidth / cellSize));
  const rows = Math.max(1, Math.ceil(cssHeight / cellSize));
  return {
    cellSize,
    cols,
    rows,
    dpr,
    width: Math.round(cssWidth * dpr),
    height: Math.round(cssHeight * dpr),
  };
}

/** Sizes `canvas` to the viewport, calls `onResize` immediately and on debounced window resize. Returns a cleanup fn. */
export function setupResize(
  canvas: HTMLCanvasElement,
  onResize: (grid: GridConfig) => void,
  debounceMs = 150,
): () => void {
  const apply = () => {
    const grid = computeGrid(window.innerWidth, window.innerHeight, window.devicePixelRatio);
    canvas.width = grid.width;
    canvas.height = grid.height;
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;
    onResize(grid);
  };

  apply();

  let timer: number | undefined;
  const handler = () => {
    if (timer !== undefined) window.clearTimeout(timer);
    timer = window.setTimeout(apply, debounceMs);
  };
  window.addEventListener('resize', handler);

  return () => {
    window.removeEventListener('resize', handler);
    if (timer !== undefined) window.clearTimeout(timer);
  };
}
