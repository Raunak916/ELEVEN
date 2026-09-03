import fs from 'fs';
import path from 'path';

const ROOT_DIR = process.cwd();
const SRC_DIR = path.join(ROOT_DIR, 'src');
const OUTPUT_DIR = path.join(ROOT_DIR, '.graphify');

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

console.log('⚡ Generating Graphify Knowledge Graph for Eleven Auction...');

function getAllFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      if (!['node_modules', '.next', '.git', '.agents'].includes(file)) {
        getAllFiles(filePath, fileList);
      }
    } else if (/\.(tsx|ts|jsx|js|mjs|json|css)$/.test(file)) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

const files = getAllFiles(SRC_DIR);

const nodes = [];
const edges = [];
const fileMap = new Map();

// 1. Register File Nodes
files.forEach((filePath) => {
  const relPath = path.relative(ROOT_DIR, filePath).replace(/\\/g, '/');
  const ext = path.extname(filePath);
  const baseName = path.basename(filePath, ext);
  
  let type = 'file';
  if (relPath.includes('src/app/api/')) type = 'api-route';
  else if (relPath.includes('src/app/')) type = 'page';
  else if (relPath.includes('src/components/')) type = 'component';
  else if (relPath.includes('src/lib/')) type = 'lib-module';

  const content = fs.readFileSync(filePath, 'utf-8');

  const node = {
    id: relPath,
    label: baseName,
    type,
    path: relPath,
    lines: content.split('\n').length,
    exports: [],
    imports: [],
  };

  // Find exports
  const exportMatches = content.matchAll(/export\s+(?:default\s+)?(?:function|const|class|interface|type)\s+([A-Za-z0-9_]+)/g);
  for (const m of exportMatches) {
    node.exports.push(m[1]);
  }

  // Find imports
  const importMatches = content.matchAll(/from\s+['"](@\/[^'"]+|\.\.?\/[^'"]+)['"]/g);
  for (const m of importMatches) {
    node.imports.push(m[1]);
  }

  nodes.push(node);
  fileMap.set(relPath, node);
});

// 2. Resolve Directional Edges
nodes.forEach((node) => {
  node.imports.forEach((imp) => {
    let targetPath = '';
    if (imp.startsWith('@/')) {
      const sub = imp.replace('@/', 'src/');
      // Match candidate extensions
      for (const ext of ['', '.ts', '.tsx', '.js', '.jsx', '/index.ts', '/index.tsx', '/route.ts', '/page.tsx']) {
        const candidate = (sub + ext).replace(/\\/g, '/');
        if (fileMap.has(candidate)) {
          targetPath = candidate;
          break;
        }
      }
    } else {
      const resolved = path.join(path.dirname(node.path), imp).replace(/\\/g, '/');
      for (const ext of ['', '.ts', '.tsx', '.js', '.jsx', '/index.ts', '/index.tsx']) {
        const candidate = (resolved + ext).replace(/\\/g, '/');
        if (fileMap.has(candidate)) {
          targetPath = candidate;
          break;
        }
      }
    }

    if (targetPath && targetPath !== node.path) {
      edges.push({
        source: node.path,
        target: targetPath,
        relation: node.type === 'page' || node.type === 'component' ? 'renders/uses' : 'imports',
      });
    }
  });
});

// 3. Add High-Level Architecture Modules
const modules = [
  {
    name: 'Tactical Lineup Engine',
    description: 'Pitch visualization, 7 formations, slot drag & drop, squad roster, and retina PNG export.',
    entry: 'src/app/auction/lineups/page.tsx',
    components: [
      'src/app/auction/lineups/[teamId]/page.tsx',
      'src/components/lineups/lineup-builder-screen.tsx',
      'src/components/lineups/pitch-board.tsx',
      'src/components/lineups/roster-sidebar.tsx',
      'src/components/lineups/player-picker-dialog.tsx',
      'src/components/lineups/ai-team-rating-modal.tsx',
      'src/lib/formations.ts',
    ],
  },
  {
    name: 'Gemini AI Tactical Scouting Engine',
    description: 'UEFA Pro calibrated squad review, 1-10 rating, sub-metrics, and key talisman detection with model fallback cascade.',
    entry: 'src/app/api/ai/rate-lineup/route.ts',
    components: [
      'src/components/lineups/ai-team-rating-modal.tsx',
      'src/app/api/ai/hype/route.ts',
    ],
  },
  {
    name: 'Live Auction & Room Sync System',
    description: 'Real-time room code synchronization, live bidding, draw deck, wheel of fortune, and Turso persistence.',
    entry: 'src/app/auction/draw/page.tsx',
    components: [
      'src/app/api/rooms/route.ts',
      'src/app/api/rooms/sync/route.ts',
      'src/app/api/rooms/draw/route.ts',
      'src/app/api/rooms/complete/route.ts',
      'src/lib/auction-store.ts',
      'src/lib/turso.ts',
    ],
  },
  {
    name: 'Player Pool & Roster Management',
    description: 'Player search, custom additions, CSV bulk-import with BOM & plain-text parsing, and points table tracking.',
    entry: 'src/app/auction/pool/page.tsx',
    components: [
      'src/components/auction/add-player-modal.tsx',
      'src/components/auction/bulk-import-modal.tsx',
      'src/components/auction/edit-player-modal.tsx',
      'src/app/auction/points-table/page.tsx',
      'src/app/api/players/search/route.ts',
      'src/app/api/players/bulk-match/route.ts',
    ],
  },
];

const graphData = {
  version: '1.0.0',
  generatedAt: new Date().toISOString(),
  projectName: 'Eleven Football Auction',
  stats: {
    totalNodes: nodes.length,
    totalEdges: edges.length,
    totalModules: modules.length,
  },
  modules,
  nodes,
  edges,
};

// Write graph.json
fs.writeFileSync(path.join(OUTPUT_DIR, 'graph.json'), JSON.stringify(graphData, null, 2));

// Generate Markdown Knowledge Graph Documentation
let mdContent = `# 🗺️ Graphify Architecture Knowledge Graph

> **Eleven Football Auction Platform** — Auto-generated knowledge graph mapping all AST nodes, modules, dependency flows, and state interactions.

---

## 📊 Summary Metrics
- **Total Registered Nodes**: ${nodes.length}
- **Total Dependency Edges**: ${edges.length}
- **Core Functional Domains**: ${modules.length}

---

## 🏛️ Functional Domain Clusters

`;

modules.forEach((mod) => {
  mdContent += `### 🔹 ${mod.name}\n`;
  mdContent += `*${mod.description}*\n\n`;
  mdContent += `- **Entry Point**: [\`${mod.entry}\`](file:///${path.join(ROOT_DIR, mod.entry).replace(/\\/g, '/')})\n`;
  mdContent += `- **Associated Components & Modules**:\n`;
  mod.components.forEach((c) => {
    mdContent += `  - [\`${c}\`](file:///${path.join(ROOT_DIR, c).replace(/\\/g, '/')})\n`;
  });
  mdContent += `\n`;
});

mdContent += `---

## 🔄 Core Data & State Flow Graph

\`\`\`mermaid
graph TD
  Store["useAuctionStore (Zustand)"] --> Persist["localStorage (football-auction-data)"]
  Store --> Turso["Turso Database (LibSQL)"]
  
  Layout["AppLayout"] --> Sidebar["Sidebar Nav (01-10)"]
  Layout --> PageContent["Active Route Page"]

  LineupsHub["/auction/lineups"] --> TeamBuilder["/auction/lineups/[teamId]"]
  TeamBuilder --> Pitch["PitchBoard (SVG / Retina PNG)"]
  TeamBuilder --> Roster["RosterSidebar (Drag & Drop)"]
  TeamBuilder --> Picker["PlayerPickerDialog"]
  TeamBuilder --> AiModal["AiTeamRatingModal"]
  
  AiModal --> AiApi["/api/ai/rate-lineup (Gemini Cascade)"]
  
  DrawPage["/auction/draw"] --> RoomsApi["/api/rooms/sync"]
  PoolPage["/auction/pool"] --> BulkImport["BulkImportModal"]
  PoolPage --> AddPlayer["AddPlayerModal"]
\`\`\`

---

## 📁 Complete Node Index (${nodes.length} Files)

| Node Path | Type | Exports |
| :--- | :--- | :--- |
`;

nodes.forEach((n) => {
  mdContent += `| [\`${n.path}\`](file:///${path.join(ROOT_DIR, n.path).replace(/\\/g, '/')}) | \`${n.type}\` | ${n.exports.join(', ') || '-'} |\n`;
});

fs.writeFileSync(path.join(OUTPUT_DIR, 'CODEBASE_GRAPH.md'), mdContent);

console.log(`✅ Graphify graph.json and CODEBASE_GRAPH.md generated successfully! (${nodes.length} nodes, ${edges.length} edges)`);
