import { TRIGGERS } from "svelte-dnd-action";
import type { Guest } from "../types";
import { getGuestsByTable, getTables, setDndActive } from "../state.svelte";
import { assignGuestIfChanged } from "../dnd-utils";
import { buildDndItemsByTable, filterShadowItems } from "./dnd-items";

export interface TableDndState {
  readonly itemsByTable: Map<string, Guest[]>;
  readonly draggingTable: string | null;
  onConsider(tableId: string, e: CustomEvent): void;
  onFinalize(tableId: string, e: CustomEvent): void;
}

export function useTableDndState(): TableDndState {
  let itemsByTable: Map<string, Guest[]> = $state(new Map());
  let draggingTable: string | null = $state(null);

  $effect(() => {
    if (draggingTable) return;
    itemsByTable = buildDndItemsByTable(getTables(), getGuestsByTable());
  });

  function onConsider(tableId: string, e: CustomEvent) {
    const trigger = e.detail.info.trigger;
    if (trigger === TRIGGERS.DRAGGED_ENTERED) {
      draggingTable = tableId;
    } else if (
      trigger === TRIGGERS.DRAGGED_LEFT ||
      trigger === TRIGGERS.DRAGGED_LEFT_ALL
    ) {
      if (draggingTable === tableId) draggingTable = null;
    }
    setDndActive(true);
    const items = filterShadowItems(e.detail.items, e.detail.info.id ?? null);
    itemsByTable = new Map(itemsByTable).set(tableId, items);
  }

  function onFinalize(tableId: string, e: CustomEvent) {
    draggingTable = null;
    setDndActive(false);
    const newItems: Guest[] = e.detail.items;
    for (const item of newItems) assignGuestIfChanged(item.id, tableId);
    itemsByTable = new Map(itemsByTable).set(tableId, newItems);
  }

  return {
    get itemsByTable() {
      return itemsByTable;
    },
    get draggingTable() {
      return draggingTable;
    },
    onConsider,
    onFinalize,
  };
}
