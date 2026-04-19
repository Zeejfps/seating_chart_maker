<script lang="ts">
  import type { Guest } from "../../types";
  import Modal from "../Modal.svelte";

  interface Props {
    guest: Guest;
    onclose: () => void;
    onconfirm: () => void;
  }
  let { guest, onclose, onconfirm }: Props = $props();
</script>

<Modal title="Delete Guest" {onclose}>
  {#snippet children()}
    <p>Delete "<strong>{guest.name}</strong>"?</p>
  {/snippet}
  {#snippet actions()}
    <button onclick={onclose}>Cancel</button>
    <button class="danger" onclick={onconfirm}>Delete</button>
  {/snippet}
</Modal>
