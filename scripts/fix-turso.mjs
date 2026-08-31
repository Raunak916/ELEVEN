import Database from 'better-sqlite3';
import { createClient } from '@libsql/client';
import { join } from 'path';
import 'dotenv/config';

const LOCAL_DATA_DIR = join(process.cwd(), 'data');
const playersDbPath = join(LOCAL_DATA_DIR, 'players.db');

async function fix() {
  const turso = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  console.log("Dropping wrong players table...");
  await turso.execute(`DROP TABLE IF EXISTS players`);

  console.log("Creating correct players schema...");
  await turso.execute(`
    CREATE TABLE IF NOT EXISTS players (
      id TEXT PRIMARY KEY,
      external_ids TEXT NOT NULL,
      name TEXT NOT NULL,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      nationality TEXT NOT NULL,
      nationality_code TEXT NOT NULL,
      date_of_birth TEXT NOT NULL,
      primary_position TEXT NOT NULL,
      secondary_positions TEXT NOT NULL,
      role TEXT NOT NULL,
      photo_url TEXT,
      photo_source TEXT NOT NULL DEFAULT 'transfermarkt',
      career_start_year INTEGER,
      career_end_year INTEGER,
      current_team TEXT,
      current_league TEXT,
      market_value_eur INTEGER,
      highest_market_value_eur INTEGER,
      international_caps INTEGER,
      international_goals INTEGER,
      category TEXT NOT NULL DEFAULT 'CURRENT',
      search_text TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      source TEXT NOT NULL DEFAULT 'database'
    );
  `);

  console.log("Migrating players...");
  const localPlayersDb = new Database(playersDbPath);
  const players = localPlayersDb.prepare('SELECT * FROM players').all();
  
  const batchSize = 100;
  for (let i = 0; i < players.length; i += batchSize) {
    const batch = players.slice(i, i + batchSize);
    const statements = batch.map(p => ({
      sql: `INSERT INTO players (
        id, external_ids, name, first_name, last_name, nationality, nationality_code, 
        date_of_birth, primary_position, secondary_positions, role, photo_url, photo_source, 
        career_start_year, career_end_year, current_team, current_league, market_value_eur, highest_market_value_eur, 
        international_caps, international_goals, category, search_text, created_at, updated_at, source
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        p.id, p.external_ids, p.name, p.first_name, p.last_name, p.nationality, p.nationality_code,
        p.date_of_birth, p.primary_position, p.secondary_positions, p.role, p.photo_url, p.photo_source,
        p.career_start_year, p.career_end_year, p.current_team, p.current_league, p.market_value_eur, p.highest_market_value_eur,
        p.international_caps, p.international_goals, p.category, p.search_text, p.created_at, p.updated_at, p.source
      ].map(v => v === undefined ? null : v)
    }));
    await turso.batch(statements, 'write');
    console.log(`Migrated players ${i + 1} to ${Math.min(i + batchSize, players.length)}`);
  }
  
  console.log("Done!");
}

fix().catch(console.error);
