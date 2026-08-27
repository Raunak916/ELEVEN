'use client';

import { Player, PlayerCategory, PlayerDataProvider, PlayerStatus, PlayerPosition, PlayerRole } from './types';
import { Player as ApiPlayer } from './player-db-types';
import { searchPlayers } from './football-player-client';
import { generatePlayerPhoto } from './player-photo';

/**
 * API-backed implementation of PlayerDataProvider.
 * Uses the /api/players/search route which queries the local SQLite database.
 */
class ApiPlayerDataProvider implements PlayerDataProvider {
  private cache = new Map<string, { players: Player[]; timestamp: number }>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  async searchPlayers(query: string): Promise<Player[]> {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return [];

    // Check cache
    const cached = this.cache.get(normalized);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.players;
    }

    try {
      const result = await searchPlayers({ query: normalized, limit: 50 });
      const players = result.players.map(this.transformToLegacyPlayer);

      // Cache results
      this.cache.set(normalized, { players, timestamp: Date.now() });

      return players;
    } catch (error) {
      console.error('Player search failed:', error);
      return [];
    }
  }

  async getPlayerById(id: string): Promise<Player | null> {
    // For now, search by ID pattern - in future we could have a dedicated endpoint
    if (id.startsWith('tm-')) {
      const result = await searchPlayers({ query: id, limit: 1 });
      return result.players[0] ? this.transformToLegacyPlayer(result.players[0]) : null;
    }
    if (id.startsWith('custom-')) {
      const result = await searchPlayers({ query: id, limit: 1 });
      return result.players[0] ? this.transformToLegacyPlayer(result.players[0]) : null;
    }
    return null;
  }

  async getPlayersByCategory(category: PlayerCategory): Promise<Player[]> {
    // For categories, we search for known names or use a different approach
    // In the future, we could add a dedicated endpoint for this
    const knownPlayers: Record<PlayerCategory, string[]> = {
      LEGEND: ['pele', 'maradona', 'cruyff', 'beckenbauer', 'maldini', 'zidane', 'ronaldo', 'ronaldinho', 'henry'],
      ICON: ['cristiano ronaldo', 'lionel messi', 'neymar', 'lewandowski', 'modric'],
      HERO: ['mbappe', 'haaland', 'bellingham', 'saka', 'foden', 'pedri', 'gavi'],
      CURRENT: [],
      RETIRED: [],
    };

    const terms = knownPlayers[category] || [];
    if (terms.length === 0) return [];

    const results = await Promise.all(
      terms.map(t => this.searchPlayers(t))
    );

    // Flatten and deduplicate
    const seen = new Set<string>();
    const players: Player[] = [];
    for (const result of results) {
      for (const p of result) {
        if (!seen.has(p.id)) {
          seen.add(p.id);
          players.push(p);
        }
      }
    }
    return players;
  }

  async getAllPlayers(): Promise<Player[]> {
    // Return empty - too many to load at once
    return [];
  }

  private transformToLegacyPlayer(p: ApiPlayer): Player {
    // Transform new Player format to legacy Player format
    // Treat Transfermarkt default.jpg as missing photo and use generated SVG
    const hasRealPhoto = p.photoUrl && !p.photoUrl.includes('default.jpg');
    const photo: string = hasRealPhoto && p.photoUrl ? p.photoUrl : generatePlayerPhoto(p.name, p.category, p.primaryPosition);

    return {
      id: p.id,
      name: p.name,
      firstName: p.firstName,
      lastName: p.lastName,
      nationality: p.nationality,
      nationalityCode: p.nationalityCode,
      position: p.primaryPosition,
      role: p.role,
      dateOfBirth: p.dateOfBirth,
      photo,
      team: p.currentTeam || 'Unknown',
      league: p.currentLeague || 'Unknown',
      category: p.category,
      status: (p.careerEndYear && p.careerEndYear < 2020 ? 'RETIRED' : 'ACTIVE') as PlayerStatus,
      source: p.source || 'database',
    };
  }
}

/**
 * Get the player data provider instance.
 * This can be swapped to use different backends without changing consumers.
 */
let providerInstance: PlayerDataProvider | null = null;

export function getPlayerDataProvider(): PlayerDataProvider {
  if (!providerInstance) {
    providerInstance = new ApiPlayerDataProvider();
  }
  return providerInstance;
}

/**
 * Set a custom provider (useful for testing or SSR)
 */
export function setPlayerDataProvider(provider: PlayerDataProvider): void {
  providerInstance = provider;
}