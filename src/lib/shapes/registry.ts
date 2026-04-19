import type { Table, TableShape } from "../types";
import type {
  ChairPosition,
  HalfSize,
  ShapeModule,
  TableLayout,
} from "./types";
import { round } from "./round";
import { rectangle } from "./rectangle";
import { sweetheart } from "./sweetheart";
import { row } from "./row";

export const SHAPE_REGISTRY: Record<TableShape, ShapeModule> = {
  round,
  rectangle,
  sweetheart,
  row,
};

export function chairPositionsFor(table: Table): ChairPosition[] {
  return SHAPE_REGISTRY[table.shape].chairPositions(table);
}

export function getTableLayout(table: Table): TableLayout {
  return SHAPE_REGISTRY[table.shape].layout(table);
}

export function getTableHalfSize(table: Table): HalfSize {
  return SHAPE_REGISTRY[table.shape].halfSize(table);
}
