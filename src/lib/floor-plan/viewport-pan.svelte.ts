import {
  getPanX,
  setPanX,
  getPanY,
  setPanY,
} from "../ui/viewport-state.svelte";

let _isPanning = $state(false);
let startMouseX = 0;
let startMouseY = 0;
let startPanX = 0;
let startPanY = 0;

export function isPanning(): boolean {
  return _isPanning;
}

export function startPan(e: MouseEvent): void {
  _isPanning = true;
  startMouseX = e.clientX;
  startMouseY = e.clientY;
  startPanX = getPanX();
  startPanY = getPanY();
}

export function updatePan(e: MouseEvent): void {
  if (!_isPanning) return;
  setPanX(startPanX + (e.clientX - startMouseX));
  setPanY(startPanY + (e.clientY - startMouseY));
}

/** End the pan. Returns whether any panning actually happened. */
export function finalizePan(): { didPan: boolean } {
  const didPan = getPanX() !== startPanX || getPanY() !== startPanY;
  _isPanning = false;
  return { didPan };
}
