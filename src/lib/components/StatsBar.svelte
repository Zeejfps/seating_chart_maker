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
