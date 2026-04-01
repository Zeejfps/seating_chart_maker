<script lang="ts">
  import { getTables, getGuests, getState, replaceAll, getNextTableNum } from "../state.svelte";
  import {
    getCanUndo,
    getCanRedo,
    undo,
    redo,
    executeCommand,
    clearHistory,
  } from "../command-history.svelte";
  import { AddTableCommand, BatchCommand } from "../commands";
  import {
    exportSnapshot,
    importSnapshot,
    exportGuestListCsv,
  } from "../persistence";

  interface Props {
    onshowmodal: (type: string, data?: unknown) => void;
  }

  let { onshowmodal }: Props = $props();

  let bulkCount = $state(8);
  let showExportMenu = $state(false);
  let showImportMenu = $state(false);

  function handleBulkCreate() {
    if (bulkCount < 1) return;
    const cmds = [];
    const startNum = getNextTableNum();
    const SPACING = 150;
    const GRID = 50;
    const COLS = Math.floor(3000 / SPACING);
    const occupied = new Set(getTables().map((t) => `${t.x},${t.y}`));
    let slot = 0;
    for (let i = 0; i < bulkCount; i++) {
      let x: number, y: number;
      while (true) {
        x = Math.round(((slot % COLS) * SPACING + 100) / GRID) * GRID;
        y = Math.round((Math.floor(slot / COLS) * SPACING + 100) / GRID) * GRID;
        slot++;
        if (!occupied.has(`${x},${y}`)) break;
      }
      occupied.add(`${x},${y}`);
      cmds.push(
        new AddTableCommand({
          id: crypto.randomUUID(),
          name: String(startNum + i),
          capacity: 8,
          x,
          y,
        }),
      );
    }
    executeCommand(new BatchCommand(cmds, `Create ${bulkCount} tables`));
  }

  function handleExportSnapshot() {
    exportSnapshot(getState());
    showExportMenu = false;
  }

  function handleExportCsv() {
    exportGuestListCsv(getGuests(), getTables());
    showExportMenu = false;
  }

  function handleImportSnapshot() {
    showImportMenu = false;
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,application/json";
    input.onchange = async () => {
      const file = input.files?.[0];
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
    };
    input.click();
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
    <input type="number" min="1" max="50" bind:value={bulkCount} />
    <button onclick={handleBulkCreate}>Create Tables</button>
  </div>

  <div class="toolbar-separator"></div>

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
