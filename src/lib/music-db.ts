import Database from 'better-sqlite3';
import { join } from 'path';
import { VINYL_CATEGORIES, VinylCategory, VinylSong, extractYouTubeId } from './music-playlists';

const DB_PATH = join(process.cwd(), 'data', 'music.db');

let dbInstance: Database.Database | null = null;

export function getMusicDB(): Database.Database {
  if (dbInstance) return dbInstance;

  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  // 1. Create vinyl categories table
  db.exec(`
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
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

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

    CREATE INDEX IF NOT EXISTS idx_vinyl_songs_vinyl_id ON vinyl_songs(vinyl_id);
    CREATE INDEX IF NOT EXISTS idx_vinyl_songs_sort ON vinyl_songs(sort_order);
  `);

  // Seed default data if empty
  const countRow = db.prepare('SELECT COUNT(*) as count FROM vinyl_categories').get() as { count: number };
  if (countRow.count === 0) {
    const insertCat = db.prepare(`
      INSERT INTO vinyl_categories (
        id, title, category, description, glow, border_gradient, label_gradient, pill_bg, pill_text, badge_border, sort_order, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertSong = db.prepare(`
      INSERT INTO vinyl_songs (
        id, vinyl_id, title, artist, url, youtube_id, sort_order, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const now = new Date().toISOString();

    const tx = db.transaction(() => {
      VINYL_CATEGORIES.forEach((cat, catIdx) => {
        insertCat.run(
          cat.id,
          cat.title,
          cat.category,
          cat.description,
          cat.accent.glow,
          cat.accent.borderGradient,
          cat.accent.labelGradient,
          cat.accent.pillBg,
          cat.accent.pillText,
          cat.accent.badgeBorder,
          catIdx,
          now,
          now
        );

        cat.songs.forEach((song, songIdx) => {
          const songId = `${cat.id}-${songIdx + 1}-${Date.now().toString(36)}`;
          insertSong.run(
            songId,
            cat.id,
            song.title,
            song.artist,
            song.url,
            extractYouTubeId(song.url),
            songIdx,
            now,
            now
          );
        });
      });
    });

    tx();
  }

  dbInstance = db;
  return dbInstance;
}

export function getAllVinylCategoriesFromDB(): VinylCategory[] {
  try {
    const db = getMusicDB();
    const categories = db.prepare('SELECT * FROM vinyl_categories ORDER BY sort_order ASC').all() as any[];
    const songs = db.prepare('SELECT * FROM vinyl_songs ORDER BY sort_order ASC').all() as any[];

    if (categories && categories.length > 0) {
      return categories.map((cat) => {
        const catSongs: VinylSong[] = songs
          .filter((s) => s.vinyl_id === cat.id)
          .map((s) => ({
            title: s.title,
            artist: s.artist,
            url: s.url,
          }));

        return {
          id: cat.id,
          title: cat.title,
          category: cat.category,
          description: cat.description,
          accent: {
            glow: cat.glow,
            borderGradient: cat.border_gradient,
            labelGradient: cat.label_gradient,
            pillBg: cat.pill_bg,
            pillText: cat.pill_text,
            badgeBorder: cat.badge_border,
          },
          songs: catSongs,
        };
      });
    }
  } catch (err) {
    console.warn('Music DB query warning, using static fallback playlists:', err);
  }

  return VINYL_CATEGORIES;
}

export function addSongToVinylDB(vinylId: string, song: { title: string; artist: string; url: string }): void {
  const db = getMusicDB();
  const maxOrderRow = db.prepare('SELECT MAX(sort_order) as maxOrder FROM vinyl_songs WHERE vinyl_id = ?').get(vinylId) as { maxOrder: number | null };
  const nextOrder = (maxOrderRow?.maxOrder ?? -1) + 1;
  const now = new Date().toISOString();
  const id = `${vinylId}-${nextOrder + 1}-${Date.now().toString(36)}`;

  db.prepare(`
    INSERT INTO vinyl_songs (id, vinyl_id, title, artist, url, youtube_id, sort_order, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    vinylId,
    song.title,
    song.artist,
    song.url,
    extractYouTubeId(song.url),
    nextOrder,
    now,
    now
  );
}

export function removeSongFromVinylDB(vinylId: string, songTitle: string): void {
  const db = getMusicDB();
  db.prepare('DELETE FROM vinyl_songs WHERE vinyl_id = ? AND title = ?').run(vinylId, songTitle);
}
