<script lang="ts">
  import { getGuests, getTables, getGuestsByTable } from "../state.svelte";

  let totalGuests = $derived(getGuests().length);
  let assignedCount = $derived(
    getGuests().filter((g) => g.tableId !== null).length,
  );
  let unassignedCount = $derived(totalGuests - assignedCount);
  let tableCount = $derived(getTables().length);
  let tablesWithOpenSeats = $derived(
    getTables().filter((t) => {
      const seated = getGuestsByTable().get(t.id)?.length ?? 0;
      return seated < t.capacity;
    }).length,
  );
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="floating-bar stats-bar" onmousedown={(e) => e.stopPropagation()}>
  <span><strong>{totalGuests}</strong> guests</span>
  <span class="sep"></span>
  <span><strong>{assignedCount}</strong> assigned</span>
  <span class="sep"></span>
  <span><strong>{unassignedCount}</strong> unassigned</span>
  <span class="sep"></span>
  <span><strong>{tableCount}</strong> tables</span>
  <span class="sep"></span>
  <span><strong>{tablesWithOpenSeats}</strong> open</span>
</div>

<style>
  .stats-bar {
    bottom: 12px;
    left: 12px;
    padding: 6px 12px;
    gap: 8px;
    font-size: 12px;
    color: var(--text);
  }

  .stats-bar span {
    white-space: nowrap;
  }

  .stats-bar :global(strong) {
    color: var(--text-h);
    font-weight: 600;
  }

  .sep {
    width: 1px;
    align-self: stretch;
    background: var(--border);
    margin: 2px 0;
  }
</style>
