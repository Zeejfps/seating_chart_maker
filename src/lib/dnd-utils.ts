import { getGuests } from "./state.svelte";
import { executeCommand } from "./command-history.svelte";
import {
  assignGuest,
  BatchCommand,
  reorderGuestsCommand,
  unassignGuest,
} from "./commands";
import type { Command, Guest } from "./types";

/** Style a dragged guest element as a compact pill. */
export function transformDraggedElement(el?: HTMLElement): void {
  if (!el) return;
  el.querySelector(".grip-handle")?.remove();
  el.querySelector(".remove-btn")?.remove();
  el.style.borderRadius = "20px";
  el.style.background = "var(--accent-bg)";
  el.style.border = "1.5px solid var(--accent-border)";
  el.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)";
  el.style.justifyContent = "center";
  el.style.padding = "0 14px";
  el.style.color = "var(--text-h)";
  el.style.fontWeight = "500";
}

/** Assign a guest to a table if their current assignment differs. Returns true if a command was executed. */
export function assignGuestIfChanged(
  guestId: string,
  newTableId: string,
): boolean {
  const original = getGuests().find((g) => g.id === guestId);
  if (original && original.tableId !== newTableId) {
    executeCommand(assignGuest(guestId, newTableId, original.tableId));
    return true;
  }
  return false;
}

/** If the order of guest IDs changed between newItems and oldItems, execute a ReorderGuestsCommand. */
export function reorderIfChanged(newItems: Guest[], oldItems: Guest[]): void {
  const newOrder = newItems.map((g) => g.id);
  const oldOrder = oldItems.map((g) => g.id);
  const changed = newOrder.some((id, i) => id !== oldOrder[i]);
  if (changed) {
    executeCommand(reorderGuestsCommand(newOrder, oldOrder));
  }
}

/** Shared DnD options for guest dropzones inside the guest panel and tables. */
export const sharedGuestDndOpts = {
  type: "guest",
  centreDraggedOnCursor: false,
  useCursorForDetection: true,
  flipDurationMs: 150,
  morphDisabled: true,
  transformDraggedElement,
  dropTargetStyle: {
    outline: "2px solid rgba(170, 59, 255, 0.5)",
    "background-color": "rgba(170, 59, 255, 0.05)",
  },
};

/** For guests dropped into an unassigned zone: unassign any that were previously
    seated. Returns the number of unassignments performed. */
export function unassignGuestsFromDnd(newItems: Guest[]): number {
  const byId = new Map(getGuests().map((g) => [g.id, g]));
  const cmds: Command[] = [];
  for (const item of newItems) {
    const original = byId.get(item.id);
    if (original && original.tableId !== null) {
      cmds.push(unassignGuest(original.id, original.tableId));
    }
  }
  if (cmds.length === 1) {
    executeCommand(cmds[0]);
  } else if (cmds.length > 1) {
    executeCommand(new BatchCommand(cmds, "Unassign guests"));
  }
  return cmds.length;
}
