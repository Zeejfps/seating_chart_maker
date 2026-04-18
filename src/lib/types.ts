export interface Guest {
  id: string;
  name: string;
  tableId: string | null;
}

export type TableShape = "round" | "rectangle" | "sweetheart" | "row";

export interface Table {
  id: string;
  name: string;
  shape: TableShape;
  capacity: number;
  rotation: number;
  x: number;
  y: number;
}

export interface ChartState {
  guests: Guest[];
  tables: Table[];
}

export interface Command {
  execute(): void;
  undo(): void;
  description: string;
}

export interface Snapshot {
  version: 1;
  guests: Guest[];
  tables: Table[];
}

export type ModalState =
  | { type: "delete-table"; table: Table }
  | { type: "delete-guest"; guest: Guest }
  | { type: "csv-import"; names: string[] }
  | { type: "snapshot-import"; state: ChartState }
  | { type: "error"; message: string };
