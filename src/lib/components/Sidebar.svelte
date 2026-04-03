<script lang="ts">
  import UnassignedGuestList from "./UnassignedGuestList.svelte";
  import type { ModalState } from "../types";

  interface Props {
    searchQuery: string;
    onshowmodal: (modal: ModalState) => void;
  }

  let { searchQuery, onshowmodal }: Props = $props();
</script>

<aside class="sidebar">
  <div class="sidebar-scroll">
    <UnassignedGuestList {searchQuery} {onshowmodal} />
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

  .sidebar-scroll {
    flex: 1;
    overflow-y: auto;
    min-height: 0;
  }
</style>
