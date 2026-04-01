<script lang="ts">
  import { onMount } from "svelte";
  import { getGuests, getTables, getState, replaceAll } from "./lib/state.svelte";
  import {
    undo,
    redo,
    clearHistory,
    executeCommand,
  } from "./lib/command-history.svelte";
  import { saveToLocalStorage, loadFromLocalStorage } from "./lib/persistence";
  import {
    AddGuestCommand,
    RemoveGuestCommand,
    RemoveTableCommand,
    BatchCommand,
  } from "./lib/commands";
  import { detectMergeChanges } from "./lib/csv";
  import type { ChartState } from "./lib/types";
  import Toolbar from "./lib/components/Toolbar.svelte";
  import StatsBar from "./lib/components/StatsBar.svelte";
  import Sidebar from "./lib/components/Sidebar.svelte";
  import TableGrid from "./lib/components/TableGrid.svelte";
  import FloorPlan from "./lib/components/FloorPlan.svelte";
  import Modal from "./lib/components/Modal.svelte";

  let selectedGuestId: string | null = $state(null);
  let activeTab: "cards" | "floorplan" = $state("cards");
  let selectedTableId: string | null = $state(null);
  let initialized = $state(false);

  // Modal state
  let modalType: string | null = $state(null);
  let modalData: unknown = $state(null);

  onMount(() => {
    const saved = loadFromLocalStorage();
    if (saved) replaceAll(saved);
    initialized = true;
  });

  // Auto-save (only after initial load)
  $effect(() => {
    const state = getState();
    if (initialized) {
      saveToLocalStorage(state);
    }
  });

  // Keyboard shortcuts
  function handleKeydown(e: KeyboardEvent) {
    if (
      e.target instanceof HTMLInputElement ||
      e.target instanceof HTMLTextAreaElement
    )
      return;
    if (e.key === "Escape") {
      selectedGuestId = null;
      selectedTableId = null;
      return;
    }
    if (e.key === "Delete" && selectedTableId && activeTab === "floorplan") {
      const table = getTables().find((t) => t.id === selectedTableId);
      if (table) {
        executeCommand(new RemoveTableCommand(table));
        selectedTableId = null;
      }
      return;
    }
    if (e.ctrlKey && e.key === "z") {
      e.preventDefault();
      undo();
    }
    if (e.ctrlKey && (e.key === "y" || (e.shiftKey && e.key === "Z"))) {
      e.preventDefault();
      redo();
    }
  }

  function showModal(type: string, data?: unknown) {
    modalType = type;
    modalData = data;
  }

  function closeModal() {
    modalType = null;
    modalData = null;
  }

  // CSV import: replace
  function handleCsvReplace() {
    const names = modalData as string[];
    clearHistory();
    replaceAll({
      guests: names.map((name) => ({
        id: crypto.randomUUID(),
        name,
        tableId: null,
      })),
      tables: [],
    });
    closeModal();
  }

  // CSV import: merge
  function handleCsvMerge() {
    const names = modalData as string[];
    const { toAdd, toRemove } = detectMergeChanges(getGuests(), names);
    const cmds = [
      ...toAdd.map(
        (name) =>
          new AddGuestCommand({
            id: crypto.randomUUID(),
            name,
            tableId: null,
          }),
      ),
      ...toRemove.map((guest) => new RemoveGuestCommand(guest)),
    ];
    if (cmds.length > 0) {
      executeCommand(new BatchCommand(cmds, "Merge guest list"));
    }
    closeModal();
  }

  // Snapshot import: confirm replace
  function handleSnapshotReplace() {
    const state = modalData as ChartState;
    clearHistory();
    replaceAll(state);
    closeModal();
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<Toolbar onshowmodal={showModal} />
<StatsBar />
<Sidebar
  {selectedGuestId}
  onselect={(id) => (selectedGuestId = selectedGuestId === id ? null : id)}
  onshowmodal={showModal}
/>
<div class="main-area">
  <div class="view-tabs">
    <button class:active={activeTab === "cards"} onclick={() => { activeTab = "cards"; selectedTableId = null; }}>Card View</button>
    <button class:active={activeTab === "floorplan"} onclick={() => { activeTab = "floorplan"; }}>Floor Plan</button>
  </div>
  {#if activeTab === "cards"}
    <TableGrid
      {selectedGuestId}
      onclearselection={() => (selectedGuestId = null)}
    />
  {:else}
    <FloorPlan
      {selectedGuestId}
      onclearselection={() => (selectedGuestId = null)}
      {selectedTableId}
      onselecttable={(id) => (selectedTableId = id)}
    />
  {/if}
</div>

{#if modalType === "csv-import"}
  <Modal title="Import Guest List" onclose={closeModal}>
    {#snippet children()}
      <p>
        You already have guests. Would you like to <strong>replace</strong>
        everything or <strong>merge</strong> with existing data?
      </p>
      <p style="font-size: 13px; margin-top: 8px; color: var(--text);">
        Merge adds missing guests, removes guests not in the CSV, and preserves
        existing table assignments.
      </p>
    {/snippet}
    {#snippet actions()}
      <button onclick={closeModal}>Cancel</button>
      <button onclick={handleCsvReplace}>Replace</button>
      <button class="primary" onclick={handleCsvMerge}>Merge</button>
    {/snippet}
  </Modal>
{/if}

{#if modalType === "snapshot-import"}
  <Modal title="Import Snapshot" onclose={closeModal}>
    {#snippet children()}
      <p>This will replace all current data with the imported snapshot.</p>
    {/snippet}
    {#snippet actions()}
      <button onclick={closeModal}>Cancel</button>
      <button class="primary" onclick={handleSnapshotReplace}>Replace</button>
    {/snippet}
  </Modal>
{/if}

{#if modalType === "error"}
  <Modal title="Error" onclose={closeModal}>
    {#snippet children()}
      <p>{modalData}</p>
    {/snippet}
    {#snippet actions()}
      <button onclick={closeModal}>OK</button>
    {/snippet}
  </Modal>
{/if}
