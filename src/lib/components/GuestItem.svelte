<script lang="ts">
  import type { Guest } from "../types";
  import { executeCommand } from "../command-history.svelte";
  import { RenameGuestCommand, RemoveGuestCommand } from "../commands";
  import InlineEdit from "./InlineEdit.svelte";

  interface Props {
    guest: Guest;
    selectedGuestId: string | null;
    onselect: (id: string) => void;
    showRemove?: boolean;
  }

  let { guest, selectedGuestId, onselect, showRemove = true }: Props = $props();

  function handleRename(newName: string) {
    executeCommand(new RenameGuestCommand(guest.id, guest.name, newName));
  }

  function handleRemove(e: MouseEvent) {
    e.stopPropagation();
    executeCommand(new RemoveGuestCommand(guest));
  }

  function handleClick() {
    onselect(guest.id);
  }
</script>

<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
<div
  class="guest-item"
  class:selected={guest.id === selectedGuestId}
  onclick={handleClick}
>
  <span class="guest-name">
    <InlineEdit value={guest.name} oncommit={handleRename} />
  </span>
  {#if showRemove}
    <button class="remove-btn" onclick={handleRemove} title="Remove guest"
      >&times;</button
    >
  {/if}
</div>
