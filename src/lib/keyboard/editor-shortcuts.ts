import { mod, type Shortcut } from "./shortcuts";

export interface EditorShortcutHandlers {
  clearSelection: () => void;
  deleteSelected: () => void;
  focusSearch: () => void;
  copyHovered: (e: KeyboardEvent) => void | false;
  pasteAtCursor: (e: KeyboardEvent) => void | false;
  undo: () => void;
  redo: () => void;
  hasSelection: () => boolean;
}

export function buildEditorShortcuts(h: EditorShortcutHandlers): Shortcut[] {
  return [
    {
      match: (e) => e.key === "Escape",
      handler: () => h.clearSelection(),
    },
    {
      match: (e) =>
        (e.key === "Delete" || e.key === "Backspace") && h.hasSelection(),
      handler: () => h.deleteSelected(),
    },
    {
      match: (e) => mod(e) && e.key === "f",
      handler: (e) => {
        e.preventDefault();
        h.focusSearch();
      },
    },
    {
      match: (e) => mod(e) && e.key === "c" && !e.shiftKey,
      handler: h.copyHovered,
    },
    {
      match: (e) => mod(e) && e.key === "v" && !e.shiftKey,
      handler: h.pasteAtCursor,
    },
    {
      match: (e) => mod(e) && e.key === "z" && !e.shiftKey,
      handler: (e) => {
        e.preventDefault();
        h.undo();
      },
    },
    {
      match: (e) => mod(e) && (e.key === "y" || (e.shiftKey && e.key === "Z")),
      handler: (e) => {
        e.preventDefault();
        h.redo();
      },
    },
  ];
}
