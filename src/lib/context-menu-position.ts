/**
 * Keep a context menu fully inside the viewport by clamping its top-left
 * corner. Returns the clamped (x, y) in the same coordinate space as the inputs.
 */
export function clampMenuToViewport(
  desiredX: number,
  desiredY: number,
  menuWidth: number,
  menuHeight: number,
  viewportWidth: number,
  viewportHeight: number,
  padding = 8,
): { x: number; y: number } {
  const x = Math.max(
    padding,
    Math.min(desiredX, viewportWidth - menuWidth - padding),
  );
  const y = Math.max(
    padding,
    Math.min(desiredY, viewportHeight - menuHeight - padding),
  );
  return { x, y };
}
