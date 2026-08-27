/**
 * Canonical Player Database Types
 *
 * This is the internal, normalized player model used by the application.
 * External data sources (transfermarkt, foot.io, API-Football, Wikidata, etc.)
 * are transformed into this format during ingestion.
 */

import { PlayerRole, PlayerCategory, PlayerPosition } from './types';

export type PlayerSource = 'database' | 'custom';

export interface Player {
  id: string;                    // Internal UUID
  externalIds: ExternalIds;      // IDs from external sources
  name: string;                  // Full name
  firstName: string;
  lastName: string;
  nationality: string;           // Full country name
  nationalityCode: string;       // ISO alpha-2
  dateOfBirth: string;           // YYYY-MM-DD
  primaryPosition: PlayerPosition;
  secondaryPositions: PlayerPosition[];
  role: PlayerRole;              // Derived from primaryPosition
  photoUrl: string | null;       // Player face/portrait URL
  photoSource: PhotoSource;      // Where the photo came from
  careerStartYear: number | null;
  careerEndYear: number | null;
  currentTeam: string | null;
  currentLeague: string | null;
  marketValueEur: number | null; // From transfermarkt
  highestMarketValueEur: number | null;
  internationalCaps: number | null;
  internationalGoals: number | null;
  category: PlayerCategory;      // LEGEND, ICON, HERO, CURRENT, RETIRED
  searchText: string;            // Pre-computed search index
  source: PlayerSource;          // 'database' | 'custom'
  createdAt: string;
  updatedAt: string;
}

export interface ExternalIds {
  transfermarktId?: string;
  footIoId?: string;
  apiFootballId?: string;
  fbrefId?: string;
  wikidataId?: string;
  // Future providers can be added here
}

export type PhotoSource =
  | 'transfermarkt'
  | 'wikimedia'
  | 'foot_io'
  | 'api_football'
  | 'fbref'
  | 'generated'
  | 'manual';

export interface PlayerSearchResult {
  players: Player[];
  total: number;
  query: string;
  tookMs: number;
}

export interface PlayerFilters {
  category?: PlayerCategory[];
  role?: PlayerRole[];
  nationalityCode?: string[];
  activeOnly?: boolean;
  minMarketValue?: number;
  maxMarketValue?: number;
}

/**
 * Ingestion record - tracks source of each player record
 */
export interface IngestionRecord {
  playerId: string;
  source: 'transfermarkt_csv' | 'wikidata' | 'openfootball' | 'foot_io' | 'api_football' | 'manual';
  sourceId: string;           // Primary key in source system
  rawData: Record<string, unknown>;
  ingestedAt: string;
}

/**
 * Search index entry for FTS5
 */
export interface SearchIndexEntry {
  id: string;
  searchText: string;         // name + firstName + lastName + nationality + team
}