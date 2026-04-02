<script lang="ts">
  import { getTables, getGuestsByTable } from "../state.svelte";
  import { executeCommand } from "../command-history.svelte";
  import { AddTableCommand } from "../commands";
  import { buildNewTable } from "../table-factory";
  import TableCard from "./TableCard.svelte";
  import type { ModalState } from "../types";

  interface Props {
    onshowmodal: (modal: ModalState) => void;
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

<style>
  .table-grid {
    padding: 16px;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 16px;
    align-content: start;
    overflow-y: auto;
    flex: 1;
  }

  .add-table-card {
    border: 2px dashed var(--border);
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 120px;
    cursor: pointer;
    color: var(--text);
    font-size: 14px;
    transition:
      border-color 0.15s,
      color 0.15s;
  }

  .add-table-card:hover {
    border-color: var(--accent-border);
    color: var(--accent);
  }
</style>
