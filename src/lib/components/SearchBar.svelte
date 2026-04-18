<script lang="ts">
  import { Search } from "lucide-svelte";

  interface Props {
    searchQuery: string;
    searchInputEl?: HTMLInputElement;
    onsearch: (query: string) => void;
  }

  let { searchQuery, searchInputEl = $bindable(), onsearch }: Props = $props();
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="floating-bar search-bar" onmousedown={(e) => e.stopPropagation()}>
  <Search size={16} />
  <input
    bind:this={searchInputEl}
    class="search-input"
    type="search"
    placeholder="Search guests..."
    value={searchQuery}
    oninput={(e) => onsearch((e.target as HTMLInputElement).value)}
  />
</div>

<style>
  .search-bar {
    top: 12px;
    left: 50%;
    transform: translateX(-50%);
    height: 40px;
    padding: 0 12px;
    width: 280px;
    color: var(--text);
  }

  .search-input {
    flex: 1;
    min-width: 0;
    font-size: 13px;
    padding: 4px 6px;
    border: none;
    background: transparent;
    color: var(--text-h);
    outline: none;
  }

  .search-input:focus {
    border: none;
  }
</style>
