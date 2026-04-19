<script lang="ts">
  import { addTableAt } from "../../table-factory";
  import { TABLE_SHAPES, TABLE_SHAPE_LABELS } from "../../table-shapes";
  import type { TableShape } from "../../types";

  interface Props {
    canvasX: number;
    canvasY: number;
    onclose: () => void;
  }
  let { canvasX, canvasY, onclose }: Props = $props();

  function handleAdd(shape: TableShape) {
    addTableAt(canvasX, canvasY, shape);
    onclose();
  }
</script>

{#each TABLE_SHAPES as shape (shape)}
  <button class="menu-item" onclick={() => handleAdd(shape)}>
    Add {TABLE_SHAPE_LABELS[shape]}
  </button>
{/each}
