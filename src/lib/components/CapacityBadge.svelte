<script lang="ts">
  import { getCapacityStatus } from "../helpers";

  interface Props {
    count: number;
    capacity: number;
    size?: "default" | "small";
  }

  let { count, capacity, size = "default" }: Props = $props();
  let status = $derived(getCapacityStatus(count, capacity));
</script>

<span class="capacity-badge {status}" class:small={size === "small"}>
  {count}/{capacity}
</span>

<style>
  .capacity-badge {
    font-size: 12px;
    padding: 2px 8px;
    border-radius: 10px;
    font-weight: 600;
    white-space: nowrap;
  }

  .capacity-badge.small {
    font-size: 11px;
    padding: 1px 6px;
    border-radius: 8px;
  }

  .capacity-badge.under {
    color: var(--text);
    background: transparent;
  }

  .capacity-badge.at {
    color: var(--warning-yellow);
    background: var(--warning-yellow-bg);
  }

  .capacity-badge.over {
    color: var(--warning-red);
    background: var(--warning-red-bg);
  }
</style>
