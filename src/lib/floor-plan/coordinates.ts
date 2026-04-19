import type { Table } from "../types";
import { getTableHalfSize } from "../shapes/registry";
import { getPanX, getPanY, getZoom } from "../ui/viewport-state.svelte";

export interface CanvasPoint {
  x: number;
  y: number;
}

export function clientToCanvas(
  clientX: number,
  clientY: number,
  rect: DOMRect,
): CanvasPoint {
  return {
    x: (clientX - rect.left - getPanX()) / getZoom(),
    y: (clientY - rect.top - getPanY()) / getZoom(),
  };
}

export function isInsideRect(
  rect: DOMRect,
  clientX: number,
  clientY: number,
): boolean {
  return (
    clientX >= rect.left &&
    clientX <= rect.right &&
    clientY >= rect.top &&
    clientY <= rect.bottom
  );
}

export function hitTestTable(pos: CanvasPoint, tables: Table[]): string | null {
  for (let i = tables.length - 1; i >= 0; i--) {
    const t = tables[i];
    const { halfW, halfH } = getTableHalfSize(t);
    if (
      pos.x >= t.x - halfW &&
      pos.x <= t.x + halfW &&
      pos.y >= t.y - halfH &&
      pos.y <= t.y + halfH
    ) {
      return t.id;
    }
  }
  return null;
}
