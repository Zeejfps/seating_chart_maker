import type { Guest, Table } from "../types";

type MaybeShadow = Guest & { isDndShadowItem?: boolean };

/** Build a fresh per-table copy of guest lists. Each guest is shallow-cloned
 *  so local dnd mutations don't touch global state. */
export function buildDndItemsByTable(
  tables: Table[],
  guestsByTable: Map<string, Guest[]>,
): Map<string, Guest[]> {
  const map = new Map<string, Guest[]>();
  for (const t of tables) {
    const guests = guestsByTable.get(t.id) ?? [];
    map.set(
      t.id,
      guests.map((g) => ({ ...g })),
    );
  }
  return map;
}

/** During a DnD "consider" event svelte-dnd-action may emit both the original
 *  dragged item and its shadow placeholder. Drop the original so only the
 *  shadow is visible in the target list. */
export function filterShadowItems(
  items: Guest[],
  draggedId: string | null,
): Guest[] {
  if (!draggedId) return items;
  const hasShadow = (items as MaybeShadow[]).some((i) => i.isDndShadowItem);
  if (!hasShadow) return items;
  return (items as MaybeShadow[]).filter(
    (i) => i.id !== draggedId || i.isDndShadowItem,
  );
}
