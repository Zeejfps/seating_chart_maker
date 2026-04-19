<script lang="ts">
  import type { Table } from "../../types";
  import { executeCommand } from "../../command-history.svelte";
  import { changeTableCapacity } from "../../commands";
  import {
    canChangeCapacity,
    clampCapacity,
    SHAPE_DEFAULTS,
  } from "../../table-shapes";

  interface Props {
    table: Table;
    guestCount: number;
  }
  let { table, guestCount }: Props = $props();

  let canChange = $derived(canChangeCapacity(table.shape));
  let minCap = $derived(SHAPE_DEFAULTS[table.shape].minCapacity);
  let maxCap = $derived(SHAPE_DEFAULTS[table.shape].maxCapacity);

  function step(delta: number) {
    const newCap = clampCapacity(table.shape, table.capacity + delta);
    if (newCap !== table.capacity) {
      executeCommand(changeTableCapacity(table.id, table.capacity, newCap));
    }
  }

  let decrementDisabled = $derived(
    table.capacity <= minCap || guestCount >= table.capacity,
  );
  let incrementDisabled = $derived(table.capacity >= maxCap);
</script>

{#if canChange}
  <div class="capacity-stepper">
    <button
      class="stepper-btn"
      disabled={decrementDisabled}
      onclick={() => step(-1)}>&minus;</button
    >
    <span class="stepper-value">{table.capacity} seats</span>
    <button
      class="stepper-btn"
      disabled={incrementDisabled}
      onclick={() => step(1)}>+</button
    >
  </div>
{/if}
