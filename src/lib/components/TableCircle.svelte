<script lang="ts">
  import type { Guest, Table } from "../types";
  import CapacityBadge from "./CapacityBadge.svelte";
  import { dndzone } from "svelte-dnd-action";

  interface Props {
    table: Table;
    guestCount: number;
    dndItems: Guest[];
    isSelected: boolean;
    isDragging: boolean;
    isDndHover: boolean;
    x: number;
    y: number;
    onmousedown: (e: MouseEvent) => void;
    onclick: (e: MouseEvent) => void;
    ondndconsider: (e: CustomEvent) => void;
    ondndfinalize: (e: CustomEvent) => void;
  }

  let {
    table,
    guestCount,
    dndItems,
    isSelected,
    isDragging,
    isDndHover,
    x,
    y,
    onmousedown,
    onclick,
    ondndconsider,
    ondndfinalize,
  }: Props = $props();
</script>

<div
  class="table-circle"
  class:selected={isSelected}
  class:is-dragging={isDragging}
  class:dnd-hover={isDndHover}
  style="left:{x}px; top:{y}px;"
  {onmousedown}
  {onclick}
>
  <span class="table-circle-name">{table.name}</span>
  <CapacityBadge count={guestCount} capacity={table.capacity} size="small" />
  <!-- eslint-disable-next-line @typescript-eslint/no-unused-vars -->
  {#each Array(table.capacity) as _seat, i (i)}
    {@const angle = (2 * Math.PI * i) / table.capacity - Math.PI / 2}
    {@const chairRadius = 58}
    {@const cx = Math.cos(angle) * chairRadius}
    {@const cy = Math.sin(angle) * chairRadius}
    {@const isOccupied = i < guestCount}
    <div
      class="chair"
      class:occupied={isOccupied}
      style="left: calc(50% + {cx}px - 6px); top: calc(50% + {cy}px - 6px);"
    ></div>
  {/each}
  <!-- Hidden dndzone for guest drops -->
  <div
    style="position:absolute; inset:0; border-radius:50%; overflow:hidden;"
    use:dndzone={{
      items: dndItems,
      type: "guest",
      centreDraggedOnCursor: true,
      flipDurationMs: 0,
      morphDisabled: true,
      dragDisabled: true,
      dropTargetStyle: {},
      dropTargetClasses: ["drag-over"],
    }}
    onconsider={ondndconsider}
    onfinalize={ondndfinalize}
  >
    {#each dndItems as guest (guest.id)}
      <div
        style="position:absolute; opacity:0; pointer-events:none; width:1px; height:1px;"
      >
        {guest.name}
      </div>
    {/each}
  </div>
</div>

<style>
  .table-circle {
    position: absolute;
    width: 100px;
    height: 100px;
    margin-left: -50px;
    margin-top: -50px;
    border-radius: 50%;
    background: var(--card-bg);
    border: 2px solid var(--border);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    cursor: grab;
    user-select: none;
    transition:
      border-color 0.15s,
      box-shadow 0.15s;
    z-index: 1;
    overflow: visible;
  }

  .chair {
    position: absolute;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    border: 2px solid var(--border);
    background: transparent;
    pointer-events: none;
    z-index: 0;
  }

  .chair.occupied {
    background: var(--border);
  }

  .table-circle:hover {
    border-color: var(--accent-border);
  }

  .table-circle.selected {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px var(--accent-bg);
  }

  .table-circle.dnd-hover {
    border-color: var(--accent);
    background: var(--accent-bg);
  }

  .table-circle.is-dragging {
    opacity: 0.8;
    z-index: 10;
    cursor: grabbing;
  }

  .table-circle-name {
    font-size: 13px;
    font-weight: 600;
    color: var(--text-h);
    line-height: 1.2;
  }
</style>
