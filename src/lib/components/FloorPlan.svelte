<script lang="ts">
  import { onMount } from "svelte";
  import {
    getTables,
    getGuestsByTable,
    getGuests,
    getNextTablePosition,
    getNextTableNum,
  } from "../state.svelte";
  import { executeCommand } from "../command-history.svelte";
  import {
    AddTableCommand,
    AssignGuestCommand,
    MoveTableCommand,
    RemoveTableCommand,
  } from "../commands";
  import type { Guest } from "../types";
  import { dndzone } from "svelte-dnd-action";

  interface Props {
    selectedGuestId: string | null;
    onclearselection: () => void;
    selectedTableId: string | null;
    onselecttable: (id: string | null) => void;
  }

  let { selectedGuestId, onclearselection, selectedTableId, onselecttable }: Props = $props();

  const CANVAS_W = 3000;
  const CANVAS_H = 2000;
  const GRID_SIZE = 50;

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

  function snapToGrid(val: number): number {
    return Math.round(val / GRID_SIZE) * GRID_SIZE;
  }

  function viewportToCanvas(clientX: number, clientY: number): { x: number; y: number } {
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

  function handleWindowMouseUp(_e: MouseEvent) {
    if (isPanning) {
      isPanning = false;
      return;
    }
    if (dragTableId) {
      const snappedX = Math.max(0, Math.min(CANVAS_W, snapToGrid(dragCurrentX)));
      const snappedY = Math.max(0, Math.min(CANVAS_H, snapToGrid(dragCurrentY)));
      didDragMove = snappedX !== dragStartX || snappedY !== dragStartY;
      if (didDragMove) {
        executeCommand(
          new MoveTableCommand(dragTableId, dragStartX, dragStartY, snappedX, snappedY),
        );
      }
      dragTableId = null;
    }
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

  // --- Table click (assign / select) ---
  function handleTableClick(e: MouseEvent, tableId: string) {
    e.stopPropagation();
    // If we just finished a drag, don't trigger click
    if (didDragMove) {
      didDragMove = false;
      return;
    }

    if (selectedGuestId) {
      const guest = getGuests().find((g) => g.id === selectedGuestId);
      if (guest) {
        executeCommand(new AssignGuestCommand(guest.id, tableId, guest.tableId));
        onclearselection();
      }
      return;
    }

    onselecttable(selectedTableId === tableId ? null : tableId);
  }

  // --- Zoom ---
  function handleWheel(e: WheelEvent) {
    if (!viewportEl) return;

    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const rect = viewportEl.getBoundingClientRect();
      const pointerX = e.clientX - rect.left;
      const pointerY = e.clientY - rect.top;

      const oldZoom = zoom;
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      const newZoom = Math.min(2, Math.max(0.25, oldZoom * delta));

      panX = pointerX - (pointerX - panX) * (newZoom / oldZoom);
      panY = pointerY - (pointerY - panY) * (newZoom / oldZoom);
      zoom = newZoom;
    } else {
      // Scroll to pan
      if (e.shiftKey) {
        panX -= e.deltaY;
      } else {
        panX -= e.deltaX;
        panY -= e.deltaY;
      }
    }
  }

  // --- Fit to view ---
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
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const t of tables) {
      minX = Math.min(minX, t.x - 50);
      minY = Math.min(minY, t.y - 50);
      maxX = Math.max(maxX, t.x + 50);
      maxY = Math.max(maxY, t.y + 50);
    }

    const contentW = maxX - minX + padding * 2;
    const contentH = maxY - minY + padding * 2;
    const rect = viewportEl.getBoundingClientRect();

    const scaleX = rect.width / contentW;
    const scaleY = rect.height / contentH;
    const newZoom = Math.min(2, Math.max(0.25, Math.min(scaleX, scaleY)));

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    zoom = newZoom;
    panX = rect.width / 2 - centerX * newZoom;
    panY = rect.height / 2 - centerY * newZoom;
  }

  // --- Add table ---
  function handleAddTable() {
    const pos = getNextTablePosition();
    executeCommand(
      new AddTableCommand({
        id: crypto.randomUUID(),
        name: String(getNextTableNum()),
        capacity: 8,
        ...pos,
      }),
    );
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
        newMap.set(t.id, (gbt.get(t.id) ?? []).map((g) => ({ ...g })));
      }
      dndItemsByTable = newMap;
    }
  });

  function handleDndConsider(tableId: string, e: CustomEvent) {
    dndDraggingTable = tableId;
    const newMap = new Map(dndItemsByTable);
    newMap.set(tableId, e.detail.items);
    dndItemsByTable = newMap;
  }

  function handleDndFinalize(tableId: string, e: CustomEvent) {
    dndDraggingTable = null;
    const newItems: Guest[] = e.detail.items;
    for (const item of newItems) {
      const original = getGuests().find((g) => g.id === item.id);
      if (original && original.tableId !== tableId) {
        executeCommand(new AssignGuestCommand(original.id, tableId, original.tableId));
      }
    }
    const newMap = new Map(dndItemsByTable);
    newMap.set(tableId, newItems);
    dndItemsByTable = newMap;
    onclearselection();
  }

  // Window event listeners
  onMount(() => {
    window.addEventListener("mousemove", handleWindowMouseMove);
    window.addEventListener("mouseup", handleWindowMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleWindowMouseMove);
      window.removeEventListener("mouseup", handleWindowMouseUp);
    };
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
      {@const guests = getGuestsByTable().get(table.id) ?? []}
      {@const isDragging = dragTableId === table.id}
      {@const tx = isDragging ? dragCurrentX : table.x}
      {@const ty = isDragging ? dragCurrentY : table.y}
      {@const count = guests.length}
      {@const capacityStatus = count >= table.capacity ? (count > table.capacity ? "over" : "at") : "under"}
      {@const dndItems = dndItemsByTable.get(table.id) ?? []}
      <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
      <div
        class="table-circle"
        class:selected={selectedTableId === table.id}
        class:is-dragging={isDragging}
        class:drop-target={!!selectedGuestId}
        style="left:{tx}px; top:{ty}px;"
        onmousedown={(e) => handleTableMouseDown(e, table.id)}
        onclick={(e) => handleTableClick(e, table.id)}
      >
        <span class="table-circle-name">{table.name}</span>
        <span class="capacity-badge {capacityStatus}">{count}/{table.capacity}</span>
        <!-- Hidden dndzone for guest drops -->
        <div
          style="position:absolute; inset:0; border-radius:50%; overflow:hidden;"
          use:dndzone={{
            items: dndItems,
            type: "guest",
            flipDurationMs: 0,
            morphDisabled: true,
            dragDisabled: true,
            dropTargetStyle: {},
            dropTargetClasses: ["drag-over"],
          }}
          onconsider={(e) => handleDndConsider(table.id, e)}
          onfinalize={(e) => handleDndFinalize(table.id, e)}
        >
          {#each dndItems as guest (guest.id)}
            <div style="position:absolute; opacity:0; pointer-events:none; width:1px; height:1px;">
              {guest.name}
            </div>
          {/each}
        </div>
      </div>
    {/each}
  </div>

  <button class="floor-plan-add-btn" onmousedown={(e) => e.stopPropagation()} onclick={handleAddTable}>
    + Add Table
  </button>

  <div class="floor-plan-controls" onmousedown={(e) => e.stopPropagation()}>
    <button onclick={fitToView}>Fit to View</button>
    <span class="zoom-display">{Math.round(zoom * 100)}%</span>
  </div>
</div>
