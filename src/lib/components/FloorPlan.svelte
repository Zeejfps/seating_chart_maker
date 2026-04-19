<script lang="ts">
  import { onMount } from "svelte";
  import { getTables, getGuestsByTable, isDndActive } from "../state.svelte";
  import { CANVAS_W, CANVAS_H } from "../grid";
  import type { ModalState } from "../types";
  import {
    getZoom,
    getPanX,
    getPanY,
    setViewportEl,
    centerView,
  } from "../ui/viewport-state.svelte";
  import * as pan from "../floor-plan/viewport-pan.svelte";
  import * as drag from "../floor-plan/table-drag.svelte";
  import {
    clientToCanvas,
    hitTestTable,
    isInsideRect,
    type CanvasPoint,
  } from "../floor-plan/coordinates";
  import { isZoomGesture, scrollPan, zoomAtPointer } from "../floor-plan/wheel";
  import { computeHighlightedTableIds } from "../floor-plan/search-highlight";
  import { useTableDndState } from "../floor-plan/dnd-state.svelte";
  import { getViewOnly } from "../ui-state.svelte";
  import Table from "./Table.svelte";
  import ContextMenu, { type ContextMenuState } from "./ContextMenu.svelte";

  interface Props {
    selectedTableId: string | null;
    searchQuery: string;
    onselecttable: (id: string | null) => void;
    onshowmodal: (modal: ModalState) => void;
    onhoverchange?: (id: string | null) => void;
    oncursorchange?: (pos: CanvasPoint | null) => void;
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
  let contextMenu: ContextMenuState | null = $state(null);
  let cursorCanvas: CanvasPoint | null = $state(null);
  let isCursorOverViewport = $state(false);
  let movedDuringLastDrag = false;
  let hasCentered = false;

  const dnd = useTableDndState();

  let hoveredTableId = $derived(
    isCursorOverViewport && cursorCanvas
      ? hitTestTable(cursorCanvas, getTables())
      : null,
  );
  let highlightedTableIds = $derived(
    computeHighlightedTableIds(searchQuery, getTables(), getGuestsByTable()),
  );
  let isSearching = $derived(searchQuery.length > 0);

  $effect(() => onhoverchange?.(hoveredTableId));
  $effect(() => oncursorchange?.(cursorCanvas));
  $effect(() => oncursoroverchange?.(isCursorOverViewport));

  function viewportRect(): DOMRect | null {
    return viewportEl?.getBoundingClientRect() ?? null;
  }

  function pointerToCanvas(e: MouseEvent): CanvasPoint | null {
    const rect = viewportRect();
    return rect ? clientToCanvas(e.clientX, e.clientY, rect) : null;
  }

  function closeContextMenu() {
    contextMenu = null;
  }

  function openTableMenu(e: MouseEvent, tableId: string) {
    contextMenu = {
      x: e.clientX,
      y: e.clientY,
      context: { type: "table", tableId },
    };
  }

  function openCanvasMenu(e: MouseEvent, canvas: CanvasPoint) {
    contextMenu = {
      x: e.clientX,
      y: e.clientY,
      context: { type: "canvas", canvasX: canvas.x, canvasY: canvas.y },
    };
  }

  function handleViewportMouseDown(e: MouseEvent) {
    if (e.button !== 0) return;
    closeContextMenu();
    pan.startPan(e);
  }

  function handleWindowMouseMove(e: MouseEvent) {
    const rect = viewportRect();
    if (!rect) return;
    isCursorOverViewport = isInsideRect(rect, e.clientX, e.clientY);
    cursorCanvas = isCursorOverViewport
      ? clientToCanvas(e.clientX, e.clientY, rect)
      : null;
    if (pan.isPanning()) {
      pan.updatePan(e);
      return;
    }
    if (drag.dragTableId() && cursorCanvas) {
      drag.updateTableDrag(cursorCanvas);
    }
  }

  function handleWindowMouseUp() {
    if (pan.isPanning()) {
      const { didPan } = pan.finalizePan();
      if (!didPan) onselecttable(null);
      return;
    }
    if (drag.dragTableId()) {
      const { didMove } = drag.finalizeTableDrag();
      movedDuringLastDrag = didMove;
    }
  }

  function handleTableMouseDown(e: MouseEvent, tableId: string) {
    if (e.button !== 0) return;
    e.stopPropagation();
    if (getViewOnly()) return;
    const canvas = pointerToCanvas(e);
    if (!canvas) return;
    closeContextMenu();
    drag.startTableDrag(tableId, canvas);
  }

  function handleTableClick(e: MouseEvent, tableId: string) {
    e.stopPropagation();
    if (movedDuringLastDrag) {
      movedDuringLastDrag = false;
      return;
    }
    if (isDndActive()) return;
    onselecttable(tableId);
    if (!getViewOnly()) openTableMenu(e, tableId);
  }

  function handleTableContextMenu(e: MouseEvent, tableId: string) {
    if (isDndActive()) return;
    e.preventDefault();
    e.stopPropagation();
    if (getViewOnly()) return;
    openTableMenu(e, tableId);
    onselecttable(tableId);
  }

  function handleCanvasContextMenu(e: MouseEvent) {
    if (isDndActive()) return;
    e.preventDefault();
    if (getViewOnly()) return;
    const canvas = pointerToCanvas(e);
    if (!canvas) return;
    openCanvasMenu(e, canvas);
  }

  function handleWheel(e: WheelEvent) {
    if (!viewportEl) return;
    closeContextMenu();
    if (isZoomGesture(e)) {
      e.preventDefault();
      zoomAtPointer(e, viewportEl.getBoundingClientRect());
    } else {
      scrollPan(e);
    }
  }

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

  // Center once the first table appears (e.g. after an async project load).
  $effect(() => {
    if (getTables().length > 0 && !hasCentered) {
      hasCentered = true;
      centerView();
    }
  });
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class="floor-plan-viewport"
  class:panning={pan.isPanning()}
  class:dragging-table={!!drag.dragTableId()}
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
      {@const isDragging = drag.dragTableId() === table.id}
      {@const items = dnd.itemsByTable.get(table.id) ?? []}
      <Table
        {table}
        guestCount={items.length}
        dndItems={items}
        isSelected={selectedTableId === table.id}
        {isDragging}
        isDndHover={dnd.draggingTable === table.id}
        isDimmed={isSearching && !highlightedTableIds.has(table.id)}
        x={isDragging ? drag.dragCurrentX() : table.x}
        y={isDragging ? drag.dragCurrentY() : table.y}
        onmousedown={(e) => handleTableMouseDown(e, table.id)}
        onclick={(e) => handleTableClick(e, table.id)}
        oncontextmenu={(e) => handleTableContextMenu(e, table.id)}
        ondndconsider={(e) => dnd.onConsider(table.id, e)}
        ondndfinalize={(e) => dnd.onFinalize(table.id, e)}
      />
    {/each}
  </div>

  <ContextMenu menu={contextMenu} onclose={closeContextMenu} {onshowmodal} />
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
