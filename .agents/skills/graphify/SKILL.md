---
name: graphify
description: >-
  Navigates and queries the project knowledge graph (.graphify/graph.json and
  .graphify/CODEBASE_GRAPH.md). Use when exploring architectural connections,
  locating components, understanding state flows, or tracing dependencies across
  the codebase without searching blindly.
---

# Graphify — Codebase Knowledge Graph

Graphify turns the entire Eleven Football Auction codebase into a structured, queryable knowledge graph. Instead of guessing or wandering around the repository with broad file searches, consult the graph to locate exact component hierarchies, data flows, and API endpoints instantly.

---

## 🗺️ Knowledge Graph Artifacts

- **Machine Graph**: [`.graphify/graph.json`](file:///C:/Users/isliv/Desktop/auction/.graphify/graph.json) — JSON node & edge index.
- **Visual & Architecture Graph**: [`.graphify/CODEBASE_GRAPH.md`](file:///C:/Users/isliv/Desktop/auction/.graphify/CODEBASE_GRAPH.md) — Mermaid diagrams, domain clusters, and full file index.
- **Generator Script**: [`scripts/generate-graphify.mjs`](file:///C:/Users/isliv/Desktop/auction/scripts/generate-graphify.mjs) — Re-generates the graph.

---

## 🏛️ Core Domain Map

### 1. Tactical Lineups & Formation Engine
* **Entry Hub**: [`src/app/auction/lineups/page.tsx`](file:///C:/Users/isliv/Desktop/auction/src/app/auction/lineups/page.tsx)
* **Team Builder**: [`src/app/auction/lineups/[teamId]/page.tsx`](file:///C:/Users/isliv/Desktop/auction/src/app/auction/lineups/%5BteamId%5D/page.tsx)
* **Interactive Pitch**: [`src/components/lineups/pitch-board.tsx`](file:///C:/Users/isliv/Desktop/auction/src/components/lineups/pitch-board.tsx)
* **Squad Roster**: [`src/components/lineups/roster-sidebar.tsx`](file:///C:/Users/isliv/Desktop/auction/src/components/lineups/roster-sidebar.tsx)
* **Formations Coordinates**: [`src/lib/formations.ts`](file:///C:/Users/isliv/Desktop/auction/src/lib/formations.ts)

### 2. Gemini AI Tactical Scouting
* **API Route**: [`src/app/api/ai/rate-lineup/route.ts`](file:///C:/Users/isliv/Desktop/auction/src/app/api/ai/rate-lineup/route.ts)
* **UI Modal**: [`src/components/lineups/ai-team-rating-modal.tsx`](file:///C:/Users/isliv/Desktop/auction/src/components/lineups/ai-team-rating-modal.tsx)
* **Hype Generator**: [`src/app/api/ai/hype/route.ts`](file:///C:/Users/isliv/Desktop/auction/src/app/api/ai/hype/route.ts)

### 3. Live Auction Arena & Room Sync
* **Draw Arena**: [`src/app/auction/draw/page.tsx`](file:///C:/Users/isliv/Desktop/auction/src/app/auction/draw/page.tsx)
* **Room Sync API**: [`src/app/api/rooms/sync/route.ts`](file:///C:/Users/isliv/Desktop/auction/src/app/api/rooms/sync/route.ts)
* **Turso SQLite**: [`src/lib/turso.ts`](file:///C:/Users/isliv/Desktop/auction/src/lib/turso.ts)

### 4. Player Pool & Roster
* **Pool Page**: [`src/app/auction/pool/page.tsx`](file:///C:/Users/isliv/Desktop/auction/src/app/auction/pool/page.tsx)
* **Bulk CSV Import**: [`src/components/auction/bulk-import-modal.tsx`](file:///C:/Users/isliv/Desktop/auction/src/components/auction/bulk-import-modal.tsx)
* **Add Player**: [`src/components/auction/add-player-modal.tsx`](file:///C:/Users/isliv/Desktop/auction/src/components/auction/add-player-modal.tsx)
* **Points Table**: [`src/app/auction/points-table/page.tsx`](file:///C:/Users/isliv/Desktop/auction/src/app/auction/points-table/page.tsx)

### 5. Shared App Shell & Global State
* **Main App Layout**: [`src/components/layout/app-layout.tsx`](file:///C:/Users/isliv/Desktop/auction/src/components/layout/app-layout.tsx)
* **Sidebar Navigation**: [`src/components/layout/sidebar.tsx`](file:///C:/Users/isliv/Desktop/auction/src/components/layout/sidebar.tsx)
* **Zustand Store**: [`src/lib/auction-store.ts`](file:///C:/Users/isliv/Desktop/auction/src/lib/auction-store.ts)
* **Type Contracts**: [`src/lib/types.ts`](file:///C:/Users/isliv/Desktop/auction/src/lib/types.ts)

---

## ⚡ How to Query the Graph

1. **Locating Features**: When modifying any feature, open [`.graphify/CODEBASE_GRAPH.md`](file:///C:/Users/isliv/Desktop/auction/.graphify/CODEBASE_GRAPH.md) to locate the exact entry point and dependent components immediately.
2. **Checking State Dependencies**: Check the dependency edges in `.graphify/graph.json` before refactoring state or props.
3. **Updating the Graph**: Whenever significant new pages or modules are added, run `node scripts/generate-graphify.mjs`.
