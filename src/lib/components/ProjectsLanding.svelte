<script lang="ts">
  import {
    createProject,
    deleteProject,
    duplicateProject,
    enterProject,
    exportProject,
    getProjects,
    importAsNewProject,
    renameProject,
  } from "../projects/projects.svelte";
  import { pickFile } from "../projects/project-persistence";
  import type { ProjectManifestEntry } from "../projects/types";
  import type { ModalState } from "../types";
  import ProjectCard from "./ProjectCard.svelte";
  import Modal from "./Modal.svelte";
  import ErrorModal from "./ErrorModal.svelte";

  let modal: ModalState | null = $state(null);

  function showModal(m: ModalState) {
    modal = m;
  }

  function closeModal() {
    modal = null;
  }

  async function handleImport() {
    const file = await pickFile(".json,application/json");
    if (!file) return;
    try {
      const id = await importAsNewProject(file);
      enterProject(id);
    } catch {
      showModal({
        type: "error",
        message: "Invalid snapshot file. Please check the file format.",
      });
    }
  }

  function handleOpen(id: string) {
    try {
      enterProject(id);
    } catch {
      showModal({
        type: "error",
        message: "Could not open project — data was missing or corrupted.",
      });
    }
  }

  function handleRequestDelete(entry: ProjectManifestEntry) {
    showModal({
      type: "confirm-delete-project",
      entry: { id: entry.id, name: entry.name },
    });
  }

  function handleDeleteConfirm() {
    if (modal?.type !== "confirm-delete-project") return;
    deleteProject(modal.entry.id);
    closeModal();
  }
</script>

<div class="landing">
  <header class="landing-header">
    <h1>Wedding Seating Chart</h1>
    <div class="header-actions">
      <button onclick={handleImport}>Import</button>
      <button class="primary" onclick={createProject}>+ New Project</button>
    </div>
  </header>

  {#if getProjects().length === 0}
    <div class="empty-state">
      <p>No projects yet.</p>
      <div class="empty-actions">
        <button class="primary" onclick={createProject}
          >+ Create your first project</button
        >
        <button onclick={handleImport}>Import from file</button>
      </div>
    </div>
  {:else}
    <div class="grid">
      {#each getProjects() as entry (entry.id)}
        <ProjectCard
          {entry}
          onopen={handleOpen}
          onrename={renameProject}
          onduplicate={duplicateProject}
          onexport={exportProject}
          ondelete={handleRequestDelete}
        />
      {/each}
    </div>
  {/if}
</div>

{#if modal?.type === "confirm-delete-project"}
  {@const name = modal.entry.name}
  <Modal title="Delete Project" onclose={closeModal}>
    {#snippet children()}
      <p>
        Delete "<strong>{name}</strong>"? This cannot be undone.
      </p>
    {/snippet}
    {#snippet actions()}
      <button onclick={closeModal}>Cancel</button>
      <button class="danger" onclick={handleDeleteConfirm}>Delete</button>
    {/snippet}
  </Modal>
{/if}

{#if modal?.type === "error"}
  <ErrorModal message={modal.message} onclose={closeModal} />
{/if}

<style>
  .landing {
    min-height: 100svh;
    padding: 32px 32px 64px;
    max-width: 1200px;
    margin: 0 auto;
    box-sizing: border-box;
  }

  .landing-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 24px;
    flex-wrap: wrap;
    gap: 12px;
  }

  .landing-header h1 {
    font-size: 24px;
  }

  .header-actions {
    display: flex;
    gap: 8px;
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 16px;
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 80px 16px;
    gap: 16px;
    border: 1px dashed var(--border);
    border-radius: 12px;
    color: var(--text);
  }

  .empty-actions {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    justify-content: center;
  }
</style>
