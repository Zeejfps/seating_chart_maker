<script lang="ts">
  import { onMount } from "svelte";
  import { getTables, getGuestsByTable, setDndActive } from "../state.svelte";
  import { executeCommand } from "../command-history.svelte";
  import {
    RenameTableCommand,
    RenameGuestCommand,
    UnassignGuestCommand,
    ChangeTableCapacityCommand,
    RotateTableCommand,
  } from "../commands";
  import { reorderIfChanged, sharedGuestDndOpts } from "../dnd-utils";
  import { addTableAt } from "../table-factory";
  import {
    canChangeCapacity,
    clampCapacity,
    SHAPE_DEFAULTS,
    TABLE_SHAPES,
    TABLE_SHAPE_LABELS,
  } from "../table-shapes";
  import { dndzone } from "svelte-dnd-action";
  import InlineEdit from "./InlineEdit.svelte";
  import { Trash2, X } from "lucide-svelte";
  import type { Guest, Table, TableShape, ModalState } from "../types";

  export type ContextMenuState =
    | { x: number; y: number; context: { type: "table"; tableId: string } }
    | {
        x: number;
        y: number;
        context: { type: "canvas"; canvasX: number; canvasY: number };
      };

  interface Props {
    menu: ContextMenuState | null;
    onclose: () => void;
    onshowmodal: (modal: ModalState) => void;
  }

  let { menu, onclose, onshowmodal }: Props = $props();

  let menuEl: HTMLDivElement | undefined = $state();
  let triggerTableEdit: (() => void) | undefined = $state();

  // Clamped position to keep menu in viewport
  let clampedX = $state(0);
  let clampedY = $state(0);
  let positioned = $state(false);

  function clampMenu() {
    if (!menu || !menuEl) return;
    const rect = menuEl.getBoundingClientRect();
    const pad = 8;
    clampedX = Math.max(
      pad,
      Math.min(menu.x, window.innerWidth - rect.width - pad),
    );
    clampedY = Math.max(
      pad,
      Math.min(menu.y, window.innerHeight - rect.height - pad),
    );
    positioned = true;
  }

  // Re-clamp whenever the menu element resizes (e.g. guest list populating)
  $effect(() => {
    if (!menuEl) {
      positioned = false;
      return;
    }
    const observer = new ResizeObserver(() => clampMenu());
    observer.observe(menuEl);
    return () => observer.disconnect();
  });

  // Re-clamp when menu target changes
  $effect(() => {
    if (menu && menuEl) {
      clampMenu();
    }
  });

  // Close on outside click, escape, scroll
  function handleWindowClick(e: MouseEvent) {
    if (draggingGuest) return;
    if (menuEl && !menuEl.contains(e.target as Node)) {
      onclose();
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (draggingGuest) return;
    if (e.key === "Escape") onclose();
  }

  function handleScroll() {
    if (draggingGuest) return;
    onclose();
  }

  onMount(() => {
    window.addEventListener("click", handleWindowClick, { capture: true });
    window.addEventListener("keydown", handleKeydown);
    window.addEventListener("scroll", handleScroll, { capture: true });
    return () => {
      window.removeEventListener("click", handleWindowClick, { capture: true });
      window.removeEventListener("keydown", handleKeydown);
      window.removeEventListener("scroll", handleScroll, { capture: true });
    };
  });

  // Derived data for table context
  let tableId = $derived(
    menu?.context.type === "table" ? menu.context.tableId : null,
  );

  let table: Table | undefined = $derived(
    tableId ? getTables().find((t) => t.id === tableId) : undefined,
  );

  let guests: Guest[] = $derived(
    tableId ? (getGuestsByTable().get(tableId) ?? []) : [],
  );

  // Local copy for DnD reordering
  let localGuests: Guest[] = $state([]);
  let draggingGuest = $state(false);

  $effect(() => {
    const items = guests.map((g) => ({ ...g }));
    if (!draggingGuest) localGuests = items;
  });

  function handleGuestDndConsider(e: CustomEvent) {
    console.log(
      `[CtxMenu DnD consider] trigger=${e.detail.info.trigger} items=${e.detail.items.length}`,
    );
    draggingGuest = true;
    setDndActive(true);
    localGuests = e.detail.items;
  }

  function handleGuestDndFinalize(e: CustomEvent) {
    console.log(
      `[CtxMenu DnD finalize] items=${e.detail.items.length} (was ${guests.length})`,
    );
    draggingGuest = false;
    setDndActive(false);
    const newItems: Guest[] = e.detail.items;
    // Only reorder if same number of items (guest stayed in this list)
    if (newItems.length === guests.length) {
      reorderIfChanged(newItems, guests);
    }
    localGuests = newItems;
  }

  function handleRenameTable(t: Table, newName: string) {
    executeCommand(new RenameTableCommand(t.id, t.name, newName));
  }

  function handleDeleteTable() {
    if (!table) return;
    onshowmodal({ type: "delete-table", table });
    onclose();
  }

  function handleRenameGuest(guest: Guest, newName: string) {
    executeCommand(new RenameGuestCommand(guest.id, guest.name, newName));
  }

  function handleUnassignGuest(guest: Guest) {
    if (guest.tableId) {
      executeCommand(new UnassignGuestCommand(guest.id, guest.tableId));
    }
  }

  function handleDeleteGuest(guest: Guest) {
    onshowmodal({ type: "delete-guest", guest });
    onclose();
  }

  function handleAddTableHere(shape: TableShape) {
    if (menu?.context.type === "canvas") {
      addTableAt(menu.context.canvasX, menu.context.canvasY, shape);
    }
    onclose();
  }

  function handleChangeCapacity(delta: number) {
    if (!table) return;
    const newCap = clampCapacity(table.shape, table.capacity + delta);
    if (newCap !== table.capacity) {
      executeCommand(
        new ChangeTableCapacityCommand(table.id, table.capacity, newCap),
      );
    }
  }

  function handleRotateTable() {
    if (!table) return;
    const newRotation = (table.rotation + 90) % 360;
    executeCommand(
      new RotateTableCommand(table.id, table.rotation, newRotation),
    );
  }
</script>

{#if menu}
  <!-- svelte-ignore a11y_no_static_element_interactions a11y_click_events_have_key_events -->
  <div
    class="context-menu"
    bind:this={menuEl}
    style="left:{clampedX}px; top:{clampedY}px; visibility:{positioned
      ? 'visible'
      : 'hidden'};"
    onclick={(e) => e.stopPropagation()}
    onmousedown={(e) => e.stopPropagation()}
  >
    {#if menu.context.type === "table" && table}
      <div class="menu-header">
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <span class="menu-header-name" ondblclick={() => triggerTableEdit?.()}>
          <InlineEdit
            value={table.name}
            oncommit={(newName) => handleRenameTable(table, newName)}
            bind:triggerEdit={triggerTableEdit}
          />
        </span>
        <button
          class="menu-header-delete"
          title="Delete table"
          onclick={handleDeleteTable}
        >
          <Trash2 size={14} />
        </button>
      </div>

      {#if localGuests.length > 0}
        <div class="menu-divider"></div>
        <div class="menu-subheader">Guests ({localGuests.length})</div>
        <div
          class="menu-guest-list"
          use:dndzone={{
            ...sharedGuestDndOpts,
            items: localGuests,
            dropFromOthersDisabled: true,
          }}
          onconsider={handleGuestDndConsider}
          onfinalize={handleGuestDndFinalize}
        >
          {#each localGuests as guest (guest.id)}
            <div class="menu-guest">
              <span class="grip-handle"></span>
              <span class="guest-name">
                <InlineEdit
                  value={guest.name}
                  oncommit={(newName) => handleRenameGuest(guest, newName)}
                />
              </span>
              <div class="guest-actions">
                <button
                  class="guest-action-btn"
                  title="Unassign"
                  onclick={() => handleUnassignGuest(guest)}
                >
                  <X size={12} />
                </button>
                <button
                  class="guest-action-btn delete"
                  title="Delete"
                  onclick={() => handleDeleteGuest(guest)}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          {/each}
        </div>
      {/if}

      {#if table.shape !== "round" || canChangeCapacity(table.shape)}
        <div class="menu-divider"></div>
        <div class="menu-footer">
          {#if table.shape !== "round"}
            <button
              class="footer-btn"
              title="Rotate 90°"
              onclick={handleRotateTable}>&#x21bb;</button
            >
          {/if}
          {#if canChangeCapacity(table.shape)}
            <div class="capacity-stepper">
              <button
                class="stepper-btn"
                disabled={table.capacity <=
                  SHAPE_DEFAULTS[table.shape].minCapacity ||
                  guests.length >= table.capacity}
                onclick={() => handleChangeCapacity(-1)}>&minus;</button
              >
              <span class="stepper-value">{table.capacity} seats</span>
              <button
                class="stepper-btn"
                disabled={table.capacity >=
                  SHAPE_DEFAULTS[table.shape].maxCapacity}
                onclick={() => handleChangeCapacity(1)}>+</button
              >
            </div>
          {/if}
        </div>
      {/if}
    {:else if menu.context.type === "canvas"}
      {#each TABLE_SHAPES as shape}
        <button class="menu-item" onclick={() => handleAddTableHere(shape)}>
          Add {TABLE_SHAPE_LABELS[shape]}
        </button>
      {/each}
    {/if}
  </div>
{/if}

<style>
  .context-menu {
    position: fixed;
    z-index: var(--z-context-menu);
    min-width: 240px;
    max-width: 320px;
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 8px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
    padding: 4px 0;
    font-size: 13px;
    max-height: calc(100vh - 16px);
    overflow-y: auto;
  }

  .menu-header {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 12px 6px;
    font-weight: 600;
    font-size: 14px;
    color: var(--text-h);
  }

  .menu-header-name {
    flex: 1;
    cursor: text;
    padding: 1px 4px;
    margin: -1px -4px;
    border-radius: 4px;
  }

  .menu-header-name:hover {
    background: var(--accent-bg);
  }

  .menu-header-delete {
    border: none;
    background: none;
    color: var(--text);
    padding: 2px;
    cursor: pointer;
    border-radius: 4px;
    display: flex;
    align-items: center;
    opacity: 0.4;
    flex-shrink: 0;
    line-height: 1;
  }

  .menu-header-delete:hover {
    opacity: 1;
    color: var(--warning-red);
    background: var(--warning-red-bg);
  }

  .menu-subheader {
    padding: 4px 12px 2px;
    font-size: 11px;
    font-weight: 600;
    color: var(--text);
    text-transform: uppercase;
    letter-spacing: 0.3px;
  }

  .menu-footer {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 12px;
  }

  .footer-btn {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    border: 1px solid var(--border);
    background: var(--bg);
    color: var(--text-h);
    font-size: 16px;
    line-height: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    padding: 0;
    flex-shrink: 0;
  }

  .footer-btn:hover {
    border-color: var(--accent-border);
    color: var(--accent);
  }

  .capacity-stepper {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .stepper-btn {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    border: 1px solid var(--border);
    background: var(--bg);
    color: var(--text-h);
    font-size: 14px;
    line-height: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    padding: 0;
  }

  .stepper-btn:hover:not(:disabled) {
    border-color: var(--accent-border);
    color: var(--accent);
  }

  .stepper-btn:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  .stepper-value {
    font-size: 12px;
    color: var(--text);
    min-width: 50px;
    text-align: center;
  }

  .menu-item {
    display: block;
    width: 100%;
    text-align: left;
    padding: 6px 12px;
    border: none;
    border-radius: 0;
    background: none;
    color: var(--text-h);
    cursor: pointer;
    font-size: 13px;
  }

  .menu-item:hover {
    background: var(--accent-bg);
    color: var(--accent);
  }

  .menu-divider {
    height: 1px;
    background: var(--border);
    margin: 4px 0;
  }

  .menu-guest-list {
    padding: 0;
  }

  .menu-guest {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 3px 12px;
    cursor: grab;
  }

  .menu-guest:hover {
    background: var(--accent-bg);
  }

  .menu-guest .guest-name {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--text-h);
  }

  .guest-actions {
    display: flex;
    gap: 2px;
    flex-shrink: 0;
    opacity: 0;
  }

  .menu-guest:hover .guest-actions {
    opacity: 1;
  }

  .guest-action-btn {
    border: none;
    background: none;
    color: var(--text);
    padding: 2px;
    cursor: pointer;
    border-radius: 3px;
    display: flex;
    align-items: center;
    line-height: 1;
  }

  .guest-action-btn:hover {
    color: var(--accent);
    background: var(--accent-bg);
  }

  .guest-action-btn.delete:hover {
    color: var(--warning-red);
    background: var(--warning-red-bg);
  }

  .grip-handle {
    display: flex;
    align-items: center;
    flex-shrink: 0;
    width: 8px;
    height: 12px;
    opacity: 0.25;
    cursor: grab;
  }

  .menu-guest:hover .grip-handle {
    opacity: 0.5;
  }

  .grip-handle::before {
    content: "";
    display: block;
    width: 8px;
    height: 12px;
    background-image: radial-gradient(
      circle,
      currentColor 1px,
      transparent 1px
    );
    background-size: 4px 4px;
    background-position: 0 0;
  }

  /* DnD shadow placeholder */
  .menu-guest:global([data-is-dnd-shadow-item-internal]) {
    opacity: 0.3;
    border: 1.5px dashed var(--accent-border);
    background: var(--accent-bg);
    visibility: visible !important;
  }

  .menu-guest:global([data-is-dnd-shadow-item-internal]) * {
    visibility: hidden;
  }
</style>
