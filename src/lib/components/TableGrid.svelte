<script lang="ts">
  import { getTables, getGuestsByTable } from "../state.svelte";
  import { executeCommand } from "../command-history.svelte";
  import { AddTableCommand } from "../commands";
  import { buildNewTable } from "../table-factory";
  import TableCard from "./TableCard.svelte";

  interface Props {
    onshowmodal: (type: string, data?: unknown) => void;
  }

  let { onshowmodal }: Props = $props();

  function handleAddTable() {
    executeCommand(new AddTableCommand(buildNewTable()));
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
