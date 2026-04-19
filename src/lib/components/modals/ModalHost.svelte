<script lang="ts">
  import type { Guest, ModalState, Table } from "../../types";
  import CsvImportModal from "./CsvImportModal.svelte";
  import DeleteTableModal from "./DeleteTableModal.svelte";
  import DeleteGuestModal from "./DeleteGuestModal.svelte";
  import ConfirmDeleteProjectModal from "./ConfirmDeleteProjectModal.svelte";
  import ErrorModal from "../ErrorModal.svelte";

  interface Props {
    modal: ModalState | null;
    onclose: () => void;
    onCsvReplace?: (names: string[]) => void;
    onCsvMerge?: (names: string[]) => void;
    onConfirmDeleteTable?: (table: Table) => void;
    onConfirmDeleteGuest?: (guest: Guest) => void;
    onConfirmDeleteProject?: (entry: { id: string; name: string }) => void;
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
</script>

{#if modal?.type === "csv-import"}
  <CsvImportModal
    {onclose}
    onreplace={() => onCsvReplace?.(modal.names)}
    onmerge={() => onCsvMerge?.(modal.names)}
  />
{:else if modal?.type === "delete-table"}
  <DeleteTableModal
    table={modal.table}
    {onclose}
    onconfirm={() => onConfirmDeleteTable?.(modal.table)}
  />
{:else if modal?.type === "delete-guest"}
  <DeleteGuestModal
    guest={modal.guest}
    {onclose}
    onconfirm={() => onConfirmDeleteGuest?.(modal.guest)}
  />
{:else if modal?.type === "confirm-delete-project"}
  <ConfirmDeleteProjectModal
    projectName={modal.entry.name}
    {onclose}
    onconfirm={() => onConfirmDeleteProject?.(modal.entry)}
  />
{:else if modal?.type === "error"}
  <ErrorModal message={modal.message} {onclose} />
{/if}
