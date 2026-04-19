import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";

// https://vite.dev/config/
export default defineConfig({
  base: "/",
  plugins: [
    svelte({
      onwarn(warning, handler) {
        // Suppress a11y warnings that are already handled via svelte-ignore comments
        // but not respected by vite-plugin-svelte
        if (warning.code === "a11y_no_static_element_interactions") return;
        handler(warning);
      },
    }),
  ],
});
