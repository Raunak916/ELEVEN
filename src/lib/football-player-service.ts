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
import { PLAYERS } from './players-data';

function toDBPlayer(p: any): Player {
  return {
    id: p.id,
    externalIds: p.externalIds || {},
    name: p.name,
    firstName: p.firstName || '',
    lastName: p.lastName || '',
    nationality: p.nationality || 'Unknown',
    nationalityCode: p.nationalityCode || 'XX',
    dateOfBirth: p.dateOfBirth || '2000-01-01',
    primaryPosition: p.position || p.primaryPosition || 'CM',
    secondaryPositions: p.secondaryPositions || [],
    role: p.role || 'Midfielder',
    photoUrl: p.photo || p.photoUrl || null,
    photoSource: p.photoSource || 'generated',
    careerStartYear: p.careerStartYear || null,
    careerEndYear: p.careerEndYear || null,
    currentTeam: p.team || p.currentTeam || 'Unknown',
    currentLeague: p.league || p.currentLeague || 'Unknown',
    marketValueEur: p.marketValueEur || null,
    highestMarketValueEur: p.highestMarketValueEur || null,
    internationalCaps: p.internationalCaps || null,
    internationalGoals: p.internationalGoals || null,
    category: p.category || 'CURRENT',
    searchText: p.searchText || `${p.name} ${p.firstName || ''} ${p.lastName || ''} ${p.team || ''} ${p.nationality || ''}`.toLowerCase(),
    source: p.source || 'database',
    createdAt: p.createdAt || new Date().toISOString(),
    updatedAt: p.updatedAt || new Date().toISOString(),
  };
}

let serviceInstance: FootballPlayerService | null = null;

export class FootballPlayerService {
  private getDb() {
    return getPlayerDB();
  }

  /**
   * Search players by name with fuzzy matching using FTS5 or LIKE or in-memory fallback
   */
  async searchPlayers(query: string, limit = 50): Promise<Player[]> {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      // Return top famous players if query is empty
      return PLAYERS.slice(0, limit).map(toDBPlayer);
    }

    try {
      const db = this.getDb();

      // Sanitize search query: keep only alphanumeric characters for FTS prefix matching
      const cleanTerms = normalized
        .replace(/[^a-zA-Z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter(term => term.length > 0);

      if (cleanTerms.length > 0) {
        try {
          const ftsQuery = cleanTerms.map(term => `"${term}"*`).join(' ');
          const rows = db.prepare(`
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
        } catch {
          // FTS5 table may not exist, continue to LIKE query
        }
      }

      // Fallback to LIKE query
      try {
        const rows = db.prepare(`
          SELECT * FROM players
          WHERE search_text LIKE ? OR name LIKE ?
          ORDER BY 
            CASE category
              WHEN 'LEGEND' THEN 4
              WHEN 'ICON' THEN 3
              WHEN 'HERO' THEN 2
              ELSE 1
            END DESC,
            COALESCE(highest_market_value_eur, market_value_eur, 0) DESC
          LIMIT ?
        `).all(`%${normalized}%`, `%${normalized}%`, limit);

        if (rows.length > 0) {
          return rows.map(rowToPlayer);
        }
      } catch (likeErr) {
        console.warn('LIKE query warning, using array filter fallback:', likeErr);
      }
    } catch (err) {
      console.warn('Database search exception, falling back to static catalog:', err);
    }

    // 3. Guaranteed in-memory fallback
    const matched = PLAYERS.filter((p) => {
      const searchable = `${p.name} ${p.firstName || ''} ${p.lastName || ''} ${p.team || ''} ${p.nationality || ''}`.toLowerCase();
      return searchable.includes(normalized);
    });

    return matched.slice(0, limit).map(toDBPlayer);
  }

  /**
   * Get player by internal ID
   */
  async getPlayer(id: string): Promise<Player | null> {
    try {
      const db = this.getDb();
      const row = db.prepare('SELECT * FROM players WHERE id = ?').get(id) as unknown;
      if (row) return rowToPlayer(row);
    } catch {
      // fallback
    }
    const found = PLAYERS.find(p => p.id === id);
    return found ? toDBPlayer(found) : null;
  }

  /**
   * Get player by external ID (transfermarkt, wikidata, etc.)
   */
  async getPlayerByExternalId(source: string, externalId: string): Promise<Player | null> {
    try {
      const db = this.getDb();
      const row = db.prepare(`
        SELECT p.* FROM players p
        JOIN player_external_ids e ON p.id = e.player_id
        WHERE e.source = ? AND e.external_id = ?
      `).get(source, externalId) as unknown;
      return row ? rowToPlayer(row) : null;
    } catch {
      return null;
    }
  }

  /**
   * Get players by category
   */
  async getPlayersByCategory(category: Player['category'], limit = 100): Promise<Player[]> {
    try {
      const db = this.getDb();
      const rows = db.prepare(`
        SELECT * FROM players WHERE category = ? ORDER BY name LIMIT ?
      `).all(category, limit) as unknown[];
      return rows.map(rowToPlayer);
    } catch {
      return PLAYERS.filter(p => p.category === category).slice(0, limit).map(toDBPlayer);
    }
  }

  /**
   * Get players by nationality
   */
  async getPlayersByNationality(nationalityCode: string, limit = 100): Promise<Player[]> {
    try {
      const db = this.getDb();
      const rows = db.prepare(`
        SELECT * FROM players WHERE nationality_code = ? ORDER BY name LIMIT ?
      `).all(nationalityCode.toUpperCase(), limit);
      return rows.map(rowToPlayer);
    } catch {
      return PLAYERS.filter(p => p.nationalityCode?.toUpperCase() === nationalityCode.toUpperCase()).slice(0, limit).map(toDBPlayer);
    }
  }

  /**
   * Get random players for discovery
   */
  async getRandomPlayers(count = 20): Promise<Player[]> {
    try {
      const db = this.getDb();
      const rows = db.prepare(`
        SELECT * FROM players ORDER BY RANDOM() LIMIT ?
      `).all(count);
      return rows.map(rowToPlayer);
    } catch {
      const shuffled = [...PLAYERS].sort(() => 0.5 - Math.random());
      return shuffled.slice(0, count).map(toDBPlayer);
    }
  }

  /**
   * Get total player count
   */
  async getTotalCount(): Promise<number> {
    try {
      const db = this.getDb();
      const row = db.prepare('SELECT COUNT(*) as c FROM players').get() as { c: number };
      return row.c;
    } catch {
      return PLAYERS.length;
    }
  }
}

export function getFootballPlayerService(): FootballPlayerService {
  if (!serviceInstance) {
    serviceInstance = new FootballPlayerService();
  }
  return serviceInstance;
}