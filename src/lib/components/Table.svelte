<script lang="ts">
  import type { Guest, Table } from "../types";
  import CapacityBadge from "./CapacityBadge.svelte";
  import { dndzone } from "svelte-dnd-action";
  import { chairPositionsFor, getTableLayout } from "../shapes/registry";

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

  let layout = $derived(getTableLayout(table));
  let chairs = $derived(chairPositionsFor(table));

  let nameEl: HTMLSpanElement | undefined = $state();
  let nameScale = $state(1);

  // Re-measure when name or capacity changes (scrollWidth is not reactive).
  const measureKey = $derived(`${table.name}|${table.capacity}`);
  $effect(() => {
    void measureKey;
    if (!nameEl || !shouldScaleName(table.shape)) {
      nameScale = 1;
      return;
    }
    const natural = nameEl.scrollWidth;
    const available = layout.bodyWidth - 8;
    nameScale = natural > available ? available / natural : 1;
  });

  function shouldScaleName(shape: Table["shape"]): boolean {
    return shape === "rectangle" || shape === "sweetheart";
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onclick(e as unknown as MouseEvent);
    }
  }
</script>

<div
  class="table-hitbox"
  class:is-dragging={isDragging}
  class:dimmed={isDimmed}
  style="left:{x}px; top:{y}px; width:{layout.width}px; height:{layout.height}px; margin-left:{-layout.width /
    2}px; margin-top:{-layout.height /
    2}px; transform: rotate({layout.rotation}deg);"
  role="button"
  tabindex="0"
  {onmousedown}
  {onclick}
  {oncontextmenu}
  onkeydown={handleKeydown}
>
  <div
    class="table-body shape-{table.shape}"
    class:selected={isSelected}
    class:dnd-hover={isDndHover}
    style="left:{layout.bodyLeft}px; top:{layout.bodyTop}px; width:{layout.bodyWidth}px; height:{layout.bodyHeight}px; border-radius:{layout.bodyRadius}px;"
  >
    {#if layout.infoMode === "inside-body"}
      <div
        class="table-info"
        style="left:{layout.infoLeft}px; top:{layout.infoTop}px; transform: translate(-50%, -50%) rotate(-{layout.rotation}deg);"
      >
        <span
          class="table-name"
          bind:this={nameEl}
          style="transform: scale({nameScale});">{table.name}</span
        >
        <CapacityBadge
          count={guestCount}
          capacity={table.capacity}
          size="small"
        />
      </div>
    {/if}
  </div>

  {#if layout.infoMode === "above-body"}
    <div
      class="table-info info-above"
      style="left:{layout.infoLeft}px; top:{layout.infoTop}px; transform: translateX(-50%) rotate(-{layout.rotation}deg);"
    >
      <span class="table-name">{table.name}</span>
      <CapacityBadge
        count={guestCount}
        capacity={table.capacity}
        size="small"
      />
    </div>
  {/if}

  {#each chairs as pos, i (i)}
    {@const isOccupied = i < guestCount}
    <div
      class="chair"
      class:occupied={isOccupied}
      style="left:{pos.x - 6}px; top:{pos.y - 6}px;"
    ></div>
    {#if isOccupied && dndItems[i]}
      <span
        class="chair-label"
        style="left:{pos.labelX}px; top:{pos.labelY}px; transform: translate(-50%, -50%) rotate(-{layout.rotation}deg);"
      >
        {dndItems[i].name.split(" ")[0]}
      </span>
    {/if}
  {/each}

  <div
    class="dnd-overlay"
    style="border-radius:{layout.bodyRadius}px;"
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
      <div class="dnd-ghost">{guest.name}</div>
    {/each}
  </div>
</div>

<style>
  .table-hitbox {
    position: absolute;
    cursor: grab;
    user-select: none;
    z-index: 1;
    overflow: visible;
  }

  .table-hitbox.is-dragging {
    opacity: 0.8;
    z-index: 10;
    cursor: grabbing;
  }

  .table-hitbox.dimmed {
    opacity: 0.2;
    filter: grayscale(1);
  }

  .table-body {
    position: absolute;
    background: var(--card-bg);
    border: 2px solid var(--border);
    box-sizing: border-box;
    display: flex;
    align-items: center;
    justify-content: center;
    transition:
      border-color 0.15s,
      background 0.15s,
      box-shadow 0.15s;
    pointer-events: none;
  }

  .table-body.shape-sweetheart {
    border-color: var(--accent-border);
  }

  .table-hitbox:hover .table-body {
    border-color: var(--accent-border);
  }

  .table-hitbox:hover .table-body.shape-sweetheart,
  .table-hitbox:hover .table-body.shape-row {
    border-color: var(--accent);
  }

  .table-body.selected {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px var(--accent-bg);
  }

  .table-body.dnd-hover {
    border-color: var(--accent);
    background: var(--accent-bg);
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
    font-size: 8px;
    font-weight: 500;
    color: var(--text-h);
    white-space: nowrap;
    pointer-events: none;
    line-height: 1;
  }

  .table-info {
    position: absolute;
    display: flex;
    flex-direction: column;
    align-items: center;
    white-space: nowrap;
    z-index: 1;
    pointer-events: none;
    transform-origin: center;
  }

  .table-info.info-above {
    flex-direction: row;
    gap: 6px;
  }

  .table-name {
    font-size: 13px;
    font-weight: 600;
    color: var(--text-h);
    line-height: 1.2;
  }

  .dnd-overlay {
    position: absolute;
    inset: 0;
    overflow: hidden;
  }

  .dnd-ghost {
    position: absolute;
    opacity: 0;
    pointer-events: none;
    width: 1px;
    height: 1px;
  }
</style>
