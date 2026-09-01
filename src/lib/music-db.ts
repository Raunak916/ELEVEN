import { VINYL_CATEGORIES, VinylCategory, VinylSong, extractYouTubeId } from './music-playlists';
import { turso } from './turso';

let schemaInitialized = false;

async function ensureMusicSchema() {
  if (schemaInitialized) return;
  try {
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
        sort_order INTEGER NOT NULL DEFAULT 0,
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

    // Ensure sort_order columns exist on older schemas
    try {
      await turso.execute("ALTER TABLE vinyl_categories ADD COLUMN sort_order INTEGER DEFAULT 0");
    } catch {
      // Column already exists
    }
    try {
      await turso.execute("ALTER TABLE vinyl_songs ADD COLUMN sort_order INTEGER DEFAULT 0");
    } catch {
      // Column already exists
    }

    // Seed default data if empty
    const countRes = await turso.execute('SELECT COUNT(*) as count FROM vinyl_categories');
    const count = Number(countRes.rows[0]?.count || 0);

    if (count === 0) {
      const now = new Date().toISOString();
      const statements: Array<{ sql: string; args: any[] }> = [];

      VINYL_CATEGORIES.forEach((cat, catIdx) => {
        statements.push({
          sql: `
            INSERT OR IGNORE INTO vinyl_categories (
              id, title, category, description, glow, border_gradient, label_gradient, pill_bg, pill_text, badge_border, sort_order, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `,
          args: [
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
          ]
        });

        cat.songs.forEach((song, songIdx) => {
          const songId = `${cat.id}-${songIdx + 1}-${Date.now().toString(36)}`;
          statements.push({
            sql: `
              INSERT OR IGNORE INTO vinyl_songs (
                id, vinyl_id, title, artist, url, youtube_id, sort_order, created_at, updated_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
            args: [
              songId,
              cat.id,
              song.title,
              song.artist,
              song.url,
              extractYouTubeId(song.url),
              songIdx,
              now,
              now
            ]
          });
        });
      });

      if (statements.length > 0) {
        await turso.batch(statements, 'write');
      }
    }
    schemaInitialized = true;
  } catch (err) {
    console.warn('Failed to ensure Turso music schema:', err);
  }
}

export async function getAllVinylCategoriesFromDB(): Promise<VinylCategory[]> {
  try {
    await ensureMusicSchema();

    const catRes = await turso.execute('SELECT * FROM vinyl_categories ORDER BY sort_order ASC');
    const songRes = await turso.execute('SELECT * FROM vinyl_songs ORDER BY sort_order ASC');

    const categories = catRes.rows as any[];
    const songs = songRes.rows as any[];

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

export async function addSongToVinylDB(
  vinylId: string,
  song: { title: string; artist: string; url: string }
): Promise<void> {
  await ensureMusicSchema();

  const maxRes = await turso.execute({
    sql: 'SELECT MAX(sort_order) as maxOrder FROM vinyl_songs WHERE vinyl_id = ?',
    args: [vinylId]
  });
  const maxOrder = Number(maxRes.rows[0]?.maxOrder ?? -1);
  const nextOrder = maxOrder + 1;
  const now = new Date().toISOString();
  const id = `${vinylId}-${nextOrder + 1}-${Date.now().toString(36)}`;

  await turso.execute({
    sql: `
      INSERT INTO vinyl_songs (id, vinyl_id, title, artist, url, youtube_id, sort_order, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    args: [
      id,
      vinylId,
      song.title,
      song.artist,
      song.url,
      extractYouTubeId(song.url),
      nextOrder,
      now,
      now
    ]
  });
}

export async function removeSongFromVinylDB(vinylId: string, songTitle: string): Promise<void> {
  await ensureMusicSchema();
  await turso.execute({
    sql: 'DELETE FROM vinyl_songs WHERE vinyl_id = ? AND title = ?',
    args: [vinylId, songTitle]
  });
}
