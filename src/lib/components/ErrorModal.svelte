<script lang="ts">
  import Modal from "./Modal.svelte";

  interface Props {
    message: string;
    onclose: () => void;
  }

  let { message, onclose }: Props = $props();
</script>

<Modal title="Error" {onclose}>
  {#snippet children()}
    <p>{message}</p>
  {/snippet}
  {#snippet actions()}
    <button onclick={onclose}>OK</button>
  {/snippet}
</Modal>
