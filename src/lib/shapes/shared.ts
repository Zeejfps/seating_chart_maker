import type { HalfSize } from "./types";

export const HITBOX_PAD = 20;

export function isSideways(rotation: number): boolean {
  return rotation === 90 || rotation === 270;
}

export function rotatedHalf(
  halfW: number,
  halfH: number,
  rotation: number,
): HalfSize {
  return isSideways(rotation)
    ? { halfW: halfH, halfH: halfW }
    : { halfW, halfH };
}
