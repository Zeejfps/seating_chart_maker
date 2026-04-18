<script lang="ts">
  import { Undo2, Redo2 } from "lucide-svelte";
  import {
    getCanUndo,
    getCanRedo,
    undo,
    redo,
  } from "../command-history.svelte";
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="floating-bar actions-bar" onmousedown={(e) => e.stopPropagation()}>
  <button
    class="icon-button"
    onclick={undo}
    disabled={!getCanUndo()}
    title="Undo (Ctrl+Z)"
    aria-label="Undo"
  >
    <Undo2 size={16} />
  </button>
  <button
    class="icon-button"
    onclick={redo}
    disabled={!getCanRedo()}
    title="Redo (Ctrl+Y)"
    aria-label="Redo"
  >
    <Redo2 size={16} />
  </button>
</div>

<style>
  .actions-bar {
    top: 12px;
    right: 12px;
    padding: 4px;
    gap: 2px;
  }

  .icon-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    padding: 0;
    border: none;
    background: none;
    color: var(--text-h);
    border-radius: 6px;
  }

  .icon-button:hover:not(:disabled) {
    background: var(--card-bg);
    color: var(--accent);
  }

  .icon-button:disabled {
    opacity: 0.35;
    cursor: default;
  }
</style>
