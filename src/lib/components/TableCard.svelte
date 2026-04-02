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
