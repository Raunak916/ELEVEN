const Database = require('better-sqlite3');
const db = new Database('data/players.db');

const results = db.prepare(
  "SELECT name, nationality, date_of_birth, category, photo_url FROM players WHERE name LIKE '%vieira%' OR name LIKE '%zidane%' OR name LIKE '%ronaldo%' OR name LIKE '%ronaldinho%' OR name LIKE '%henry%' OR name LIKE '%maldini%' OR name LIKE '%cruyff%' OR name LIKE '%beckham%' OR name LIKE '%xavi%' OR name LIKE '%iniesta%' OR name LIKE '%pirlo%' LIMIT 30"
).all();

console.log(results.map(r => `${r.name} | ${r.nationality} | ${r.date_of_birth} | ${r.category} | ${r.photo_url ? 'HAS_PHOTO' : 'NO_PHOTO'}`).join('\n'));

const count = db.prepare("SELECT COUNT(*) as c FROM players").get();
console.log(`\nTotal players: ${count.c}`);