import {
  getPanX,
  getPanY,
  getZoom,
  setPanX,
  setPanY,
  zoomAround,
} from "../ui/viewport-state.svelte";

const ZOOM_SPEED = 0.005;

export function zoomAtPointer(e: WheelEvent, rect: DOMRect): void {
  const pointerX = e.clientX - rect.left;
  const pointerY = e.clientY - rect.top;
  zoomAround(pointerX, pointerY, getZoom() * (1 - e.deltaY * ZOOM_SPEED));
}

export function scrollPan(e: WheelEvent): void {
  if (e.shiftKey) {
    setPanX(getPanX() - e.deltaY);
    return;
  }
  setPanX(getPanX() - e.deltaX);
  setPanY(getPanY() - e.deltaY);
}

export function isZoomGesture(e: WheelEvent): boolean {
  return e.ctrlKey || e.metaKey;
}
