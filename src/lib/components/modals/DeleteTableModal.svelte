<script lang="ts">
  import type { Table } from "../../types";
  import { getGuestsByTable } from "../../state.svelte";
  import Modal from "../Modal.svelte";

  interface Props {
    table: Table;
    onclose: () => void;
    onconfirm: () => void;
  }
  let { table, onclose, onconfirm }: Props = $props();

  let seatedGuestCount = $derived(
    (getGuestsByTable().get(table.id) ?? []).length,
  );
</script>

<Modal title="Delete Table" {onclose}>
  {#snippet children()}
    <p>Delete table "<strong>{table.name}</strong>"?</p>
    {#if seatedGuestCount > 0}
      <p style="margin-top: 8px; color: var(--warning-red);">
        {seatedGuestCount} guest{seatedGuestCount === 1 ? "" : "s"} will be moved
        to the unassigned list.
      </p>
    {/if}
  {/snippet}
  {#snippet actions()}
    <button onclick={onclose}>Cancel</button>
    <button class="danger" onclick={onconfirm}>Delete</button>
  {/snippet}
</Modal>
