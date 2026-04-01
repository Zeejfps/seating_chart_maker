<script lang="ts">
  import { getUnassignedGuests, getGuests, getGuestsByTable, getTables, setDndActive } from "../state.svelte";
  import { executeCommand } from "../command-history.svelte";
  import {
    AddGuestCommand,
    UnassignGuestCommand,
    AssignGuestCommand,
    ReorderGuestsCommand,
    BatchCommand,
  } from "../commands";
  import type { Guest, Table } from "../types";
  import GuestItem from "./GuestItem.svelte";
  import { dndzone } from "svelte-dnd-action";
  import { parseCsv } from "../csv";

  interface Props {
    selectedGuestId: string | null;
    onselect: (id: string | null) => void;
    onshowmodal: (type: string, data?: unknown) => void;
    onpantotable: (tableId: string) => void;
  }

  let { selectedGuestId, onselect, onshowmodal, onpantotable }: Props = $props();

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
  let assignedExpanded = $state(false);

  let filteredAssignedByTable: { table: Table; guests: Guest[] }[] = $derived.by(() => {
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
      .filter((group) => group.guests.length > 0);
  });

  let totalFilteredAssigned = $derived(
    filteredAssignedByTable.reduce((sum, g) => sum + g.guests.length, 0),
  );

  // Auto-expand/collapse based on search
  $effect(() => {
    if (searchQuery.length > 0) {
      assignedExpanded = true;
    } else {
      assignedExpanded = false;
    }
  });

  // Local items for assigned DnD zones
  let localAssignedByTable: Map<string, Guest[]> = $state(new Map());
  let draggingAssignedTable: string | null = $state(null);

  $effect(() => {
    if (!draggingAssignedTable) {
      const newMap = new Map<string, Guest[]>();
      for (const group of filteredAssignedByTable) {
        newMap.set(group.table.id, group.guests.map((g) => ({ ...g })));
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
    setDndActive(false);
    const newItems: Guest[] = e.detail.items;
    for (const item of newItems) {
      const original = getGuests().find((g) => g.id === item.id);
      if (original && original.tableId !== tableId) {
        executeCommand(new AssignGuestCommand(item.id, tableId, original.tableId));
      }
    }
    const current = new Map(localAssignedByTable);
    current.set(tableId, newItems);
    localAssignedByTable = current;
    onselect(null);
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
    onselect(null);
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
        centreDraggedOnCursor: true,
        dropFromOthersDisabled: false,
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
        <GuestItem {guest} {selectedGuestId} onselect={(id) => onselect(id)} />
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
      <button
        class="section-toggle"
        onclick={() => (assignedExpanded = !assignedExpanded)}
      >
        <span class="toggle-arrow" class:expanded={assignedExpanded}>&#9654;</span>
        Assigned
        <span class="section-count">{totalFilteredAssigned}</span>
      </button>

      {#if assignedExpanded}
        <div class="assigned-groups">
          {#each filteredAssignedByTable as { table } (table.id)}
            {@const items = localAssignedByTable.get(table.id) ?? []}
            <div class="table-group">
              <div class="table-subheader">
                <span class="table-name">{table.name}</span>
                <span class="table-count">{items.length}/{table.capacity}</span>
              </div>
              <div
                class="guest-list assigned-guest-list"
                use:dndzone={{
                  items,
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
                onconsider={(e) => handleAssignedConsider(table.id, e)}
                onfinalize={(e) => handleAssignedFinalize(table.id, e)}
              >
                {#each items as guest (guest.id)}
                  <GuestItem {guest} {selectedGuestId} onselect={(id) => onselect(id)}>
                    {#snippet badge()}
                      <button
                        class="table-badge"
                        onclick={(e) => { e.stopPropagation(); onpantotable(table.id); }}
                      >
                        {table.name}
                      </button>
                    {/snippet}
                  </GuestItem>
                {/each}
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
