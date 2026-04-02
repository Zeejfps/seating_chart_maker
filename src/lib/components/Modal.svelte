<script lang="ts">
  import type { Snippet } from "svelte";

  interface Props {
    title: string;
    onclose: () => void;
    children: Snippet;
    actions?: Snippet;
  }

  let { title, onclose, children, actions }: Props = $props();

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === "Escape") onclose();
  }

  function handleBackdropClick(e: MouseEvent) {
    if (e.target === e.currentTarget) onclose();
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="modal-backdrop" role="presentation" onclick={handleBackdropClick}>
  <div class="modal" role="dialog" aria-labelledby="modal-title">
    <h2 id="modal-title">{title}</h2>
    {@render children()}
    {#if actions}
      <div class="modal-actions">
        {@render actions()}
      </div>
    {/if}
  </div>
</div>

<style>
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
  }

  .modal {
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 24px;
    min-width: 320px;
    max-width: 90vw;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  }

  .modal h2 {
    font-size: 18px;
    margin-bottom: 12px;
  }

  .modal :global(p) {
    margin-bottom: 16px;
    color: var(--text);
  }

  .modal-actions {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
  }
</style>
