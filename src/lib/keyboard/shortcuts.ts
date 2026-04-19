export interface Shortcut {
  /** True when the event matches this shortcut. */
  match: (e: KeyboardEvent) => boolean;
  /** The action to run. Return false to allow subsequent shortcuts to match. */
  handler: (e: KeyboardEvent) => void | false;
}

/** Returns whether the user is typing into an editable surface. */
export function isTypingTarget(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    (target instanceof HTMLElement && target.isContentEditable)
  );
}

/** Convenience for Ctrl/Cmd modifier. */
export const mod = (e: KeyboardEvent): boolean => e.ctrlKey || e.metaKey;

/** Run the first matching shortcut. */
export function runShortcuts(e: KeyboardEvent, shortcuts: Shortcut[]): void {
  for (const s of shortcuts) {
    if (s.match(e)) {
      if (s.handler(e) === false) continue;
      return;
    }
  }
}
