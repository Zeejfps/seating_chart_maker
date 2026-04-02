<script lang="ts">
  import UnassignedGuestList from "./UnassignedGuestList.svelte";
  import AssignedGuestsTree from "./AssignedGuestsTree.svelte";

  interface Props {
    selectedTableId: string | null;
    onshowmodal: (type: string, data?: unknown) => void;
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
