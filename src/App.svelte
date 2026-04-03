<script lang="ts">
  import { onMount } from "svelte";
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
  import type { ModalState } from "./lib/types";
  import Toolbar from "./lib/components/Toolbar.svelte";
  import StatsBar from "./lib/components/StatsBar.svelte";
  import Sidebar from "./lib/components/Sidebar.svelte";
  import FloorPlan from "./lib/components/FloorPlan.svelte";
  import Modal from "./lib/components/Modal.svelte";

  let selectedTableId: string | null = $state(null);
  let initialized = $state(false);
  let searchQuery = $state("");
  let searchInputEl: HTMLInputElement | undefined = $state();

  // Modal state
  let modal: ModalState | null = $state(null);

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
    if (modal?.type !== "delete-table") return;
    executeCommand(new RemoveTableCommand(modal.table));
    if (selectedTableId === modal.table.id) selectedTableId = null;
    closeModal();
  }

  function handleDeleteGuestConfirm() {
    if (modal?.type !== "delete-guest") return;
    executeCommand(new RemoveGuestCommand(modal.guest));
    closeModal();
  }

  function handleKeydown(e: KeyboardEvent) {
    if (
      e.target instanceof HTMLInputElement ||
      e.target instanceof HTMLTextAreaElement
    )
      return;
    if (modal) return;
    if (e.key === "Escape") {
      selectedTableId = null;
      return;
    }
    if ((e.key === "Delete" || e.key === "Backspace") && selectedTableId) {
      const table = getTables().find((t) => t.id === selectedTableId);
      if (table) {
        showModal({ type: "delete-table", table });
      }
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key === "f") {
      e.preventDefault();
      searchInputEl?.focus();
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key === "z") {
      e.preventDefault();
      undo();
    }
    if (
      (e.ctrlKey || e.metaKey) &&
      (e.key === "y" || (e.shiftKey && e.key === "Z"))
    ) {
      e.preventDefault();
      redo();
    }
  }

  function showModal(m: ModalState) {
    modal = m;
  }

  function closeModal() {
    modal = null;
  }

  // CSV import: replace
  function handleCsvReplace() {
    if (modal?.type !== "csv-import") return;
    clearHistory();
    replaceAll({
      guests: modal.names.map((name) => ({
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
    if (modal?.type !== "csv-import") return;
    const { toAdd, toRemove } = detectMergeChanges(getGuests(), modal.names);
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
    if (modal?.type !== "snapshot-import") return;
    clearHistory();
    replaceAll(modal.state);
    closeModal();
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<Toolbar
  {searchQuery}
  bind:searchInputEl
  onsearch={(q) => (searchQuery = q)}
  onshowmodal={showModal}
/>
<StatsBar />
<Sidebar {searchQuery} onshowmodal={showModal} />
<div class="main-area">
  <FloorPlan
    {selectedTableId}
    {searchQuery}
    onselecttable={(id) => (selectedTableId = id)}
    onshowmodal={showModal}
  />
</div>

{#if modal?.type === "csv-import"}
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

{#if modal?.type === "snapshot-import"}
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

{#if modal?.type === "delete-table"}
  {@const table = modal.table}
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

{#if modal?.type === "delete-guest"}
  {@const guest = modal.guest}
  <Modal title="Delete Guest" onclose={closeModal}>
    {#snippet children()}
      <p>Delete "<strong>{guest.name}</strong>"?</p>
    {/snippet}
    {#snippet actions()}
      <button onclick={closeModal}>Cancel</button>
      <button class="danger" onclick={handleDeleteGuestConfirm}>Delete</button>
    {/snippet}
  </Modal>
{/if}

{#if modal?.type === "error"}
  {@const message = modal.message}
  <Modal title="Error" onclose={closeModal}>
    {#snippet children()}
      <p>{message}</p>
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
</style>
