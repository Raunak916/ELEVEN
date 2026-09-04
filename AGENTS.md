<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Graphify Codebase Memory

- Always implicitly consult the Graphify knowledge graph (`.graphify/graph.json` and `.graphify/CODEBASE_GRAPH.md`) before investigating, modifying, or refactoring code.
- Never search or wander blindly. Use the indexed component tree, store mutations (`useAuctionStore`), and API routes to jump directly to exact files.
- Re-run `node scripts/generate-graphify.mjs` whenever new routes or modules are added to maintain 100% graph freshness.

# Ponytail — Anti-Bloat & Minimal Solutions

- Always apply the Ponytail decision ladder implicitly: YAGNI first, reuse existing codebase helpers/stores, native platform over dependencies, and write the shortest code that works.
- Never introduce speculative abstractions, unused wrappers, or redundant dependencies.

# Visual System & DESIGN.md Contract

- Always implicitly consult `DESIGN.md` for visual specifications, color tokens, typography scales, glassmorphism surfaces, and interaction physics.
- Adhere to the defined dark luxury stadium aesthetic (`#040609` – `#0e1014`), trophy gold accents (`oklch(0.75 0.18 75)`), pitch emeralds, and position role chromatic gradients (Forward = Rose, Mid = Emerald, Def = Amber, GK = Sky).
- Strictly avoid arbitrary colors, magic number layouts, and unthemed components.

