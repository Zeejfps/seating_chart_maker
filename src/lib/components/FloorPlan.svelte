<script lang="ts">
  import { onMount } from "svelte";
  import { getTables, getGuestsByTable, setDndActive } from "../state.svelte";
  import { executeCommand } from "../command-history.svelte";
  import { AddTableCommand, MoveTableCommand } from "../commands";
  import { CANVAS_W, CANVAS_H, snapToGrid } from "../grid";
  import { assignGuestIfChanged } from "../dnd-utils";
  import { buildNewTable } from "../table-factory";
  import type { Guest, Table } from "../types";
  import TableCircle from "./TableCircle.svelte";

  interface Props {
    selectedTableId: string | null;
    onselecttable: (id: string | null) => void;
    onready?: (api: { panToTable: (tableId: string) => void }) => void;
  }

  let { selectedTableId, onselecttable, onready }: Props = $props();

  let viewportEl: HTMLDivElement | undefined = $state();
  let zoom = $state(1);
  let panX = $state(0);
  let panY = $state(0);

  // Pan state
  let isPanning = $state(false);
  let panStartMouseX = 0;
  let panStartMouseY = 0;
  let panStartX = 0;
  let panStartY = 0;

  // Table drag state
  let dragTableId: string | null = $state(null);
  let dragStartX = 0;
  let dragStartY = 0;
  let dragCurrentX = $state(0);
  let dragCurrentY = $state(0);
  let dragOffsetX = 0;
  let dragOffsetY = 0;
  let didDragMove = false;

  const TABLE_RADIUS = 70;
  const MIN_ZOOM = 0.25;
  const MAX_ZOOM = 2;

  function clampZoom(value: number): number {
    return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));
  }

  function calculateTableBounds(tables: Table[]): {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  } {
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    for (const t of tables) {
      minX = Math.min(minX, t.x - TABLE_RADIUS);
      minY = Math.min(minY, t.y - TABLE_RADIUS);
      maxX = Math.max(maxX, t.x + TABLE_RADIUS);
      maxY = Math.max(maxY, t.y + TABLE_RADIUS);
    }
    return { minX, minY, maxX, maxY };
  }

  function viewportToCanvas(
    clientX: number,
    clientY: number,
  ): { x: number; y: number } {
    if (!viewportEl) return { x: 0, y: 0 };
    const rect = viewportEl.getBoundingClientRect();
    return {
      x: (clientX - rect.left - panX) / zoom,
      y: (clientY - rect.top - panY) / zoom,
    };
  }

  // --- Pan ---
  function handleViewportMouseDown(e: MouseEvent) {
    if (e.button !== 0) return;
    // Only pan if clicking empty space (not a table circle)
    isPanning = true;
    panStartMouseX = e.clientX;
    panStartMouseY = e.clientY;
    panStartX = panX;
    panStartY = panY;
  }

  function handleWindowMouseMove(e: MouseEvent) {
    if (isPanning) {
      panX = panStartX + (e.clientX - panStartMouseX);
      panY = panStartY + (e.clientY - panStartMouseY);
      return;
    }
    if (dragTableId) {
      const canvas = viewportToCanvas(e.clientX, e.clientY);
      dragCurrentX = canvas.x - dragOffsetX;
      dragCurrentY = canvas.y - dragOffsetY;
    }
  }

  function finalizePan() {
    const didPan = panX !== panStartX || panY !== panStartY;
    isPanning = false;
    if (!didPan) onselecttable(null);
  }

  function finalizeTableDrag() {
    const snappedX = Math.max(0, Math.min(CANVAS_W, snapToGrid(dragCurrentX)));
    const snappedY = Math.max(0, Math.min(CANVAS_H, snapToGrid(dragCurrentY)));
    didDragMove = snappedX !== dragStartX || snappedY !== dragStartY;
    if (didDragMove) {
      executeCommand(
        new MoveTableCommand(
          dragTableId!,
          dragStartX,
          dragStartY,
          snappedX,
          snappedY,
        ),
      );
    }
    dragTableId = null;
  }

  function handleWindowMouseUp() {
    if (isPanning) return finalizePan();
    if (dragTableId) finalizeTableDrag();
  }

  // --- Table drag ---
  function handleTableMouseDown(e: MouseEvent, tableId: string) {
    if (e.button !== 0) return;
    e.stopPropagation();
    const table = getTables().find((t) => t.id === tableId);
    if (!table) return;

    dragTableId = tableId;
    dragStartX = table.x;
    dragStartY = table.y;
    dragCurrentX = table.x;
    dragCurrentY = table.y;

    const canvas = viewportToCanvas(e.clientX, e.clientY);
    dragOffsetX = canvas.x - table.x;
    dragOffsetY = canvas.y - table.y;
  }

  // --- Table click (select) ---
  function handleTableClick(e: MouseEvent, tableId: string) {
    e.stopPropagation();
    // If we just finished a drag, don't trigger click
    if (didDragMove) {
      didDragMove = false;
      return;
    }

    onselecttable(selectedTableId === tableId ? null : tableId);
  }

  function handleZoomWheel(e: WheelEvent) {
    const rect = viewportEl!.getBoundingClientRect();
    const pointerX = e.clientX - rect.left;
    const pointerY = e.clientY - rect.top;

    const oldZoom = zoom;
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = clampZoom(oldZoom * delta);

    panX = pointerX - (pointerX - panX) * (newZoom / oldZoom);
    panY = pointerY - (pointerY - panY) * (newZoom / oldZoom);
    zoom = newZoom;
  }

  function handleScrollPan(e: WheelEvent) {
    if (e.shiftKey) {
      panX -= e.deltaY;
    } else {
      panX -= e.deltaX;
      panY -= e.deltaY;
    }
  }

  function handleWheel(e: WheelEvent) {
    if (!viewportEl) return;
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      handleZoomWheel(e);
    } else {
      handleScrollPan(e);
    }
  }

  // --- Pan to specific table ---
  function panToTable(tableId: string) {
    if (!viewportEl) return;
    const table = getTables().find((t) => t.id === tableId);
    if (!table) return;
    const rect = viewportEl.getBoundingClientRect();
    const targetZoom = Math.max(zoom, 0.8);
    zoom = targetZoom;
    panX = rect.width / 2 - table.x * targetZoom;
    panY = rect.height / 2 - table.y * targetZoom;
    onselecttable(tableId);
  }

  function fitToView() {
    if (!viewportEl) return;
    const tables = getTables();
    if (tables.length === 0) {
      zoom = 1;
      panX = 0;
      panY = 0;
      return;
    }

    const padding = 80;
    const { minX, minY, maxX, maxY } = calculateTableBounds(tables);
    const rect = viewportEl.getBoundingClientRect();

    const contentW = maxX - minX + padding * 2;
    const contentH = maxY - minY + padding * 2;
    const newZoom = clampZoom(
      Math.min(rect.width / contentW, rect.height / contentH),
    );

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    zoom = newZoom;
    panX = rect.width / 2 - centerX * newZoom;
    panY = rect.height / 2 - centerY * newZoom;
  }

  function handleAddTable() {
    executeCommand(new AddTableCommand(buildNewTable()));
  }

  // --- DND for guest drops ---
  // Each circle manages a local items array for svelte-dnd-action
  let dndItemsByTable: Map<string, Guest[]> = $state(new Map());
  let dndDraggingTable: string | null = $state(null);

  $effect(() => {
    const gbt = getGuestsByTable();
    if (!dndDraggingTable) {
      const newMap = new Map<string, Guest[]>();
      for (const t of getTables()) {
        newMap.set(
          t.id,
          (gbt.get(t.id) ?? []).map((g) => ({ ...g })),
        );
      }
      dndItemsByTable = newMap;
    }
  });

  function handleDndConsider(tableId: string, e: CustomEvent) {
    dndDraggingTable = tableId;
    setDndActive(true);
    const newMap = new Map(dndItemsByTable);
    newMap.set(tableId, e.detail.items);
    dndItemsByTable = newMap;
  }

  function handleDndFinalize(tableId: string, e: CustomEvent) {
    dndDraggingTable = null;
    setDndActive(false);
    const newItems: Guest[] = e.detail.items;
    for (const item of newItems) {
      assignGuestIfChanged(item.id, tableId);
    }
    const newMap = new Map(dndItemsByTable);
    newMap.set(tableId, newItems);
    dndItemsByTable = newMap;
  }

  function centerView() {
    if (!viewportEl) return;
    const rect = viewportEl.getBoundingClientRect();
    if (getTables().length > 0) {
      fitToView();
    } else {
      panX = rect.width / 2 - (CANVAS_W / 2) * zoom;
      panY = rect.height / 2 - (CANVAS_H / 2) * zoom;
    }
  }

  // Window event listeners + initial centering
  let hasCentered = false;
  onMount(() => {
    window.addEventListener("mousemove", handleWindowMouseMove);
    window.addEventListener("mouseup", handleWindowMouseUp);
    centerView();
    if (getTables().length > 0) hasCentered = true;
    onready?.({ panToTable });
    return () => {
      window.removeEventListener("mousemove", handleWindowMouseMove);
      window.removeEventListener("mouseup", handleWindowMouseUp);
    };
  });

  // Re-center once tables load (if data wasn't ready on mount)
  $effect(() => {
    const tables = getTables();
    if (tables.length > 0 && !hasCentered) {
      hasCentered = true;
      centerView();
    }
  });
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class="floor-plan-viewport"
  class:panning={isPanning}
  class:dragging-table={!!dragTableId}
  bind:this={viewportEl}
  onmousedown={handleViewportMouseDown}
  onwheel={handleWheel}
>
  <div
    class="floor-plan-canvas"
    style="width:{CANVAS_W}px; height:{CANVAS_H}px; transform: translate({panX}px, {panY}px) scale({zoom});"
  >
    {#each getTables() as table (table.id)}
      {@const isDragging = dragTableId === table.id}
      <TableCircle
        {table}
        guestCount={(getGuestsByTable().get(table.id) ?? []).length}
        dndItems={dndItemsByTable.get(table.id) ?? []}
        isSelected={selectedTableId === table.id}
        {isDragging}
        isDndHover={dndDraggingTable === table.id}
        x={isDragging ? dragCurrentX : table.x}
        y={isDragging ? dragCurrentY : table.y}
        onmousedown={(e) => handleTableMouseDown(e, table.id)}
        onclick={(e) => handleTableClick(e, table.id)}
        ondndconsider={(e) => handleDndConsider(table.id, e)}
        ondndfinalize={(e) => handleDndFinalize(table.id, e)}
      />
    {/each}
  </div>

  <button
    class="floor-plan-add-btn"
    onmousedown={(e) => e.stopPropagation()}
    onclick={handleAddTable}
  >
    + Add Table
  </button>

  <div class="floor-plan-controls" onmousedown={(e) => e.stopPropagation()}>
    <button onclick={fitToView}>Fit to View</button>
    <span class="zoom-display">{Math.round(zoom * 100)}%</span>
  </div>
</div>

<style>
  .floor-plan-viewport {
    flex: 1;
    overflow: hidden;
    position: relative;
    cursor: grab;
  }

  .floor-plan-viewport.panning {
    cursor: grabbing;
  }

  .floor-plan-viewport.dragging-table {
    cursor: grabbing;
  }

  .floor-plan-canvas {
    position: absolute;
    top: 0;
    left: 0;
    transform-origin: 0 0;
    background-image: radial-gradient(
      circle,
      var(--border) 1px,
      transparent 1px
    );
    background-size: 50px 50px;
  }

  .floor-plan-add-btn {
    position: absolute;
    top: 12px;
    right: 12px;
    z-index: 20;
    font-size: 13px;
    padding: 6px 14px;
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 6px;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
  }

  .floor-plan-add-btn:hover {
    border-color: var(--accent-border);
    color: var(--accent);
  }

  .floor-plan-controls {
    position: absolute;
    bottom: 12px;
    right: 12px;
    display: flex;
    align-items: center;
    gap: 8px;
    z-index: 20;
  }

  .floor-plan-controls button {
    font-size: 12px;
    padding: 4px 10px;
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 6px;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
  }

  .zoom-display {
    font-size: 12px;
    color: var(--text);
    min-width: 40px;
    text-align: center;
  }
</style>
