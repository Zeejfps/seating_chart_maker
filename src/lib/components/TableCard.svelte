<script lang="ts">
  import type { Guest, Table } from "../types";
  import { executeCommand } from "../command-history.svelte";
  import {
    AssignGuestCommand,
    UnassignGuestCommand,
    RemoveTableCommand,
    RenameTableCommand,
    ChangeTableCapacityCommand,
    ReorderGuestsCommand,
  } from "../commands";
  import { getGuests } from "../state.svelte";
  import InlineEdit from "./InlineEdit.svelte";
  import { dndzone } from "svelte-dnd-action";

  interface Props {
    table: Table;
    tableGuests: Guest[];
    selectedGuestId: string | null;
    onclearselection: () => void;
  }

  let { table, tableGuests, selectedGuestId, onclearselection }: Props =
    $props();

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
    executeCommand(new RemoveTableCommand(table));
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
    const name =
      el.querySelector(".guest-name")?.textContent ?? el.textContent ?? "";
    const dots = `<span style="
      display: inline-block;
      width: 10px; height: 14px;
      background-image: radial-gradient(circle, currentColor 1.2px, transparent 1.2px);
      background-size: 5px 5px;
      opacity: 0.5;
      flex-shrink: 0;
      margin-right: 6px;
    "></span>`;
    el.innerHTML = `<span style="
      display: inline-flex;
      align-items: center;
      border-radius: 20px;
      padding: 4px 14px 4px 10px;
      background: var(--accent-bg);
      border: 1.5px solid var(--accent-border);
      color: var(--text-h);
      font-size: 13px;
      font-weight: 500;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      white-space: nowrap;
    ">${dots}${name}</span>`;
    el.style.cssText += `
      display: flex;
      align-items: center;
      justify-content: flex-start;
      background: transparent !important;
      border: none !important;
      box-shadow: none !important;
      outline: none !important;
      padding: 0 !important;
    `;
  }

  function handleDndConsider(e: CustomEvent) {
    dragging = true;
    localItems = e.detail.items;
  }

  function handleDndFinalize(e: CustomEvent) {
    dragging = false;
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
      title="Delete table">&times;</button
    >
  </div>

  <div
    class="table-card-body"
    use:dndzone={{
      items: localItems,
      type: "guest",
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
    <label>Seats:</label>
    <input
      type="number"
      min="1"
      value={table.capacity}
      onchange={handleCapacityChange}
      onclick={(e) => e.stopPropagation()}
    />
  </div>
</div>
