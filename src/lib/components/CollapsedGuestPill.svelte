<script lang="ts">
  import { Users } from "lucide-svelte";
  import { getGuests, getUnassignedGuests } from "../state.svelte";
  import { setUnassignedCollapsed } from "../ui-state.svelte";

  let unassignedCount = $derived(getUnassignedGuests().length);
  let totalCount = $derived(getGuests().length);
</script>

<button
  class="floating-bar collapsed-pill"
  onclick={() => setUnassignedCollapsed(false)}
  onmousedown={(e) => e.stopPropagation()}
  title="Show guests"
  aria-label="Show guests"
>
  <Users size={16} />
  <span class="count">
    {#if totalCount > 0}
      {unassignedCount} / {totalCount}
    {:else}
      0
    {/if}
  </span>
</button>

<style>
  .collapsed-pill {
    top: 64px;
    left: 12px;
    padding: 8px 12px;
    gap: 8px;
    color: var(--text-h);
    cursor: pointer;
    font: inherit;
  }

  .collapsed-pill:hover {
    color: var(--accent);
    background: var(--card-bg);
  }

  .collapsed-pill .count {
    font-size: 13px;
    font-weight: 600;
  }
</style>
