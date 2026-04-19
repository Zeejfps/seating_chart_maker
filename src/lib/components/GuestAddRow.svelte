<script lang="ts">
  import { executeCommand } from "../command-history.svelte";
  import { AddGuestCommand } from "../commands";

  interface Props {
    ondone: () => void;
  }

  let { ondone }: Props = $props();

  let name = $state("");
  let input: HTMLInputElement | undefined = $state();

  $effect(() => {
    requestAnimationFrame(() => input?.focus());
  });

  function commit() {
    const trimmed = name.trim();
    if (trimmed) {
      executeCommand(
        new AddGuestCommand({
          id: crypto.randomUUID(),
          name: trimmed,
          tableId: null,
        }),
      );
    }
    name = "";
    ondone();
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      commit();
    } else if (e.key === "Escape") {
      name = "";
      ondone();
    }
  }
</script>

<div class="add-guest-row">
  <input
    bind:this={input}
    type="text"
    placeholder="Guest name..."
    bind:value={name}
    onblur={commit}
    onkeydown={handleKeydown}
  />
</div>

<style>
  .add-guest-row {
    padding: 8px 12px;
  }

  .add-guest-row input {
    width: 100%;
  }
</style>
