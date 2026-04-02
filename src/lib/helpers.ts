/** Determine whether a table is over, at, or under capacity. */
export function getCapacityStatus(
  count: number,
  capacity: number,
): "over" | "at" | "under" {
  if (count > capacity) return "over";
  if (count === capacity) return "at";
  return "under";
}
