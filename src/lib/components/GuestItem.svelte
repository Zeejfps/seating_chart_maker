<script lang="ts">
  import type { Snippet } from "svelte";
  import type { Guest } from "../types";
  import { executeCommand } from "../command-history.svelte";
  import { RenameGuestCommand, RemoveGuestCommand } from "../commands";
  import TrashIcon from "./icons/TrashIcon.svelte";

  interface Props {
    guest: Guest;
    showRemove?: boolean;
    badge?: Snippet;
  }

  let { guest, showRemove = true, badge }: Props = $props();

  let editing = $state(false);
  let editValue = $state("");
  let inputEl: HTMLInputElement | undefined = $state();

  function startEdit() {
    editValue = guest.name;
    editing = true;
    requestAnimationFrame(() => {
      inputEl?.focus();
      inputEl?.select();
    });
  }

  function commitEdit() {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== guest.name) {
      executeCommand(new RenameGuestCommand(guest.id, guest.name, trimmed));
    }
    editing = false;
  }

  function handleEditKeydown(e: KeyboardEvent) {
    e.stopPropagation();
    if (e.key === "Enter") {
      e.preventDefault();
      commitEdit();
    } else if (e.key === "Escape") {
      editing = false;
    }
  }

  function handleRemove(e: MouseEvent) {
    e.stopPropagation();
    if (confirm(`Remove "${guest.name}" from the guest list?`)) {
      executeCommand(new RemoveGuestCommand(guest));
    }
  }

  function handleDblClick(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    startEdit();
  }
</script>

<div
  class="guest-item"
  role="button"
  tabindex="0"
  ondblclick={handleDblClick}
  onkeydown={(e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      startEdit();
    }
  }}
>
  <span class="grip-handle"></span>
  {#if editing}
    <input
      bind:this={inputEl}
      class="rename-input"
      type="text"
      bind:value={editValue}
      onblur={commitEdit}
      onkeydown={handleEditKeydown}
      onclick={(e) => e.stopPropagation()}
    />
  {:else}
    <span class="guest-name">{guest.name}</span>
  {/if}
  {#if badge && !editing}
    {@render badge()}
  {/if}
  {#if showRemove && !editing}
    <button class="remove-btn" onclick={handleRemove} title="Remove guest">
      <TrashIcon />
    </button>
  {/if}
</div>

<style>
  .guest-item {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 8px;
    border-radius: 6px;
    cursor: grab;
    user-select: none;
    font-size: 14px;
    color: var(--text-h);
    transition: background 0.1s;
  }

  .guest-item:hover {
    background: var(--accent-bg);
  }

  .grip-handle {
    display: flex;
    align-items: center;
    flex-shrink: 0;
    width: 10px;
    height: 14px;
    opacity: 0.3;
    cursor: grab;
  }

  .guest-item:hover .grip-handle {
    opacity: 0.6;
  }

  .grip-handle::before {
    content: "";
    display: block;
    width: 10px;
    height: 14px;
    background-image: radial-gradient(
      circle,
      currentColor 1.2px,
      transparent 1.2px
    );
    background-size: 5px 5px;
    background-position: 0 0;
  }

  .guest-name {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .rename-input {
    flex: 1;
    min-width: 0;
    cursor: text;
    font-size: inherit;
    padding: 0 3px;
  }

  .remove-btn {
    opacity: 0;
    border: none;
    background: none;
    color: var(--text);
    padding: 0 4px;
    font-size: 16px;
    line-height: 1;
    cursor: pointer;
    flex-shrink: 0;
  }

  .guest-item:hover .remove-btn {
    opacity: 0.6;
  }

  .remove-btn:hover {
    opacity: 1;
    color: var(--warning-red);
  }

  /* Shadow placeholder during drag — :global needed because dnd library adds the attribute */
  :global(.guest-item[data-is-dnd-shadow-item-internal]) {
    opacity: 0.3;
    border: 1.5px dashed var(--accent-border);
    background: var(--accent-bg);
    visibility: visible !important;
  }

  :global(.guest-item[data-is-dnd-shadow-item-internal]) :global(*) {
    visibility: hidden;
  }
</style>
