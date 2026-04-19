import type { Table } from "../types";
import type {
  ChairPosition,
  HalfSize,
  ShapeModule,
  TableLayout,
} from "./types";
import { HITBOX_PAD, rotatedHalf } from "./shared";
import { RECT_CHAIR_OFFSET } from "./rectangle";

export const SWEETHEART_WIDTH = 80;
export const SWEETHEART_HEIGHT = 50;

function chairPositions(): ChairPosition[] {
  const y = SWEETHEART_HEIGHT + RECT_CHAIR_OFFSET;
  return [0, 1].map((i) => {
    const x = ((i + 0.5) / 2) * SWEETHEART_WIDTH;
    return { x, y, labelX: x, labelY: y + 12 };
  });
}

function layout(table: Table): TableLayout {
  return {
    width: SWEETHEART_WIDTH,
    height: SWEETHEART_HEIGHT,
    bodyLeft: 0,
    bodyTop: 0,
    bodyWidth: SWEETHEART_WIDTH,
    bodyHeight: SWEETHEART_HEIGHT,
    bodyRadius: 10,
    infoLeft: SWEETHEART_WIDTH / 2,
    infoTop: SWEETHEART_HEIGHT / 2,
    infoMode: "inside-body",
    rotation: table.rotation,
  };
}

function halfSize(table: Table): HalfSize {
  return rotatedHalf(
    SWEETHEART_WIDTH / 2 + HITBOX_PAD,
    SWEETHEART_HEIGHT / 2 + HITBOX_PAD,
    table.rotation,
  );
}

export const sweetheart: ShapeModule = { chairPositions, layout, halfSize };
