/**
 * Football Player Service (Server-side only)
 *
 * Abstraction layer for player search across multiple data sources.
 * Currently uses local SQLite database (transfermarkt-datasets + future Wikidata).
 * Designed to be easily extensible for foot.io, API-Football, etc.
 *
 * IMPORTANT: This file must ONLY be imported in server-side code (API routes, server components).
 * For client-side, use football-player-client.ts
 */

import { getPlayerDB, rowToPlayer, Player } from './player-db';

let serviceInstance: FootballPlayerService | null = null;

export class FootballPlayerService {
  private db = getPlayerDB();

  /**
   * Search players by name with fuzzy matching using FTS5
   */
  async searchPlayers(query: string, limit = 50): Promise<Player[]> {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return [];

    try {
      // Sanitize search query: keep only alphanumeric characters for FTS prefix matching
      const cleanTerms = normalized
        .replace(/[^a-zA-Z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter(term => term.length > 0);

      if (cleanTerms.length === 0) {
        const rows = this.db.prepare(`
          SELECT * FROM players
          WHERE search_text LIKE ?
          LIMIT ?
        `).all(`%${normalized}%`, limit);
        return rows.map(rowToPlayer);
      }

      const ftsQuery = cleanTerms.map(term => `"${term}"*`).join(' ');

      const rows = this.db.prepare(`
        SELECT p.*
        FROM players_fts fts
        JOIN players p ON p.rowid = fts.rowid
        WHERE players_fts MATCH ?
        ORDER BY 
          CASE p.category
            WHEN 'LEGEND' THEN 4
            WHEN 'ICON' THEN 3
            WHEN 'HERO' THEN 2
            ELSE 1
          END DESC,
          COALESCE(p.highest_market_value_eur, p.market_value_eur, 0) DESC,
          bm25(players_fts) ASC
        LIMIT ?
      `).all(ftsQuery, limit);

      if (rows.length > 0) {
        return rows.map(rowToPlayer);
      }
    } catch (err) {
      console.warn('FTS5 search query error, using fallback:', err);
    }

    // Fallback to LIKE query
    try {
      const rows = this.db.prepare(`
        SELECT * FROM players
        WHERE search_text LIKE ?
        ORDER BY 
          CASE category
            WHEN 'LEGEND' THEN 4
            WHEN 'ICON' THEN 3
            WHEN 'HERO' THEN 2
            ELSE 1
          END DESC,
          COALESCE(highest_market_value_eur, market_value_eur, 0) DESC
        LIMIT ?
      `).all(`%${normalized}%`, limit);
      return rows.map(rowToPlayer);
    } catch (fallbackErr) {
      console.error('LIKE search fallback failed:', fallbackErr);
      return [];
    }
  }

  /**
   * Get player by internal ID
   */
  async getPlayer(id: string): Promise<Player | null> {
    const row = this.db.prepare('SELECT * FROM players WHERE id = ?').get(id) as unknown;
    return row ? rowToPlayer(row) : null;
  }

  /**
   * Get player by external ID (transfermarkt, wikidata, etc.)
   */
  async getPlayerByExternalId(source: string, externalId: string): Promise<Player | null> {
    const row = this.db.prepare(`
      SELECT p.* FROM players p
      JOIN player_external_ids e ON p.id = e.player_id
      WHERE e.source = ? AND e.external_id = ?
    `).get(source, externalId) as unknown;
    return row ? rowToPlayer(row) : null;
  }

  /**
   * Get players by category
   */
  async getPlayersByCategory(category: Player['category'], limit = 100): Promise<Player[]> {
    const rows = this.db.prepare(`
      SELECT * FROM players WHERE category = ? ORDER BY name LIMIT ?
    `).all(category, limit) as unknown[];
    return rows.map(rowToPlayer);
  }

  /**
   * Get players by nationality
   */
  async getPlayersByNationality(nationalityCode: string, limit = 100): Promise<Player[]> {
    const rows = this.db.prepare(`
      SELECT * FROM players WHERE nationality_code = ? ORDER BY name LIMIT ?
    `).all(nationalityCode.toUpperCase(), limit);
    return rows.map(rowToPlayer);
  }

  /**
   * Get random players for discovery
   */
  async getRandomPlayers(count = 20): Promise<Player[]> {
    const rows = this.db.prepare(`
      SELECT * FROM players ORDER BY RANDOM() LIMIT ?
    `).all(count);
    return rows.map(rowToPlayer);
  }

  /**
   * Get total player count
   */
  async getTotalCount(): Promise<number> {
    const row = this.db.prepare('SELECT COUNT(*) as c FROM players').get() as { c: number };
    return row.c;
  }
}

export function getFootballPlayerService(): FootballPlayerService {
  if (!serviceInstance) {
    serviceInstance = new FootballPlayerService();
  }
  return serviceInstance;
}