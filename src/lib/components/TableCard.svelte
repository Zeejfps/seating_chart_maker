<script lang="ts">
  import type { Guest, Table } from "../types";
  import { executeCommand } from "../command-history.svelte";
  import {
    UnassignGuestCommand,
    RenameTableCommand,
    ChangeTableCapacityCommand,
  } from "../commands";
  import { isDndActive, setDndActive } from "../state.svelte";
  import {
    transformDraggedElement,
    assignGuestIfChanged,
    reorderIfChanged,
  } from "../dnd-utils";
  import { getCapacityStatus } from "../helpers";
  import InlineEdit from "./InlineEdit.svelte";
  import TrashIcon from "./icons/TrashIcon.svelte";
  import { dndzone } from "svelte-dnd-action";

  interface Props {
    table: Table;
    tableGuests: Guest[];
    onshowmodal: (type: string, data?: unknown) => void;
  }

  let { table, tableGuests, onshowmodal }: Props = $props();

  let capacityStatus = $derived(
    getCapacityStatus(tableGuests.length, table.capacity),
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
      if (assignGuestIfChanged(item.id, table.id)) hadNewAssignments = true;
    }
    if (!hadNewAssignments) {
      reorderIfChanged(newItems, tableGuests);
    }
    localItems = newItems;
  }
</script>

<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
<div
  class="table-card"
  class:has-room={isDndActive() && tableGuests.length < table.capacity}
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
      <TrashIcon />
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

<style>
  .table-card {
    background: var(--card-bg);
    border: 1px solid var(--border);
    border-radius: 10px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    transition: box-shadow 0.15s;
  }

  .table-card.has-room {
    box-shadow: 0 0 0 2px var(--accent-border);
  }

  .table-card-header {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 10px 12px;
    border-bottom: 1px solid var(--border);
  }

  .table-card-header .table-name {
    flex: 1;
    font-weight: 600;
    font-size: 14px;
    color: var(--text-h);
    min-width: 0;
  }

  .capacity-badge {
    font-size: 12px;
    padding: 2px 8px;
    border-radius: 10px;
    font-weight: 600;
    white-space: nowrap;
  }

  .capacity-badge.under {
    color: var(--text);
    background: transparent;
  }

  .capacity-badge.at {
    color: var(--warning-yellow);
    background: rgba(245, 158, 11, 0.1);
  }

  .capacity-badge.over {
    color: var(--warning-red);
    background: rgba(239, 68, 68, 0.1);
  }

  .delete-table-btn {
    border: none;
    background: none;
    color: var(--text);
    padding: 0 2px;
    cursor: pointer;
    opacity: 0.4;
    line-height: 1;
    display: flex;
    align-items: center;
  }

  .delete-table-btn:hover {
    opacity: 1;
    color: var(--warning-red);
  }

  .table-card-body {
    padding: 8px;
    min-height: 40px;
    flex: 1;
  }

  /* Inline guest items within the card */
  .table-card-body .guest-item {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 4px 6px;
    border-radius: 6px;
    cursor: grab;
    user-select: none;
    font-size: 13px;
    color: var(--text-h);
    transition: background 0.1s;
  }

  .table-card-body .guest-item:hover {
    background: var(--accent-bg);
  }

  .table-card-body .grip-handle {
    display: flex;
    align-items: center;
    flex-shrink: 0;
    width: 10px;
    height: 14px;
    opacity: 0.3;
    cursor: grab;
  }

  .table-card-body .guest-item:hover .grip-handle {
    opacity: 0.6;
  }

  .table-card-body .grip-handle::before {
    content: "";
    display: block;
    width: 10px;
    height: 14px;
    background-image: radial-gradient(
      circle,
      currentColor 1.2px,
      transparent 1.2px
    );
    background-size: 5px 5px;
    background-position: 0 0;
  }

  .table-card-body .guest-name {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .table-card-body .remove-btn {
    opacity: 0;
    border: none;
    background: none;
    color: var(--text);
    padding: 0 4px;
    font-size: 16px;
    line-height: 1;
    cursor: pointer;
    flex-shrink: 0;
  }

  .table-card-body .guest-item:hover .remove-btn {
    opacity: 0.6;
  }

  .table-card-body .remove-btn:hover {
    opacity: 1;
    color: var(--warning-red);
  }

  /* DnD shadow for inline guest items */
  :global(.guest-item[data-is-dnd-shadow-item-internal]) {
    opacity: 0.3;
    border: 1.5px dashed var(--accent-border);
    background: var(--accent-bg);
    visibility: visible !important;
  }

  :global(.guest-item[data-is-dnd-shadow-item-internal]) :global(*) {
    visibility: hidden;
  }

  .table-card-footer {
    padding: 6px 12px;
    border-top: 1px solid var(--border);
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
  }

  .table-card-footer label {
    color: var(--text);
  }

  .table-card-footer input[type="number"] {
    width: 50px;
    padding: 2px 6px;
    font-size: 12px;
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
