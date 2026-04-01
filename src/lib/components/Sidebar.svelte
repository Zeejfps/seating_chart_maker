<script lang="ts">
  import { getUnassignedGuests, getGuests } from "../state.svelte";
  import { executeCommand } from "../command-history.svelte";
  import {
    AddGuestCommand,
    UnassignGuestCommand,
    BatchCommand,
  } from "../commands";
  import type { Guest } from "../types";
  import GuestItem from "./GuestItem.svelte";
  import { dndzone } from "svelte-dnd-action";
  import { parseCsv } from "../csv";

  interface Props {
    selectedGuestId: string | null;
    onselect: (id: string | null) => void;
    onshowmodal: (type: string, data?: unknown) => void;
  }

  let { selectedGuestId, onselect, onshowmodal }: Props = $props();

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
    const name =
      el.querySelector(".guest-name")?.textContent ?? el.textContent ?? "";
    el.innerHTML = name;
    el.style.cssText += `
      border-radius: 20px;
      padding: 4px 14px;
      background: var(--accent-bg);
      border: 1.5px solid var(--accent-border);
      color: var(--text-h);
      font-size: 13px;
      font-weight: 500;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      white-space: nowrap;
      width: auto !important;
      height: auto !important;
      display: inline-flex;
      align-items: center;
    `;
  }

  function handleDndConsider(e: CustomEvent) {
    dragging = true;
    localItems = e.detail.items;
  }

  function handleDndFinalize(e: CustomEvent) {
    dragging = false;
    const newItems: Guest[] = e.detail.items;
    // Check if a guest was dropped here from a table (unassign)
    for (const item of newItems) {
      const original = getGuests().find((g) => g.id === item.id);
      if (original && original.tableId !== null) {
        executeCommand(new UnassignGuestCommand(original.id, original.tableId));
      }
    }
    localItems = newItems;
  }
</script>

<aside class="sidebar">
  <div class="sidebar-header">
    <h2>Unassigned Guests</h2>
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

  <div
    class="guest-list"
    use:dndzone={{
      items: localItems,
      type: "guest",
      dropFromOthersDisabled: false,
      flipDurationMs: 150,
      morphDisabled: true,
      centreDraggedOnCursor: true,
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
</aside>
