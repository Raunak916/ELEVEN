import re

with open('src/lib/room-db.ts', 'r') as f:
    text = f.read()

# Replace better-sqlite3 imports
text = re.sub(r"import Database from 'better-sqlite3';\n?", "import { turso } from './turso';\n", text)
text = re.sub(r"let dbInstance.*?\n", "", text)
text = re.sub(r"export function getRoomDB.*?\{.*?\}", "", text, flags=re.DOTALL)
text = re.sub(r"const db = getRoomDB\(\);\n?", "", text)

# Fix signatures
def async_sig(match):
    name = match.group(1)
    args = match.group(2)
    ret = match.group(3)
    if "Promise<" not in ret:
        ret = f"Promise<{ret}>"
    return f"export async function {name}({args}): {ret} {{"

text = re.sub(r"export function (\w+)\((.*?)\): (.*?) \{", async_sig, text)

# Convert all stmt.run(...) or db.prepare(...).run/get/all
# Since python regex is easier:

# db.prepare(SQL).get(ARGS)
text = re.sub(r"db\.prepare\(`([\s\S]*?)`\)\.get\(([\s\S]*?)\)", r"(await turso.execute({ sql: `\1`, args: [\2] })).rows[0] as any", text)
text = re.sub(r"db\.prepare\('(.*?)'\)\.get\(([\s\S]*?)\)", r"(await turso.execute({ sql: '\1', args: [\2] })).rows[0] as any", text)

# db.prepare(SQL).all(ARGS)
text = re.sub(r"db\.prepare\(`([\s\S]*?)`\)\.all\(([\s\S]*?)\)", r"(await turso.execute({ sql: `\1`, args: [\2] })).rows as any", text)
text = re.sub(r"db\.prepare\('(.*?)'\)\.all\(([\s\S]*?)\)", r"(await turso.execute({ sql: '\1', args: [\2] })).rows as any", text)

# db.prepare(SQL).run(ARGS)
text = re.sub(r"db\.prepare\(`([\s\S]*?)`\)\.run\(([\s\S]*?)\)", r"await turso.execute({ sql: `\1`, args: [\2] })", text)
text = re.sub(r"db\.prepare\('(.*?)'\)\.run\(([\s\S]*?)\)", r"await turso.execute({ sql: '\1', args: [\2] })", text)

# db.prepare(SQL).get()
text = re.sub(r"db\.prepare\(`([\s\S]*?)`\)\.get\(\)", r"(await turso.execute(`\1`)).rows[0] as any", text)
text = re.sub(r"db\.prepare\('(.*?)'\)\.get\(\)", r"(await turso.execute('\1')).rows[0] as any", text)
text = re.sub(r'db\.prepare\("(.*?)"\)\.get\(\)', r'(await turso.execute("\1")).rows[0] as any', text)

# db.prepare(SQL).all()
text = re.sub(r"db\.prepare\(`([\s\S]*?)`\)\.all\(\)", r"(await turso.execute(`\1`)).rows as any", text)
text = re.sub(r"db\.prepare\('(.*?)'\)\.all\(\)", r"(await turso.execute('\1')).rows as any", text)
text = re.sub(r'db\.prepare\("(.*?)"\)\.all\(\)', r'(await turso.execute("\1")).rows as any', text)

# db.prepare(SQL).run()
text = re.sub(r"db\.prepare\(`([\s\S]*?)`\)\.run\(\)", r"await turso.execute(`\1`)", text)
text = re.sub(r"db\.prepare\('(.*?)'\)\.run\(\)", r"await turso.execute('\1')", text)

# const stmt = db.prepare(SQL) ... stmt.run(ARGS)
# Because it's hard with regex, let's just do it precisely for room-db.ts
text = text.replace("const stmt = db.prepare(`", "/* stmt */ const SQL = `")
text = text.replace("`);\n    stmt.run(", "`;\n    await turso.execute({ sql: SQL, args: [")
text = text.replace("`);\n    stmt.get(", "`;\n    return (await turso.execute({ sql: SQL, args: [")

text = text.replace("stmt.run", "await turso.execute({ sql: SQL, args: [")

text = text.replace("db.exec(\"ALTER", "await turso.execute(\"ALTER")

# Change types
text = text.replace("Database.Database", "any")

# Now add await to internal function calls:
funcs = ["createRoom", "getRoomByCode", "joinRoom", "leaveRoom", "updateRoomDraw", "updateRoomRoster", "updateRoomCards", "updateRoomStatus", "syncHostedRoomParticipants", "getRoomById"]
for f in funcs:
    text = re.sub(r"(?<!await )" + f + r"\(", f"await {f}(", text)

with open('src/lib/room-db.ts', 'w') as f:
    f.write(text)
