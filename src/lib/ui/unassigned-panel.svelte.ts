import { safeRead, safeWrite } from "../safe-storage";

const COLLAPSED_KEY = "scm.unassigned.collapsed";
const WIDTH_KEY = "scm.unassigned.width";

export const UNASSIGNED_MIN_WIDTH = 180;
export const UNASSIGNED_MAX_WIDTH = 480;
const DEFAULT_WIDTH = 240;

function clampWidth(v: number): number {
  return Math.min(UNASSIGNED_MAX_WIDTH, Math.max(UNASSIGNED_MIN_WIDTH, v));
}

function loadCollapsed(): boolean {
  return safeRead(COLLAPSED_KEY) === "1";
}

function loadWidth(): number {
  const raw = safeRead(WIDTH_KEY);
  if (!raw) return DEFAULT_WIDTH;
  const n = parseInt(raw, 10);
  if (isNaN(n)) return DEFAULT_WIDTH;
  return clampWidth(n);
}

let collapsed = $state(loadCollapsed());
let width = $state(loadWidth());

export function getUnassignedCollapsed(): boolean {
  return collapsed;
}

export function setUnassignedCollapsed(v: boolean): void {
  if (v === collapsed) return;
  collapsed = v;
  safeWrite(COLLAPSED_KEY, v ? "1" : "0");
}

export function getUnassignedWidth(): number {
  return width;
}

export function setUnassignedWidth(v: number): void {
  const clamped = clampWidth(v);
  if (clamped === width) return;
  width = clamped;
}

export function commitUnassignedWidth(): void {
  safeWrite(WIDTH_KEY, String(width));
}
