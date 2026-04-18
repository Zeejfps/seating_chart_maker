<script lang="ts">
  import { ZoomIn, ZoomOut, Maximize2 } from "lucide-svelte";
  import { getZoom, zoomToCenter, fitToView } from "../ui-state.svelte";

  let editing = $state(false);
  let inputValue = $state("");

  function handleInput(e: Event) {
    const input = e.target as HTMLInputElement;
    const parsed = parseFloat(input.value);
    if (!isNaN(parsed)) {
      zoomToCenter(parsed / 100);
    }
    editing = false;
  }

  function handleInputKeydown(e: KeyboardEvent) {
    if (e.key === "Enter") {
      (e.target as HTMLInputElement).blur();
    } else if (e.key === "Escape") {
      editing = false;
    }
  }

  function autoFocusSelect(node: HTMLInputElement) {
    node.focus();
    node.select();
  }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class="floating-bar view-controls-bar"
  onmousedown={(e) => e.stopPropagation()}
>
  <button
    class="icon-button"
    title="Fit to view"
    aria-label="Fit to view"
    onclick={fitToView}
  >
    <Maximize2 size={14} />
  </button>
  <button
    class="icon-button"
    title="Zoom out"
    aria-label="Zoom out"
    onclick={() => zoomToCenter(getZoom() - 0.1)}
  >
    <ZoomOut size={14} />
  </button>
  {#if editing}
    <input
      class="zoom-input"
      type="text"
      bind:value={inputValue}
      onblur={handleInput}
      onkeydown={handleInputKeydown}
      use:autoFocusSelect
    />
  {:else}
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <span
      class="zoom-display"
      ondblclick={() => {
        inputValue = String(Math.round(getZoom() * 100));
        editing = true;
      }}
      title="Double-click to edit"
    >
      {Math.round(getZoom() * 100)}%
    </span>
  {/if}
  <button
    class="icon-button"
    title="Zoom in"
    aria-label="Zoom in"
    onclick={() => zoomToCenter(getZoom() + 0.1)}
  >
    <ZoomIn size={14} />
  </button>
</div>

<style>
  .view-controls-bar {
    bottom: 12px;
    right: 12px;
    padding: 4px;
    gap: 2px;
  }

  .icon-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    padding: 0;
    border: none;
    background: none;
    color: var(--text-h);
    border-radius: 6px;
  }

  .icon-button:hover {
    background: var(--card-bg);
    color: var(--accent);
  }

  .zoom-display {
    font-size: 12px;
    color: var(--text);
    min-width: 44px;
    text-align: center;
    cursor: default;
    user-select: none;
  }

  .zoom-input {
    width: 54px;
    font-size: 12px;
    text-align: center;
    padding: 2px 4px;
    border: 1px solid var(--accent-border);
    border-radius: 4px;
    background: var(--bg);
    color: var(--text);
    outline: none;
  }
</style>
