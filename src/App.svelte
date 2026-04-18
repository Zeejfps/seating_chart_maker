<script lang="ts">
  import { onMount } from "svelte";
  import {
    initProjects,
    getCurrentProjectId,
  } from "./lib/projects/projects.svelte";
  import ProjectsLanding from "./lib/components/ProjectsLanding.svelte";
  import Editor from "./lib/components/Editor.svelte";
  import Toast from "./lib/components/Toast.svelte";

  let initialized = $state(false);

  onMount(() => {
    initProjects();
    initialized = true;
  });
</script>

{#if initialized}
  {#if getCurrentProjectId()}
    <Editor />
  {:else}
    <ProjectsLanding />
  {/if}
{/if}

<Toast />
