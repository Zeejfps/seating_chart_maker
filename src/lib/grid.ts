/** Grid layout constants for the floor plan canvas. */
export const CANVAS_W = 3000;
export const CANVAS_H = 2000;
export const GRID_SNAP = 50;
export const TABLE_SPACING = 150;
export const GRID_COLS = 10;

/** Snap a value to the nearest grid line. */
export function snapToGrid(val: number): number {
  return Math.round(val / GRID_SNAP) * GRID_SNAP;
}

/** Clamp a point to the canvas bounds. */
export function clampToCanvas(x: number, y: number): { x: number; y: number } {
  return {
    x: Math.max(0, Math.min(CANVAS_W, x)),
    y: Math.max(0, Math.min(CANVAS_H, y)),
  };
}

/** Starting x/y for the table grid, centered on the canvas. */
export function gridStartPosition(): { startX: number; startY: number } {
  return {
    startX: CANVAS_W / 2 - Math.floor(GRID_COLS / 2) * TABLE_SPACING,
    startY: CANVAS_H / 2 - 2 * TABLE_SPACING,
  };
}

/** Find the next open grid slot that isn't in the occupied set. */
export function findOpenSlot(occupied: Set<string>): { x: number; y: number } {
  const { startX, startY } = gridStartPosition();
  for (let i = 0; i < 1000; i++) {
    const x = snapToGrid(startX + (i % GRID_COLS) * TABLE_SPACING);
    const y = snapToGrid(startY + Math.floor(i / GRID_COLS) * TABLE_SPACING);
    if (!occupied.has(`${x},${y}`)) {
      return { x, y };
    }
  }
  return { x: CANVAS_W / 2, y: CANVAS_H / 2 };
}
