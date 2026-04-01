<script lang="ts">
  import type { Guest } from "../types";
  import { executeCommand } from "../command-history.svelte";
  import { RenameGuestCommand, RemoveGuestCommand } from "../commands";

  interface Props {
    guest: Guest;
    selectedGuestId: string | null;
    onselect: (id: string) => void;
    showRemove?: boolean;
  }

  let { guest, selectedGuestId, onselect, showRemove = true }: Props = $props();

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

  function handleClick() {
    onselect(guest.id);
  }

  function handleDblClick(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    startEdit();
  }
</script>

<div
  class="guest-item"
  class:selected={guest.id === selectedGuestId}
  role="button"
  tabindex="0"
  onclick={handleClick}
  ondblclick={handleDblClick}
  onkeydown={(e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleClick();
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
  {#if showRemove && !editing}
    <button class="remove-btn" onclick={handleRemove} title="Remove guest">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="3 6 5 6 21 6"></polyline>
        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path>
        <path d="M10 11v6"></path>
        <path d="M14 11v6"></path>
        <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"></path>
      </svg>
    </button>
  {/if}
</div>
