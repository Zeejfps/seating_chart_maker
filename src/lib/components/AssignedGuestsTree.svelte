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
  import { transformDraggedElement, assignGuestIfChanged } from "../dnd-utils";
  import { addTable } from "../table-factory";
  import { executeCommand } from "../command-history.svelte";
  import { UnassignGuestCommand } from "../commands";
  import type { Guest, ModalState, Table } from "../types";
  import GuestItem from "./GuestItem.svelte";
  import TrashIcon from "./icons/TrashIcon.svelte";
  import CrosshairIcon from "./icons/CrosshairIcon.svelte";
  import XIcon from "./icons/XIcon.svelte";
  import { dndzone, TRIGGERS } from "svelte-dnd-action";

  interface Props {
    searchQuery: string;
    selectedTableId: string | null;
    onshowmodal: (modal: ModalState) => void;
    onpantotable: (tableId: string) => void;
  }

  let { searchQuery, selectedTableId, onshowmodal, onpantotable }: Props =
    $props();

  loadTreeState();
  let assignedExpanded = $state(false);

  let flashTableId: string | null = $state(null);
  let prevSelectedTableId: string | null = null;

  let tableToggleRefs: Map<string, HTMLElement> = new Map();

  function registerToggleRef(node: HTMLElement, tableId: string) {
    tableToggleRefs.set(tableId, node);
    return {
      destroy() {
        tableToggleRefs.delete(tableId);
      },
    };
  }

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
          const el = tableToggleRefs.get(id);
          const group = el?.closest(".table-group");
          if (group) {
            group.scrollIntoView({ behavior: "smooth", block: "nearest" });
          }
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

  function finalizeDropOnTable(tableId: string, items: { id: string }[]) {
    headerDropTable = null;
    setDndActive(false);
    for (const item of items) {
      assignGuestIfChanged(item.id, tableId);
    }
    if (!isTableExpanded(tableId)) {
      toggleTable(tableId);
    }
  }

  function handleAssignedFinalize(tableId: string, e: CustomEvent) {
    draggingAssignedTable = null;
    finalizeDropOnTable(tableId, e.detail.items);
    const current = new Map(localAssignedByTable);
    current.set(tableId, e.detail.items);
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
    finalizeDropOnTable(tableId, e.detail.items);
    const current = new Map(headerOverlayItems);
    current.set(tableId, []);
    headerOverlayItems = current;
  }
</script>

<div class="assigned-section">
  <div class="section-header">
    <div
      class="section-toggle"
      role="button"
      tabindex="0"
      onclick={() => (assignedExpanded = !assignedExpanded)}
      onkeydown={(e: KeyboardEvent) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          assignedExpanded = !assignedExpanded;
        }
      }}
    >
      <span class="toggle-arrow" class:expanded={assignedExpanded}>&#9654;</span
      >
      Tables
      <button
        class="pill-btn"
        title="Add table"
        tabindex="-1"
        onclick={(e: MouseEvent) => {
          e.stopPropagation();
          addTable();
        }}>+ Add</button
      >
      <span class="section-count">{totalFilteredAssigned}</span>
    </div>
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
          >
            <div
              class="table-toggle"
              class:highlight-flash={flashTableId === table.id}
              role="button"
              tabindex="0"
              use:registerToggleRef={table.id}
              onclick={() => toggleTable(table.id)}
              onkeydown={(e: KeyboardEvent) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  toggleTable(table.id);
                }
              }}
            >
              <span class="toggle-arrow" class:expanded>&#9654;</span>
              <span class="table-name">Table {table.name}</span>
              <button
                class="icon-btn pan-to-table-btn"
                title="Pan to table"
                tabindex="-1"
                onclick={(e: MouseEvent) => {
                  e.stopPropagation();
                  onpantotable(table.id);
                }}
              >
                <CrosshairIcon />
              </button>
              <button
                class="icon-btn delete-table-btn-sidebar"
                title="Delete table"
                tabindex="-1"
                onclick={(e: MouseEvent) => {
                  e.stopPropagation();
                  onshowmodal({ type: "delete-table", table });
                }}
              >
                <TrashIcon />
              </button>
              <span class="table-count">{items.length}/{table.capacity}</span>
            </div>
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
                dropAnimationDisabled: true,
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
                <GuestItem
                  {guest}
                  removeTitle="Unassign guest"
                  onremove={(g) =>
                    executeCommand(new UnassignGuestCommand(g.id, g.tableId!))}
                >
                  {#snippet icon()}
                    <XIcon />
                  {/snippet}
                </GuestItem>
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

<style>
  .assigned-section {
    border-top: 1px solid var(--border);
    margin-top: 16px;
    padding-top: 8px;
  }

  .section-header {
    display: flex;
    align-items: center;
    padding-left: 8px;
    padding-right: 8px;
  }

  .section-toggle {
    display: flex;
    align-items: center;
    gap: 6px;
    flex: 1;
    padding: 4px 16px 4px 12px;
    font-size: 12px;
    font-weight: 600;
    color: var(--text);
    background: none;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }

  .section-toggle:hover {
    background: var(--accent-bg);
    color: var(--accent);
  }

  .toggle-arrow {
    font-size: 9px;
    transition: transform 0.15s;
    display: inline-block;
  }

  .toggle-arrow.expanded {
    transform: rotate(90deg);
  }

  .section-count {
    font-weight: 400;
    font-size: 11px;
    color: var(--text);
    opacity: 0.7;
  }

  .section-toggle :global(.pill-btn) {
    margin-left: auto;
    margin-right: 4px;
    opacity: 0;
  }

  .section-toggle:hover :global(.pill-btn) {
    opacity: 0.5;
  }

  .table-group {
    margin-bottom: 2px;
    position: relative;
  }

  .table-subheader {
    display: flex;
    align-items: center;
    width: 100%;
    padding-left: 20px;
    padding-right: 8px;
    position: relative;
  }

  .header-drop-overlay {
    position: absolute;
    inset: 0;
    z-index: 1;
    overflow: hidden;
  }

  .header-drop-overlay > :global(*) {
    display: none;
  }

  .table-subheader.header-drop-highlight {
    background-color: var(--accent-bg);
    outline: 2px solid var(--accent-border);
    border-radius: 4px;
  }

  .table-toggle.highlight-flash::before {
    content: "";
    position: absolute;
    inset: 0;
    border-radius: 4px;
    animation: flash-border 1.5s ease-out;
    pointer-events: none;
  }

  @keyframes flash-border {
    0%,
    20%,
    40% {
      outline: 2px solid var(--accent-border);
      background-color: var(--accent-bg);
    }
    10%,
    30% {
      outline: 2px solid transparent;
      background-color: transparent;
    }
    50% {
      outline: 2px solid var(--accent-border);
      background-color: var(--accent-bg);
    }
    100% {
      outline: none;
      background-color: transparent;
    }
  }

  .table-toggle {
    display: flex;
    align-items: center;
    gap: 6px;
    flex: 1;
    padding: 4px 16px 4px 12px;
    font-size: 12px;
    font-weight: 600;
    color: var(--text);
    background: none;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    position: relative;
  }

  .table-toggle:hover {
    background: var(--accent-bg);
    color: var(--accent);
  }

  .table-toggle .toggle-arrow {
    font-size: 8px;
  }

  .table-toggle .table-count {
    font-weight: 400;
    font-size: 11px;
    color: var(--text);
    opacity: 0.7;
  }

  .pan-to-table-btn {
    margin-left: auto;
  }

  .table-toggle:hover :global(.icon-btn) {
    opacity: 0.5;
  }

  .table-toggle :global(.icon-btn.pan-to-table-btn:hover) {
    color: var(--accent);
  }

  .table-toggle :global(.icon-btn.delete-table-btn-sidebar:hover) {
    color: var(--warning-red);
  }

  .guest-list {
    padding: 8px;
    min-height: 60px;
  }

  .assigned-guest-list {
    padding: 4px 8px;
    padding-left: 40px;
  }

  .assigned-guest-list:empty {
    padding: 0;
  }

  .assigned-guest-list.collapsed {
    min-height: 0;
    height: 0;
    padding: 0;
    overflow: hidden;
  }
</style>
