<script lang="ts">
  import {
    getUnassignedGuests,
    getGuests,
    setDndActive,
  } from "../state.svelte";
  import { executeCommand } from "../command-history.svelte";
  import {
    AddGuestCommand,
    UnassignGuestCommand,
    BatchCommand,
  } from "../commands";
  import { transformDraggedElement, reorderIfChanged } from "../dnd-utils";
  import { pickFile } from "../persistence";
  import type { Guest } from "../types";
  import GuestItem from "./GuestItem.svelte";
  import { dndzone } from "svelte-dnd-action";
  import { parseCsv } from "../csv";

  interface Props {
    searchQuery: string;
    onshowmodal: (type: string, data?: unknown) => void;
  }

  let { searchQuery, onshowmodal }: Props = $props();

  let addingGuest = $state(false);
  let newGuestName = $state("");
  let addInput: HTMLInputElement | undefined = $state();

  let filteredGuests: Guest[] = $derived.by(() => {
    const unassigned = getUnassignedGuests();
    return searchQuery
      ? unassigned.filter((g) =>
          g.name.toLowerCase().includes(searchQuery.toLowerCase()),
        )
      : unassigned;
  });

  // Local copy for svelte-dnd-action
  let localItems: Guest[] = $state([]);
  let dragging = $state(false);
  $effect(() => {
    const items = filteredGuests.map((g) => ({ ...g }));
    if (!dragging) localItems = items;
  });

  function handleAddGuest() {
    addingGuest = true;
    requestAnimationFrame(() => addInput?.focus());
  }

  function commitAddGuest() {
    const trimmed = newGuestName.trim();
    if (trimmed) {
      executeCommand(
        new AddGuestCommand({
          id: crypto.randomUUID(),
          name: trimmed,
          tableId: null,
        }),
      );
    }
    newGuestName = "";
    addingGuest = false;
  }

  function handleAddKeydown(e: KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      commitAddGuest();
    } else if (e.key === "Escape") {
      newGuestName = "";
      addingGuest = false;
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
        (name) =>
          new AddGuestCommand({
            id: crypto.randomUUID(),
            name,
            tableId: null,
          }),
      );
      executeCommand(new BatchCommand(cmds, "Import guest list"));
    } else {
      onshowmodal("csv-import", names);
    }
  }

  function handleDndConsider(e: CustomEvent) {
    dragging = true;
    setDndActive(true);
    localItems = e.detail.items;
  }

  function handleDndFinalize(e: CustomEvent) {
    dragging = false;
    setDndActive(false);
    const newItems: Guest[] = e.detail.items;
    let hadUnassignments = false;
    for (const item of newItems) {
      const original = getGuests().find((g) => g.id === item.id);
      if (original && original.tableId !== null) {
        hadUnassignments = true;
        executeCommand(new UnassignGuestCommand(original.id, original.tableId));
      }
    }
    if (!hadUnassignments) {
      reorderIfChanged(newItems, filteredGuests);
    }
    localItems = newItems;
  }
</script>

<div class="sidebar-actions">
  <button onclick={handleAddGuest}>+ Add</button>
  <button onclick={handleCsvImport}>Import CSV</button>
</div>

{#if addingGuest}
  <div style="padding: 8px 12px;">
    <input
      bind:this={addInput}
      type="text"
      placeholder="Guest name..."
      bind:value={newGuestName}
      onblur={commitAddGuest}
      onkeydown={handleAddKeydown}
      style="width: 100%;"
    />
  </div>
{/if}

<div class="section-label">Unassigned ({filteredGuests.length})</div>
<div
  class="guest-list"
  use:dndzone={{
    items: localItems,
    type: "guest",
    centreDraggedOnCursor: false,
    dropFromOthersDisabled: false,
    dragDisabled: !localItems.length,
    flipDurationMs: 150,
    morphDisabled: true,
    dropTargetStyle: {
      outline: "2px solid rgba(170, 59, 255, 0.5)",
      "background-color": "rgba(170, 59, 255, 0.05)",
    },
    transformDraggedElement,
  }}
  onconsider={handleDndConsider}
  onfinalize={handleDndFinalize}
>
  {#each localItems as guest (guest.id)}
    <GuestItem {guest} />
  {/each}
  {#if !localItems.length && !addingGuest}
    <div class="empty-state">
      {#if searchQuery}
        No matches
      {:else if getGuests().length === 0}
        Import a CSV or add guests manually
      {:else}
        All guests assigned!
      {/if}
    </div>
  {/if}
</div>

<style>
  .sidebar-actions {
    display: flex;
    gap: 6px;
  }

  .sidebar-actions button {
    font-size: 13px;
    padding: 4px 8px;
  }

  .section-label {
    padding: 6px 12px 2px;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--text);
  }

  .guest-list {
    padding: 8px;
    min-height: 60px;
  }

  .empty-state {
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text);
    font-size: 13px;
    padding: 20px;
    text-align: center;
    opacity: 0.7;
  }
</style>
