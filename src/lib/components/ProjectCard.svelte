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

  let editing = $state(false);

  function isInteractive(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) return false;
    return !!target.closest(".inline-edit, .inline-edit-input, .menu-root");
  }

  function handleClick(e: MouseEvent) {
    if (editing) return;
    if (isInteractive(e.target)) return;
    onopen(entry.id);
  }

  function handleKeydown(e: KeyboardEvent) {
    if (editing) return;
    if (isInteractive(e.target)) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onopen(entry.id);
    }
  }
</script>

<div
  class="card"
  role="button"
  tabindex="0"
  onclick={handleClick}
  onkeydown={handleKeydown}
>
  <div class="card-header">
    <div class="card-name">
      <InlineEdit
        value={entry.name}
        oncommit={(name) => onrename(entry.id, name)}
        onediting={(e) => (editing = e)}
      />
    </div>
    <ProjectCardMenu
      onduplicate={() => onduplicate(entry.id)}
      onexport={() => onexport(entry.id)}
      ondelete={() => ondelete(entry)}
    />
  </div>
  <div class="card-stats">
    {entry.guestCount} guest{entry.guestCount === 1 ? "" : "s"} ·
    {entry.tableCount} table{entry.tableCount === 1 ? "" : "s"}
  </div>
  <div class="card-footer">
    Last edited {relativeTime(entry.updatedAt)}
  </div>
</div>

<style>
  .card {
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 16px;
    cursor: pointer;
    display: flex;
    flex-direction: column;
    gap: 6px;
    text-align: left;
    transition:
      border-color 0.1s,
      transform 0.1s;
  }

  .card:hover {
    border-color: var(--accent-border);
  }

  .card:focus-visible {
    outline: 2px solid var(--accent-border);
    outline-offset: 2px;
  }

  .card-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 8px;
  }

  .card-name {
    font-size: 16px;
    font-weight: 600;
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
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
