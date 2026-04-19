import type { Table } from "../types";

export interface ChairPosition {
  /** px from the hitbox left edge */
  x: number;
  /** px from the hitbox top edge */
  y: number;
  /** px from hitbox left edge where the label anchor sits */
  labelX: number;
  /** px from hitbox top edge where the label anchor sits */
  labelY: number;
}

export interface TableLayout {
  /** full hitbox width (used for negative-margin centering) */
  width: number;
  /** full hitbox height */
  height: number;
  /** body visual dims, relative to hitbox */
  bodyLeft: number;
  bodyTop: number;
  bodyWidth: number;
  bodyHeight: number;
  /** radius of body border */
  bodyRadius: number;
  /** where the info (name + capacity) sits, relative to hitbox */
  infoLeft: number;
  infoTop: number;
  /** whether info is positioned absolutely above the body (row) or centered in body */
  infoMode: "inside-body" | "above-body";
  /** rotation applied to the whole table (0 for circle) */
  rotation: number;
}

export interface HalfSize {
  halfW: number;
  halfH: number;
}

export interface ShapeModule {
  chairPositions(table: Table): ChairPosition[];
  layout(table: Table): TableLayout;
  halfSize(table: Table): HalfSize;
}
