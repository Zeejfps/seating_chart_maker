<script lang="ts" module>
  export type ContextMenuState =
    | { x: number; y: number; context: { type: "table"; tableId: string } }
    | {
        x: number;
        y: number;
        context: { type: "canvas"; canvasX: number; canvasY: number };
      };
</script>

<script lang="ts">
  import { onMount } from "svelte";
  import { isDndActive } from "../state.svelte";
  import { clampMenuToViewport } from "../context-menu-position";
  import TableContextMenu from "./context-menu/TableContextMenu.svelte";
  import CanvasContextMenu from "./context-menu/CanvasContextMenu.svelte";
  import type { ModalState } from "../types";

  interface Props {
    menu: ContextMenuState | null;
    onclose: () => void;
    onshowmodal: (modal: ModalState) => void;
  }
  let { menu, onclose, onshowmodal }: Props = $props();

  let menuEl: HTMLDivElement | undefined = $state();
  let clampedX = $state(0);
  let clampedY = $state(0);
  let positioned = $state(false);

  function reclamp() {
    if (!menu || !menuEl) return;
    const rect = menuEl.getBoundingClientRect();
    const { x, y } = clampMenuToViewport(
      menu.x,
      menu.y,
      rect.width,
      rect.height,
      window.innerWidth,
      window.innerHeight,
    );
    clampedX = x;
    clampedY = y;
    positioned = true;
  }

  $effect(() => {
    if (!menuEl) {
      positioned = false;
      return;
    }
    const observer = new ResizeObserver(() => reclamp());
    observer.observe(menuEl);
    return () => observer.disconnect();
  });

  $effect(() => {
    if (menu && menuEl) reclamp();
  });

  function handleWindowClick(e: MouseEvent) {
    if (isDndActive()) return;
    if (menuEl && !menuEl.contains(e.target as Node)) onclose();
  }

  function handleKeydown(e: KeyboardEvent) {
    if (isDndActive()) return;
    if (e.key === "Escape") onclose();
  }

  function handleScroll() {
    if (isDndActive()) return;
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
    {#if menu.context.type === "table"}
      <TableContextMenu
        tableId={menu.context.tableId}
        {onclose}
        {onshowmodal}
      />
    {:else}
      <CanvasContextMenu
        canvasX={menu.context.canvasX}
        canvasY={menu.context.canvasY}
        {onclose}
      />
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

  .context-menu :global(.menu-header) {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 12px 6px;
    font-weight: 600;
    font-size: 14px;
    color: var(--text-h);
  }

  .context-menu :global(.menu-header-name) {
    flex: 1;
    cursor: text;
    padding: 1px 4px;
    margin: -1px -4px;
    border-radius: 4px;
  }

  .context-menu :global(.menu-header-name:hover) {
    background: var(--accent-bg);
  }

  .context-menu :global(.menu-header-delete) {
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

  .context-menu :global(.menu-header-delete:hover) {
    opacity: 1;
    color: var(--warning-red);
    background: var(--warning-red-bg);
  }

  .context-menu :global(.menu-subheader) {
    padding: 4px 12px 2px;
    font-size: 11px;
    font-weight: 600;
    color: var(--text);
    text-transform: uppercase;
    letter-spacing: 0.3px;
  }

  .context-menu :global(.menu-footer) {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 12px;
  }

  .context-menu :global(.footer-btn) {
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

  .context-menu :global(.footer-btn:hover) {
    border-color: var(--accent-border);
    color: var(--accent);
  }

  .context-menu :global(.capacity-stepper) {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .context-menu :global(.stepper-btn) {
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

  .context-menu :global(.stepper-btn:hover:not(:disabled)) {
    border-color: var(--accent-border);
    color: var(--accent);
  }

  .context-menu :global(.stepper-btn:disabled) {
    opacity: 0.3;
    cursor: not-allowed;
  }

  .context-menu :global(.stepper-value) {
    font-size: 12px;
    color: var(--text);
    min-width: 50px;
    text-align: center;
  }

  .context-menu :global(.menu-item) {
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

  .context-menu :global(.menu-item:hover) {
    background: var(--accent-bg);
    color: var(--accent);
  }

  .context-menu :global(.menu-divider) {
    height: 1px;
    background: var(--border);
    margin: 4px 0;
  }

  .context-menu :global(.menu-guest-list) {
    padding: 0;
  }

  .context-menu :global(.menu-guest) {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 3px 12px;
    cursor: grab;
  }

  .context-menu :global(.menu-guest:hover) {
    background: var(--accent-bg);
  }

  .context-menu :global(.menu-guest .guest-name) {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--text-h);
  }

  .context-menu :global(.guest-actions) {
    display: flex;
    gap: 2px;
    flex-shrink: 0;
    opacity: 0;
  }

  .context-menu :global(.menu-guest:hover .guest-actions) {
    opacity: 1;
  }

  .context-menu :global(.guest-action-btn) {
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

  .context-menu :global(.guest-action-btn:hover) {
    color: var(--accent);
    background: var(--accent-bg);
  }

  .context-menu :global(.guest-action-btn.delete:hover) {
    color: var(--warning-red);
    background: var(--warning-red-bg);
  }

  .context-menu :global(.grip-handle) {
    display: flex;
    align-items: center;
    flex-shrink: 0;
    width: 8px;
    height: 12px;
    opacity: 0.25;
    cursor: grab;
  }

  .context-menu :global(.menu-guest:hover .grip-handle) {
    opacity: 0.5;
  }

  .context-menu :global(.grip-handle::before) {
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

  .context-menu :global(.menu-guest[data-is-dnd-shadow-item-internal]) {
    opacity: 0.3;
    border: 1.5px dashed var(--accent-border);
    background: var(--accent-bg);
    visibility: visible !important;
  }

  .context-menu :global(.menu-guest[data-is-dnd-shadow-item-internal] *) {
    visibility: hidden;
  }
</style>
