<script lang="ts">
  import Modal from "../Modal.svelte";

  interface Props {
    onclose: () => void;
    onreplace: () => void;
    onmerge: () => void;
  }
  let { onclose, onreplace, onmerge }: Props = $props();
</script>

<Modal title="Import Guest List" {onclose}>
  {#snippet children()}
    <p>
      You already have guests. Would you like to <strong>replace</strong>
      or <strong>merge</strong> with existing data?
    </p>
    <p style="font-size: 13px; margin-top: 8px; color: var(--text);">
      Both options keep your tables. Replace swaps the guest list wholesale —
      all current guests are removed and re-added from the CSV, clearing their
      seat assignments. Merge adds missing guests and removes guests not in the
      CSV, preserving existing seat assignments.
    </p>
  {/snippet}
  {#snippet actions()}
    <button onclick={onclose}>Cancel</button>
    <button onclick={onreplace}>Replace</button>
    <button class="primary" onclick={onmerge}>Merge</button>
  {/snippet}
</Modal>
