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
  import type { Guest, ModalState } from "../types";
  import { getTableHalfSize } from "../table-shapes";
  import {
    getZoom,
    setZoom,
    getPanX,
    setPanX,
    getPanY,
    setPanY,
    setViewportEl,
    clampZoom,
    centerView,
  } from "../ui-state.svelte";
  import TableRenderer from "./TableRenderer.svelte";
  import ContextMenu, { type ContextMenuState } from "./ContextMenu.svelte";

  interface Props {
    selectedTableId: string | null;
    searchQuery: string;
    onselecttable: (id: string | null) => void;
    onshowmodal: (modal: ModalState) => void;
    onhoverchange?: (id: string | null) => void;
    oncursorchange?: (pos: { x: number; y: number } | null) => void;
    oncursoroverchange?: (over: boolean) => void;
  }

  let {
    selectedTableId,
    searchQuery,
    onselecttable,
    onshowmodal,
    onhoverchange,
    oncursorchange,
    oncursoroverchange,
  }: Props = $props();

  let viewportEl: HTMLDivElement | undefined = $state();

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

  // Hover / cursor tracking for copy-paste
  let cursorCanvas: { x: number; y: number } | null = $state(null);
  let isCursorOverViewport = $state(false);

  function hitTestTable(pos: { x: number; y: number }): string | null {
    const tables = getTables();
    for (let i = tables.length - 1; i >= 0; i--) {
      const t = tables[i];
      const { halfW, halfH } = getTableHalfSize(t);
      if (
        pos.x >= t.x - halfW &&
        pos.x <= t.x + halfW &&
        pos.y >= t.y - halfH &&
        pos.y <= t.y + halfH
      ) {
        return t.id;
      }
    }
    return null;
  }

  let hoveredTableId = $derived(
    isCursorOverViewport && cursorCanvas ? hitTestTable(cursorCanvas) : null,
  );

  $effect(() => {
    onhoverchange?.(hoveredTableId);
  });
  $effect(() => {
    oncursorchange?.(cursorCanvas);
  });
  $effect(() => {
    oncursoroverchange?.(isCursorOverViewport);
  });

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
    for (const t of getTables()) {
      if (t.name.toLowerCase().includes(q)) {
        ids.add(t.id);
      }
    }
    return ids;
  });
  let isSearching = $derived(searchQuery.length > 0);

  function viewportToCanvas(
    clientX: number,
    clientY: number,
  ): { x: number; y: number } {
    if (!viewportEl) return { x: 0, y: 0 };
    const rect = viewportEl.getBoundingClientRect();
    return {
      x: (clientX - rect.left - getPanX()) / getZoom(),
      y: (clientY - rect.top - getPanY()) / getZoom(),
    };
  }

  // --- Pan ---
  function handleViewportMouseDown(e: MouseEvent) {
    if (e.button !== 0) return;
    contextMenu = null;
    isPanning = true;
    panStartMouseX = e.clientX;
    panStartMouseY = e.clientY;
    panStartX = getPanX();
    panStartY = getPanY();
  }

  function handleWindowMouseMove(e: MouseEvent) {
    if (viewportEl) {
      const rect = viewportEl.getBoundingClientRect();
      const inside =
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom;
      isCursorOverViewport = inside;
      cursorCanvas = inside ? viewportToCanvas(e.clientX, e.clientY) : null;
    }
    if (isPanning) {
      setPanX(panStartX + (e.clientX - panStartMouseX));
      setPanY(panStartY + (e.clientY - panStartMouseY));
      return;
    }
    if (dragTableId) {
      const canvas = viewportToCanvas(e.clientX, e.clientY);
      dragCurrentX = canvas.x - dragOffsetX;
      dragCurrentY = canvas.y - dragOffsetY;
    }
  }

  function finalizePan() {
    const didPan = getPanX() !== panStartX || getPanY() !== panStartY;
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

  function handleZoomWheel(e: WheelEvent) {
    const rect = viewportEl!.getBoundingClientRect();
    const pointerX = e.clientX - rect.left;
    const pointerY = e.clientY - rect.top;

    const oldZoom = getZoom();
    const zoomSensitivity = 0.005;
    const newZoom = clampZoom(oldZoom * (1 - e.deltaY * zoomSensitivity));

    setPanX(pointerX - (pointerX - getPanX()) * (newZoom / oldZoom));
    setPanY(pointerY - (pointerY - getPanY()) * (newZoom / oldZoom));
    setZoom(newZoom);
  }

  function handleScrollPan(e: WheelEvent) {
    if (e.shiftKey) {
      setPanX(getPanX() - e.deltaY);
    } else {
      setPanX(getPanX() - e.deltaX);
      setPanY(getPanY() - e.deltaY);
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

  // --- DND for guest drops ---
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

  let hasCentered = false;
  onMount(() => {
    window.addEventListener("mousemove", handleWindowMouseMove);
    window.addEventListener("mouseup", handleWindowMouseUp);
    setViewportEl(viewportEl);
    centerView();
    if (getTables().length > 0) hasCentered = true;
    return () => {
      window.removeEventListener("mousemove", handleWindowMouseMove);
      window.removeEventListener("mouseup", handleWindowMouseUp);
      setViewportEl(undefined);
    };
  });

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
    style="width:{CANVAS_W}px; height:{CANVAS_H}px; transform: translate({getPanX()}px, {getPanY()}px) scale({getZoom()});"
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

  <ContextMenu
    menu={contextMenu}
    onclose={() => (contextMenu = null)}
    {onshowmodal}
  />
</div>

<style>
  .floor-plan-viewport {
    width: 100%;
    height: 100%;
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
</style>
