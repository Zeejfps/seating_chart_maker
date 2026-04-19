<script lang="ts">
  import { untrack } from "svelte";
  import { getGuests, getTables, getState } from "../state.svelte";
  import { undo, redo, executeCommand } from "../command-history.svelte";
  import {
    AddGuestCommand,
    RemoveGuestCommand,
    RemoveTableCommand,
    BatchCommand,
  } from "../commands";
  import { detectMergeChanges } from "../csv";
  import type { ModalState } from "../types";
  import TitleBar from "./TitleBar.svelte";
  import SearchBar from "./SearchBar.svelte";
  import ActionsBar from "./ActionsBar.svelte";
  import StatsBar from "./StatsBar.svelte";
  import GuestPanel from "./GuestPanel.svelte";
  import AddTableBar from "./AddTableBar.svelte";
  import ViewControlsBar from "./ViewControlsBar.svelte";
  import FloorPlan from "./FloorPlan.svelte";
  import ModalHost from "./modals/ModalHost.svelte";
  import { getClipboard, setClipboard } from "../clipboard.svelte";
  import { showToast } from "../toast.svelte";
  import { pasteTableAt } from "../table-factory";
  import {
    leaveProject,
    saveCurrentProject,
  } from "../projects/projects.svelte";
  import {
    isTypingTarget,
    mod,
    runShortcuts,
    type Shortcut,
  } from "../keyboard/shortcuts";

  let selectedTableId: string | null = $state(null);
  let searchQuery = $state("");
  let searchInputEl: HTMLInputElement | undefined = $state();

  let hoveredTableId: string | null = $state(null);
  let canvasCursor: { x: number; y: number } | null = $state(null);
  let isCursorOverCanvas = $state(false);

  let modal: ModalState | null = $state(null);

  const SAVE_DEBOUNCE_MS = 300;
  let autosaveArmed = false;
  let saveTimer: ReturnType<typeof setTimeout> | null = null;

  function flushSave() {
    if (saveTimer === null) return;
    clearTimeout(saveTimer);
    saveTimer = null;
    saveCurrentProject(getState());
  }

  // Skip the initial load so opening a project doesn't bump updatedAt.
  // Debounced + untracked so the manifest write can't re-trigger this effect.
  $effect(() => {
    getState();
    if (!autosaveArmed) {
      autosaveArmed = true;
      return;
    }
    if (saveTimer !== null) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      saveTimer = null;
      untrack(() => saveCurrentProject(getState()));
    }, SAVE_DEBOUNCE_MS);
  });

  $effect(() => {
    const onPagehide = () => flushSave();
    window.addEventListener("pagehide", onPagehide);
    return () => {
      window.removeEventListener("pagehide", onPagehide);
      flushSave();
    };
  });

  function showModal(m: ModalState) {
    modal = m;
  }
  function closeModal() {
    modal = null;
  }

  function confirmDeleteTable() {
    if (modal?.type !== "delete-table") return;
    executeCommand(new RemoveTableCommand(modal.table));
    if (selectedTableId === modal.table.id) selectedTableId = null;
    closeModal();
  }

  function confirmDeleteGuest() {
    if (modal?.type !== "delete-guest") return;
    executeCommand(new RemoveGuestCommand(modal.guest));
    closeModal();
  }

  function addGuest(name: string) {
    return new AddGuestCommand({
      id: crypto.randomUUID(),
      name,
      tableId: null,
    });
  }

  function confirmCsvReplace() {
    if (modal?.type !== "csv-import") return;
    const cmds = [
      ...getGuests().map((g) => new RemoveGuestCommand(g)),
      ...modal.names.map(addGuest),
    ];
    if (cmds.length > 0) {
      executeCommand(new BatchCommand(cmds, "Replace guest list"));
    }
    closeModal();
  }

  function confirmCsvMerge() {
    if (modal?.type !== "csv-import") return;
    const { toAdd, toRemove } = detectMergeChanges(getGuests(), modal.names);
    const cmds = [
      ...toAdd.map(addGuest),
      ...toRemove.map((guest) => new RemoveGuestCommand(guest)),
    ];
    if (cmds.length > 0) {
      executeCommand(new BatchCommand(cmds, "Merge guest list"));
    }
    closeModal();
  }

  const shortcuts: Shortcut[] = [
    {
      match: (e) => e.key === "Escape",
      handler: () => {
        selectedTableId = null;
      },
    },
    {
      match: (e) =>
        (e.key === "Delete" || e.key === "Backspace") && !!selectedTableId,
      handler: () => {
        const table = getTables().find((t) => t.id === selectedTableId);
        if (table) showModal({ type: "delete-table", table });
      },
    },
    {
      match: (e) => mod(e) && e.key === "f",
      handler: (e) => {
        e.preventDefault();
        searchInputEl?.focus();
      },
    },
    {
      match: (e) => mod(e) && e.key === "c" && !e.shiftKey,
      handler: copyHoveredTable,
    },
    {
      match: (e) => mod(e) && e.key === "v" && !e.shiftKey,
      handler: pasteTableAtCursor,
    },
    {
      match: (e) => mod(e) && e.key === "z" && !e.shiftKey,
      handler: (e) => {
        e.preventDefault();
        undo();
      },
    },
    {
      match: (e) => mod(e) && (e.key === "y" || (e.shiftKey && e.key === "Z")),
      handler: (e) => {
        e.preventDefault();
        redo();
      },
    },
  ];

  function copyHoveredTable(e: KeyboardEvent): void | false {
    if (!hoveredTableId) return false;
    const table = getTables().find((t) => t.id === hoveredTableId);
    if (!table) return false;
    e.preventDefault();
    setClipboard({
      name: table.name,
      shape: table.shape,
      capacity: table.capacity,
      rotation: table.rotation,
    });
    showToast(`Table ${table.name} copied`);
  }

  function pasteTableAtCursor(e: KeyboardEvent): void | false {
    const clip = getClipboard();
    if (!clip || !isCursorOverCanvas || !canvasCursor) return false;
    e.preventDefault();
    pasteTableAt(clip, canvasCursor.x, canvasCursor.y);
  }

  function handleKeydown(e: KeyboardEvent) {
    if (isTypingTarget(e.target)) return;
    if (modal) return;
    runShortcuts(e, shortcuts);
  }

  function handleBack() {
    flushSave();
    leaveProject();
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<main class="canvas-root">
  <FloorPlan
    {selectedTableId}
    {searchQuery}
    onselecttable={(id) => (selectedTableId = id)}
    onshowmodal={showModal}
    onhoverchange={(id) => (hoveredTableId = id)}
    oncursorchange={(pos) => (canvasCursor = pos)}
    oncursoroverchange={(over) => (isCursorOverCanvas = over)}
  />
  <TitleBar onback={handleBack} />
  <SearchBar
    {searchQuery}
    bind:searchInputEl
    onsearch={(q) => (searchQuery = q)}
  />
  <ActionsBar />
  <GuestPanel {searchQuery} onshowmodal={showModal} />
  <AddTableBar />
  <StatsBar />
  <ViewControlsBar />
</main>

<ModalHost
  {modal}
  onclose={closeModal}
  onCsvReplace={confirmCsvReplace}
  onCsvMerge={confirmCsvMerge}
  onConfirmDeleteTable={confirmDeleteTable}
  onConfirmDeleteGuest={confirmDeleteGuest}
/>

<style>
  .canvas-root {
    position: relative;
    width: 100vw;
    height: 100svh;
    overflow: hidden;
  }
</style>
