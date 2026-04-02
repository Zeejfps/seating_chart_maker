<script lang="ts">
  import type { Guest, Table } from "../types";
  import { getCapacityStatus } from "../helpers";
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

  let capacityStatus = $derived(getCapacityStatus(guestCount, table.capacity));
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
  <span class="capacity-badge {capacityStatus}"
    >{guestCount}/{table.capacity}</span
  >
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
