# Seating Chart Maker

Wedding seating chart tool. 100% client-side SPA deployed to GitHub Pages.

## Tech Stack

- **Svelte 5** with runes (`$state`, `$derived`, `$effect`, `$props`)
- **TypeScript 5.9** (strict mode)
- **Vite 8** (build + dev server)
- **svelte-dnd-action** for drag-and-drop

No backend, no database. Data persists in localStorage (`seating-chart-v1` key).

## Architecture

```
types.ts          → Pure interfaces (Guest, Table, ChartState, Command, ModalState)
state.svelte.ts   → Module-scoped $state runes with getter/setter functions
commands.ts       → Command pattern classes (execute/undo) for all mutations
command-history.svelte.ts → Undo/redo stacks
persistence.ts    → localStorage, JSON snapshot export/import, CSV import
components/       → Svelte UI components
```

### Key Patterns

- **All state mutations go through commands** — never mutate state directly from components. This ensures undo/redo works.
- **State is module-scoped** — imported directly, no context API or stores.
- **DnD uses local item copies** — each component with a dndzone maintains a local copy of items synced via `$effect`, to avoid mutating global state during drag.
- **Modal system uses a discriminated union** (`ModalState` in types.ts) — type-safe, no string dispatch.

## Commands

```bash
npm run dev       # Start dev server
npm run build     # Production build
npm run check     # svelte-check + tsc
npm run lint      # ESLint
npm run format    # Prettier
```

## Deployment

GitHub Pages via GitHub Actions, triggered on version tags (`v*`). Base path: `/seating_chart_maker/`.
