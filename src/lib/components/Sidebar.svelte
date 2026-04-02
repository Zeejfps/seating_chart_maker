<script lang="ts">
  import UnassignedGuestList from "./UnassignedGuestList.svelte";
  import AssignedGuestsTree from "./AssignedGuestsTree.svelte";
  import type { ModalState } from "../types";

  interface Props {
    selectedTableId: string | null;
    onshowmodal: (modal: ModalState) => void;
    onpantotable: (tableId: string) => void;
  }

  let { selectedTableId, onshowmodal, onpantotable }: Props = $props();

  let searchQuery = $state("");
</script>

<aside class="sidebar">
  <div class="sidebar-header">
    <h2>Guests</h2>
    <input
      type="search"
      placeholder="Search guests..."
      bind:value={searchQuery}
    />
  </div>

  <div class="sidebar-scroll">
    <UnassignedGuestList {searchQuery} {onshowmodal} />
    <AssignedGuestsTree
      {searchQuery}
      {selectedTableId}
      {onshowmodal}
      {onpantotable}
    />
  </div>
</aside>

<style>
  .sidebar {
    grid-area: sidebar;
    border-right: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  @media (max-width: 768px) {
    .sidebar {
      border-right: none;
      border-bottom: 1px solid var(--border);
      max-height: 40vh;
    }
  }

  .sidebar-header {
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    border-bottom: 1px solid var(--border);
  }

  .sidebar-header h2 {
    font-size: 14px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .sidebar-scroll {
    flex: 1;
    overflow-y: auto;
    min-height: 0;
  }
</style>
