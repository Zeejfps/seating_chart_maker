<script lang="ts">
  import { getTables, getGuestsByTable } from "../../state.svelte";
  import { executeCommand } from "../../command-history.svelte";
  import { renameTable, rotateTable } from "../../commands";
  import InlineEdit from "../InlineEdit.svelte";
  import { Trash2 } from "lucide-svelte";
  import TableGuestList from "./TableGuestList.svelte";
  import CapacityControls from "./CapacityControls.svelte";
  import { canChangeCapacity } from "../../table-shapes";
  import type { ModalState, Table } from "../../types";

  interface Props {
    tableId: string;
    onclose: () => void;
    onshowmodal: (modal: ModalState) => void;
  }
  let { tableId, onclose, onshowmodal }: Props = $props();

  let table: Table | undefined = $derived(
    getTables().find((t) => t.id === tableId),
  );
  let guests = $derived(getGuestsByTable().get(tableId) ?? []);

  let triggerTableEdit: (() => void) | undefined = $state();

  function handleRename(t: Table, newName: string) {
    executeCommand(renameTable(t.id, t.name, newName));
  }

  function handleDelete() {
    if (!table) return;
    onshowmodal({ type: "delete-table", table });
    onclose();
  }

  function handleRotate() {
    if (!table) return;
    const newRotation = (table.rotation + 90) % 360;
    executeCommand(rotateTable(table.id, table.rotation, newRotation));
  }

  let canRotate = $derived(table ? table.shape !== "round" : false);
  let canChangeCap = $derived(table ? canChangeCapacity(table.shape) : false);
</script>

{#if table}
  <div class="menu-header">
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <span class="menu-header-name" ondblclick={() => triggerTableEdit?.()}>
      <InlineEdit
        value={table.name}
        oncommit={(newName) => handleRename(table, newName)}
        bind:triggerEdit={triggerTableEdit}
      />
    </span>
    <button
      class="menu-header-delete"
      title="Delete table"
      onclick={handleDelete}
    >
      <Trash2 size={14} />
    </button>
  </div>

  <TableGuestList {guests} {onshowmodal} {onclose} />

  {#if canRotate || canChangeCap}
    <div class="menu-divider"></div>
    <div class="menu-footer">
      {#if canRotate}
        <button class="footer-btn" title="Rotate 90°" onclick={handleRotate}
          >&#x21bb;</button
        >
      {/if}
      <CapacityControls {table} guestCount={guests.length} />
    </div>
  {/if}
{/if}
