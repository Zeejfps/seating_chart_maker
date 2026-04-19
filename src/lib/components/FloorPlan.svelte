<script lang="ts">
  import { onMount } from "svelte";
  import {
    getTables,
    getGuestsByTable,
    setDndActive,
    isDndActive,
  } from "../state.svelte";
  import { CANVAS_W, CANVAS_H } from "../grid";
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
  import * as pan from "../viewport-pan.svelte";
  import * as drag from "../table-drag.svelte";
  import { buildDndItemsByTable, filterShadowItems } from "../floor-plan-dnd";
  import Table from "./Table.svelte";
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
  let contextMenu: ContextMenuState | null = $state(null);
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

  $effect(() => onhoverchange?.(hoveredTableId));
  $effect(() => oncursorchange?.(cursorCanvas));
  $effect(() => oncursoroverchange?.(isCursorOverViewport));

  let highlightedTableIds: Set<string> = $derived.by(() => {
    if (!searchQuery) return new Set<string>();
    const q = searchQuery.toLowerCase();
    const ids = new Set<string>();
    for (const [tableId, guests] of getGuestsByTable()) {
      if (guests.some((g) => g.name.toLowerCase().includes(q)))
        ids.add(tableId);
    }
    for (const t of getTables()) {
      if (t.name.toLowerCase().includes(q)) ids.add(t.id);
    }
    return ids;
  });
  let isSearching = $derived(searchQuery.length > 0);

  function viewportRect(): DOMRect | null {
    return viewportEl ? viewportEl.getBoundingClientRect() : null;
  }

  function clientToCanvas(
    clientX: number,
    clientY: number,
    rect: DOMRect,
  ): { x: number; y: number } {
    return {
      x: (clientX - rect.left - getPanX()) / getZoom(),
      y: (clientY - rect.top - getPanY()) / getZoom(),
    };
  }

  function handleViewportMouseDown(e: MouseEvent) {
    if (e.button !== 0) return;
    contextMenu = null;
    pan.startPan(e);
  }

  function handleWindowMouseMove(e: MouseEvent) {
    const rect = viewportRect();
    if (!rect) return;
    const inside =
      e.clientX >= rect.left &&
      e.clientX <= rect.right &&
      e.clientY >= rect.top &&
      e.clientY <= rect.bottom;
    isCursorOverViewport = inside;
    cursorCanvas = inside ? clientToCanvas(e.clientX, e.clientY, rect) : null;
    if (pan.isPanning()) {
      pan.updatePan(e);
      return;
    }
    if (drag.dragTableId()) {
      drag.updateTableDrag(clientToCanvas(e.clientX, e.clientY, rect));
    }
  }

  let movedDuringLastDrag = false;
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
    const rect = viewportRect();
    if (!rect) return;
    contextMenu = null;
    drag.startTableDrag(tableId, clientToCanvas(e.clientX, e.clientY, rect));
  }

  function handleTableClick(e: MouseEvent, tableId: string) {
    e.stopPropagation();
    if (movedDuringLastDrag) {
      movedDuringLastDrag = false;
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

  function handleCanvasContextMenu(e: MouseEvent) {
    if (isDndActive()) return;
    const rect = viewportRect();
    if (!rect) return;
    e.preventDefault();
    const canvasPos = clientToCanvas(e.clientX, e.clientY, rect);
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

  function zoomAtPointer(e: WheelEvent) {
    const rect = viewportEl!.getBoundingClientRect();
    const pointerX = e.clientX - rect.left;
    const pointerY = e.clientY - rect.top;
    const oldZoom = getZoom();
    const newZoom = clampZoom(oldZoom * (1 - e.deltaY * 0.005));
    setPanX(pointerX - (pointerX - getPanX()) * (newZoom / oldZoom));
    setPanY(pointerY - (pointerY - getPanY()) * (newZoom / oldZoom));
    setZoom(newZoom);
  }

  function scrollPan(e: WheelEvent) {
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
      zoomAtPointer(e);
    } else {
      scrollPan(e);
    }
  }

  let dndItemsByTable: Map<string, Guest[]> = $state(new Map());
  let dndDraggingTable: string | null = $state(null);

  $effect(() => {
    if (dndDraggingTable) return;
    dndItemsByTable = buildDndItemsByTable(getTables(), getGuestsByTable());
  });

  function handleDndConsider(tableId: string, e: CustomEvent) {
    const trigger = e.detail.info.trigger;
    if (trigger === TRIGGERS.DRAGGED_ENTERED) {
      dndDraggingTable = tableId;
    } else if (
      trigger === TRIGGERS.DRAGGED_LEFT ||
      trigger === TRIGGERS.DRAGGED_LEFT_ALL
    ) {
      if (dndDraggingTable === tableId) dndDraggingTable = null;
    }
    setDndActive(true);
    const items = filterShadowItems(e.detail.items, e.detail.info.id ?? null);
    dndItemsByTable = new Map(dndItemsByTable).set(tableId, items);
  }

  function handleDndFinalize(tableId: string, e: CustomEvent) {
    dndDraggingTable = null;
    setDndActive(false);
    const newItems: Guest[] = e.detail.items;
    for (const item of newItems) assignGuestIfChanged(item.id, tableId);
    dndItemsByTable = new Map(dndItemsByTable).set(tableId, newItems);
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
      <Table
        {table}
        guestCount={(dndItemsByTable.get(table.id) ?? []).length}
        dndItems={dndItemsByTable.get(table.id) ?? []}
        isSelected={selectedTableId === table.id}
        {isDragging}
        isDndHover={dndDraggingTable === table.id}
        isDimmed={isSearching && !highlightedTableIds.has(table.id)}
        x={isDragging ? drag.dragCurrentX() : table.x}
        y={isDragging ? drag.dragCurrentY() : table.y}
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
