<script lang="ts">
  import { getTables, getGuestsByTable } from "../state.svelte";
  import { executeCommand } from "../command-history.svelte";
  import { AddTableCommand } from "../commands";
  import TableCard from "./TableCard.svelte";

  interface Props {
    selectedGuestId: string | null;
    onclearselection: () => void;
  }

  let { selectedGuestId, onclearselection }: Props = $props();

  function getNextTableNum(): number {
    let max = 0;
    for (const t of getTables()) {
      const n = parseInt(t.name, 10);
      if (!isNaN(n) && n > max) max = n;
    }
    return max + 1;
  }

  function handleAddTable() {
    executeCommand(
      new AddTableCommand({
        id: crypto.randomUUID(),
        name: String(getNextTableNum()),
        capacity: 8,
      }),
    );
  }
</script>

<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
<div class="table-grid" onclick={onclearselection}>
  {#each getTables() as table (table.id)}
    <TableCard
      {table}
      tableGuests={getGuestsByTable().get(table.id) ?? []}
      {selectedGuestId}
      {onclearselection}
    />
  {/each}

  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div class="add-table-card" onclick={handleAddTable}>+ Add Table</div>
</div>
