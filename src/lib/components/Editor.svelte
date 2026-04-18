<script lang="ts">
  import { untrack } from "svelte";
  import {
    getGuests,
    getTables,
    getGuestsByTable,
    getState,
  } from "../state.svelte";
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
  import UnassignedPanel from "./UnassignedPanel.svelte";
  import AddTableBar from "./AddTableBar.svelte";
  import ViewControlsBar from "./ViewControlsBar.svelte";
  import FloorPlan from "./FloorPlan.svelte";
  import Modal from "./Modal.svelte";
  import ErrorModal from "./ErrorModal.svelte";
  import { getClipboard, setClipboard } from "../clipboard.svelte";
  import { showToast } from "../toast.svelte";
  import { pasteTableAt } from "../table-factory";
  import {
    leaveProject,
    saveCurrentProject,
  } from "../projects/projects.svelte";

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

  // Skip the initial load (the effect's first run) so opening a project
  // doesn't bump updatedAt. Debounced + untracked so the manifest write
  // can't re-trigger this effect.
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
    if ((e.ctrlKey || e.metaKey) && e.key === "c" && !e.shiftKey) {
      if (hoveredTableId) {
        const table = getTables().find((t) => t.id === hoveredTableId);
        if (table) {
          e.preventDefault();
          setClipboard({
            name: table.name,
            shape: table.shape,
            capacity: table.capacity,
            rotation: table.rotation,
          });
          showToast(`Table ${table.name} copied`);
        }
      }
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key === "v" && !e.shiftKey) {
      const clip = getClipboard();
      if (clip && isCursorOverCanvas && canvasCursor) {
        e.preventDefault();
        pasteTableAt(clip, canvasCursor.x, canvasCursor.y);
      }
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

  function handleCsvReplace() {
    if (modal?.type !== "csv-import") return;
    const cmds = [
      ...getGuests().map((g) => new RemoveGuestCommand(g)),
      ...modal.names.map(
        (name) =>
          new AddGuestCommand({
            id: crypto.randomUUID(),
            name,
            tableId: null,
          }),
      ),
    ];
    if (cmds.length > 0) {
      executeCommand(new BatchCommand(cmds, "Replace guest list"));
    }
    closeModal();
  }

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
  <UnassignedPanel {searchQuery} onshowmodal={showModal} />
  <AddTableBar />
  <StatsBar />
  <ViewControlsBar />
</main>

{#if modal?.type === "csv-import"}
  <Modal title="Import Guest List" onclose={closeModal}>
    {#snippet children()}
      <p>
        You already have guests. Would you like to <strong>replace</strong>
        or <strong>merge</strong> with existing data?
      </p>
      <p style="font-size: 13px; margin-top: 8px; color: var(--text);">
        Both options keep your tables. Replace swaps the guest list wholesale —
        all current guests are removed and re-added from the CSV, clearing their
        seat assignments. Merge adds missing guests and removes guests not in
        the CSV, preserving existing seat assignments.
      </p>
    {/snippet}
    {#snippet actions()}
      <button onclick={closeModal}>Cancel</button>
      <button onclick={handleCsvReplace}>Replace</button>
      <button class="primary" onclick={handleCsvMerge}>Merge</button>
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
  <ErrorModal message={modal.message} onclose={closeModal} />
{/if}

<style>
  .canvas-root {
    position: relative;
    width: 100vw;
    height: 100svh;
    overflow: hidden;
  }
</style>
