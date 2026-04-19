import type { Table } from "../types";
import type {
  ChairPosition,
  HalfSize,
  ShapeModule,
  TableLayout,
} from "./types";

const SIZE = 100;
const CHAIR_RADIUS = 58;
const CENTER = SIZE / 2;

function chairPositions(table: Table): ChairPosition[] {
  return Array.from({ length: table.capacity }, (_, i) => {
    const angle = (2 * Math.PI * i) / table.capacity - Math.PI / 2;
    const x = CENTER + Math.cos(angle) * CHAIR_RADIUS;
    const y = CENTER + Math.sin(angle) * CHAIR_RADIUS;
    return { x, y, labelX: x, labelY: y };
  });
}

function layout(): TableLayout {
  return {
    width: SIZE,
    height: SIZE,
    bodyLeft: 0,
    bodyTop: 0,
    bodyWidth: SIZE,
    bodyHeight: SIZE,
    bodyRadius: SIZE / 2,
    infoLeft: CENTER,
    infoTop: CENTER,
    infoMode: "inside-body",
    rotation: 0,
  };
}

function halfSize(): HalfSize {
  return { halfW: 70, halfH: 70 };
}

export const round: ShapeModule = { chairPositions, layout, halfSize };
