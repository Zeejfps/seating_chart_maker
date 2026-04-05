<script lang="ts">
  import type { Guest, Table } from "../types";
  import CapacityBadge from "./CapacityBadge.svelte";
  import { dndzone } from "svelte-dnd-action";
  import {
    getRectWidth,
    RECT_HEIGHT,
    RECT_CHAIR_OFFSET,
  } from "../table-shapes";

  interface Props {
    table: Table;
    guestCount: number;
    dndItems: Guest[];
    isSelected: boolean;
    isDragging: boolean;
    isDndHover: boolean;
    isDimmed?: boolean;
    x: number;
    y: number;
    onmousedown: (e: MouseEvent) => void;
    onclick: (e: MouseEvent) => void;
    oncontextmenu?: (e: MouseEvent) => void;
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
    isDimmed = false,
    x,
    y,
    onmousedown,
    onclick,
    oncontextmenu,
    ondndconsider,
    ondndfinalize,
  }: Props = $props();

  let width = $derived(getRectWidth(table.capacity));
  let topSeats = $derived(Math.ceil(table.capacity / 2));
  let bottomSeats = $derived(Math.floor(table.capacity / 2));

  let nameEl: HTMLSpanElement | undefined = $state();
  let nameScale = $state(1);

  $effect(() => {
    table.name;
    if (!nameEl) return;
    const natural = nameEl.scrollWidth;
    const available = width - 8;
    nameScale = natural > available ? available / natural : 1;
  });
</script>

<div
  class="table-rect"
  class:selected={isSelected}
  class:is-dragging={isDragging}
  class:dnd-hover={isDndHover}
  class:dimmed={isDimmed}
  style="left:{x}px; top:{y}px; width:{width}px; height:{RECT_HEIGHT}px; margin-left:{-width /
    2}px; margin-top:{-RECT_HEIGHT /
    2}px; transform: rotate({table.rotation}deg);"
  role="button"
  tabindex="0"
  {onmousedown}
  {onclick}
  {oncontextmenu}
  onkeydown={(e: KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onclick(e as unknown as MouseEvent);
    }
  }}
>
  <div class="table-info" style="transform: rotate(-{table.rotation}deg);">
    <span
      class="table-rect-name"
      bind:this={nameEl}
      style="transform: scale({nameScale});">{table.name}</span
    >
    <CapacityBadge count={guestCount} capacity={table.capacity} size="small" />
  </div>

  <!-- Top row of chairs -->
  {#each Array(topSeats) as _, i (i)}
    {@const cx = ((i + 0.5) / topSeats) * width}
    {@const isOccupied = i < guestCount}
    <div
      class="chair"
      class:occupied={isOccupied}
      style="left: {cx - 6}px; top: {-RECT_CHAIR_OFFSET - 6}px;"
    ></div>
    {#if isOccupied && dndItems[i]}
      <span
        class="chair-label"
        style="left: {cx}px; top: {-RECT_CHAIR_OFFSET -
          6}px; transform: translate(-50%, -50%) rotate(-{table.rotation}deg);"
      >
        {dndItems[i].name.split(" ")[0]}
      </span>
    {/if}
  {/each}

  <!-- Bottom row of chairs -->
  {#each Array(bottomSeats) as _, i (i)}
    {@const cx = ((i + 0.5) / bottomSeats) * width}
    {@const guestIdx = topSeats + i}
    {@const isOccupied = guestIdx < guestCount}
    <div
      class="chair"
      class:occupied={isOccupied}
      style="left: {cx - 6}px; top: {RECT_HEIGHT + RECT_CHAIR_OFFSET - 6}px;"
    ></div>
    {#if isOccupied && dndItems[guestIdx]}
      <span
        class="chair-label"
        style="left: {cx}px; top: {RECT_HEIGHT +
          RECT_CHAIR_OFFSET +
          6}px; transform: translate(-50%, -50%) rotate(-{table.rotation}deg);"
      >
        {dndItems[guestIdx].name.split(" ")[0]}
      </span>
    {/if}
  {/each}

  <!-- Hidden dndzone for guest drops -->
  <div
    style="position:absolute; inset:0; border-radius:6px; overflow:hidden;"
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
  .table-rect {
    position: absolute;
    border-radius: 6px;
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

  .chair-label {
    position: absolute;
    transform: translate(-50%, -50%);
    font-size: 8px;
    font-weight: 500;
    color: var(--text-h);
    white-space: nowrap;
    pointer-events: none;
    line-height: 1;
  }

  .table-rect:hover {
    border-color: var(--accent-border);
  }

  .table-rect.selected {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px var(--accent-bg);
  }

  .table-rect.dnd-hover {
    border-color: var(--accent);
    background: var(--accent-bg);
  }

  .table-rect.is-dragging {
    opacity: 0.8;
    z-index: 10;
    cursor: grabbing;
  }

  .table-rect.dimmed {
    opacity: 0.2;
    filter: grayscale(1);
  }

  .table-info {
    display: flex;
    flex-direction: column;
    align-items: center;
    white-space: nowrap;
    z-index: 1;
  }

  .table-rect-name {
    font-size: 13px;
    font-weight: 600;
    color: var(--text-h);
    line-height: 1.2;
  }
</style>
