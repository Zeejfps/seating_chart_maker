<script lang="ts">
  import { onDestroy } from "svelte";
  import { Users, Download, ChevronLeft } from "lucide-svelte";
  import { getUnassignedGuests, getGuests } from "../state.svelte";
  import { executeCommand } from "../command-history.svelte";
  import { AddGuestCommand, BatchCommand } from "../commands";
  import { parseCsv } from "../csv";
  import { pickFile } from "../projects/project-persistence";
  import type { ModalState } from "../types";
  import {
    getUnassignedCollapsed,
    setUnassignedCollapsed,
    getUnassignedWidth,
    setUnassignedWidth,
    commitUnassignedWidth,
    UNASSIGNED_MIN_WIDTH,
    UNASSIGNED_MAX_WIDTH,
  } from "../ui-state.svelte";
  import UnassignedGuestList from "./UnassignedGuestList.svelte";

  interface Props {
    searchQuery: string;
    onshowmodal: (modal: ModalState) => void;
  }

  let { searchQuery, onshowmodal }: Props = $props();

  let unassignedCount = $derived(getUnassignedGuests().length);

  async function handleCsvImport() {
    const file = await pickFile(".csv,text/csv");
    if (!file) return;
    const text = await file.text();
    const names = parseCsv(text);
    if (!names.length) return;

    if (getGuests().length === 0) {
      const cmds = names.map(
        (name: string) =>
          new AddGuestCommand({
            id: crypto.randomUUID(),
            name,
            tableId: null,
          }),
      );
      executeCommand(new BatchCommand(cmds, "Import guest list"));
    } else {
      onshowmodal({ type: "csv-import", names });
    }
  }

  let resizeStartX = 0;
  let resizeStartWidth = 0;

  function handleResizeMouseDown(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    resizeStartX = e.clientX;
    resizeStartWidth = getUnassignedWidth();
    window.addEventListener("mousemove", handleResizeMouseMove);
    window.addEventListener("mouseup", handleResizeMouseUp);
  }

  function handleResizeMouseMove(e: MouseEvent) {
    setUnassignedWidth(resizeStartWidth + (e.clientX - resizeStartX));
  }

  function handleResizeMouseUp() {
    window.removeEventListener("mousemove", handleResizeMouseMove);
    window.removeEventListener("mouseup", handleResizeMouseUp);
    commitUnassignedWidth();
  }

  onDestroy(() => {
    window.removeEventListener("mousemove", handleResizeMouseMove);
    window.removeEventListener("mouseup", handleResizeMouseUp);
  });
</script>

{#if getUnassignedCollapsed()}
  <button
    class="floating-bar collapsed-pill"
    onclick={() => setUnassignedCollapsed(false)}
    onmousedown={(e) => e.stopPropagation()}
    title="Show unassigned guests"
    aria-label="Show unassigned guests"
  >
    <Users size={16} />
    <span class="count">{unassignedCount}</span>
  </button>
{:else}
  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
  <aside
    class="unassigned-panel"
    style="width: {getUnassignedWidth()}px;"
    onmousedown={(e) => e.stopPropagation()}
  >
    <div class="panel-header">
      <span class="panel-title">Unassigned</span>
      <button
        class="header-btn"
        onclick={handleCsvImport}
        title="Import guests from CSV"
        aria-label="Import CSV"
      >
        <Download size={14} />
      </button>
      <button
        class="header-btn"
        onclick={() => setUnassignedCollapsed(true)}
        title="Collapse panel"
        aria-label="Collapse panel"
      >
        <ChevronLeft size={16} />
      </button>
    </div>
    <div class="panel-scroll">
      <UnassignedGuestList {searchQuery} {onshowmodal} />
    </div>
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <div
      class="resize-handle"
      onmousedown={handleResizeMouseDown}
      role="separator"
      aria-orientation="vertical"
      aria-valuemin={UNASSIGNED_MIN_WIDTH}
      aria-valuemax={UNASSIGNED_MAX_WIDTH}
      aria-valuenow={getUnassignedWidth()}
    ></div>
  </aside>
{/if}

<style>
  .collapsed-pill {
    top: 64px;
    left: 12px;
    padding: 8px 12px;
    gap: 8px;
    color: var(--text-h);
    cursor: pointer;
    font: inherit;
  }

  .collapsed-pill:hover {
    color: var(--accent);
    background: var(--card-bg);
  }

  .collapsed-pill .count {
    font-size: 13px;
    font-weight: 600;
  }

  .unassigned-panel {
    position: fixed;
    top: 64px;
    left: 12px;
    bottom: 64px;
    z-index: var(--z-floating);
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 8px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    box-sizing: border-box;
    min-width: 180px;
    max-width: 480px;
  }

  .panel-header {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 8px 8px 6px 12px;
    border-bottom: 1px solid var(--border);
  }

  .panel-title {
    flex: 1;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--text);
  }

  .header-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 26px;
    height: 26px;
    padding: 0;
    border: none;
    background: none;
    color: var(--text);
    border-radius: 4px;
  }

  .header-btn:hover {
    background: var(--card-bg);
    color: var(--accent);
  }

  .panel-scroll {
    flex: 1;
    overflow-y: auto;
    min-height: 0;
  }

  .resize-handle {
    position: absolute;
    top: 0;
    right: -3px;
    width: 6px;
    height: 100%;
    cursor: ew-resize;
  }

  .resize-handle:hover {
    background: var(--accent-border);
  }
</style>
