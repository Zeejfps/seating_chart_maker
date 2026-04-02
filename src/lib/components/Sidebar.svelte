<script lang="ts">
  import { untrack } from "svelte";
  import {
    getUnassignedGuests,
    getGuests,
    getGuestsByTable,
    getTables,
    getNextTablePosition,
    getNextTableNum,
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
  import {
    AddGuestCommand,
    AddTableCommand,
    UnassignGuestCommand,
    AssignGuestCommand,
    ReorderGuestsCommand,
    BatchCommand,
  } from "../commands";
  import type { Guest, Table } from "../types";
  import GuestItem from "./GuestItem.svelte";
  import { dndzone, TRIGGERS } from "svelte-dnd-action";
  import { parseCsv } from "../csv";

  interface Props {
    selectedTableId: string | null;
    onshowmodal: (type: string, data?: unknown) => void;
    onpantotable: (tableId: string) => void;
  }

  let { selectedTableId, onshowmodal, onpantotable }: Props = $props();

  let searchQuery = $state("");
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

  // --- Assigned guests ---
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
      const original = getGuests().find((g) => g.id === item.id);
      if (original && original.tableId !== tableId) {
        executeCommand(
          new AssignGuestCommand(item.id, tableId, original.tableId),
        );
      }
    }
    // Auto-expand if dropped into a collapsed table
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
      const original = getGuests().find((g) => g.id === item.id);
      if (original && original.tableId !== tableId) {
        executeCommand(
          new AssignGuestCommand(item.id, tableId, original.tableId),
        );
      }
    }
    if (!isTableExpanded(tableId)) {
      toggleTable(tableId);
    }
    const current = new Map(headerOverlayItems);
    current.set(tableId, []);
    headerOverlayItems = current;
  }

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

  function handleCsvImport() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".csv,text/csv";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const text = await file.text();
      const names = parseCsv(text);
      if (!names.length) return;

      if (getGuests().length === 0) {
        // No existing data — just add all
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
        // Show replace/merge modal
        onshowmodal("csv-import", names);
      }
    };
    input.click();
  }

  function transformDraggedElement(el?: HTMLElement) {
    if (!el) return;
    // Hide grip handle and remove button, keep only the name
    el.querySelector(".grip-handle")?.remove();
    el.querySelector(".remove-btn")?.remove();
    // Style the outer element directly as a pill
    el.style.borderRadius = "20px";
    el.style.background = "var(--accent-bg)";
    el.style.border = "1.5px solid var(--accent-border)";
    el.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)";
    el.style.justifyContent = "center";
    el.style.padding = "0 14px";
    el.style.color = "var(--text-h)";
    el.style.fontWeight = "500";
  }

  function handleAddTable() {
    const pos = getNextTablePosition();
    executeCommand(
      new AddTableCommand({
        id: crypto.randomUUID(),
        name: String(getNextTableNum()),
        capacity: 8,
        ...pos,
      }),
    );
  }

  function handleDndConsider(e: CustomEvent) {
    dragging = true;
    draggingAssignedTable = null;
    setDndActive(true);
    localItems = e.detail.items;
  }

  function handleDndFinalize(e: CustomEvent) {
    dragging = false;
    draggingAssignedTable = null;
    headerDropTable = null;
    setDndActive(false);
    const newItems: Guest[] = e.detail.items;
    let hadUnassignments = false;
    // Check if a guest was dropped here from a table (unassign)
    for (const item of newItems) {
      const original = getGuests().find((g) => g.id === item.id);
      if (original && original.tableId !== null) {
        hadUnassignments = true;
        executeCommand(new UnassignGuestCommand(original.id, original.tableId));
      }
    }
    // Persist reorder if no unassignments (pure reorder within sidebar)
    if (!hadUnassignments) {
      const newOrder = newItems.map((g) => g.id);
      const oldOrder = filteredGuests.map((g) => g.id);
      const orderChanged = newOrder.some((id, i) => id !== oldOrder[i]);
      if (orderChanged) {
        executeCommand(new ReorderGuestsCommand(newOrder, oldOrder));
      }
    }
    localItems = newItems;
  }
</script>

<aside class="sidebar">
  <div class="sidebar-header">
    <h2>Guests</h2>
    <input
      type="search"
      placeholder="Search guests..."
      bind:value={searchQuery}
    />
    <div class="sidebar-actions">
      <button onclick={handleAddGuest}>+ Add</button>
      <button onclick={handleCsvImport}>Import CSV</button>
    </div>
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

  <div class="sidebar-scroll">
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

    <div class="assigned-section">
      <div class="section-header">
        <button
          class="section-toggle"
          onclick={() => (assignedExpanded = !assignedExpanded)}
        >
          <span class="toggle-arrow" class:expanded={assignedExpanded}
            >&#9654;</span
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
                <button
                  class="table-toggle"
                  onclick={() => toggleTable(table.id)}
                >
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
                      <circle cx="12" cy="12" r="10"></circle>
                      <line x1="22" y1="12" x2="18" y2="12"></line>
                      <line x1="6" y1="12" x2="2" y2="12"></line>
                      <line x1="12" y1="6" x2="12" y2="2"></line>
                      <line x1="12" y1="22" x2="12" y2="18"></line>
                    </svg>
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
                      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"
                      ></path>
                      <path d="M10 11v6"></path>
                      <path d="M14 11v6"></path>
                      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"></path>
                    </svg>
                  </span>
                  <span class="table-count"
                    >{items.length}/{table.capacity}</span
                  >
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
  </div>
</aside>
