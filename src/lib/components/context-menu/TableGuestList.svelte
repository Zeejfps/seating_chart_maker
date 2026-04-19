<script lang="ts">
  import { dndzone } from "svelte-dnd-action";
  import { setDndActive } from "../../state.svelte";
  import { executeCommand } from "../../command-history.svelte";
  import { renameGuest, unassignGuest } from "../../commands";
  import { reorderIfChanged, sharedGuestDndOpts } from "../../dnd-utils";
  import InlineEdit from "../InlineEdit.svelte";
  import { Trash2, X } from "lucide-svelte";
  import type { Guest, ModalState } from "../../types";

  interface Props {
    guests: Guest[];
    onshowmodal: (modal: ModalState) => void;
    onclose: () => void;
  }
  let { guests, onshowmodal, onclose }: Props = $props();

  let localGuests: Guest[] = $state([]);
  let dragging = $state(false);

  $effect(() => {
    const items = guests.map((g) => ({ ...g }));
    if (!dragging) localGuests = items;
  });

  function handleConsider(e: CustomEvent) {
    dragging = true;
    setDndActive(true);
    localGuests = e.detail.items;
  }

  function handleFinalize(e: CustomEvent) {
    dragging = false;
    setDndActive(false);
    const newItems: Guest[] = e.detail.items;
    if (newItems.length === guests.length) {
      reorderIfChanged(newItems, guests);
    }
    localGuests = newItems;
  }

  function handleRename(guest: Guest, newName: string) {
    executeCommand(renameGuest(guest.id, guest.name, newName));
  }

  function handleUnassign(guest: Guest) {
    if (guest.tableId) {
      executeCommand(unassignGuest(guest.id, guest.tableId));
    }
  }

  function handleDelete(guest: Guest) {
    onshowmodal({ type: "delete-guest", guest });
    onclose();
  }
</script>

{#if localGuests.length > 0}
  <div class="menu-divider"></div>
  <div class="menu-subheader">Guests ({localGuests.length})</div>
  <div
    class="menu-guest-list"
    use:dndzone={{
      ...sharedGuestDndOpts,
      items: localGuests,
      dropFromOthersDisabled: true,
    }}
    onconsider={handleConsider}
    onfinalize={handleFinalize}
  >
    {#each localGuests as guest (guest.id)}
      <div class="menu-guest">
        <span class="grip-handle"></span>
        <span class="guest-name">
          <InlineEdit
            value={guest.name}
            oncommit={(newName) => handleRename(guest, newName)}
          />
        </span>
        <div class="guest-actions">
          <button
            class="guest-action-btn"
            title="Unassign"
            onclick={() => handleUnassign(guest)}
          >
            <X size={12} />
          </button>
          <button
            class="guest-action-btn delete"
            title="Delete"
            onclick={() => handleDelete(guest)}
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>
    {/each}
  </div>
{/if}
