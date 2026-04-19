import type { Table } from "./types";
import {
  getRectWidth,
  getRowWidth,
  RECT_HEIGHT,
  RECT_CHAIR_OFFSET,
  SWEETHEART_WIDTH,
  SWEETHEART_HEIGHT,
  ROW_CHAIR_OFFSET,
  ROW_HEIGHT,
  ROW_HITBOX_HEIGHT,
  ROW_HITBOX_PAD_X,
  ROW_PADDING,
  ROW_SEAT_SPACING,
} from "./table-shapes";

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

export function chairPositionsForCircle(capacity: number): ChairPosition[] {
  const radius = 58;
  const centerX = 50;
  const centerY = 50;
  return Array.from({ length: capacity }, (_, i) => {
    const angle = (2 * Math.PI * i) / capacity - Math.PI / 2;
    const x = centerX + Math.cos(angle) * radius;
    const y = centerY + Math.sin(angle) * radius;
    return { x, y, labelX: x, labelY: y };
  });
}

export function chairPositionsForRectangle(capacity: number): ChairPosition[] {
  const width = getRectWidth(capacity);
  const topSeats = Math.ceil(capacity / 2);
  const bottomSeats = Math.floor(capacity / 2);
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

export function chairPositionsForSweetheart(): ChairPosition[] {
  const y = SWEETHEART_HEIGHT + RECT_CHAIR_OFFSET;
  return [0, 1].map((i) => {
    const x = ((i + 0.5) / 2) * SWEETHEART_WIDTH;
    return { x, y, labelX: x, labelY: y + 12 };
  });
}

export function chairPositionsForRow(capacity: number): ChairPosition[] {
  const barTop = (ROW_HITBOX_HEIGHT - ROW_HEIGHT) / 2;
  const chairY = barTop + ROW_HEIGHT + ROW_CHAIR_OFFSET;
  const labelY = chairY + 20;
  return Array.from({ length: capacity }, (_, i) => {
    const x = ROW_HITBOX_PAD_X + ROW_PADDING / 2 + (i + 0.5) * ROW_SEAT_SPACING;
    return { x, y: chairY, labelX: x, labelY };
  });
}

export function chairPositionsFor(table: Table): ChairPosition[] {
  switch (table.shape) {
    case "round":
      return chairPositionsForCircle(table.capacity);
    case "rectangle":
      return chairPositionsForRectangle(table.capacity);
    case "sweetheart":
      return chairPositionsForSweetheart();
    case "row":
      return chairPositionsForRow(table.capacity);
  }
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

export function getTableLayout(table: Table): TableLayout {
  switch (table.shape) {
    case "round": {
      const size = 100;
      return {
        width: size,
        height: size,
        bodyLeft: 0,
        bodyTop: 0,
        bodyWidth: size,
        bodyHeight: size,
        bodyRadius: size / 2,
        infoLeft: size / 2,
        infoTop: size / 2,
        infoMode: "inside-body",
        rotation: 0,
      };
    }
    case "rectangle": {
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
    case "sweetheart": {
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
    case "row": {
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
  }
}
