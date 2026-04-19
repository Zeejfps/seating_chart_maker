<script lang="ts">
  import { Plus, ChevronUp } from "lucide-svelte";
  import { addTable } from "../table-factory";
  import { TABLE_SHAPES, TABLE_SHAPE_LABELS } from "../table-shapes";
  import type { TableShape } from "../types";

  let showMenu = $state(false);

  function handleAdd(shape: TableShape) {
    addTable(shape);
    showMenu = false;
  }

  $effect(() => {
    if (!showMenu) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest(".add-table-bar")) showMenu = false;
    };
    window.addEventListener("click", handler);
    return () => window.removeEventListener("click", handler);
  });
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class="floating-bar add-table-bar"
  onmousedown={(e) => e.stopPropagation()}
>
  <button
    class="add-btn"
    onclick={() => addTable("round")}
    title="Add round table"
  >
    <Plus size={16} />
    <span>Add Table</span>
  </button>
  <button
    class="menu-toggle"
    onclick={() => (showMenu = !showMenu)}
    aria-label="Choose table shape"
    title="Choose table shape"
  >
    <ChevronUp size={14} />
  </button>
  {#if showMenu}
    <div class="shape-menu">
      {#each TABLE_SHAPES as shape (shape)}
        <button onclick={() => handleAdd(shape)}>
          {TABLE_SHAPE_LABELS[shape]}
        </button>
      {/each}
    </div>
  {/if}
</div>

<style>
  .add-table-bar {
    bottom: 12px;
    left: 50%;
    transform: translateX(-50%);
    padding: 4px;
    gap: 2px;
  }

  .add-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    border: none;
    background: none;
    color: var(--text-h);
    border-radius: 6px;
    font-size: 13px;
  }

  .add-btn:hover {
    background: var(--card-bg);
    color: var(--accent);
  }

  .menu-toggle {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 32px;
    padding: 0;
    border: none;
    background: none;
    color: var(--text-h);
    border-radius: 6px;
  }

  .menu-toggle:hover {
    background: var(--card-bg);
    color: var(--accent);
  }

  .shape-menu {
    position: absolute;
    bottom: calc(100% + 6px);
    left: 50%;
    transform: translateX(-50%);
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    overflow: hidden;
    min-width: 180px;
    display: flex;
    flex-direction: column;
  }

  .shape-menu button {
    text-align: left;
    padding: 8px 12px;
    font-size: 13px;
    background: none;
    border: none;
    border-radius: 0;
    color: var(--text-h);
  }

  .shape-menu button:hover {
    background: var(--accent-bg);
    color: var(--accent);
  }
</style>
