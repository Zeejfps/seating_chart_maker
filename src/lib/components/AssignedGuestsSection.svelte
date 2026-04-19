<script lang="ts">
  import { ChevronDown, ChevronRight } from "lucide-svelte";
  import { dndzone } from "svelte-dnd-action";
  import { getGuests, getTables, setDndActive } from "../state.svelte";
  import { getSectionOpen, toggleSectionOpen } from "../ui-state.svelte";
  import { sharedGuestDndOpts } from "../dnd-utils";
  import type { Guest, ModalState } from "../types";
  import GuestItem from "./GuestItem.svelte";

  interface Props {
    searchQuery: string;
    onshowmodal: (modal: ModalState) => void;
  }

  let { searchQuery, onshowmodal }: Props = $props();

  let normalizedQuery = $derived(searchQuery.trim().toLowerCase());
  let assigned = $derived(getGuests().filter((g) => g.tableId !== null));
  let count = $derived(assigned.length);
  let filtered = $derived.by(() => {
    const list = normalizedQuery
      ? assigned.filter((g) => g.name.toLowerCase().includes(normalizedQuery))
      : assigned.slice();
    list.sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
    );
    return list;
  });
  let open = $derived(normalizedQuery.length > 0 || getSectionOpen("assigned"));

  let tableNameById = $derived.by(() => {
    const m = new Map<string, string>();
    for (const t of getTables()) m.set(t.id, t.name);
    return m;
  });

  let localItems: Guest[] = $state([]);
  let dragging = $state(false);
  $effect(() => {
    if (!dragging) {
      localItems = filtered.map((g) => ({ ...g }));
    }
  });

  let bodyVisible = $derived(open && filtered.length > 0);

  function handleConsider(e: CustomEvent) {
    dragging = true;
    setDndActive(true);
    localItems = e.detail.items;
  }

  function handleFinalize(e: CustomEvent) {
    dragging = false;
    setDndActive(false);
    localItems = e.detail.items;
  }
</script>

<div class="section">
  <div class="section-header-row">
    <button
      class="section-header"
      onclick={() => toggleSectionOpen("assigned")}
      aria-expanded={open}
    >
      {#if open}
        <ChevronDown size={14} />
      {:else}
        <ChevronRight size={14} />
      {/if}
      <span class="section-label">Assigned</span>
      <span class="section-count">{count}</span>
    </button>
  </div>
  {#if bodyVisible}
    <div
      class="section-body"
      use:dndzone={{
        ...sharedGuestDndOpts,
        items: localItems,
        dragDisabled: !localItems.length,
        dropFromOthersDisabled: true,
      }}
      onconsider={handleConsider}
      onfinalize={handleFinalize}
    >
      {#each localItems as guest (guest.id)}
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

<style>
  .section {
    display: block;
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
</style>
