<script lang="ts">
  import { onMount } from "svelte";
  import { getTables, getGuestsByTable } from "../state.svelte";
  import { executeCommand } from "../command-history.svelte";
  import {
    RenameTableCommand,
    RenameGuestCommand,
    UnassignGuestCommand,
  } from "../commands";
  import { addTableAt } from "../table-factory";
  import type { Guest, Table, ModalState } from "../types";

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

  // Clamped position to keep menu in viewport
  let clampedX = $state(0);
  let clampedY = $state(0);

  $effect(() => {
    if (menu && menuEl) {
      const rect = menuEl.getBoundingClientRect();
      const pad = 8;
      clampedX = Math.min(menu.x, window.innerWidth - rect.width - pad);
      clampedY = Math.min(menu.y, window.innerHeight - rect.height - pad);
    }
  });

  // Close on outside click, escape, scroll
  function handleWindowClick(e: MouseEvent) {
    if (menuEl && !menuEl.contains(e.target as Node)) {
      onclose();
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === "Escape") onclose();
  }

  function handleScroll() {
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

  // Inline editing state
  let editingTableName = $state(false);
  let tableNameValue = $state("");
  let editingGuestId: string | null = $state(null);
  let guestNameValue = $state("");

  // Reset editing state when menu opens/closes
  $effect(() => {
    if (menu) {
      editingTableName = false;
      editingGuestId = null;
    }
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

  function startRenameTable() {
    if (!table) return;
    tableNameValue = table.name;
    editingTableName = true;
    requestAnimationFrame(() => {
      const input = menuEl?.querySelector<HTMLInputElement>(
        ".rename-table-input",
      );
      input?.focus();
      input?.select();
    });
  }

  function commitRenameTable() {
    const trimmed = tableNameValue.trim();
    if (table && trimmed && trimmed !== table.name) {
      executeCommand(new RenameTableCommand(table.id, table.name, trimmed));
    }
    editingTableName = false;
  }

  function handleTableNameKeydown(e: KeyboardEvent) {
    e.stopPropagation();
    if (e.key === "Enter") {
      e.preventDefault();
      commitRenameTable();
    } else if (e.key === "Escape") {
      editingTableName = false;
    }
  }

  function handleDeleteTable() {
    if (!table) return;
    onshowmodal({ type: "delete-table", table });
    onclose();
  }

  function startRenameGuest(guest: Guest) {
    editingGuestId = guest.id;
    guestNameValue = guest.name;
    requestAnimationFrame(() => {
      const input = menuEl?.querySelector<HTMLInputElement>(
        `.rename-guest-input[data-guest-id="${guest.id}"]`,
      );
      input?.focus();
      input?.select();
    });
  }

  function commitRenameGuest(guest: Guest) {
    const trimmed = guestNameValue.trim();
    if (trimmed && trimmed !== guest.name) {
      executeCommand(new RenameGuestCommand(guest.id, guest.name, trimmed));
    }
    editingGuestId = null;
  }

  function handleGuestNameKeydown(e: KeyboardEvent, guest: Guest) {
    e.stopPropagation();
    if (e.key === "Enter") {
      e.preventDefault();
      commitRenameGuest(guest);
    } else if (e.key === "Escape") {
      editingGuestId = null;
    }
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

  function handleAddTableHere() {
    if (menu?.context.type === "canvas") {
      addTableAt(menu.context.canvasX, menu.context.canvasY);
    }
    onclose();
  }
</script>

{#if menu}
  <!-- svelte-ignore a11y_no_static_element_interactions a11y_click_events_have_key_events -->
  <div
    class="context-menu"
    bind:this={menuEl}
    style="left:{clampedX}px; top:{clampedY}px;"
    onclick={(e) => e.stopPropagation()}
    onmousedown={(e) => e.stopPropagation()}
  >
    {#if menu.context.type === "table" && table}
      <div class="menu-header">{table.name}</div>
      {#if editingTableName}
        <div class="menu-item">
          <input
            class="rename-table-input menu-input"
            type="text"
            bind:value={tableNameValue}
            onblur={commitRenameTable}
            onkeydown={handleTableNameKeydown}
          />
        </div>
      {:else}
        <button class="menu-item" onclick={startRenameTable}
          >Rename Table</button
        >
      {/if}
      <button class="menu-item danger" onclick={handleDeleteTable}
        >Delete Table</button
      >

      {#if guests.length > 0}
        <div class="menu-divider"></div>
        <div class="menu-subheader">Guests ({guests.length})</div>
        {#each guests as guest (guest.id)}
          <div class="menu-guest">
            {#if editingGuestId === guest.id}
              <input
                class="rename-guest-input menu-input"
                data-guest-id={guest.id}
                type="text"
                bind:value={guestNameValue}
                onblur={() => commitRenameGuest(guest)}
                onkeydown={(e) => handleGuestNameKeydown(e, guest)}
              />
            {:else}
              <span
                class="guest-name"
                ondblclick={() => startRenameGuest(guest)}>{guest.name}</span
              >
            {/if}
            <div class="guest-actions">
              {#if editingGuestId !== guest.id}
                <button
                  class="guest-action-btn"
                  title="Rename"
                  onclick={() => startRenameGuest(guest)}
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    ><path
                      d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"
                    /></svg
                  >
                </button>
              {/if}
              <button
                class="guest-action-btn"
                title="Unassign"
                onclick={() => handleUnassignGuest(guest)}
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  ><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg
                >
              </button>
              <button
                class="guest-action-btn delete"
                title="Delete"
                onclick={() => handleDeleteGuest(guest)}
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  ><path d="M3 6h18" /><path
                    d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"
                  /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg
                >
              </button>
            </div>
          </div>
        {/each}
      {/if}
    {:else if menu.context.type === "canvas"}
      <button class="menu-item" onclick={handleAddTableHere}
        >Add Table Here</button
      >
    {/if}
  </div>
{/if}

<style>
  .context-menu {
    position: fixed;
    z-index: 100;
    min-width: 200px;
    max-width: 300px;
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 8px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
    padding: 4px 0;
    font-size: 13px;
  }

  .menu-header {
    padding: 6px 12px 4px;
    font-weight: 600;
    font-size: 12px;
    color: var(--text);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .menu-subheader {
    padding: 4px 12px 2px;
    font-size: 11px;
    font-weight: 600;
    color: var(--text);
    text-transform: uppercase;
    letter-spacing: 0.3px;
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

  .menu-item.danger:hover {
    background: var(--warning-red-bg);
    color: var(--warning-red);
  }

  .menu-divider {
    height: 1px;
    background: var(--border);
    margin: 4px 0;
  }

  .menu-input {
    width: 100%;
    font: inherit;
    font-size: 13px;
    padding: 3px 6px;
    border: 1px solid var(--accent-border);
    border-radius: 4px;
    background: var(--bg);
    color: var(--text-h);
    outline: none;
  }

  .menu-guest {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 3px 12px;
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
    cursor: text;
    padding: 1px 2px;
    border-radius: 3px;
  }

  .menu-guest .guest-name:hover {
    background: rgba(0, 0, 0, 0.05);
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
</style>
