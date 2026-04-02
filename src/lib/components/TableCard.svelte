<script lang="ts">
  import type { Guest, ModalState, Table } from "../types";
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
  import InlineEdit from "./InlineEdit.svelte";
  import CapacityBadge from "./CapacityBadge.svelte";
  import GuestItem from "./GuestItem.svelte";
  import TrashIcon from "./icons/TrashIcon.svelte";
  import { dndzone } from "svelte-dnd-action";

  interface Props {
    table: Table;
    tableGuests: Guest[];
    onshowmodal: (modal: ModalState) => void;
  }

  let { table, tableGuests, onshowmodal }: Props = $props();

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
    onshowmodal({ type: "delete-table", table });
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

<div
  class="table-card"
  class:has-room={isDndActive() && tableGuests.length < table.capacity}
>
  <div class="table-card-header">
    <span class="table-name">
      <InlineEdit value={table.name} oncommit={handleRename} />
    </span>
    <CapacityBadge count={tableGuests.length} capacity={table.capacity} />
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
      <GuestItem
        {guest}
        compact
        showRemove={true}
        onremove={(g) => {
          executeCommand(new UnassignGuestCommand(g.id, table.id));
        }}
      />
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
</style>
