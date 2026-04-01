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

<div class="table-grid" role="presentation" onclick={onclearselection}>
  {#each getTables() as table (table.id)}
    <TableCard
      {table}
      tableGuests={getGuestsByTable().get(table.id) ?? []}
      {selectedGuestId}
      {onclearselection}
    />
  {/each}

  <button class="add-table-card" onclick={handleAddTable}>+ Add Table</button>
</div>
