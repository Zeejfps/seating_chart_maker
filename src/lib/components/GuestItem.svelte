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
    executeCommand(new RemoveGuestCommand(guest));
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

<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
<div
  class="guest-item"
  class:selected={guest.id === selectedGuestId}
  onclick={handleClick}
  ondblclick={handleDblClick}
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
    <button class="remove-btn" onclick={handleRemove} title="Remove guest"
      >&times;</button
    >
  {/if}
</div>
