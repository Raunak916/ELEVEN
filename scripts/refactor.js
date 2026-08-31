const fs = require('fs');
let text = fs.readFileSync('src/lib/room-db.ts', 'utf8');

text = text.replace(/import Database from 'better-sqlite3';\n?/, "import { turso } from './turso';\n");
text = text.replace(/let dbInstance[\s\S]*?;\n/, '');
text = text.replace(/export function getRoomDB[\s\S]*?^}/m, '');
text = text.replace(/const db = getRoomDB\(\);\n?/g, '');

text = text.replace(/export function (\w+)/g, 'export async function $1');

// db.prepare(sql).run(args) inline
text = text.replace(/db\.prepare\(\`([\s\S]*?)\`\)\.run\(([\s\S]*?)\)/g, 'await turso.execute({ sql: `$1`, args: [$2] })');
text = text.replace(/db\.prepare\('(.*?)'\)\.run\(([\s\S]*?)\)/g, 'await turso.execute({ sql: \'$1\', args: [$2] })');
text = text.replace(/db\.prepare\("(.*?)"\)\.run\(([\s\S]*?)\)/g, 'await turso.execute({ sql: "$1", args: [$2] })');

// db.prepare(sql).run() inline
text = text.replace(/db\.prepare\(\`([\s\S]*?)\`\)\.run\(\)/g, 'await turso.execute(`$1`)');
text = text.replace(/db\.prepare\('(.*?)'\)\.run\(\)/g, 'await turso.execute(\'$1\')');
text = text.replace(/db\.prepare\("(.*?)"\)\.run\(\)/g, 'await turso.execute("$1")');

// db.prepare(sql).get(args) inline
text = text.replace(/db\.prepare\(\`([\s\S]*?)\`\)\.get\(([\s\S]*?)\)/g, '(await turso.execute({ sql: `$1`, args: [$2] })).rows[0] as any');
text = text.replace(/db\.prepare\('(.*?)'\)\.get\(([\s\S]*?)\)/g, '(await turso.execute({ sql: \'$1\', args: [$2] })).rows[0] as any');
text = text.replace(/db\.prepare\("(.*?)"\)\.get\(([\s\S]*?)\)/g, '(await turso.execute({ sql: "$1", args: [$2] })).rows[0] as any');

// db.prepare(sql).get() inline
text = text.replace(/db\.prepare\(\`([\s\S]*?)\`\)\.get\(\)/g, '(await turso.execute(`$1`)).rows[0] as any');
text = text.replace(/db\.prepare\('(.*?)'\)\.get\(\)/g, '(await turso.execute(\'$1\')).rows[0] as any');
text = text.replace(/db\.prepare\("(.*?)"\)\.get\(\)/g, '(await turso.execute("$1")).rows[0] as any');

// db.prepare(sql).all(args) inline
text = text.replace(/db\.prepare\(\`([\s\S]*?)\`\)\.all\(([\s\S]*?)\)/g, '(await turso.execute({ sql: `$1`, args: [$2] })).rows as any');
text = text.replace(/db\.prepare\('(.*?)'\)\.all\(([\s\S]*?)\)/g, '(await turso.execute({ sql: \'$1\', args: [$2] })).rows as any');
text = text.replace(/db\.prepare\("(.*?)"\)\.all\(([\s\S]*?)\)/g, '(await turso.execute({ sql: "$1", args: [$2] })).rows as any');

// db.prepare(sql).all() inline
text = text.replace(/db\.prepare\(\`([\s\S]*?)\`\)\.all\(\)/g, '(await turso.execute(`$1`)).rows as any');
text = text.replace(/db\.prepare\('(.*?)'\)\.all\(\)/g, '(await turso.execute(\'$1\')).rows as any');
text = text.replace(/db\.prepare\("(.*?)"\)\.all\(\)/g, '(await turso.execute("$1")).rows as any');

// const stmt = db.prepare(...) blocks
text = text.replace(/const (\w+) = db\.prepare\(\`([\s\S]*?)\`\);\n\s*\1\.run\(([\s\S]*?)\);/g, 'await turso.execute({ sql: `$2`, args: [$3] });');
text = text.replace(/const (\w+) = db\.prepare\(\`([\s\S]*?)\`\);\n\s*return \1\.get\(([\s\S]*?)\);/g, 'return (await turso.execute({ sql: `$2`, args: [$3] })).rows[0] as any;');

// Pragma
text = text.replace(/const tableInfo = db\.prepare\('PRAGMA table_info\(rooms\)'\)\.all\(\);/g, "const tableInfo = (await turso.execute('PRAGMA table_info(rooms)')).rows as any;");

// db.exec
text = text.replace(/db\.exec\((.*?)\)/g, 'await turso.execute($1)');

// Internal function calls
const funcs = ['ensureRoom', 'getRoomByCode', 'getRoomById', 'createRoom'];
funcs.forEach(f => {
    // Only replace if not already preceded by await
    const regex = new RegExp(`(?<!await )${f}\\(`, 'g');
    text = text.replace(regex, `await ${f}(`);
});

// Fix return types for Room -> Promise<Room>
text = text.replace(/\): Room \{/g, '): Promise<Room> {');
text = text.replace(/\): Room \| null \{/g, '): Promise<Room | null> {');
text = text.replace(/\): boolean \{/g, '): Promise<boolean> {');
text = text.replace(/\): string \{/g, '): Promise<string> {');
text = text.replace(/\): RoomParticipant\[\] \{/g, '): Promise<RoomParticipant[]> {');
text = text.replace(/\): \{ success: true; room: Room; participant: RoomParticipant \} \| \{ success: false; error: string \} \{/g, '): Promise<{ success: true; room: Room; participant: RoomParticipant } | { success: false; error: string }> {');

text = text.replace(/Database\.Database/g, 'any');

// Remove leftover `export function getRoomDB()` completely if regex missed
text = text.replace(/export async function getRoomDB\(\): any \{[\s\S]*?return dbInstance;\n\}/, '');

fs.writeFileSync('src/lib/room-db.ts', text);
