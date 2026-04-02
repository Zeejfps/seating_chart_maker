<script lang="ts">
  import {
    getTables,
    getGuestsByTable,
    getNextTablePosition,
    getNextTableNum,
  } from "../state.svelte";
  import { executeCommand } from "../command-history.svelte";
  import { AddTableCommand } from "../commands";
  import TableCard from "./TableCard.svelte";

  interface Props {
    onshowmodal: (type: string, data?: unknown) => void;
  }

  let { onshowmodal }: Props = $props();

  function handleAddTable() {
    const pos = getNextTablePosition();
    executeCommand(
      new AddTableCommand({
        id: crypto.randomUUID(),
        name: String(getNextTableNum()),
        capacity: 8,
        ...pos,
      }),
    );
  }
</script>

<div class="table-grid" role="presentation">
  {#each getTables() as table (table.id)}
    <TableCard
      {table}
      tableGuests={getGuestsByTable().get(table.id) ?? []}
      {onshowmodal}
    />
  {/each}

  <button class="add-table-card" onclick={handleAddTable}>+ Add Table</button>
</div>
