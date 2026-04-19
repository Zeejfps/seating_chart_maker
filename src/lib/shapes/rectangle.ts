import type { Table } from "../types";
import type {
  ChairPosition,
  HalfSize,
  ShapeModule,
  TableLayout,
} from "./types";
import { HITBOX_PAD, rotatedHalf } from "./shared";

export const RECT_HEIGHT = 50;
export const RECT_SEAT_SPACING = 30;
export const RECT_MIN_WIDTH = 120;
export const RECT_CHAIR_OFFSET = 18;

export function getRectWidth(capacity: number): number {
  const seatsPerSide = Math.ceil(capacity / 2);
  return Math.max(RECT_MIN_WIDTH, seatsPerSide * RECT_SEAT_SPACING);
}

function chairPositions(table: Table): ChairPosition[] {
  const width = getRectWidth(table.capacity);
  const topSeats = Math.ceil(table.capacity / 2);
  const bottomSeats = Math.floor(table.capacity / 2);
  const topY = -RECT_CHAIR_OFFSET;
  const bottomY = RECT_HEIGHT + RECT_CHAIR_OFFSET;
  const top: ChairPosition[] = Array.from({ length: topSeats }, (_, i) => {
    const x = ((i + 0.5) / topSeats) * width;
    return { x, y: topY, labelX: x, labelY: topY };
  });
  const bottom: ChairPosition[] = Array.from(
    { length: bottomSeats },
    (_, i) => {
      const x = ((i + 0.5) / bottomSeats) * width;
      return { x, y: bottomY, labelX: x, labelY: bottomY + 12 };
    },
  );
  return [...top, ...bottom];
}

function layout(table: Table): TableLayout {
  const w = getRectWidth(table.capacity);
  return {
    width: w,
    height: RECT_HEIGHT,
    bodyLeft: 0,
    bodyTop: 0,
    bodyWidth: w,
    bodyHeight: RECT_HEIGHT,
    bodyRadius: 6,
    infoLeft: w / 2,
    infoTop: RECT_HEIGHT / 2,
    infoMode: "inside-body",
    rotation: table.rotation,
  };
}

function halfSize(table: Table): HalfSize {
  return rotatedHalf(
    getRectWidth(table.capacity) / 2 + HITBOX_PAD,
    RECT_HEIGHT / 2 + HITBOX_PAD,
    table.rotation,
  );
}

export const rectangle: ShapeModule = { chairPositions, layout, halfSize };
