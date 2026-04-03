<script lang="ts">
  import type { Guest, Table } from "../types";
  import TableCircle from "./TableCircle.svelte";
  import TableRectangle from "./TableRectangle.svelte";
  import TableSweetheart from "./TableSweetheart.svelte";

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
</script>

{#if table.shape === "rectangle"}
  <TableRectangle
    {table}
    {guestCount}
    {dndItems}
    {isSelected}
    {isDragging}
    {isDndHover}
    {isDimmed}
    {x}
    {y}
    {onmousedown}
    {onclick}
    {oncontextmenu}
    {ondndconsider}
    {ondndfinalize}
  />
{:else if table.shape === "sweetheart"}
  <TableSweetheart
    {table}
    {guestCount}
    {dndItems}
    {isSelected}
    {isDragging}
    {isDndHover}
    {isDimmed}
    {x}
    {y}
    {onmousedown}
    {onclick}
    {oncontextmenu}
    {ondndconsider}
    {ondndfinalize}
  />
{:else}
  <TableCircle
    {table}
    {guestCount}
    {dndItems}
    {isSelected}
    {isDragging}
    {isDndHover}
    {isDimmed}
    {x}
    {y}
    {onmousedown}
    {onclick}
    {oncontextmenu}
    {ondndconsider}
    {ondndfinalize}
  />
{/if}
