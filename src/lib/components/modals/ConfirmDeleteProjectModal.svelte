<script lang="ts">
  import Modal from "../Modal.svelte";

  interface Props {
    projectName: string;
    onclose: () => void;
    onconfirm: () => void;
  }
  let { projectName, onclose, onconfirm }: Props = $props();
</script>

<Modal title="Delete Project" {onclose}>
  {#snippet children()}
    <p>
      Delete "<strong>{projectName}</strong>"? This cannot be undone.
    </p>
  {/snippet}
  {#snippet actions()}
    <button onclick={onclose}>Cancel</button>
    <button class="danger" onclick={onconfirm}>Delete</button>
  {/snippet}
</Modal>
