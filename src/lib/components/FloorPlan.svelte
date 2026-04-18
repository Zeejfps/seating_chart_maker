<script lang="ts">
  import { onMount } from "svelte";
  import {
    getTables,
    getGuestsByTable,
    setDndActive,
    isDndActive,
  } from "../state.svelte";
  import { executeCommand } from "../command-history.svelte";
  import { MoveTableCommand } from "../commands";
  import { CANVAS_W, CANVAS_H, snapToGrid } from "../grid";
  import { assignGuestIfChanged } from "../dnd-utils";
  import { TRIGGERS } from "svelte-dnd-action";
  import { addTable } from "../table-factory";
  import type { Guest, Table, TableShape, ModalState } from "../types";
  import {
    getRectWidth,
    RECT_HEIGHT,
    SWEETHEART_WIDTH,
    SWEETHEART_HEIGHT,
  } from "../table-shapes";
  import TableRenderer from "./TableRenderer.svelte";
  import ContextMenu, { type ContextMenuState } from "./ContextMenu.svelte";

  interface Props {
    selectedTableId: string | null;
    searchQuery: string;
    onselecttable: (id: string | null) => void;
    onshowmodal: (modal: ModalState) => void;
  }

  let { selectedTableId, searchQuery, onselecttable, onshowmodal }: Props =
    $props();

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

  // Context menu state
  let contextMenu: ContextMenuState | null = $state(null);

  // Add table dropdown
  let showAddMenu = $state(false);

  function handleAddFromMenu(shape: TableShape) {
    addTable(shape);
    showAddMenu = false;
  }

  // Search highlighting
  let highlightedTableIds: Set<string> = $derived.by(() => {
    if (!searchQuery) return new Set<string>();
    const q = searchQuery.toLowerCase();
    const gbt = getGuestsByTable();
    const ids = new Set<string>();
    for (const [tableId, guests] of gbt) {
      if (guests.some((g) => g.name.toLowerCase().includes(q))) {
        ids.add(tableId);
      }
    }
    // Also match table names
    for (const t of getTables()) {
      if (t.name.toLowerCase().includes(q)) {
        ids.add(t.id);
      }
    }
    return ids;
  });
  let isSearching = $derived(searchQuery.length > 0);

  const MIN_ZOOM = 0.75;
  const MAX_ZOOM = 2.5;

  function clampZoom(value: number): number {
    return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));
  }

  function getTableHalfSize(t: Table): { halfW: number; halfH: number } {
    let halfW: number, halfH: number;
    if (t.shape === "rectangle") {
      halfW = getRectWidth(t.capacity) / 2 + 20;
      halfH = RECT_HEIGHT / 2 + 20;
    } else if (t.shape === "sweetheart") {
      halfW = SWEETHEART_WIDTH / 2 + 20;
      halfH = SWEETHEART_HEIGHT / 2 + 20;
    } else {
      return { halfW: 70, halfH: 70 };
    }
    // Swap for 90/270 degree rotations
    if (t.rotation === 90 || t.rotation === 270) {
      return { halfW: halfH, halfH: halfW };
    }
    return { halfW, halfH };
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
      const { halfW, halfH } = getTableHalfSize(t);
      minX = Math.min(minX, t.x - halfW);
      minY = Math.min(minY, t.y - halfH);
      maxX = Math.max(maxX, t.x + halfW);
      maxY = Math.max(maxY, t.y + halfH);
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
    contextMenu = null;
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
    contextMenu = null;
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

  // --- Table click (select + context menu) ---
  function handleTableClick(e: MouseEvent, tableId: string) {
    e.stopPropagation();
    // If we just finished a drag, don't trigger click
    if (didDragMove) {
      didDragMove = false;
      return;
    }

    if (isDndActive()) return;

    onselecttable(tableId);
    contextMenu = {
      x: e.clientX,
      y: e.clientY,
      context: { type: "table", tableId },
    };
  }

  // --- Context menu ---
  function handleCanvasContextMenu(e: MouseEvent) {
    if (isDndActive()) return;
    e.preventDefault();
    const canvasPos = viewportToCanvas(e.clientX, e.clientY);
    contextMenu = {
      x: e.clientX,
      y: e.clientY,
      context: { type: "canvas", canvasX: canvasPos.x, canvasY: canvasPos.y },
    };
  }

  function handleTableContextMenu(e: MouseEvent, tableId: string) {
    if (isDndActive()) return;
    e.preventDefault();
    e.stopPropagation();
    contextMenu = {
      x: e.clientX,
      y: e.clientY,
      context: { type: "table", tableId },
    };
    onselecttable(tableId);
  }

  // Zoom editing state
  let editingZoom = $state(false);
  let zoomInputValue = $state("");

  function handleZoomWheel(e: WheelEvent) {
    const rect = viewportEl!.getBoundingClientRect();
    const pointerX = e.clientX - rect.left;
    const pointerY = e.clientY - rect.top;

    const oldZoom = zoom;
    const zoomSensitivity = 0.005;
    const newZoom = clampZoom(oldZoom * (1 - e.deltaY * zoomSensitivity));

    panX = pointerX - (pointerX - panX) * (newZoom / oldZoom);
    panY = pointerY - (pointerY - panY) * (newZoom / oldZoom);
    zoom = newZoom;
  }

  function zoomToCenter(newZoomValue: number) {
    if (!viewportEl) return;
    const rect = viewportEl.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const oldZoom = zoom;
    const clamped = clampZoom(newZoomValue);
    panX = cx - (cx - panX) * (clamped / oldZoom);
    panY = cy - (cy - panY) * (clamped / oldZoom);
    zoom = clamped;
  }

  function handleZoomInput(e: Event) {
    const input = e.target as HTMLInputElement;
    const parsed = parseFloat(input.value);
    if (!isNaN(parsed)) {
      zoomToCenter(parsed / 100);
    }
    editingZoom = false;
  }

  function handleZoomInputKeydown(e: KeyboardEvent) {
    if (e.key === "Enter") {
      (e.target as HTMLInputElement).blur();
    } else if (e.key === "Escape") {
      editingZoom = false;
    }
  }

  function autoFocusSelect(node: HTMLInputElement) {
    node.focus();
    node.select();
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
    contextMenu = null;
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      handleZoomWheel(e);
    } else {
      handleScrollPan(e);
    }
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
    const trigger = e.detail.info.trigger;
    const tableName = getTables().find((t) => t.id === tableId)?.name;
    const itemIds = e.detail.items.map(
      (g: Guest & { isDndShadowItem?: boolean }) =>
        `${g.name ?? "?"}(${g.isDndShadowItem ? "shadow:" : ""}${g.id.slice(0, 8)})`,
    );
    console.log(
      `[DnD consider] table=${tableName} trigger=${trigger} items=[${itemIds.join(", ")}]`,
    );
    const prevItems = dndItemsByTable.get(tableId) ?? [];
    const prevIds = prevItems.map((g) => `${g.name}(${g.id.slice(0, 8)})`);
    console.log(`[DnD consider] prev items=[${prevIds.join(", ")}]`);
    if (trigger === TRIGGERS.DRAGGED_ENTERED) {
      dndDraggingTable = tableId;
    } else if (
      trigger === TRIGGERS.DRAGGED_LEFT ||
      trigger === TRIGGERS.DRAGGED_LEFT_ALL
    ) {
      if (dndDraggingTable === tableId) dndDraggingTable = null;
    }
    setDndActive(true);
    // Deduplicate: when dragging a guest from a table's context menu back onto
    // the same table, svelte-dnd-action adds a shadow element but doesn't remove
    // the real guest (it only filters by placeholder ID). Remove the real item
    // if a shadow for the same guest exists.
    const draggedId = e.detail.info.id;
    let items: Guest[] = e.detail.items;
    const hasShadow = items.some(
      (i: Guest & { isDndShadowItem?: boolean }) => i.isDndShadowItem,
    );
    if (hasShadow && draggedId) {
      items = items.filter(
        (i: Guest & { isDndShadowItem?: boolean }) =>
          i.id !== draggedId || i.isDndShadowItem,
      );
    }
    const newMap = new Map(dndItemsByTable);
    newMap.set(tableId, items);
    dndItemsByTable = newMap;
  }

  function handleDndFinalize(tableId: string, e: CustomEvent) {
    const tableName = getTables().find((t) => t.id === tableId)?.name;
    console.log(
      `[DnD finalize] table=${tableName} items=${e.detail.items.length}`,
    );
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
  oncontextmenu={handleCanvasContextMenu}
>
  <div
    class="floor-plan-canvas"
    style="width:{CANVAS_W}px; height:{CANVAS_H}px; transform: translate({panX}px, {panY}px) scale({zoom});"
  >
    {#each getTables() as table (table.id)}
      {@const isDragging = dragTableId === table.id}
      <TableRenderer
        {table}
        guestCount={(dndItemsByTable.get(table.id) ?? []).length}
        dndItems={dndItemsByTable.get(table.id) ?? []}
        isSelected={selectedTableId === table.id}
        {isDragging}
        isDndHover={dndDraggingTable === table.id}
        isDimmed={isSearching && !highlightedTableIds.has(table.id)}
        x={isDragging ? dragCurrentX : table.x}
        y={isDragging ? dragCurrentY : table.y}
        onmousedown={(e) => handleTableMouseDown(e, table.id)}
        onclick={(e) => handleTableClick(e, table.id)}
        oncontextmenu={(e) => handleTableContextMenu(e, table.id)}
        ondndconsider={(e) => handleDndConsider(table.id, e)}
        ondndfinalize={(e) => handleDndFinalize(table.id, e)}
      />
    {/each}
  </div>

  <div class="add-table-group" onmousedown={(e) => e.stopPropagation()}>
    <button class="floor-plan-add-btn" onclick={() => addTable("round")}>
      + Add Table
    </button>
    <button
      class="floor-plan-add-btn add-table-toggle"
      onclick={() => (showAddMenu = !showAddMenu)}
    >
      &#9662;
    </button>
    {#if showAddMenu}
      <div class="add-table-menu">
        <button onclick={() => handleAddFromMenu("round")}>Round Table</button>
        <button onclick={() => handleAddFromMenu("rectangle")}
          >Rectangle Table</button
        >
        <button onclick={() => handleAddFromMenu("sweetheart")}
          >Sweetheart Table</button
        >
        <button onclick={() => handleAddFromMenu("row")}>Ceremony Row</button>
      </div>
    {/if}
  </div>

  <div class="floor-plan-controls" onmousedown={(e) => e.stopPropagation()}>
    <button onclick={fitToView}>Fit to View</button>
    <button class="zoom-btn" onclick={() => zoomToCenter(zoom - 0.1)}>−</button>
    {#if editingZoom}
      <input
        class="zoom-input"
        type="text"
        bind:value={zoomInputValue}
        onblur={handleZoomInput}
        onkeydown={handleZoomInputKeydown}
        use:autoFocusSelect
      />
    {:else}
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <span
        class="zoom-display"
        ondblclick={() => {
          zoomInputValue = String(Math.round(zoom * 100));
          editingZoom = true;
        }}>{Math.round(zoom * 100)}%</span
      >
    {/if}
    <button class="zoom-btn" onclick={() => zoomToCenter(zoom + 0.1)}>+</button>
  </div>

  <ContextMenu
    menu={contextMenu}
    onclose={() => (contextMenu = null)}
    {onshowmodal}
  />
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

  .add-table-group {
    position: absolute;
    top: 12px;
    right: 12px;
    z-index: 20;
    display: flex;
  }

  .floor-plan-add-btn {
    font-size: 13px;
    padding: 6px 14px;
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 6px 0 0 6px;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
  }

  .floor-plan-add-btn:hover {
    border-color: var(--accent-border);
    color: var(--accent);
  }

  .add-table-toggle {
    padding: 6px 8px;
    border-radius: 0 6px 6px 0;
    border-left: none;
  }

  .add-table-menu {
    position: absolute;
    top: 100%;
    right: 0;
    margin-top: 4px;
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 6px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    overflow: hidden;
    min-width: 160px;
  }

  .add-table-menu button {
    display: block;
    width: 100%;
    text-align: left;
    padding: 8px 12px;
    font-size: 13px;
    background: none;
    border: none;
    color: var(--text);
    cursor: pointer;
  }

  .add-table-menu button:hover {
    background: var(--accent-bg);
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

  .zoom-btn {
    width: 28px;
    height: 28px;
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 16px;
    line-height: 1;
  }

  .zoom-display {
    font-size: 12px;
    color: var(--text);
    min-width: 40px;
    text-align: center;
    cursor: default;
    user-select: none;
  }

  .zoom-input {
    width: 50px;
    font-size: 12px;
    text-align: center;
    padding: 2px 4px;
    border: 1px solid var(--accent-border);
    border-radius: 4px;
    background: var(--bg);
    color: var(--text);
    outline: none;
  }
</style>
