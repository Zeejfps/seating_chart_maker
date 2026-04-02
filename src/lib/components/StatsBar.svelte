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

<div class="stats-bar">
  <span><strong>{totalGuests}</strong> guests</span>
  <span><strong>{assignedCount}</strong> assigned</span>
  <span><strong>{unassignedCount}</strong> unassigned</span>
  <span><strong>{tableCount}</strong> tables</span>
  <span><strong>{tablesWithOpenSeats}</strong> with open seats</span>
</div>

<style>
  .stats-bar {
    position: fixed;
    bottom: 0;
    left: 0;
    width: 100%;
    z-index: 100;
    display: flex;
    gap: 20px;
    padding: 8px 16px;
    border-top: 1px solid var(--border);
    background: var(--bg);
    font-size: 13px;
    color: var(--text);
    flex-wrap: wrap;
    box-sizing: border-box;
  }

  .stats-bar span {
    white-space: nowrap;
  }

  .stats-bar :global(strong) {
    color: var(--text-h);
  }
</style>
