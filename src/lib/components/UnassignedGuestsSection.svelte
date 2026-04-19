<script lang="ts">
  import { ChevronDown, ChevronRight } from "lucide-svelte";
  import { dndzone } from "svelte-dnd-action";
  import {
    getUnassignedGuests,
    setDndActive,
    isDndActive,
  } from "../state.svelte";
  import {
    getSectionOpen,
    toggleSectionOpen,
  } from "../ui/guest-sections.svelte";
  import {
    sharedGuestDndOpts,
    reorderIfChanged,
    unassignGuestsFromDnd,
  } from "../dnd-utils";
  import type { Guest, ModalState } from "../types";
  import GuestItem from "./GuestItem.svelte";

  interface Props {
    searchQuery: string;
    onshowmodal: (modal: ModalState) => void;
  }

  let { searchQuery, onshowmodal }: Props = $props();

  let normalizedQuery = $derived(searchQuery.trim().toLowerCase());
  let unassigned = $derived(getUnassignedGuests());
  let count = $derived(unassigned.length);
  let filtered = $derived(
    normalizedQuery
      ? unassigned.filter((g) => g.name.toLowerCase().includes(normalizedQuery))
      : unassigned,
  );
  let open = $derived(
    normalizedQuery.length > 0 || getSectionOpen("unassigned"),
  );

  let localItems: Guest[] = $state([]);
  let dragging = $state(false);
  $effect(() => {
    if (!dragging) {
      localItems = filtered.map((g) => ({ ...g }));
    }
  });

  // Header-dropzone ghosts: svelte-dnd-action mutates this during drag. We drive
  // body visibility off `filtered` (the persistent source) rather than
  // `localItems` so the body zone doesn't unmount mid-drag when its last item
  // is picked up.
  let headerGhosts: Guest[] = $state([]);
  let headerHovering = $derived(headerGhosts.length > 0);

  let bodyVisible = $derived(open && filtered.length > 0);

  function handleHeaderConsider(e: CustomEvent) {
    setDndActive(true);
    headerGhosts = e.detail.items;
  }

  function handleHeaderFinalize(e: CustomEvent) {
    setDndActive(false);
    unassignGuestsFromDnd(e.detail.items);
    headerGhosts = [];
  }

  function handleConsider(e: CustomEvent) {
    dragging = true;
    setDndActive(true);
    localItems = e.detail.items;
  }

  function handleFinalize(e: CustomEvent) {
    dragging = false;
    setDndActive(false);
    const newItems: Guest[] = e.detail.items;
    const unassigned = unassignGuestsFromDnd(newItems);
    if (unassigned === 0) {
      reorderIfChanged(newItems, filtered);
    }
    localItems = newItems;
  }
</script>

<div class="section">
  <div class="section-header-row">
    <button
      class="section-header"
      class:drop-ready={isDndActive() && !bodyVisible}
      class:drop-hovered={headerHovering}
      onclick={() => toggleSectionOpen("unassigned")}
      aria-expanded={open}
    >
      {#if open}
        <ChevronDown size={14} />
      {:else}
        <ChevronRight size={14} />
      {/if}
      <span class="section-label">Unassigned</span>
      <span class="section-count">{count}</span>
    </button>
    {#if !bodyVisible && isDndActive()}
      <div
        class="header-dropzone"
        use:dndzone={{
          ...sharedGuestDndOpts,
          items: headerGhosts,
          flipDurationMs: 0,
        }}
        onconsider={handleHeaderConsider}
        onfinalize={handleHeaderFinalize}
      >
        {#each headerGhosts as ghost (ghost.id)}
          <div class="dnd-ghost">{ghost.name}</div>
        {/each}
      </div>
    {/if}
  </div>
  {#if bodyVisible}
    <div
      class="section-body"
      use:dndzone={{
        ...sharedGuestDndOpts,
        items: localItems,
        dragDisabled: !localItems.length,
      }}
      onconsider={handleConsider}
      onfinalize={handleFinalize}
    >
      {#each localItems as guest (guest.id)}
        <GuestItem {guest} {onshowmodal} />
      {/each}
    </div>
  {/if}
</div>

<style>
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
</style>
