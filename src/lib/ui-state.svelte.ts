import { getTables } from "./state.svelte";
import type { Table } from "./types";
import { getTableHalfSize } from "./table-shapes";
import { CANVAS_W, CANVAS_H } from "./grid";

const COLLAPSED_KEY = "scm.unassigned.collapsed";
const WIDTH_KEY = "scm.unassigned.width";

export const UNASSIGNED_MIN_WIDTH = 180;
export const UNASSIGNED_MAX_WIDTH = 480;
const DEFAULT_WIDTH = 240;

export const MIN_ZOOM = 0.75;
export const MAX_ZOOM = 2.5;

function loadCollapsed(): boolean {
  try {
    return localStorage.getItem(COLLAPSED_KEY) === "1";
  } catch {
    return false;
  }
}

function loadWidth(): number {
  try {
    const raw = localStorage.getItem(WIDTH_KEY);
    if (!raw) return DEFAULT_WIDTH;
    const n = parseInt(raw, 10);
    if (isNaN(n)) return DEFAULT_WIDTH;
    return Math.min(UNASSIGNED_MAX_WIDTH, Math.max(UNASSIGNED_MIN_WIDTH, n));
  } catch {
    return DEFAULT_WIDTH;
  }
}

let zoom = $state(1);
let panX = $state(0);
let panY = $state(0);
let viewportEl: HTMLDivElement | undefined = $state();

let unassignedCollapsed = $state(loadCollapsed());
let unassignedWidth = $state(loadWidth());

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

export function getUnassignedCollapsed(): boolean {
  return unassignedCollapsed;
}
export function setUnassignedCollapsed(v: boolean): void {
  if (v === unassignedCollapsed) return;
  unassignedCollapsed = v;
  try {
    localStorage.setItem(COLLAPSED_KEY, v ? "1" : "0");
  } catch {
    // ignore
  }
}

export function getUnassignedWidth(): number {
  return unassignedWidth;
}
export function setUnassignedWidth(v: number): void {
  const clamped = Math.min(
    UNASSIGNED_MAX_WIDTH,
    Math.max(UNASSIGNED_MIN_WIDTH, v),
  );
  if (clamped === unassignedWidth) return;
  unassignedWidth = clamped;
}
export function commitUnassignedWidth(): void {
  try {
    localStorage.setItem(WIDTH_KEY, String(unassignedWidth));
  } catch {
    // ignore
  }
}

export function clampZoom(v: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, v));
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

export function zoomToCenter(newZoomValue: number): void {
  if (!viewportEl) return;
  const rect = viewportEl.getBoundingClientRect();
  const cx = rect.width / 2;
  const cy = rect.height / 2;
  const oldZoom = zoom;
  const clamped = clampZoom(newZoomValue);
  panX = cx - (cx - panX) * (clamped / oldZoom);
  panY = cy - (cy - panY) * (clamped / oldZoom);
  zoom = clamped;
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

  const padding = 80;
  const { minX, minY, maxX, maxY } = calculateTableBounds(tables);
  const rect = viewportEl.getBoundingClientRect();

  const contentW = maxX - minX + padding * 2;
  const contentH = maxY - minY + padding * 2;
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
  const rect = viewportEl.getBoundingClientRect();
  if (getTables().length > 0) {
    fitToView();
  } else {
    panX = rect.width / 2 - (CANVAS_W / 2) * zoom;
    panY = rect.height / 2 - (CANVAS_H / 2) * zoom;
  }
}
