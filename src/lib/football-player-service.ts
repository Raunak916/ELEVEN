/**
 * Football Player Service (Server-side only)
 *
 * Abstraction layer for player search across Turso Database + curated catalog.
 *
 * IMPORTANT: This file must ONLY be imported in server-side code (API routes, server components).
 */

import { rowToPlayer, stripAccents, Player } from './player-db';
import { PLAYERS } from './players-data';
import { turso } from './turso';

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
      if (normalizedName.includes(cleanQuery) || searchable.includes(cleanQuery) || cleanQuery.includes(normalizedName)) {
        return true;
      }

      // Multi-token match: all non-trivial query tokens exist in searchable
      if (queryTokens.length > 1) {
        const allTokensPresent = queryTokens.every((token) => searchable.includes(token));
        if (allTokensPresent) return true;
      }

      // Last name match
      if (queryTokens.length > 0) {
        const lastToken = queryTokens[queryTokens.length - 1];
        if (lastToken.length >= 3 && normalizedName.includes(lastToken)) {
          return true;
        }
      }

      return false;
    }).map(toDBPlayer);

    let dbMatches: Player[] = [];

    try {
      if (queryTokens.length > 0) {
        const likeConditions = queryTokens.map(() => `search_text LIKE ?`).join(' AND ');
        const likeParams = queryTokens.map((t) => `%${t}%`);

        const rows = (await turso.execute({
          sql: `
            SELECT * FROM players
            WHERE (${likeConditions}) OR search_text LIKE ? OR name LIKE ?
            ORDER BY 
              CASE category
                WHEN 'LEGEND' THEN 4
                WHEN 'ICON' THEN 3
                WHEN 'HERO' THEN 2
                ELSE 1
              END DESC,
              rating DESC
            LIMIT ?
          `,
          args: [...likeParams, `%${cleanQuery}%`, `%${cleanQuery}%`, limit]
        })).rows;

        if (rows && rows.length > 0) {
          dbMatches = rows.map(rowToPlayer);
        }
      }

      // Surname / individual token fallback if no matches found
      if (dbMatches.length === 0 && queryTokens.length > 0) {
        const primaryTokens = queryTokens.filter((t) => t.length >= 3);
        for (const token of primaryTokens) {
          try {
            const rows = (await turso.execute({
              sql: `
                SELECT * FROM players
                WHERE name LIKE ? OR search_text LIKE ?
                ORDER BY rating DESC
                LIMIT ?
              `,
              args: [`%${token}%`, `%${token}%`, 10]
            })).rows;

            const existingIds = new Set(dbMatches.map((p) => p.id));
            for (const row of rows) {
              const player = rowToPlayer(row);
              if (!existingIds.has(player.id)) {
                dbMatches.push(player);
                existingIds.add(player.id);
              }
            }
            if (dbMatches.length > 0) break;
          } catch {
            // Ignore
          }
        }
      }
    } catch (err) {
      console.warn('Turso player database search exception:', err);
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
      const row = (await turso.execute({
        sql: 'SELECT * FROM players WHERE id = ?',
        args: [id]
      })).rows[0];
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
      const stats = (await turso.execute(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN category = 'LEGEND' THEN 1 ELSE 0 END) as legends,
          SUM(CASE WHEN category = 'ICON' THEN 1 ELSE 0 END) as icons,
          SUM(CASE WHEN category = 'HERO' THEN 1 ELSE 0 END) as heroes,
          SUM(CASE WHEN category = 'CURRENT' THEN 1 ELSE 0 END) as currents
        FROM players
      `)).rows[0] as any;

      return {
        totalPlayers: Number(stats?.total) || PLAYERS.length,
        legendCount: Number(stats?.legends) || PLAYERS.filter((p) => p.category === 'LEGEND').length,
        iconCount: Number(stats?.icons) || PLAYERS.filter((p) => p.category === 'ICON').length,
        heroCount: Number(stats?.heroes) || PLAYERS.filter((p) => p.category === 'HERO').length,
        currentCount: Number(stats?.currents) || PLAYERS.filter((p) => p.category === 'CURRENT').length,
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