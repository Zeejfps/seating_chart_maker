<script lang="ts">
  import { onMount, tick } from "svelte";
  import {
    getGuests,
    getTables,
    getGuestsByTable,
    getState,
    replaceAll,
  } from "./lib/state.svelte";
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
  import type { ChartState, Table } from "./lib/types";
  import Toolbar from "./lib/components/Toolbar.svelte";
  import StatsBar from "./lib/components/StatsBar.svelte";
  import Sidebar from "./lib/components/Sidebar.svelte";
  import TableGrid from "./lib/components/TableGrid.svelte";
  import FloorPlan from "./lib/components/FloorPlan.svelte";
  import Modal from "./lib/components/Modal.svelte";

  let activeTab: "cards" | "floorplan" = $state("floorplan");
  let selectedTableId: string | null = $state(null);
  let initialized = $state(false);
  let floorPlanApi: { panToTable: (tableId: string) => void } | null =
    $state(null);

  async function handlePanToTable(tableId: string) {
    if (activeTab !== "floorplan") {
      activeTab = "floorplan";
      await tick();
    }
    floorPlanApi?.panToTable(tableId);
  }

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
  function handleDeleteTableConfirm() {
    const table = modalData as Table;
    executeCommand(new RemoveTableCommand(table));
    if (selectedTableId === table.id) selectedTableId = null;
    closeModal();
  }

  function handleKeydown(e: KeyboardEvent) {
    if (
      e.target instanceof HTMLInputElement ||
      e.target instanceof HTMLTextAreaElement
    )
      return;
    if (modalType) return;
    if (e.key === "Escape") {
      selectedTableId = null;
      return;
    }
    if (e.key === "Delete" && selectedTableId && activeTab === "floorplan") {
      const table = getTables().find((t) => t.id === selectedTableId);
      if (table) {
        showModal("delete-table", table);
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
  {selectedTableId}
  onshowmodal={showModal}
  onpantotable={handlePanToTable}
/>
<div class="main-area">
  <div class="view-tabs">
    <button
      class:active={activeTab === "cards"}
      onclick={() => {
        activeTab = "cards";
        selectedTableId = null;
      }}>Card View</button
    >
    <button
      class:active={activeTab === "floorplan"}
      onclick={() => {
        activeTab = "floorplan";
      }}>Floor Plan</button
    >
  </div>
  {#if activeTab === "cards"}
    <TableGrid onshowmodal={showModal} />
  {:else}
    <FloorPlan
      {selectedTableId}
      onselecttable={(id) => (selectedTableId = id)}
      onready={(api) => (floorPlanApi = api)}
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

{#if modalType === "delete-table"}
  {@const table = modalData as Table}
  {@const guests = getGuestsByTable().get(table.id) ?? []}
  <Modal title="Delete Table" onclose={closeModal}>
    {#snippet children()}
      <p>Delete table "<strong>{table.name}</strong>"?</p>
      {#if guests.length > 0}
        <p style="margin-top: 8px; color: var(--warning-red);">
          {guests.length} guest{guests.length === 1 ? "" : "s"} will be moved to the
          unassigned list.
        </p>
      {/if}
    {/snippet}
    {#snippet actions()}
      <button onclick={closeModal}>Cancel</button>
      <button class="danger" onclick={handleDeleteTableConfirm}>Delete</button>
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

<style>
  :global(#app) {
    display: grid;
    grid-template-rows: auto 1fr;
    grid-template-columns: var(--sidebar-width) 1fr;
    grid-template-areas:
      "toolbar toolbar"
      "sidebar main";
    height: 100svh;
    padding-bottom: 36px;
  }

  @media (max-width: 768px) {
    :global(#app) {
      grid-template-columns: 1fr;
      grid-template-areas:
        "toolbar"
        "sidebar"
        "main";
    }
  }

  .main-area {
    grid-area: main;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .view-tabs {
    display: flex;
    gap: 0;
    border-bottom: 1px solid var(--border);
    padding: 0 16px;
    flex-shrink: 0;
  }

  .view-tabs button {
    border: none;
    border-bottom: 2px solid transparent;
    border-radius: 0;
    background: none;
    padding: 8px 16px;
    font-size: 13px;
    font-weight: 600;
    color: var(--text);
    cursor: pointer;
  }

  .view-tabs button:hover {
    color: var(--text-h);
    background: none;
  }

  .view-tabs button.active {
    color: var(--accent);
    border-bottom-color: var(--accent);
  }
</style>
