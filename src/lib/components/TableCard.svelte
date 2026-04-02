<script lang="ts">
  import type { Guest, Table } from "../types";
  import { executeCommand } from "../command-history.svelte";
  import {
    AssignGuestCommand,
    UnassignGuestCommand,
    RenameTableCommand,
    ChangeTableCapacityCommand,
    ReorderGuestsCommand,
  } from "../commands";
  import { getGuests, isDndActive, setDndActive } from "../state.svelte";
  import InlineEdit from "./InlineEdit.svelte";
  import { dndzone } from "svelte-dnd-action";

  interface Props {
    table: Table;
    tableGuests: Guest[];
    selectedGuestId: string | null;
    onclearselection: () => void;
    onshowmodal: (type: string, data?: unknown) => void;
  }

  let {
    table,
    tableGuests,
    selectedGuestId,
    onclearselection,
    onshowmodal,
  }: Props = $props();

  let capacityStatus = $derived(
    tableGuests.length >= table.capacity
      ? tableGuests.length > table.capacity
        ? "over"
        : "at"
      : "under",
  );

  // Local copy for svelte-dnd-action
  let localItems: Guest[] = $state([]);
  let dragging = $state(false);
  $effect(() => {
    const items = tableGuests.map((g) => ({ ...g }));
    if (!dragging) localItems = items;
  });

  function handleRename(newName: string) {
    executeCommand(new RenameTableCommand(table.id, table.name, newName));
  }

  function handleCapacityChange(e: Event) {
    const target = e.target as HTMLInputElement;
    const val = parseInt(target.value, 10);
    if (!isNaN(val) && val > 0 && val !== table.capacity) {
      executeCommand(
        new ChangeTableCapacityCommand(table.id, table.capacity, val),
      );
    }
  }

  function handleDelete() {
    onshowmodal("delete-table", table);
  }

  function handleUnassign(e: MouseEvent, guestId: string) {
    e.stopPropagation();
    executeCommand(new UnassignGuestCommand(guestId, table.id));
  }

  function handleCardClick(e: MouseEvent) {
    e.stopPropagation();
    if (selectedGuestId) {
      const guest = getGuests().find((g) => g.id === selectedGuestId);
      if (guest) {
        executeCommand(
          new AssignGuestCommand(guest.id, table.id, guest.tableId),
        );
        onclearselection();
      }
    }
  }

  function transformDraggedElement(el?: HTMLElement) {
    if (!el) return;
    el.querySelector(".grip-handle")?.remove();
    el.querySelector(".remove-btn")?.remove();
    el.style.borderRadius = "20px";
    el.style.background = "var(--accent-bg)";
    el.style.border = "1.5px solid var(--accent-border)";
    el.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)";
    el.style.justifyContent = "center";
    el.style.padding = "0 14px";
    el.style.color = "var(--text-h)";
    el.style.fontWeight = "500";
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
    let hadNewAssignments = false;
    for (const item of newItems) {
      const original = getGuests().find((g) => g.id === item.id);
      if (original) {
        if (original.tableId !== table.id) {
          hadNewAssignments = true;
          executeCommand(
            new AssignGuestCommand(original.id, table.id, original.tableId),
          );
        }
      }
    }
    // Persist reorder if no new assignments (pure reorder within table)
    if (!hadNewAssignments) {
      const newOrder = newItems.map((g) => g.id);
      const oldOrder = tableGuests.map((g) => g.id);
      const orderChanged = newOrder.some((id, i) => id !== oldOrder[i]);
      if (orderChanged) {
        executeCommand(new ReorderGuestsCommand(newOrder, oldOrder));
      }
    }
    localItems = newItems;
    onclearselection();
  }
</script>

<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
<div
  class="table-card"
  class:drop-target={!!selectedGuestId}
  class:has-room={isDndActive() && tableGuests.length < table.capacity}
  onclick={handleCardClick}
>
  <div class="table-card-header">
    <span class="table-name">
      <InlineEdit value={table.name} oncommit={handleRename} />
    </span>
    <span class="capacity-badge {capacityStatus}">
      {tableGuests.length}/{table.capacity}
    </span>
    <button
      class="delete-table-btn"
      onclick={(e) => {
        e.stopPropagation();
        handleDelete();
      }}
      title="Delete table"
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <polyline points="3 6 5 6 21 6"></polyline>
        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path>
        <path d="M10 11v6"></path>
        <path d="M14 11v6"></path>
        <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"></path>
      </svg>
    </button>
  </div>

  <div
    class="table-card-body"
    use:dndzone={{
      items: localItems,
      type: "guest",
      centreDraggedOnCursor: true,
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
      <div class="guest-item">
        <span class="grip-handle"></span>
        <span class="guest-name">{guest.name}</span>
        <button
          class="remove-btn"
          onclick={(e) => handleUnassign(e, guest.id)}
          title="Unassign">&times;</button
        >
      </div>
    {/each}
    {#if !localItems.length}
      <div class="empty-state">Drop guests here</div>
    {/if}
  </div>

  <div class="table-card-footer">
    <label for="seats-{table.id}">Seats:</label>
    <input
      id="seats-{table.id}"
      type="number"
      min="1"
      value={table.capacity}
      onchange={handleCapacityChange}
      onclick={(e) => e.stopPropagation()}
    />
  </div>
</div>
