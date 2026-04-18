import type { Table } from "./types";

export type TableClipboardSnapshot = Pick<
  Table,
  "name" | "shape" | "capacity" | "rotation"
>;

let clipboard: TableClipboardSnapshot | null = $state(null);

export function getClipboard(): TableClipboardSnapshot | null {
  return clipboard;
}

export function setClipboard(snapshot: TableClipboardSnapshot | null): void {
  clipboard = snapshot;
}
