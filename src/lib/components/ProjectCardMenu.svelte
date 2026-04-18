<script lang="ts">
  interface Props {
    onduplicate: () => void;
    onexport: () => void;
    ondelete: () => void;
  }

  let { onduplicate, onexport, ondelete }: Props = $props();

  let open = $state(false);
  let rootEl: HTMLDivElement | undefined = $state();

  function toggle(e: MouseEvent) {
    e.stopPropagation();
    open = !open;
  }

  function runAndClose(fn: () => void) {
    open = false;
    fn();
  }

  function handleWindowClick(e: MouseEvent) {
    if (!open) return;
    if (rootEl && e.target instanceof Node && !rootEl.contains(e.target)) {
      open = false;
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (open && e.key === "Escape") {
      e.stopPropagation();
      open = false;
    }
  }
</script>

<svelte:window onclick={handleWindowClick} onkeydown={handleKeydown} />

<div class="menu-root" bind:this={rootEl}>
  <button
    class="menu-trigger"
    onclick={toggle}
    aria-haspopup="true"
    aria-expanded={open}
    title="More"
  >
    ⋯
  </button>
  {#if open}
    <div class="menu-popover" role="menu">
      <button role="menuitem" onclick={() => runAndClose(onduplicate)}
        >Duplicate</button
      >
      <button role="menuitem" onclick={() => runAndClose(onexport)}
        >Export</button
      >
      <button
        class="danger"
        role="menuitem"
        onclick={() => runAndClose(ondelete)}>Delete</button
      >
    </div>
  {/if}
</div>

<style>
  .menu-root {
    position: relative;
    display: inline-block;
  }

  .menu-trigger {
    background: transparent;
    border: none;
    border-radius: 6px;
    padding: 2px 8px;
    font-size: 18px;
    line-height: 1;
    cursor: pointer;
    color: var(--text);
  }

  .menu-trigger:hover {
    background: var(--accent-bg);
  }

  .menu-popover {
    position: absolute;
    right: 0;
    top: calc(100% + 4px);
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 8px;
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
    padding: 4px;
    min-width: 140px;
    z-index: 10;
    display: flex;
    flex-direction: column;
  }

  .menu-popover button {
    text-align: left;
    padding: 6px 10px;
    background: transparent;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    color: var(--text);
    font-size: 13px;
  }

  .menu-popover button:hover {
    background: var(--accent-bg);
  }

  .menu-popover button.danger {
    color: var(--warning-red);
  }
</style>
