<script lang="ts">
  import { onDestroy } from "svelte";
  import {
    Users,
    Download,
    UserPlus,
    ChevronLeft,
    ChevronRight,
    ChevronDown,
  } from "lucide-svelte";
  import {
    getGuests,
    getUnassignedGuests,
    getTables,
    setDndActive,
    isDndActive,
  } from "../state.svelte";
  import { executeCommand } from "../command-history.svelte";
  import {
    AddGuestCommand,
    BatchCommand,
    UnassignGuestCommand,
  } from "../commands";
  import { parseCsv } from "../csv";
  import { pickFile } from "../projects/project-persistence";
  import { transformDraggedElement, reorderIfChanged } from "../dnd-utils";
  import type { Guest, ModalState } from "../types";
  import {
    getUnassignedCollapsed,
    setUnassignedCollapsed,
    getUnassignedWidth,
    setUnassignedWidth,
    commitUnassignedWidth,
    getSectionOpen,
    setSectionOpen,
    toggleSectionOpen,
    UNASSIGNED_MIN_WIDTH,
    UNASSIGNED_MAX_WIDTH,
  } from "../ui-state.svelte";
  import GuestItem from "./GuestItem.svelte";
  import { dndzone } from "svelte-dnd-action";

  interface Props {
    searchQuery: string;
    onshowmodal: (modal: ModalState) => void;
  }

  let { searchQuery, onshowmodal }: Props = $props();

  let unassignedCount = $derived(getUnassignedGuests().length);
  let totalCount = $derived(getGuests().length);
  let assignedCount = $derived(totalCount - unassignedCount);

  let normalizedQuery = $derived(searchQuery.trim().toLowerCase());
  let isSearching = $derived(normalizedQuery.length > 0);
  let showUnassigned = $derived(isSearching || getSectionOpen("unassigned"));
  let showAssigned = $derived(isSearching || getSectionOpen("assigned"));

  let tableNameById = $derived.by(() => {
    const m = new Map<string, string>();
    for (const t of getTables()) m.set(t.id, t.name);
    return m;
  });

  let unassignedFiltered: Guest[] = $derived.by(() => {
    const list = getUnassignedGuests();
    return normalizedQuery
      ? list.filter((g) => g.name.toLowerCase().includes(normalizedQuery))
      : list;
  });

  let assignedFiltered: Guest[] = $derived.by(() => {
    const list = getGuests().filter(
      (g) =>
        g.tableId !== null &&
        (!normalizedQuery || g.name.toLowerCase().includes(normalizedQuery)),
    );
    list.sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
    );
    return list;
  });

  let localUnassignedItems: Guest[] = $state([]);
  let unassignedDragging = $state(false);
  $effect(() => {
    if (!unassignedDragging) {
      localUnassignedItems = unassignedFiltered.map((g) => ({ ...g }));
    }
  });

  let localAssignedItems: Guest[] = $state([]);
  let assignedDragging = $state(false);
  $effect(() => {
    if (!assignedDragging) {
      localAssignedItems = assignedFiltered.map((g) => ({ ...g }));
    }
  });

  // Header dropzone: holds a phantom ghost list that svelte-dnd-action
  // mutates during drag. Use the persistent filtered list (not the local
  // drag-synced copy) for body visibility so the source zone doesn't unmount
  // mid-drag when its last item is picked up.
  let unassignedHeaderGhosts: Guest[] = $state([]);
  let unassignedHeaderHovering = $derived(unassignedHeaderGhosts.length > 0);

  let unassignedBodyVisible = $derived(
    showUnassigned && unassignedFiltered.length > 0,
  );
  let assignedBodyVisible = $derived(
    showAssigned && assignedFiltered.length > 0,
  );

  function handleUnassignedHeaderConsider(e: CustomEvent) {
    setDndActive(true);
    unassignedHeaderGhosts = e.detail.items;
  }

  function handleUnassignedHeaderFinalize(e: CustomEvent) {
    setDndActive(false);
    const newItems: Guest[] = e.detail.items;
    const cmds = [];
    for (const item of newItems) {
      const original = getGuests().find((g) => g.id === item.id);
      if (original && original.tableId !== null) {
        cmds.push(new UnassignGuestCommand(original.id, original.tableId));
      }
    }
    if (cmds.length === 1) {
      executeCommand(cmds[0]);
    } else if (cmds.length > 1) {
      executeCommand(new BatchCommand(cmds, "Unassign guests"));
    }
    unassignedHeaderGhosts = [];
  }

  function handleUnassignedConsider(e: CustomEvent) {
    unassignedDragging = true;
    setDndActive(true);
    localUnassignedItems = e.detail.items;
  }

  function handleUnassignedFinalize(e: CustomEvent) {
    unassignedDragging = false;
    setDndActive(false);
    const newItems: Guest[] = e.detail.items;
    const cmds = [];
    for (const item of newItems) {
      const original = getGuests().find((g) => g.id === item.id);
      if (original && original.tableId !== null) {
        cmds.push(new UnassignGuestCommand(original.id, original.tableId));
      }
    }
    if (cmds.length === 1) {
      executeCommand(cmds[0]);
    } else if (cmds.length > 1) {
      executeCommand(new BatchCommand(cmds, "Unassign guests"));
    } else {
      reorderIfChanged(newItems, unassignedFiltered);
    }
    localUnassignedItems = newItems;
  }

  function handleAssignedConsider(e: CustomEvent) {
    assignedDragging = true;
    setDndActive(true);
    localAssignedItems = e.detail.items;
  }

  function handleAssignedFinalize(e: CustomEvent) {
    assignedDragging = false;
    setDndActive(false);
    localAssignedItems = e.detail.items;
  }

  let addingGuest = $state(false);
  let newGuestName = $state("");
  let addInput: HTMLInputElement | undefined = $state();

  function startAddGuest() {
    setSectionOpen("unassigned", true);
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

  async function handleCsvImport() {
    const file = await pickFile(".csv,text/csv");
    if (!file) return;
    const text = await file.text();
    const names = parseCsv(text);
    if (!names.length) return;

    if (getGuests().length === 0) {
      const cmds = names.map(
        (name: string) =>
          new AddGuestCommand({
            id: crypto.randomUUID(),
            name,
            tableId: null,
          }),
      );
      executeCommand(new BatchCommand(cmds, "Import guest list"));
    } else {
      onshowmodal({ type: "csv-import", names });
    }
  }

  let resizeStartX = 0;
  let resizeStartWidth = 0;

  function handleResizeMouseDown(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    resizeStartX = e.clientX;
    resizeStartWidth = getUnassignedWidth();
    window.addEventListener("mousemove", handleResizeMouseMove);
    window.addEventListener("mouseup", handleResizeMouseUp);
  }

  function handleResizeMouseMove(e: MouseEvent) {
    setUnassignedWidth(resizeStartWidth + (e.clientX - resizeStartX));
  }

  function handleResizeMouseUp() {
    window.removeEventListener("mousemove", handleResizeMouseMove);
    window.removeEventListener("mouseup", handleResizeMouseUp);
    commitUnassignedWidth();
  }

  onDestroy(() => {
    window.removeEventListener("mousemove", handleResizeMouseMove);
    window.removeEventListener("mouseup", handleResizeMouseUp);
  });

  const sharedDndOpts = {
    type: "guest",
    centreDraggedOnCursor: false,
    useCursorForDetection: true,
    flipDurationMs: 150,
    morphDisabled: true,
    transformDraggedElement,
    dropTargetStyle: {
      outline: "2px solid rgba(170, 59, 255, 0.5)",
      "background-color": "rgba(170, 59, 255, 0.05)",
    },
  };
</script>

{#if getUnassignedCollapsed()}
  <button
    class="floating-bar collapsed-pill"
    onclick={() => setUnassignedCollapsed(false)}
    onmousedown={(e) => e.stopPropagation()}
    title="Show guests"
    aria-label="Show guests"
  >
    <Users size={16} />
    <span class="count">
      {#if totalCount > 0}
        {unassignedCount} / {totalCount}
      {:else}
        0
      {/if}
    </span>
  </button>
{:else}
  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
  <aside
    class="guest-panel"
    style="width: {getUnassignedWidth()}px;"
    onmousedown={(e) => e.stopPropagation()}
  >
    <div class="panel-header">
      <span class="panel-title">Guests</span>
      <button
        class="header-btn"
        onclick={startAddGuest}
        title="Add guest"
        aria-label="Add guest"
      >
        <UserPlus size={14} />
      </button>
      <button
        class="header-btn"
        onclick={handleCsvImport}
        title="Import guests from CSV"
        aria-label="Import CSV"
      >
        <Download size={14} />
      </button>
      <button
        class="header-btn"
        onclick={() => setUnassignedCollapsed(true)}
        title="Collapse panel"
        aria-label="Collapse panel"
      >
        <ChevronLeft size={16} />
      </button>
    </div>
    <div class="panel-scroll">
      {#if addingGuest}
        <div class="add-guest-row">
          <input
            bind:this={addInput}
            type="text"
            placeholder="Guest name..."
            bind:value={newGuestName}
            onblur={commitAddGuest}
            onkeydown={handleAddKeydown}
          />
        </div>
      {/if}

      <div class="section">
        <div class="section-header-row">
          <button
            class="section-header"
            class:drop-ready={isDndActive() && !unassignedBodyVisible}
            class:drop-hovered={unassignedHeaderHovering}
            onclick={() => toggleSectionOpen("unassigned")}
            aria-expanded={showUnassigned}
          >
            {#if showUnassigned}
              <ChevronDown size={14} />
            {:else}
              <ChevronRight size={14} />
            {/if}
            <span class="section-label">Unassigned</span>
            <span class="section-count">{unassignedCount}</span>
          </button>
          {#if !unassignedBodyVisible && isDndActive()}
            <div
              class="header-dropzone"
              use:dndzone={{
                ...sharedDndOpts,
                items: unassignedHeaderGhosts,
                flipDurationMs: 0,
              }}
              onconsider={handleUnassignedHeaderConsider}
              onfinalize={handleUnassignedHeaderFinalize}
            >
              {#each unassignedHeaderGhosts as ghost (ghost.id)}
                <div class="dnd-ghost">{ghost.name}</div>
              {/each}
            </div>
          {/if}
        </div>
        {#if unassignedBodyVisible}
          <div
            class="section-body"
            use:dndzone={{
              ...sharedDndOpts,
              items: localUnassignedItems,
              dragDisabled: !localUnassignedItems.length,
            }}
            onconsider={handleUnassignedConsider}
            onfinalize={handleUnassignedFinalize}
          >
            {#each localUnassignedItems as guest (guest.id)}
              <GuestItem {guest} {onshowmodal} />
            {/each}
          </div>
        {/if}
      </div>

      <div class="section">
        <div class="section-header-row">
          <button
            class="section-header"
            onclick={() => toggleSectionOpen("assigned")}
            aria-expanded={showAssigned}
          >
            {#if showAssigned}
              <ChevronDown size={14} />
            {:else}
              <ChevronRight size={14} />
            {/if}
            <span class="section-label">Assigned</span>
            <span class="section-count">{assignedCount}</span>
          </button>
        </div>
        {#if assignedBodyVisible}
          <div
            class="section-body"
            use:dndzone={{
              ...sharedDndOpts,
              items: localAssignedItems,
              dragDisabled: !localAssignedItems.length,
              dropFromOthersDisabled: true,
            }}
            onconsider={handleAssignedConsider}
            onfinalize={handleAssignedFinalize}
          >
            {#each localAssignedItems as guest (guest.id)}
              <GuestItem {guest} {onshowmodal}>
                {#snippet badge()}
                  {@const name =
                    (guest.tableId && tableNameById.get(guest.tableId)) ?? "—"}
                  <span class="table-badge" title="Seated at {name}">
                    {name}
                  </span>
                {/snippet}
              </GuestItem>
            {/each}
          </div>
        {/if}
      </div>
    </div>
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <div
      class="resize-handle"
      onmousedown={handleResizeMouseDown}
      role="separator"
      aria-orientation="vertical"
      aria-valuemin={UNASSIGNED_MIN_WIDTH}
      aria-valuemax={UNASSIGNED_MAX_WIDTH}
      aria-valuenow={getUnassignedWidth()}
    ></div>
  </aside>
{/if}

<style>
  .collapsed-pill {
    top: 64px;
    left: 12px;
    padding: 8px 12px;
    gap: 8px;
    color: var(--text-h);
    cursor: pointer;
    font: inherit;
  }

  .collapsed-pill:hover {
    color: var(--accent);
    background: var(--card-bg);
  }

  .collapsed-pill .count {
    font-size: 13px;
    font-weight: 600;
  }

  .guest-panel {
    position: fixed;
    top: 64px;
    left: 12px;
    bottom: 64px;
    z-index: var(--z-floating);
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 8px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    box-sizing: border-box;
    min-width: 180px;
    max-width: 480px;
  }

  .panel-header {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 8px 8px 6px 12px;
    border-bottom: 1px solid var(--border);
  }

  .panel-title {
    flex: 1;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--text);
  }

  .header-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 26px;
    height: 26px;
    padding: 0;
    border: none;
    background: none;
    color: var(--text);
    border-radius: 4px;
  }

  .header-btn:hover {
    background: var(--card-bg);
    color: var(--accent);
  }

  .panel-scroll {
    flex: 1;
    overflow-y: auto;
    min-height: 0;
  }

  .add-guest-row {
    padding: 8px 12px;
  }

  .add-guest-row input {
    width: 100%;
  }

  .section {
    display: block;
  }

  .section-header-row {
    position: relative;
  }

  .section-header {
    display: flex;
    align-items: center;
    gap: 6px;
    width: 100%;
    padding: 8px 12px 6px;
    background: none;
    border: none;
    border-radius: 0;
    color: var(--text);
    cursor: pointer;
    text-align: left;
  }

  .section-header:hover {
    color: var(--text-h);
  }

  .section-header.drop-ready {
    box-shadow: inset 0 0 0 1px var(--accent-border);
    background: var(--accent-bg);
    color: var(--text-h);
    border-radius: 4px;
  }

  .section-header.drop-hovered {
    box-shadow: inset 0 0 0 2px var(--accent);
  }

  .section-label {
    flex: 1;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .section-count {
    font-size: 11px;
    font-weight: 600;
    color: var(--text);
    opacity: 0.7;
  }

  .header-dropzone {
    position: absolute;
    inset: 0;
    border-radius: 4px;
  }

  .dnd-ghost {
    height: 0;
    overflow: hidden;
    opacity: 0;
    pointer-events: none;
  }

  .section-body {
    padding: 4px 8px 8px;
    min-height: 24px;
  }

  .table-badge {
    font-size: 11px;
    padding: 1px 8px;
    border: 1px solid var(--border);
    background: var(--card-bg);
    color: var(--text);
    border-radius: 10px;
    flex-shrink: 0;
    line-height: 1.4;
    white-space: nowrap;
    max-width: 120px;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .resize-handle {
    position: absolute;
    top: 0;
    right: -3px;
    width: 6px;
    height: 100%;
    cursor: ew-resize;
  }

  .resize-handle:hover {
    background: var(--accent-border);
  }
</style>
