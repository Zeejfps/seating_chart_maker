<script lang="ts">
  import {
    getUnassignedGuests,
    getGuests,
    setDndActive,
  } from "../state.svelte";
  import { executeCommand } from "../command-history.svelte";
  import { AddGuestCommand, UnassignGuestCommand } from "../commands";
  import { transformDraggedElement, reorderIfChanged } from "../dnd-utils";
  import type { Guest } from "../types";
  import GuestItem from "./GuestItem.svelte";
  import { dndzone } from "svelte-dnd-action";

  interface Props {
    searchQuery: string;
  }

  let { searchQuery }: Props = $props();

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

<div class="section-header">
  <span class="section-label">Unassigned ({filteredGuests.length})</span>
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <span
    class="add-guest-btn"
    title="Add guest"
    role="button"
    tabindex="-1"
    onclick={handleAddGuest}>+ Add</span
  >
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
  .section-header {
    display: flex;
    align-items: center;
    padding: 6px 12px 2px;
  }

  .section-label {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--text);
  }

  .add-guest-btn {
    margin-left: auto;
    color: var(--text);
    padding: 1px 8px;
    cursor: pointer;
    border: 1px solid var(--border);
    background: var(--card-bg);
    border-radius: 10px;
    flex-shrink: 0;
    line-height: 1.4;
    display: inline-flex;
    align-items: center;
    font-size: 10px;
    font-weight: 500;
    opacity: 0.5;
    transition: opacity 0.1s;
  }

  .add-guest-btn:hover {
    opacity: 1;
    color: var(--accent);
  }

  .guest-list {
    padding: 8px;
    min-height: 60px;
  }
</style>
