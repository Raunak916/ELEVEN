---
trigger: always_on
---

# Implicit Graphify Knowledge Graph Rule

1. **Always Use Implicitly**:
   Whenever the user asks for ANY feature change, bug fix, refactor, or architectural analysis, ALWAYS consult the Graphify knowledge graph (`.graphify/graph.json` and `.graphify/CODEBASE_GRAPH.md`) implicitly in the background. The user never needs to ask for it.

2. **Zero Blind Searching**:
   Never guess or grep blindly across the codebase. Use the indexed component hierarchy, state flows (`useAuctionStore`), API endpoints (`/api/*`), and database mappings from the knowledge graph to target exact files directly in O(1) time.

3. **Keep Knowledge Graph in Sync**:
   Whenever new files, routes, or modules are added or restructured, run `node scripts/generate-graphify.mjs` to keep `.graphify/graph.json` and `.graphify/CODEBASE_GRAPH.md` up to date.
