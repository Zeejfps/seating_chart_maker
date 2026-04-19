import type { Table } from "../types";
import type {
  ChairPosition,
  HalfSize,
  ShapeModule,
  TableLayout,
} from "./types";

export const ROW_SEAT_SPACING = 30;
export const ROW_HEIGHT = 6;
export const ROW_PADDING = 10;
export const ROW_CHAIR_OFFSET = 14;
const ROW_CHAIR_SIZE = 12;
export const ROW_HITBOX_PAD_X = 6;
export const ROW_HITBOX_HEIGHT =
  (ROW_CHAIR_OFFSET + ROW_CHAIR_SIZE) * 2 + ROW_HEIGHT;

export function getRowWidth(capacity: number): number {
  return capacity * ROW_SEAT_SPACING + ROW_PADDING;
}

function chairPositions(table: Table): ChairPosition[] {
  const barTop = (ROW_HITBOX_HEIGHT - ROW_HEIGHT) / 2;
  const chairY = barTop + ROW_HEIGHT + ROW_CHAIR_OFFSET;
  const labelY = chairY + 20;
  return Array.from({ length: table.capacity }, (_, i) => {
    const x = ROW_HITBOX_PAD_X + ROW_PADDING / 2 + (i + 0.5) * ROW_SEAT_SPACING;
    return { x, y: chairY, labelX: x, labelY };
  });
}

function layout(table: Table): TableLayout {
  const barWidth = getRowWidth(table.capacity);
  const wrapperWidth = barWidth + 2 * ROW_HITBOX_PAD_X;
  const barTop = (ROW_HITBOX_HEIGHT - ROW_HEIGHT) / 2;
  return {
    width: wrapperWidth,
    height: ROW_HITBOX_HEIGHT,
    bodyLeft: ROW_HITBOX_PAD_X,
    bodyTop: barTop,
    bodyWidth: barWidth,
    bodyHeight: ROW_HEIGHT,
    bodyRadius: 3,
    infoLeft: wrapperWidth / 2,
    infoTop: barTop - 24,
    infoMode: "above-body",
    rotation: table.rotation,
  };
}

function halfSize(): HalfSize {
  return { halfW: 70, halfH: 70 };
}

export const row: ShapeModule = { chairPositions, layout, halfSize };
