/**
 * Football Player Service (Server-side only)
 *
 * Abstraction layer for player search across multiple data sources.
 * Currently uses local SQLite database (transfermarkt-datasets + curated catalog).
 *
 * IMPORTANT: This file must ONLY be imported in server-side code (API routes, server components).
 */

import { getPlayerDB, rowToPlayer, Player } from './player-db';
import { PLAYERS } from './players-data';

function stripAccents(str: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .trim();
}

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
   * Search players by name with high-recall fuzzy & multi-token matching
   */
  async searchPlayers(query: string, limit = 50): Promise<Player[]> {
    const rawQuery = (query || '').trim();
    if (!rawQuery) {
      return PLAYERS.slice(0, limit).map(toDBPlayer);
    }

    const cleanQuery = stripAccents(rawQuery);
    const queryTokens = cleanQuery.split(/\s+/).filter((t) => t.length > 0);

    // 1. Check curated catalog (Legends, Icons, Heroes, Stars)
    const curatedMatches = PLAYERS.filter((p) => {
      const normalizedName = stripAccents(p.name);
      const searchable = stripAccents(
        `${p.name} ${p.firstName || ''} ${p.lastName || ''} ${p.team || ''} ${p.nationality || ''}`
      );

      // Exact or substring match
      if (normalizedName.includes(cleanQuery) || searchable.includes(cleanQuery)) {
        return true;
      }

      // Multi-token match: all non-trivial query tokens exist in searchable
      if (queryTokens.length > 1) {
        const allTokensPresent = queryTokens.every((token) => searchable.includes(token));
        if (allTokensPresent) return true;
      }

      return false;
    }).map(toDBPlayer);

    let dbMatches: Player[] = [];

    try {
      const db = this.getDb();

      // 2. FTS5 Search with prefix wildcard
      if (queryTokens.length > 0) {
        try {
          const ftsQuery = queryTokens.map((term) => `"${term}"*`).join(' ');
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
            dbMatches = rows.map(rowToPlayer);
          }
        } catch {
          // FTS5 table may not exist, continue to multi-token LIKE fallback
        }
      }

      // 3. Multi-token LIKE fallback
      if (dbMatches.length < limit && queryTokens.length > 0) {
        try {
          const likeConditions = queryTokens.map(() => `search_text LIKE ?`).join(' AND ');
          const likeParams = queryTokens.map((t) => `%${t}%`);

          const rows = db.prepare(`
            SELECT * FROM players
            WHERE ${likeConditions} OR search_text LIKE ?
            ORDER BY 
              CASE category
                WHEN 'LEGEND' THEN 4
                WHEN 'ICON' THEN 3
                WHEN 'HERO' THEN 2
                ELSE 1
              END DESC,
              COALESCE(highest_market_value_eur, market_value_eur, 0) DESC
            LIMIT ?
          `).all(...likeParams, `%${cleanQuery}%`, limit);

          const existingIds = new Set(dbMatches.map((p) => p.id));
          for (const row of rows) {
            const player = rowToPlayer(row);
            if (!existingIds.has(player.id)) {
              dbMatches.push(player);
              existingIds.add(player.id);
            }
          }
        } catch (likeErr) {
          console.warn('LIKE query warning:', likeErr);
        }
      }

      // 4. Single-token fallback on last name if still no results
      if (dbMatches.length === 0 && queryTokens.length > 1) {
        const lastNameToken = queryTokens[queryTokens.length - 1];
        if (lastNameToken.length >= 3) {
          try {
            const rows = db.prepare(`
              SELECT * FROM players
              WHERE search_text LIKE ?
              ORDER BY COALESCE(highest_market_value_eur, market_value_eur, 0) DESC
              LIMIT ?
            `).all(`%${lastNameToken}%`, limit);

            if (rows.length > 0) {
              dbMatches = rows.map(rowToPlayer);
            }
          } catch {
            // Ignore
          }
        }
      }
    } catch (err) {
      console.warn('Database search exception:', err);
    }

    // Combine curated matches first, then DB matches, deduplicating by normalized name
    const combined: Player[] = [...curatedMatches];
    const seenNames = new Set(curatedMatches.map((p) => stripAccents(p.name)));

    for (const p of dbMatches) {
      const nameKey = stripAccents(p.name);
      if (!seenNames.has(nameKey)) {
        combined.push(p);
        seenNames.add(nameKey);
      }
    }

    return combined.slice(0, limit);
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

    const curated = PLAYERS.find((p) => p.id === id);
    if (curated) return toDBPlayer(curated);

    return null;
  }

  /**
   * Get player statistics
   */
  async getStats(): Promise<{
    totalPlayers: number;
    legendCount: number;
    iconCount: number;
    heroCount: number;
    currentCount: number;
  }> {
    try {
      const db = this.getDb();
      const stats = db.prepare(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN category = 'LEGEND' THEN 1 ELSE 0 END) as legends,
          SUM(CASE WHEN category = 'ICON' THEN 1 ELSE 0 END) as icons,
          SUM(CASE WHEN category = 'HERO' THEN 1 ELSE 0 END) as heroes,
          SUM(CASE WHEN category = 'CURRENT' THEN 1 ELSE 0 END) as currents
        FROM players
      `).get() as any;

      return {
        totalPlayers: stats.total || PLAYERS.length,
        legendCount: stats.legends || PLAYERS.filter((p) => p.category === 'LEGEND').length,
        iconCount: stats.icons || PLAYERS.filter((p) => p.category === 'ICON').length,
        heroCount: stats.heroes || PLAYERS.filter((p) => p.category === 'HERO').length,
        currentCount: stats.currents || PLAYERS.filter((p) => p.category === 'CURRENT').length,
      };
    } catch {
      return {
        totalPlayers: PLAYERS.length,
        legendCount: PLAYERS.filter((p) => p.category === 'LEGEND').length,
        iconCount: PLAYERS.filter((p) => p.category === 'ICON').length,
        heroCount: PLAYERS.filter((p) => p.category === 'HERO').length,
        currentCount: PLAYERS.filter((p) => p.category === 'CURRENT').length,
      };
    }
  }
}

export function getFootballPlayerService(): FootballPlayerService {
  if (!serviceInstance) {
    serviceInstance = new FootballPlayerService();
  }
  return serviceInstance;
}