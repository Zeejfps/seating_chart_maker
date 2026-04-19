<script lang="ts">
  import { getTables } from "../state.svelte";
  import { undo, redo } from "../command-history.svelte";
  import type { ModalState, Table } from "../types";
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
  import { leaveProject } from "../projects/projects.svelte";
  import { isTypingTarget, runShortcuts } from "../keyboard/shortcuts";
  import { buildEditorShortcuts } from "../keyboard/editor-shortcuts";
  import { useAutosave } from "../autosave.svelte";
  import {
    deleteGuest,
    deleteTable,
    mergeGuestsFromCsv,
    replaceGuestsFromCsv,
  } from "../modal-commands";

  let selectedTableId: string | null = $state(null);
  let searchQuery = $state("");
  let searchInputEl: HTMLInputElement | undefined = $state();

  let hoveredTableId: string | null = $state(null);
  let canvasCursor: { x: number; y: number } | null = $state(null);
  let isCursorOverCanvas = $state(false);

  let modal: ModalState | null = $state(null);

  const autosave = useAutosave();

  function showModal(m: ModalState) {
    modal = m;
  }
  function closeModal() {
    modal = null;
  }

  function handleConfirmDeleteTable(table: Table) {
    deleteTable(table);
    if (selectedTableId === table.id) selectedTableId = null;
    closeModal();
  }

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

  function deleteSelectedTable() {
    const table = getTables().find((t) => t.id === selectedTableId);
    if (table) showModal({ type: "delete-table", table });
  }

  const shortcuts = buildEditorShortcuts({
    clearSelection: () => (selectedTableId = null),
    deleteSelected: deleteSelectedTable,
    focusSearch: () => searchInputEl?.focus(),
    copyHovered: copyHoveredTable,
    pasteAtCursor: pasteTableAtCursor,
    undo,
    redo,
    hasSelection: () => !!selectedTableId,
  });

  function handleKeydown(e: KeyboardEvent) {
    if (isTypingTarget(e.target)) return;
    if (modal) return;
    runShortcuts(e, shortcuts);
  }

  function handleBack() {
    autosave.flushSave();
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
  onCsvReplace={(names) => {
    replaceGuestsFromCsv(names);
    closeModal();
  }}
  onCsvMerge={(names) => {
    mergeGuestsFromCsv(names);
    closeModal();
  }}
  onConfirmDeleteTable={handleConfirmDeleteTable}
  onConfirmDeleteGuest={(guest) => {
    deleteGuest(guest);
    closeModal();
  }}
/>

<style>
  .canvas-root {
    position: relative;
    width: 100vw;
    height: 100svh;
    overflow: hidden;
  }
</style>
