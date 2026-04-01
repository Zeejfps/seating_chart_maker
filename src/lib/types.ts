export interface Guest {
  id: string;
  name: string;
  tableId: string | null;
}

export interface Table {
  id: string;
  name: string;
  capacity: number;
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
