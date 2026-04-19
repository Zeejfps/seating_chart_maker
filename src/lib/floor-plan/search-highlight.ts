import type { Guest, Table } from "../types";

export function computeHighlightedTableIds(
  query: string,
  tables: Table[],
  guestsByTable: Map<string, Guest[]>,
): Set<string> {
  if (!query) return new Set();
  const q = query.toLowerCase();
  const ids = new Set<string>();
  for (const [tableId, guests] of guestsByTable) {
    if (guests.some((g) => g.name.toLowerCase().includes(q))) ids.add(tableId);
  }
  for (const t of tables) {
    if (t.name.toLowerCase().includes(q)) ids.add(t.id);
  }
  return ids;
}
