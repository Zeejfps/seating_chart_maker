import { untrack } from "svelte";
import { getState } from "./state.svelte";
import { saveCurrentProject } from "./projects/projects.svelte";

const SAVE_DEBOUNCE_MS = 300;

export interface AutosaveHandle {
  flushSave(): void;
}

export function useAutosave(): AutosaveHandle {
  let seenInitialLoad = false;
  let timer: ReturnType<typeof setTimeout> | null = null;

  function flushSave() {
    if (timer === null) return;
    clearTimeout(timer);
    timer = null;
    saveCurrentProject(getState());
  }

  // Skip the initial load so opening a project doesn't bump updatedAt.
  // Debounced + untracked so the manifest write can't re-trigger this effect.
  $effect(() => {
    getState();
    if (!seenInitialLoad) {
      seenInitialLoad = true;
      return;
    }
    if (timer !== null) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      untrack(() => saveCurrentProject(getState()));
    }, SAVE_DEBOUNCE_MS);
  });

  $effect(() => {
    window.addEventListener("pagehide", flushSave);
    return () => {
      window.removeEventListener("pagehide", flushSave);
      flushSave();
    };
  });

  return { flushSave };
}
