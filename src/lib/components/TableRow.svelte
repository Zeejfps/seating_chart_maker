<script lang="ts">
  import type { Guest, Table } from "../types";
  import CapacityBadge from "./CapacityBadge.svelte";
  import { dndzone } from "svelte-dnd-action";
  import {
    ROW_SEAT_SPACING,
    ROW_HEIGHT,
    ROW_PADDING,
    ROW_CHAIR_OFFSET,
    ROW_HITBOX_PAD_X,
    ROW_HITBOX_HEIGHT,
    getRowWidth,
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

  let barWidth = $derived(getRowWidth(table.capacity));
  let wrapperWidth = $derived(barWidth + 2 * ROW_HITBOX_PAD_X);
  // Vertical center of wrapper = bar center. Wrapper is symmetric around bar.
  const BAR_TOP = (ROW_HITBOX_HEIGHT - ROW_HEIGHT) / 2;
  const CHAIR_TOP = BAR_TOP + ROW_HEIGHT + ROW_CHAIR_OFFSET - 6;
  const CHAIR_LABEL_TOP = BAR_TOP + ROW_HEIGHT + ROW_CHAIR_OFFSET + 14;
  const INFO_TOP = BAR_TOP - 24;
</script>

<div
  class="table-row"
  class:selected={isSelected}
  class:is-dragging={isDragging}
  class:dnd-hover={isDndHover}
  class:dimmed={isDimmed}
  style="left:{x}px; top:{y}px; width:{wrapperWidth}px; height:{ROW_HITBOX_HEIGHT}px; margin-left:{-wrapperWidth /
    2}px; margin-top:{-ROW_HITBOX_HEIGHT /
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
  <div
    class="table-row-bar"
    style="left:{ROW_HITBOX_PAD_X}px; top:{BAR_TOP}px; width:{barWidth}px; height:{ROW_HEIGHT}px;"
  ></div>

  <div
    class="table-info"
    style="top:{INFO_TOP}px; transform: translateX(-50%) rotate(-{table.rotation}deg);"
  >
    <span class="table-row-name">{table.name}</span>
    <CapacityBadge count={guestCount} capacity={table.capacity} size="small" />
  </div>

  {#each Array(table.capacity) as _, i (i)}
    {@const cx =
      ROW_HITBOX_PAD_X + ROW_PADDING / 2 + (i + 0.5) * ROW_SEAT_SPACING}
    {@const isOccupied = i < guestCount}
    <div
      class="chair"
      class:occupied={isOccupied}
      style="left: {cx - 6}px; top: {CHAIR_TOP}px;"
    ></div>
    {#if isOccupied && dndItems[i]}
      <span
        class="chair-label"
        style="left: {cx}px; top: {CHAIR_LABEL_TOP}px; transform: translate(-50%, -50%) rotate(-{table.rotation}deg);"
      >
        {dndItems[i].name.split(" ")[0]}
      </span>
    {/if}
  {/each}

  <div
    style="position:absolute; inset:0; overflow:hidden;"
    use:dndzone={{
      items: dndItems,
      type: "guest",
      centreDraggedOnCursor: true,
      useCursorForDetection: true,
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
  .table-row {
    position: absolute;
    cursor: grab;
    user-select: none;
    z-index: 1;
    overflow: visible;
  }

  .table-row-bar {
    position: absolute;
    background: var(--card-bg);
    border: 2px solid var(--border);
    border-radius: 3px;
    box-sizing: border-box;
    transition:
      border-color 0.15s,
      background 0.15s,
      box-shadow 0.15s;
    pointer-events: none;
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

  .table-row:hover .table-row-bar {
    border-color: var(--accent);
  }

  .table-row.selected .table-row-bar {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px var(--accent-bg);
  }

  .table-row.dnd-hover .table-row-bar {
    border-color: var(--accent);
    background: var(--accent-bg);
  }

  .table-row.is-dragging {
    opacity: 0.8;
    z-index: 10;
    cursor: grabbing;
  }

  .table-row.dimmed {
    opacity: 0.2;
    filter: grayscale(1);
  }

  .table-info {
    position: absolute;
    left: 50%;
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 6px;
    white-space: nowrap;
    z-index: 1;
    transform-origin: center;
    pointer-events: none;
  }

  .table-row-name {
    font-size: 13px;
    font-weight: 600;
    color: var(--text-h);
    line-height: 1.2;
  }
</style>
