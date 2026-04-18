<script lang="ts">
  import type { ProjectManifestEntry } from "../projects/types";
  import InlineEdit from "./InlineEdit.svelte";
  import ProjectCardMenu from "./ProjectCardMenu.svelte";
  import { relativeTime } from "../relative-time";

  interface Props {
    entry: ProjectManifestEntry;
    onopen: (id: string) => void;
    onrename: (id: string, name: string) => void;
    onduplicate: (id: string) => void;
    onexport: (id: string) => void;
    ondelete: (entry: ProjectManifestEntry) => void;
  }

  let { entry, onopen, onrename, onduplicate, onexport, ondelete }: Props =
    $props();
</script>

<div class="card">
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div class="card-header" onclick={() => onopen(entry.id)}>
    <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
    <div class="card-name" onclick={(e) => e.stopPropagation()}>
      <InlineEdit
        value={entry.name}
        oncommit={(name) => onrename(entry.id, name)}
      />
    </div>
    <ProjectCardMenu
      onduplicate={() => onduplicate(entry.id)}
      onexport={() => onexport(entry.id)}
      ondelete={() => ondelete(entry)}
    />
  </div>
  <button
    type="button"
    class="open-area"
    aria-label={`Open ${entry.name}`}
    onclick={() => onopen(entry.id)}
  >
    <div class="card-stats">
      {entry.guestCount} guest{entry.guestCount === 1 ? "" : "s"} ·
      {entry.tableCount} table{entry.tableCount === 1 ? "" : "s"}
    </div>
    <div class="card-footer">
      Last edited {relativeTime(entry.updatedAt)}
    </div>
  </button>
</div>

<style>
  .card {
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    text-align: left;
    transition: border-color 0.1s;
  }

  .card:hover {
    border-color: var(--accent-border);
  }

  .card-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 8px;
    cursor: pointer;
  }

  .card-name {
    font-size: 16px;
    font-weight: 600;
    flex: 0 1 auto;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    cursor: default;
  }

  .open-area {
    display: block;
    width: 100%;
    padding: 0;
    margin: 0;
    background: transparent;
    border: 0;
    border-radius: 4px;
    text-align: left;
    cursor: pointer;
    color: inherit;
    font: inherit;
  }

  .open-area:focus-visible {
    outline: 2px solid var(--accent-border);
    outline-offset: 2px;
  }

  .card-stats {
    font-size: 13px;
    color: var(--text);
    opacity: 0.8;
  }

  .card-footer {
    font-size: 12px;
    color: var(--text);
    opacity: 0.6;
    margin-top: 4px;
  }
</style>
