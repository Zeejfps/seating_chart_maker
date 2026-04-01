import type { Guest } from "./types";

const HEADER_PATTERNS = /^(name|guest|first\s*last|full\s*name)$/i;

export function parseCsv(text: string): string[] {
  const lines = text.split(/\r?\n/);
  const names: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (!trimmed) continue;
    if (i === 0 && HEADER_PATTERNS.test(trimmed)) continue;
    names.push(trimmed);
  }

  return names;
}

export function detectMergeChanges(
  existing: Guest[],
  incoming: string[],
): {
  toAdd: string[];
  toRemove: Guest[];
  toKeep: Guest[];
} {
  const incomingSet = new Set(incoming.map((n) => n.toLowerCase()));
  const existingNameMap = new Map<string, Guest>();
  for (const g of existing) {
    existingNameMap.set(g.name.toLowerCase(), g);
  }

  const toAdd: string[] = [];
  const toKeep: Guest[] = [];
  const toRemove: Guest[] = [];

  for (const name of incoming) {
    const key = name.toLowerCase();
    const match = existingNameMap.get(key);
    if (match) {
      toKeep.push(match);
    } else {
      toAdd.push(name);
    }
  }

  for (const guest of existing) {
    if (!incomingSet.has(guest.name.toLowerCase())) {
      toRemove.push(guest);
    }
  }

  return { toAdd, toRemove, toKeep };
}
