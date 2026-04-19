<script lang="ts">
  import type { ModalState } from "../../types";
  import CsvImportModal from "./CsvImportModal.svelte";
  import DeleteTableModal from "./DeleteTableModal.svelte";
  import DeleteGuestModal from "./DeleteGuestModal.svelte";
  import ConfirmDeleteProjectModal from "./ConfirmDeleteProjectModal.svelte";
  import ErrorModal from "../ErrorModal.svelte";

  interface Props {
    modal: ModalState | null;
    onclose: () => void;
    onCsvReplace?: () => void;
    onCsvMerge?: () => void;
    onConfirmDeleteTable?: () => void;
    onConfirmDeleteGuest?: () => void;
    onConfirmDeleteProject?: () => void;
  }
  let {
    modal,
    onclose,
    onCsvReplace,
    onCsvMerge,
    onConfirmDeleteTable,
    onConfirmDeleteGuest,
    onConfirmDeleteProject,
  }: Props = $props();

  const noop = () => {};
</script>

{#if modal?.type === "csv-import"}
  <CsvImportModal
    {onclose}
    onreplace={onCsvReplace ?? noop}
    onmerge={onCsvMerge ?? noop}
  />
{:else if modal?.type === "delete-table"}
  <DeleteTableModal
    table={modal.table}
    {onclose}
    onconfirm={onConfirmDeleteTable ?? noop}
  />
{:else if modal?.type === "delete-guest"}
  <DeleteGuestModal
    guest={modal.guest}
    {onclose}
    onconfirm={onConfirmDeleteGuest ?? noop}
  />
{:else if modal?.type === "confirm-delete-project"}
  <ConfirmDeleteProjectModal
    projectName={modal.entry.name}
    {onclose}
    onconfirm={onConfirmDeleteProject ?? noop}
  />
{:else if modal?.type === "error"}
  <ErrorModal message={modal.message} {onclose} />
{/if}
