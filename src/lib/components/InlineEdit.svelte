<script lang="ts">
  interface Props {
    value: string;
    oncommit: (newValue: string) => void;
  }

  let { value, oncommit }: Props = $props();

  let editing = $state(false);
  let editValue = $state("");
  let inputEl: HTMLInputElement | undefined = $state();

  function startEdit() {
    editValue = value;
    editing = true;
    // Wait for DOM update then focus
    requestAnimationFrame(() => {
      inputEl?.focus();
      inputEl?.select();
    });
  }

  function commit() {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== value) {
      oncommit(trimmed);
    }
    editing = false;
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      commit();
    } else if (e.key === "Escape") {
      editing = false;
    }
  }
</script>

{#if editing}
  <input
    bind:this={inputEl}
    class="inline-edit-input"
    type="text"
    bind:value={editValue}
    onblur={commit}
    onkeydown={handleKeydown}
  />
{:else}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <span class="inline-edit" ondblclick={startEdit}>
    {value}
  </span>
{/if}
