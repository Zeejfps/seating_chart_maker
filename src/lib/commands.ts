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

export class AssignGuestCommand implements Command {
  description = "Assign guest to table";
  constructor(
    private guestId: string,
    private tableId: string,
    private prevTableId: string | null,
  ) {}
  execute() {
    updateGuest(this.guestId, { tableId: this.tableId });
  }
  undo() {
    updateGuest(this.guestId, { tableId: this.prevTableId });
  }
}

export class UnassignGuestCommand implements Command {
  description = "Unassign guest from table";
  constructor(
    private guestId: string,
    private prevTableId: string,
  ) {}
  execute() {
    updateGuest(this.guestId, { tableId: null });
  }
  undo() {
    updateGuest(this.guestId, { tableId: this.prevTableId });
  }
}

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

export class RenameGuestCommand implements Command {
  description = "Rename guest";
  constructor(
    private guestId: string,
    private oldName: string,
    private newName: string,
  ) {}
  execute() {
    updateGuest(this.guestId, { name: this.newName });
  }
  undo() {
    updateGuest(this.guestId, { name: this.oldName });
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
  private displacedGuests: { id: string; tableId: string }[] = [];
  constructor(table: Table) {
    this.tableSnapshot = { ...table };
  }
  execute() {
    this.displacedGuests = getGuests()
      .filter((g) => g.tableId === this.tableSnapshot.id)
      .map((g) => ({ id: g.id, tableId: this.tableSnapshot.id }));
    for (const g of this.displacedGuests) {
      updateGuest(g.id, { tableId: null });
    }
    removeTable(this.tableSnapshot.id);
  }
  undo() {
    addTable({ ...this.tableSnapshot });
    for (const g of this.displacedGuests) {
      updateGuest(g.id, { tableId: g.tableId });
    }
  }
}

export class RenameTableCommand implements Command {
  description = "Rename table";
  constructor(
    private tableId: string,
    private oldName: string,
    private newName: string,
  ) {}
  execute() {
    updateTable(this.tableId, { name: this.newName });
  }
  undo() {
    updateTable(this.tableId, { name: this.oldName });
  }
}

export class ChangeTableCapacityCommand implements Command {
  description = "Change table capacity";
  constructor(
    private tableId: string,
    private oldCapacity: number,
    private newCapacity: number,
  ) {}
  execute() {
    updateTable(this.tableId, { capacity: this.newCapacity });
  }
  undo() {
    updateTable(this.tableId, { capacity: this.oldCapacity });
  }
}

export class ReorderGuestsCommand implements Command {
  description = "Reorder guests";
  constructor(
    private newOrder: string[],
    private oldOrder: string[],
  ) {}
  execute() {
    reorderGuests(this.newOrder);
  }
  undo() {
    reorderGuests(this.oldOrder);
  }
}

export class MoveTableCommand implements Command {
  description = "Move table";
  constructor(
    private tableId: string,
    private oldX: number,
    private oldY: number,
    private newX: number,
    private newY: number,
  ) {}
  execute() {
    updateTable(this.tableId, { x: this.newX, y: this.newY });
  }
  undo() {
    updateTable(this.tableId, { x: this.oldX, y: this.oldY });
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
    for (const cmd of this.commands) {
      cmd.execute();
    }
  }
  undo() {
    for (let i = this.commands.length - 1; i >= 0; i--) {
      this.commands[i].undo();
    }
  }
}
