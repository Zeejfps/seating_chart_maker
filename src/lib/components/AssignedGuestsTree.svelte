<script lang="ts">
  import { untrack } from "svelte";
  import {
    getGuestsByTable,
    getTables,
    setDndActive,
    isDndActive,
  } from "../state.svelte";
  import {
    loadTreeState,
    isTableExpanded,
    toggleTable,
    expandTable,
    setSearchExpandedTables,
  } from "../tree-state.svelte";
  import { executeCommand } from "../command-history.svelte";
  import { AddTableCommand } from "../commands";
  import { transformDraggedElement, assignGuestIfChanged } from "../dnd-utils";
  import { buildNewTable } from "../table-factory";
  import type { Guest, Table } from "../types";
  import GuestItem from "./GuestItem.svelte";
  import TrashIcon from "./icons/TrashIcon.svelte";
  import CrosshairIcon from "./icons/CrosshairIcon.svelte";
  import { dndzone, TRIGGERS } from "svelte-dnd-action";

  interface Props {
    searchQuery: string;
    selectedTableId: string | null;
    onshowmodal: (type: string, data?: unknown) => void;
    onpantotable: (tableId: string) => void;
  }

  let { searchQuery, selectedTableId, onshowmodal, onpantotable }: Props =
    $props();

  loadTreeState();
  let assignedExpanded = $state(false);

  let flashTableId: string | null = $state(null);
  let prevSelectedTableId: string | null = null;

  $effect(() => {
    const id = selectedTableId;
    untrack(() => {
      if (id && id !== prevSelectedTableId) {
        prevSelectedTableId = id;
        assignedExpanded = true;
        expandTable(id);
        flashTableId = null;
        requestAnimationFrame(() => {
          flashTableId = id;
        });
      } else if (!id) {
        prevSelectedTableId = null;
      }
    });
  });

  let filteredAssignedByTable: { table: Table; guests: Guest[] }[] =
    $derived.by(() => {
      const tables = getTables();
      const guestsByTable = getGuestsByTable();
      const query = searchQuery.toLowerCase();

      return tables
        .map((table) => ({
          table,
          guests: (guestsByTable.get(table.id) ?? []).filter(
            (g) => !query || g.name.toLowerCase().includes(query),
          ),
        }))
        .filter((group) => !query || group.guests.length > 0);
    });

  let totalFilteredAssigned = $derived(
    filteredAssignedByTable.reduce((sum, g) => sum + g.guests.length, 0),
  );

  // Auto-expand assigned section and matching table nodes on search
  $effect(() => {
    if (searchQuery.length > 0) {
      assignedExpanded = true;
      const matchingTableIds = filteredAssignedByTable.map((g) => g.table.id);
      setSearchExpandedTables(matchingTableIds);
    } else {
      assignedExpanded = false;
      setSearchExpandedTables(null);
    }
  });

  // Local items for assigned DnD zones
  let localAssignedByTable: Map<string, Guest[]> = $state(new Map());
  let draggingAssignedTable: string | null = $state(null);
  let headerDropTable: string | null = $state(null);
  let headerOverlayItems: Map<string, { id: string }[]> = $state(new Map());

  $effect(() => {
    if (!draggingAssignedTable) {
      const newMap = new Map<string, Guest[]>();
      for (const group of filteredAssignedByTable) {
        newMap.set(
          group.table.id,
          group.guests.map((g) => ({ ...g })),
        );
      }
      localAssignedByTable = newMap;
    }
  });

  function handleAssignedConsider(tableId: string, e: CustomEvent) {
    draggingAssignedTable = tableId;
    setDndActive(true);
    const current = new Map(localAssignedByTable);
    current.set(tableId, e.detail.items);
    localAssignedByTable = current;
  }

  function handleAssignedFinalize(tableId: string, e: CustomEvent) {
    draggingAssignedTable = null;
    headerDropTable = null;
    setDndActive(false);
    const newItems: Guest[] = e.detail.items;
    for (const item of newItems) {
      assignGuestIfChanged(item.id, tableId);
    }
    if (!isTableExpanded(tableId)) {
      toggleTable(tableId);
    }
    const current = new Map(localAssignedByTable);
    current.set(tableId, newItems);
    localAssignedByTable = current;
  }

  function handleHeaderConsider(tableId: string, e: CustomEvent) {
    const trigger = e.detail.info.trigger;
    setDndActive(true);
    if (trigger === TRIGGERS.DRAGGED_ENTERED) {
      headerDropTable = tableId;
    } else if (
      trigger === TRIGGERS.DRAGGED_LEFT ||
      trigger === TRIGGERS.DRAGGED_LEFT_ALL
    ) {
      if (headerDropTable === tableId) headerDropTable = null;
    }
    const current = new Map(headerOverlayItems);
    current.set(tableId, e.detail.items);
    headerOverlayItems = current;
  }

  function handleHeaderFinalize(tableId: string, e: CustomEvent) {
    headerDropTable = null;
    setDndActive(false);
    const newItems: { id: string }[] = e.detail.items;
    for (const item of newItems) {
      assignGuestIfChanged(item.id, tableId);
    }
    if (!isTableExpanded(tableId)) {
      toggleTable(tableId);
    }
    const current = new Map(headerOverlayItems);
    current.set(tableId, []);
    headerOverlayItems = current;
  }

  function handleAddTable() {
    executeCommand(new AddTableCommand(buildNewTable()));
  }
</script>

<div class="assigned-section">
  <div class="section-header">
    <button
      class="section-toggle"
      onclick={() => (assignedExpanded = !assignedExpanded)}
    >
      <span class="toggle-arrow" class:expanded={assignedExpanded}>&#9654;</span
      >
      Tables
      <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
      <span
        class="add-table-btn-sidebar"
        title="Add table"
        role="button"
        tabindex="-1"
        onclick={(e: MouseEvent) => {
          e.stopPropagation();
          handleAddTable();
        }}>+ Add</span
      >
      <span class="section-count">{totalFilteredAssigned}</span>
    </button>
  </div>

  {#if assignedExpanded}
    <div class="assigned-groups">
      {#each filteredAssignedByTable as { table } (table.id)}
        {@const items = localAssignedByTable.get(table.id) ?? []}
        {@const expanded = isTableExpanded(table.id)}
        <div class="table-group">
          <div
            class="table-subheader"
            class:header-drop-highlight={headerDropTable === table.id}
            class:highlight-flash={flashTableId === table.id}
          >
            <button class="table-toggle" onclick={() => toggleTable(table.id)}>
              <span class="toggle-arrow" class:expanded>&#9654;</span>
              <span class="table-name">Table {table.name}</span>
              <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
              <span
                class="pan-to-table-btn"
                title="Pan to table"
                role="button"
                tabindex="-1"
                onclick={(e: MouseEvent) => {
                  e.stopPropagation();
                  onpantotable(table.id);
                }}
              >
                <CrosshairIcon />
              </span>
              <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
              <span
                class="delete-table-btn-sidebar"
                title="Delete table"
                role="button"
                tabindex="-1"
                onclick={(e: MouseEvent) => {
                  e.stopPropagation();
                  onshowmodal("delete-table", table);
                }}
              >
                <TrashIcon />
              </span>
              <span class="table-count">{items.length}/{table.capacity}</span>
            </button>
            <div
              class="header-drop-overlay"
              style:pointer-events={isDndActive() ? "auto" : "none"}
              use:dndzone={{
                items: headerOverlayItems.get(table.id) ?? [],
                type: "guest",
                dropFromOthersDisabled: false,
                dragDisabled: true,
                morphDisabled: true,
                flipDurationMs: 0,
                dropTargetStyle: {},
                dropTargetClasses: [],
                transformDraggedElement,
              }}
              onconsider={(e) => handleHeaderConsider(table.id, e)}
              onfinalize={(e) => handleHeaderFinalize(table.id, e)}
            ></div>
          </div>
          <div
            class="guest-list assigned-guest-list"
            class:collapsed={!expanded}
            use:dndzone={{
              items: expanded ? items : [],
              type: "guest",
              centreDraggedOnCursor: false,
              flipDurationMs: 150,
              morphDisabled: true,
              dragDisabled: !expanded,
              dropTargetStyle: {},
              transformDraggedElement,
            }}
            onconsider={(e) => handleAssignedConsider(table.id, e)}
            onfinalize={(e) => handleAssignedFinalize(table.id, e)}
          >
            {#if expanded}
              {#each items as guest (guest.id)}
                <GuestItem {guest} />
              {/each}
            {/if}
          </div>
        </div>
      {/each}
      {#if !filteredAssignedByTable.length}
        <div class="empty-state">
          {#if searchQuery}No matches{:else}No assigned guests{/if}
        </div>
      {/if}
    </div>
  {/if}
</div>
