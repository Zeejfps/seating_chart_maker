<script lang="ts">
  import { getTables, getGuests, getState, replaceAll } from "../state.svelte";
  import {
    getCanUndo,
    getCanRedo,
    undo,
    redo,
    clearHistory,
  } from "../command-history.svelte";
  import {
    exportSnapshot,
    importSnapshot,
    exportGuestListCsv,
    pickFile,
  } from "../persistence";

  interface Props {
    onshowmodal: (type: string, data?: unknown) => void;
  }

  let { onshowmodal }: Props = $props();

  let showExportMenu = $state(false);
  let showImportMenu = $state(false);

  function handleExportSnapshot() {
    exportSnapshot(getState());
    showExportMenu = false;
  }

  function handleExportCsv() {
    exportGuestListCsv(getGuests(), getTables());
    showExportMenu = false;
  }

  async function handleImportSnapshot() {
    showImportMenu = false;
    const file = await pickFile(".json,application/json");
    if (!file) return;
    try {
      const state = await importSnapshot(file);
      if (getGuests().length > 0 || getTables().length > 0) {
        onshowmodal("snapshot-import", state);
      } else {
        clearHistory();
        replaceAll(state);
      }
    } catch {
      onshowmodal(
        "error",
        "Invalid snapshot file. Please check the file format.",
      );
    }
  }

  function handleClickOutside() {
    showExportMenu = false;
    showImportMenu = false;
  }
</script>

<svelte:window onclick={handleClickOutside} />

<div class="toolbar">
  <h1>Wedding Seating Chart</h1>

  <div class="toolbar-group">
    <button onclick={undo} disabled={!getCanUndo()} title="Undo (Ctrl+Z)"
      >Undo</button
    >
    <button onclick={redo} disabled={!getCanRedo()} title="Redo (Ctrl+Y)"
      >Redo</button
    >
  </div>

  <div class="toolbar-separator"></div>

  <div class="toolbar-group">
    <div class="dropdown-wrap">
      <button
        onclick={(e) => {
          e.stopPropagation();
          showExportMenu = !showExportMenu;
          showImportMenu = false;
        }}>Export</button
      >
      {#if showExportMenu}
        <div class="dropdown-menu" role="menu">
          <button onclick={handleExportSnapshot}>JSON Snapshot</button>
          <button onclick={handleExportCsv}>Guest List CSV</button>
        </div>
      {/if}
    </div>
    <div class="dropdown-wrap">
      <button
        onclick={(e) => {
          e.stopPropagation();
          showImportMenu = !showImportMenu;
          showExportMenu = false;
        }}>Import</button
      >
      {#if showImportMenu}
        <div class="dropdown-menu" role="menu">
          <button onclick={handleImportSnapshot}>JSON Snapshot</button>
        </div>
      {/if}
    </div>
  </div>
</div>

<style>
  .toolbar {
    grid-area: toolbar;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 16px;
    border-bottom: 1px solid var(--border);
    flex-wrap: wrap;
  }

  .toolbar h1 {
    font-size: 18px;
    margin-right: auto;
  }

  .toolbar-group {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .toolbar-separator {
    width: 1px;
    height: 24px;
    background: var(--border);
    margin: 0 4px;
  }

  .dropdown-wrap {
    position: relative;
  }

  .dropdown-menu {
    position: absolute;
    top: 100%;
    right: 0;
    margin-top: 4px;
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 4px;
    min-width: 180px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
    z-index: 50;
  }

  .dropdown-menu button {
    display: block;
    width: 100%;
    text-align: left;
    border: none;
    border-radius: 4px;
    padding: 6px 10px;
    font-size: 13px;
  }

  .dropdown-menu button:hover {
    background: var(--accent-bg);
  }
</style>
