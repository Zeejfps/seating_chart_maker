import { safeRead, safeWrite } from "../safe-storage";

const STORAGE_KEY_PREFIX = "scm.guestpanel.section.";

export type GuestSection = "unassigned" | "assigned";

function defaultOpen(name: GuestSection): boolean {
  return name === "unassigned";
}

function loadOpen(name: GuestSection): boolean {
  const raw = safeRead(STORAGE_KEY_PREFIX + name);
  if (raw === null) return defaultOpen(name);
  return raw === "1";
}

const sectionOpen: Record<GuestSection, boolean> = $state({
  unassigned: loadOpen("unassigned"),
  assigned: loadOpen("assigned"),
});

export function getSectionOpen(name: GuestSection): boolean {
  return sectionOpen[name];
}

export function setSectionOpen(name: GuestSection, v: boolean): void {
  if (sectionOpen[name] === v) return;
  sectionOpen[name] = v;
  safeWrite(STORAGE_KEY_PREFIX + name, v ? "1" : "0");
}

export function toggleSectionOpen(name: GuestSection): void {
  setSectionOpen(name, !sectionOpen[name]);
}
