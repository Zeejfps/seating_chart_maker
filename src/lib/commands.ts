import type { Command, Guest, Table } from "./types";
import {
  updateGuest,
  addGuest,
  removeGuest,
  addTable,
  removeTable,
  updateTable,
  reorderGuests,
  getGuests,
} from "./state.svelte";

class TablePatchCommand implements Command {
  constructor(
    private tableId: string,
    private before: Partial<Table>,
    private after: Partial<Table>,
    public description: string,
  ) {}
  execute() {
    updateTable(this.tableId, this.after);
  }
  undo() {
    updateTable(this.tableId, this.before);
  }
}

class GuestPatchCommand implements Command {
  constructor(
    private guestId: string,
    private before: Partial<Guest>,
    private after: Partial<Guest>,
    public description: string,
  ) {}
  execute() {
    updateGuest(this.guestId, this.after);
  }
  undo() {
    updateGuest(this.guestId, this.before);
  }
}

export const assignGuest = (
  guestId: string,
  newTableId: string,
  prevTableId: string | null,
): Command =>
  new GuestPatchCommand(
    guestId,
    { tableId: prevTableId },
    { tableId: newTableId },
    "Assign guest to table",
  );

export const unassignGuest = (guestId: string, prevTableId: string): Command =>
  new GuestPatchCommand(
    guestId,
    { tableId: prevTableId },
    { tableId: null },
    "Unassign guest from table",
  );

export const renameGuest = (
  guestId: string,
  oldName: string,
  newName: string,
): Command =>
  new GuestPatchCommand(
    guestId,
    { name: oldName },
    { name: newName },
    "Rename guest",
  );

export const renameTable = (
  tableId: string,
  oldName: string,
  newName: string,
): Command =>
  new TablePatchCommand(
    tableId,
    { name: oldName },
    { name: newName },
    "Rename table",
  );

export const changeTableCapacity = (
  tableId: string,
  oldCapacity: number,
  newCapacity: number,
): Command =>
  new TablePatchCommand(
    tableId,
    { capacity: oldCapacity },
    { capacity: newCapacity },
    "Change table capacity",
  );

export const rotateTable = (
  tableId: string,
  oldRotation: number,
  newRotation: number,
): Command =>
  new TablePatchCommand(
    tableId,
    { rotation: oldRotation },
    { rotation: newRotation },
    "Rotate table",
  );

export const moveTable = (
  tableId: string,
  from: { x: number; y: number },
  to: { x: number; y: number },
): Command => new TablePatchCommand(tableId, from, to, "Move table");

export const reorderGuestsCommand = (
  newOrder: string[],
  oldOrder: string[],
): Command => ({
  description: "Reorder guests",
  execute: () => reorderGuests(newOrder),
  undo: () => reorderGuests(oldOrder),
});

export class AddGuestCommand implements Command {
  description = "Add guest";
  constructor(private guest: Guest) {}
  execute() {
    addGuest(this.guest);
  }
  undo() {
    removeGuest(this.guest.id);
  }
}

export class RemoveGuestCommand implements Command {
  description = "Remove guest";
  private snapshot: Guest;
  constructor(guest: Guest) {
    this.snapshot = { ...guest };
  }
  execute() {
    removeGuest(this.snapshot.id);
  }
  undo() {
    addGuest({ ...this.snapshot });
  }
}

export class AddTableCommand implements Command {
  description = "Add table";
  constructor(private table: Table) {}
  execute() {
    addTable(this.table);
  }
  undo() {
    removeTable(this.table.id);
  }
}

export class RemoveTableCommand implements Command {
  description = "Remove table";
  private tableSnapshot: Table;
  private displacedGuestIds: string[] = [];
  constructor(table: Table) {
    this.tableSnapshot = { ...table };
  }
  execute() {
    this.displacedGuestIds = getGuests()
      .filter((g) => g.tableId === this.tableSnapshot.id)
      .map((g) => g.id);
    for (const id of this.displacedGuestIds) {
      updateGuest(id, { tableId: null });
    }
    removeTable(this.tableSnapshot.id);
  }
  undo() {
    addTable({ ...this.tableSnapshot });
    for (const id of this.displacedGuestIds) {
      updateGuest(id, { tableId: this.tableSnapshot.id });
    }
  }
}

export class BatchCommand implements Command {
  description: string;
  constructor(
    private commands: Command[],
    description = "Batch operation",
  ) {
    this.description = description;
  }
  execute() {
    for (const cmd of this.commands) cmd.execute();
  }
  undo() {
    for (let i = this.commands.length - 1; i >= 0; i--) {
      this.commands[i].undo();
    }
  }
}
