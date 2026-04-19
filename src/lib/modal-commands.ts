import type { Guest, Table } from "./types";
import { getGuests } from "./state.svelte";
import { executeCommand } from "./command-history.svelte";
import {
  AddGuestCommand,
  BatchCommand,
  RemoveGuestCommand,
  RemoveTableCommand,
} from "./commands";
import { detectMergeChanges } from "./csv";

export function deleteTable(table: Table): void {
  executeCommand(new RemoveTableCommand(table));
}

export function deleteGuest(guest: Guest): void {
  executeCommand(new RemoveGuestCommand(guest));
}

export function replaceGuestsFromCsv(names: string[]): void {
  const commands = [
    ...getGuests().map((g) => new RemoveGuestCommand(g)),
    ...names.map(addGuestCommand),
  ];
  if (commands.length === 0) return;
  executeCommand(new BatchCommand(commands, "Replace guest list"));
}

export function mergeGuestsFromCsv(names: string[]): void {
  const { toAdd, toRemove } = detectMergeChanges(getGuests(), names);
  const commands = [
    ...toAdd.map(addGuestCommand),
    ...toRemove.map((g) => new RemoveGuestCommand(g)),
  ];
  if (commands.length === 0) return;
  executeCommand(new BatchCommand(commands, "Merge guest list"));
}

function addGuestCommand(name: string): AddGuestCommand {
  return new AddGuestCommand({ id: crypto.randomUUID(), name, tableId: null });
}
