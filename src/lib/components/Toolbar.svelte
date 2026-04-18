<script lang="ts">
  import { getTables, getGuests, getState, replaceAll } from "../state.svelte";
  import {
    getCanUndo,
    getCanRedo,
    undo,
    redo,
    clearHistory,
    executeCommand,
  } from "../command-history.svelte";
  import { exportSnapshot, importSnapshot, pickFile } from "../persistence";
  import { AddGuestCommand, BatchCommand } from "../commands";
  import { parseCsv } from "../csv";
  import type { ModalState } from "../types";

  interface Props {
    searchQuery: string;
    searchInputEl?: HTMLInputElement;
    onsearch: (query: string) => void;
    onshowmodal: (modal: ModalState) => void;
  }

  let {
    searchQuery,
    searchInputEl = $bindable(),
    onsearch,
    onshowmodal,
  }: Props = $props();

  function handleNew() {
    if (getGuests().length === 0 && getTables().length === 0) return;
    onshowmodal({ type: "new-project" });
  }

  function handleExport() {
    exportSnapshot(getState());
  }

  async function handleImport() {
    const file = await pickFile(".json,application/json");
    if (!file) return;
    try {
      const state = await importSnapshot(file);
      if (getGuests().length > 0 || getTables().length > 0) {
        onshowmodal({ type: "snapshot-import", state });
      } else {
        clearHistory();
        replaceAll(state);
      }
    } catch {
      onshowmodal({
        type: "error",
        message: "Invalid snapshot file. Please check the file format.",
      });
    }
  }

  async function handleCsvImport() {
    const file = await pickFile(".csv,text/csv");
    if (!file) return;
    const text = await file.text();
    const names = parseCsv(text);
    if (!names.length) return;

    if (getGuests().length === 0) {
      const cmds = names.map(
        (name: string) =>
          new AddGuestCommand({
            id: crypto.randomUUID(),
            name,
            tableId: null,
          }),
      );
      executeCommand(new BatchCommand(cmds, "Import guest list"));
    } else {
      onshowmodal({ type: "csv-import", names });
    }
  }
</script>

<div class="toolbar">
  <h1>Wedding Seating Chart</h1>

  <div class="toolbar-separator"></div>

  <input
    bind:this={searchInputEl}
    class="toolbar-search"
    type="search"
    placeholder="Search guests..."
    value={searchQuery}
    oninput={(e) => onsearch((e.target as HTMLInputElement).value)}
  />

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
    <button onclick={handleCsvImport}>Import Guests</button>
  </div>

  <div class="toolbar-separator"></div>

  <div class="toolbar-group">
    <button onclick={handleNew}>New</button>
    <button onclick={handleExport}>Save</button>
    <button onclick={handleImport}>Load</button>
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
  }

  .toolbar-group {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .toolbar-search {
    flex: 0 1 250px;
    font-size: 13px;
    padding: 5px 10px;
    margin-right: auto;
  }

  .toolbar-separator {
    width: 1px;
    height: 24px;
    background: var(--border);
    margin: 0 4px;
  }
</style>
