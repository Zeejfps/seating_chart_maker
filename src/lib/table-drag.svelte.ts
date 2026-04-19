import { getTables } from "./state.svelte";
import { executeCommand } from "./command-history.svelte";
import { moveTable } from "./commands";
import { clampToCanvas, snapToGrid } from "./grid";

let _dragTableId: string | null = $state(null);
let _dragCurrentX = $state(0);
let _dragCurrentY = $state(0);
let startX = 0;
let startY = 0;
let offsetX = 0;
let offsetY = 0;

export function dragTableId(): string | null {
  return _dragTableId;
}
export function dragCurrentX(): number {
  return _dragCurrentX;
}
export function dragCurrentY(): number {
  return _dragCurrentY;
}

export function startTableDrag(
  tableId: string,
  pointerCanvas: { x: number; y: number },
): void {
  const table = getTables().find((t) => t.id === tableId);
  if (!table) return;
  _dragTableId = tableId;
  _dragCurrentX = table.x;
  _dragCurrentY = table.y;
  startX = table.x;
  startY = table.y;
  offsetX = pointerCanvas.x - table.x;
  offsetY = pointerCanvas.y - table.y;
}

export function updateTableDrag(pointerCanvas: { x: number; y: number }): void {
  if (!_dragTableId) return;
  _dragCurrentX = pointerCanvas.x - offsetX;
  _dragCurrentY = pointerCanvas.y - offsetY;
}

/** End the drag. Returns whether the table actually moved. */
export function finalizeTableDrag(): { didMove: boolean } {
  if (!_dragTableId) return { didMove: false };
  const snapped = clampToCanvas(
    snapToGrid(_dragCurrentX),
    snapToGrid(_dragCurrentY),
  );
  const didMove = snapped.x !== startX || snapped.y !== startY;
  if (didMove) {
    executeCommand(
      moveTable(
        _dragTableId,
        { x: startX, y: startY },
        { x: snapped.x, y: snapped.y },
      ),
    );
  }
  _dragTableId = null;
  return { didMove };
}
