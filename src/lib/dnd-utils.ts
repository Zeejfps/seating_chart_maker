import { getGuests } from "./state.svelte";
import { executeCommand } from "./command-history.svelte";
import { AssignGuestCommand, ReorderGuestsCommand } from "./commands";
import type { Guest } from "./types";

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
    executeCommand(
      new AssignGuestCommand(guestId, newTableId, original.tableId),
    );
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
    executeCommand(new ReorderGuestsCommand(newOrder, oldOrder));
  }
}
