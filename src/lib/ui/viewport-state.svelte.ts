import { getTables } from "../state.svelte";
import type { Table } from "../types";
import { getTableHalfSize } from "../shapes/registry";
import { CANVAS_W, CANVAS_H } from "../grid";

export const MIN_ZOOM = 0.75;
export const MAX_ZOOM = 2.5;
const FIT_PADDING = 80;

let zoom = $state(1);
let panX = $state(0);
let panY = $state(0);
let viewportEl: HTMLDivElement | undefined = $state();

export function getZoom(): number {
  return zoom;
}
export function setZoom(v: number): void {
  zoom = v;
}
export function getPanX(): number {
  return panX;
}
export function setPanX(v: number): void {
  panX = v;
}
export function getPanY(): number {
  return panY;
}
export function setPanY(v: number): void {
  panY = v;
}

export function getViewportEl(): HTMLDivElement | undefined {
  return viewportEl;
}
export function setViewportEl(el: HTMLDivElement | undefined): void {
  viewportEl = el;
}

export function clampZoom(v: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, v));
}

export function zoomAround(
  anchorX: number,
  anchorY: number,
  newZoom: number,
): void {
  const clamped = clampZoom(newZoom);
  const ratio = clamped / zoom;
  panX = anchorX - (anchorX - panX) * ratio;
  panY = anchorY - (anchorY - panY) * ratio;
  zoom = clamped;
}

export function zoomToCenter(newZoomValue: number): void {
  if (!viewportEl) return;
  const rect = viewportEl.getBoundingClientRect();
  zoomAround(rect.width / 2, rect.height / 2, newZoomValue);
}

export function fitToView(): void {
  if (!viewportEl) return;
  const tables = getTables();
  if (tables.length === 0) {
    zoom = 1;
    panX = 0;
    panY = 0;
    return;
  }

  const { minX, minY, maxX, maxY } = calculateTableBounds(tables);
  const rect = viewportEl.getBoundingClientRect();

  const contentW = maxX - minX + FIT_PADDING * 2;
  const contentH = maxY - minY + FIT_PADDING * 2;
  const newZoom = clampZoom(
    Math.min(rect.width / contentW, rect.height / contentH),
  );

  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  zoom = newZoom;
  panX = rect.width / 2 - centerX * newZoom;
  panY = rect.height / 2 - centerY * newZoom;
}

export function centerView(): void {
  if (!viewportEl) return;
  if (getTables().length > 0) {
    fitToView();
    return;
  }
  const rect = viewportEl.getBoundingClientRect();
  panX = rect.width / 2 - (CANVAS_W / 2) * zoom;
  panY = rect.height / 2 - (CANVAS_H / 2) * zoom;
}

function calculateTableBounds(tables: Table[]) {
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (const t of tables) {
    const { halfW, halfH } = getTableHalfSize(t);
    minX = Math.min(minX, t.x - halfW);
    minY = Math.min(minY, t.y - halfH);
    maxX = Math.max(maxX, t.x + halfW);
    maxY = Math.max(maxY, t.y + halfH);
  }
  return { minX, minY, maxX, maxY };
}
