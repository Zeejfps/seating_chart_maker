<script lang="ts">
  import { ArrowLeft, Eye, EyeOff, Upload } from "lucide-svelte";
  import {
    exportProject,
    getCurrentEntry,
    getCurrentProjectId,
    renameProject,
  } from "../projects/projects.svelte";
  import { getViewOnly, toggleViewOnly } from "../ui-state.svelte";
  import InlineEdit from "./InlineEdit.svelte";

  interface Props {
    onback: () => void;
  }

  let { onback }: Props = $props();

  const entry = $derived(getCurrentEntry());
  const viewOnly = $derived(getViewOnly());

  function handleExport() {
    const id = getCurrentProjectId();
    if (!id) return;
    exportProject(id);
  }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="floating-bar title-bar" onmousedown={(e) => e.stopPropagation()}>
  {#if !viewOnly}
    <button
      class="icon-button"
      onclick={onback}
      title="Back to projects"
      aria-label="Back to projects"
    >
      <ArrowLeft size={18} />
    </button>

    {#if entry}
      <h1 class="project-title" title="Double-click to rename">
        <InlineEdit
          value={entry.name}
          oncommit={(name) => renameProject(entry.id, name)}
        />
      </h1>
    {/if}

    <div class="title-bar-separator"></div>

    <button
      class="icon-text-button"
      onclick={handleExport}
      title="Export project as JSON"
    >
      <Upload size={16} />
      <span>Export</span>
    </button>
  {/if}

  <button
    class="icon-text-button"
    class:active={viewOnly}
    onclick={toggleViewOnly}
    title={viewOnly ? "Exit preview" : "Preview as guest"}
  >
    {#if viewOnly}
      <EyeOff size={16} />
    {:else}
      <Eye size={16} />
    {/if}
    <span>{viewOnly ? "Exit Preview" : "Preview"}</span>
  </button>
</div>

<style>
  .title-bar {
    top: 12px;
    left: 12px;
    padding: 4px 6px 4px 4px;
    gap: 4px;
    max-width: calc(100vw - 24px);
  }

  .project-title {
    font-size: 15px;
    font-weight: 600;
    line-height: 1;
    color: var(--text-h);
    margin: 0 12px 0 4px;
    max-width: 320px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .title-bar-separator {
    width: 1px;
    align-self: stretch;
    background: var(--border);
    margin: 4px 2px;
  }

  .icon-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    padding: 0;
    border: none;
    background: none;
    color: var(--text-h);
    border-radius: 6px;
  }

  .icon-button:hover {
    background: var(--card-bg);
  }

  .icon-text-button {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 10px;
    border: none;
    background: none;
    color: var(--text-h);
    border-radius: 6px;
    font-size: 13px;
  }

  .icon-text-button:hover {
    background: var(--card-bg);
    color: var(--accent);
  }

  .icon-text-button.active {
    background: var(--accent-bg);
    color: var(--accent);
    box-shadow: inset 0 0 0 1px var(--accent-border);
  }
</style>
