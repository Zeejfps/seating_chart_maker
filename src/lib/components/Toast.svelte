<script lang="ts">
  import { getToast } from "../toast.svelte";
</script>

{#if getToast()}
  <div class="toast" role="status" aria-live="polite">
    {getToast()}
  </div>
{/if}

<style>
  .toast {
    position: fixed;
    bottom: 32px;
    left: 50%;
    transform: translateX(-50%);
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 999px;
    padding: 10px 20px;
    font-size: 14px;
    color: var(--text);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25);
    z-index: 200;
    pointer-events: none;
    animation: toast-in 120ms ease-out;
  }

  @keyframes toast-in {
    from {
      opacity: 0;
      transform: translate(-50%, 8px);
    }
    to {
      opacity: 1;
      transform: translate(-50%, 0);
    }
  }
</style>
