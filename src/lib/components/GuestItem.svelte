<script lang="ts">
  import type { Snippet } from "svelte";
  import type { Guest, ModalState } from "../types";
  import { executeCommand } from "../command-history.svelte";
  import { RenameGuestCommand, RemoveGuestCommand } from "../commands";
  import InlineEdit from "./InlineEdit.svelte";
  import TrashIcon from "./icons/TrashIcon.svelte";

  interface Props {
    guest: Guest;
    showRemove?: boolean;
    compact?: boolean;
    badge?: Snippet;
    onremove?: (guest: Guest) => void;
    onshowmodal?: (modal: ModalState) => void;
  }

  let {
    guest,
    showRemove = true,
    compact = false,
    badge,
    onremove,
    onshowmodal,
  }: Props = $props();

  let editing = $state(false);

  function handleRename(newName: string) {
    executeCommand(new RenameGuestCommand(guest.id, guest.name, newName));
  }

  function handleRemove(e: MouseEvent) {
    e.stopPropagation();
    if (onremove) {
      onremove(guest);
    } else if (onshowmodal) {
      onshowmodal({ type: "delete-guest", guest });
    } else if (confirm(`Remove "${guest.name}" from the guest list?`)) {
      executeCommand(new RemoveGuestCommand(guest));
    }
  }
</script>

<div class="guest-item" class:compact>
  <span class="grip-handle"></span>
  <span class="guest-name">
    <InlineEdit
      value={guest.name}
      oncommit={handleRename}
      onediting={(v) => (editing = v)}
    />
  </span>
  {#if badge && !editing}
    {@render badge()}
  {/if}
  {#if showRemove && !editing}
    <button class="icon-btn" onclick={handleRemove} title="Remove guest">
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

  .guest-item:hover :global(.icon-btn) {
    opacity: 0.6;
  }

  .guest-item :global(.icon-btn:hover) {
    color: var(--warning-red);
  }

  .guest-item.compact {
    padding: 4px 6px;
    font-size: 13px;
  }
</style>
