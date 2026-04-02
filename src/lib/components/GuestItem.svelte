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
