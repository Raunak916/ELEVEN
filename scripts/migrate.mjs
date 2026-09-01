import Database from 'better-sqlite3';
import { createClient } from '@libsql/client';
import { join } from 'path';
import 'dotenv/config';

const IS_SERVERLESS = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.LAMBDA_TASK_ROOT);
const LOCAL_DATA_DIR = join(process.cwd(), 'data');

const playersDbPath = join(LOCAL_DATA_DIR, 'players.db');
const musicDbPath = join(LOCAL_DATA_DIR, 'music.db');
const roomsDbPath = IS_SERVERLESS ? '/tmp/rooms.db' : join(LOCAL_DATA_DIR, 'rooms.db');

async function migrate() {
  if (!process.env.TURSO_DATABASE_URL || !process.env.TURSO_AUTH_TOKEN) {
    console.error("Missing TURSO credentials in .env");
    process.exit(1);
  }

  const turso = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  console.log("Setting up Turso Schema...");

  // 1. Rooms Schema
  await turso.execute(`
    CREATE TABLE IF NOT EXISTS rooms (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      host_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'CREATED',
      settings_json TEXT DEFAULT '{}',
      current_draw_json TEXT DEFAULT NULL,
      roster_state_json TEXT DEFAULT NULL,
      cards_state_json TEXT DEFAULT NULL,
      participants_json TEXT NOT NULL DEFAULT '[]',
      version INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);
  
  // 2. Players Schema
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
      base_price REAL NOT NULL,
      category TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'AVAILABLE',
      rating INTEGER NOT NULL DEFAULT 80,
      potential INTEGER NOT NULL DEFAULT 80,
      stats_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      search_text TEXT NOT NULL
    );
  `);

  // 3. Player AI Hype Cache Schema
  await turso.execute(`
    CREATE TABLE IF NOT EXISTS player_hype_cache (
      player_id TEXT PRIMARY KEY,
      hype_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
    );
  `);

  // 4. Music Schema
  await turso.execute(`
    CREATE TABLE IF NOT EXISTS vinyl_categories (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT NOT NULL,
      glow TEXT NOT NULL,
      border_gradient TEXT NOT NULL,
      label_gradient TEXT NOT NULL,
      pill_bg TEXT NOT NULL,
      pill_text TEXT NOT NULL,
      badge_border TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  await turso.execute(`
    CREATE TABLE IF NOT EXISTS vinyl_songs (
      id TEXT PRIMARY KEY,
      vinyl_id TEXT NOT NULL,
      title TEXT NOT NULL,
      artist TEXT NOT NULL,
      url TEXT NOT NULL,
      youtube_id TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (vinyl_id) REFERENCES vinyl_categories(id) ON DELETE CASCADE
    );
  `);

  console.log("Schema created successfully.");

  // Migrate Data
  // -----------------------------
  // Players
  try {
    const localPlayersDb = new Database(playersDbPath);
    const players = localPlayersDb.prepare('SELECT * FROM players').all();
    console.log(`Found ${players.length} players locally. Migrating to Turso...`);
    
    // Batch insert for performance
    const batchSize = 100;
    for (let i = 0; i < players.length; i += batchSize) {
      const batch = players.slice(i, i + batchSize);
      const statements = batch.map(p => ({
        sql: `INSERT OR IGNORE INTO players (
          id, external_ids, name, first_name, last_name, nationality, nationality_code, 
          date_of_birth, primary_position, secondary_positions, role, photo_url, photo_source, 
          career_start_year, career_end_year, base_price, category, status, rating, potential, 
          stats_json, created_at, updated_at, search_text
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          p.id, p.external_ids, p.name, p.first_name, p.last_name, p.nationality, p.nationality_code,
          p.date_of_birth, p.primary_position, p.secondary_positions, p.role, p.photo_url, p.photo_source,
          p.career_start_year, p.career_end_year, p.base_price, p.category, p.status, p.rating, p.potential,
          p.stats_json, p.created_at, p.updated_at, p.search_text
        ].map(v => v === undefined ? null : v)
      }));
      await turso.batch(statements, 'write');
      console.log(`Migrated players ${i + 1} to ${Math.min(i + batchSize, players.length)}`);
    }
    localPlayersDb.close();
  } catch (err) {
    console.log("Error migrating players or no players db found:", err.message);
  }

  // -----------------------------
  // Music
  try {
    const localMusicDb = new Database(musicDbPath);
    const categories = localMusicDb.prepare('SELECT * FROM vinyl_categories').all();
    const songs = localMusicDb.prepare('SELECT * FROM vinyl_songs').all();
    
    console.log(`Found ${categories.length} vinyl categories and ${songs.length} songs. Migrating...`);

    if (categories.length > 0) {
      const statements = categories.map(c => ({
        sql: `INSERT OR IGNORE INTO vinyl_categories (id, title, category, description, glow, border_gradient, label_gradient, pill_bg, pill_text, badge_border, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [c.id, c.title, c.category, c.description, c.glow, c.border_gradient, c.label_gradient, c.pill_bg, c.pill_text, c.badge_border, c.created_at, c.updated_at]
      }));
      await turso.batch(statements, 'write');
    }

    if (songs.length > 0) {
      const statements = songs.map(s => ({
        sql: `INSERT OR IGNORE INTO vinyl_songs (id, vinyl_id, title, artist, url, youtube_id, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [s.id, s.vinyl_id, s.title, s.artist, s.url, s.youtube_id, s.sort_order, s.created_at, s.updated_at]
      }));
      await turso.batch(statements, 'write');
    }
    localMusicDb.close();
    console.log("Music migrated successfully.");
  } catch (err) {
    console.log("Error migrating music or no music db found:", err.message);
  }

  console.log("Migration complete!");
}

migrate().catch(console.error);
