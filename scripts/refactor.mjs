import fs from 'fs';

function refactorFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  // Add Turso import if not exists
  if (!content.includes("import { turso } from './turso';")) {
    content = content.replace(/import Database from 'better-sqlite3';/, "import { turso } from './turso';");
  }
  
  // Replace function definitions with async
  content = content.replace(/export function ([a-zA-Z0-9_]+)\(/g, 'export async function $1(');
  
  // Replace the inside of the functions
  // Instead of complex regex, we just replace the db.prepare
  
  content = content.replace(/const db = get[a-zA-Z0-9_]+DB\(\);/g, '');
  content = content.replace(/db\.prepare\((.*?)\)\.get\((.*?)\)/g, '(await turso.execute({ sql: $1, args: [$2] })).rows[0]');
  content = content.replace(/db\.prepare\((.*?)\)\.get\(\)/g, '(await turso.execute($1)).rows[0]');
  
  content = content.replace(/db\.prepare\((.*?)\)\.all\((.*?)\)/g, '(await turso.execute({ sql: $1, args: [$2] })).rows');
  content = content.replace(/db\.prepare\((.*?)\)\.all\(\)/g, '(await turso.execute($1)).rows');
  
  content = content.replace(/db\.prepare\((.*?)\)\.run\((.*?)\)/g, 'await turso.execute({ sql: $1, args: [$2] })');
  content = content.replace(/db\.prepare\((.*?)\)\.run\(\)/g, 'await turso.execute($1)');

  fs.writeFileSync(filePath, content, 'utf8');
}

const libs = ['src/lib/player-db.ts', 'src/lib/room-db.ts', 'src/lib/music-db.ts'];
libs.forEach(f => {
  if (fs.existsSync(f)) {
    refactorFile(f);
  }
});
