#!/usr/bin/env node

/**
 * API-Football (API-Sports) Ingestion Script
 *
 * API-Football provides comprehensive football data including player profiles.
 * This script ingests player data from the API-Football API.
 *
 * Documentation: https://www.api-football.com/documentation-v3
 * Requires API key - set API_FOOTBALL_KEY environment variable
 * Free tier: 100 requests/day
 *
 * Run with: npx ts-node scripts/ingest-api-football.ts
 */

import { join } from 'path';
import { getPlayerDB, mapPosition, normalizeNationalityCode, getRoleFromPosition } from '@/lib/player-db';
import { Player } from '@/lib/player-db-types';

const DB_PATH = join(process.cwd(), 'data', 'players.db');
const API_FOOTBALL_BASE_URL = 'https://v3.football.api-sports.io';

interface ApiFootballPlayer {
  id: number;
  name: string;
  firstname: string;
  lastname: string;
  age: number;
  birth: {
    date: string;
    place: string;
    country: string;
  };
  nationality: string;
  height: string;
  weight: string;
  injured: boolean;
  photo: string;
}

interface ApiFootballPlayerResponse {
  get: string;
  parameters: object;
  errors: object[];
  results: number;
  paging: {
    current: number;
    total: number;
  };
  response: Array<{
    player: ApiFootballPlayer;
    statistics: Array<{
      team: {
        id: number;
        name: string;
        logo: string;
      };
      league: {
        id: number;
        name: string;
        country: string;
        logo: string;
        season: number;
      };
      games: {
        appearences: number;
        lineups: number;
        minutes: number;
        number: number | null;
        position: string;
        rating: string | null;
        captain: boolean;
      };
    }>;
  }>;
}

function inferCategory(name: string, age: number, currentTeam: string | null): Player['category'] {
  const lowerName = name.toLowerCase();
  const birthYear = new Date().getFullYear() - age;

  const legendKeywords = ['pele', 'maradona', 'cruyff', 'beckenbauer', 'maldini', 'zidane', 'ronaldo nazario', 'ronaldinho', 'henry', 'puskas', 'di stefano', 'best', 'garrincha', 'charlton', 'eusebio'];
  if (legendKeywords.some(k => lowerName.includes(k)) || (birthYear < 1975 && !currentTeam)) {
    return 'LEGEND';
  }

  const iconKeywords = ['cristiano ronaldo', 'lionel messi', 'neymar', 'suarez', 'aguero', 'lewandowski', 'modric', 'ramos', 'pique', 'alves', 'marcelo', 'silva', 'de bruyne', 'kante', 'pogba', 'griezmann', 'benzema', 'bale', 'ozil', 'muller', 'lahm', 'schweinsteiger', 'neuer'];
  if (iconKeywords.some(k => lowerName.includes(k))) {
    return 'ICON';
  }

  const heroKeywords = ['mbappe', 'haaland', 'vinicius', 'bellingham', 'saka', 'foden', 'pedri', 'gavi', 'rodrygo', 'valverde', 'tchouameni', 'saliba', 'dias', 'alisson', 'courtois', 'ter stegen', 'donnarumma', 'osimhen', 'kvaratskhelia', 'chiesa', 'odegaard', 'rice', 'gvardiol', 'hakimi', 'szoboszlai', 'raphinha', 'lautaro', 'alvarez', 'rashford', 'fernandes'];
  if (heroKeywords.some(k => lowerName.includes(k))) {
    return 'HERO';
  }

  if (!currentTeam && birthYear < 1995) {
    return 'RETIRED';
  }

  return 'CURRENT';
}

async function fetchApiFootballPlayers(apiKey: string, leagueId?: number, season?: number): Promise<ApiFootballPlayerResponse['response']> {
  const allPlayers: ApiFootballPlayerResponse['response'] = [];
  let page = 1;

  console.log('Fetching players from API-Football...');

  while (true) {
    const params = new URLSearchParams();
    params.set('page', String(page));
    if (leagueId) params.set('league', String(leagueId));
    if (season) params.set('season', String(season));
    params.set('per_page', '100');

    const url = `${API_FOOTBALL_BASE_URL}/players?${params.toString()}`;
    const response = await fetch(url, {
      headers: {
        'x-rapidapi-key': apiKey,
        'x-rapidapi-host': 'v3.football.api-sports.io',
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API-Football error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data: ApiFootballPlayerResponse = await response.json();
    allPlayers.push(...data.response);

    console.log(`  Fetched page ${page}/${data.paging.total} (${allPlayers.length}/${data.results})`);

    if (page >= data.paging.total) break;
    page++;

    // Rate limiting - free tier 100 requests/day
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  return allPlayers;
}

function transformRecord(record: ApiFootballPlayerResponse['response'][0]): Player | null {
  const player = record.player;
  const stats = record.statistics[0]; // Current/primary team stats

  if (!player.id || !player.name) return null;

  const name = player.name?.trim();
  const firstName = player.firstname?.trim() || name.split(' ')[0];
  const lastName = player.lastname?.trim() || name.split(' ').slice(1).join(' ');
  const nationality = player.nationality?.trim() || player.birth?.country?.trim() || 'Unknown';
  const nationalityCode = normalizeNationalityCode(nationality);
  const dateOfBirth = player.birth?.date?.split('T')[0] || '1970-01-01';
  const primaryPosition = stats?.games?.position ? mapPosition(stats.games.position) : mapPosition('Central Midfield');
  const secondaryPositions: Player['secondaryPositions'] = [];
  const role = getRoleFromPosition(primaryPosition);
  const photoUrl = player.photo?.trim() || null;
  const currentTeam = stats?.team?.name?.trim() || null;
  const currentLeague = stats?.league?.name?.trim() || null;

  const age = player.age || 0;
  const birthYear = new Date().getFullYear() - age;
  const careerStartYear = birthYear + 17;
  const careerEndYear = currentTeam ? null : birthYear + 35;

  const category = inferCategory(name, age, currentTeam);

  const searchText = [
    name,
    firstName,
    lastName,
    nationality,
    currentTeam || '',
    currentLeague || '',
  ].join(' ').toLowerCase();

  return {
    id: `apifootball-${player.id}`,
    externalIds: {
      apiFootballId: String(player.id),
      transfermarktId: undefined,
    },
    name,
    firstName,
    lastName,
    nationality,
    nationalityCode,
    dateOfBirth,
    primaryPosition,
    secondaryPositions,
    role,
    photoUrl,
    photoSource: 'api_football',
    careerStartYear,
    careerEndYear,
    currentTeam,
    currentLeague,
    marketValueEur: null,
    highestMarketValueEur: null,
    internationalCaps: null,
    internationalGoals: null,
    category,
    searchText,
    source: 'database' as const,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function ingestPlayers(players: Player[]): void {
  console.log('Ingesting API-Football players into database...');
  const db = getPlayerDB();

  const insertStmt = db.prepare(`
    INSERT OR REPLACE INTO players (
      id, external_ids, name, first_name, last_name, nationality, nationality_code,
      date_of_birth, primary_position, secondary_positions, role, photo_url, photo_source,
      career_start_year, career_end_year, current_team, current_league,
      market_value_eur, highest_market_value_eur, international_caps, international_goals,
      category, search_text, created_at, updated_at
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
    )
  `);

  const externalIdStmt = db.prepare(`
    INSERT OR REPLACE INTO player_external_ids (player_id, source, external_id)
    VALUES (?, ?, ?)
  `);

  const transaction = db.transaction((players: Player[]) => {
    for (const player of players) {
      insertStmt.run(
        player.id,
        JSON.stringify(player.externalIds),
        player.name,
        player.firstName,
        player.lastName,
        player.nationality,
        player.nationalityCode,
        player.dateOfBirth,
        player.primaryPosition,
        JSON.stringify(player.secondaryPositions),
        player.role,
        player.photoUrl,
        player.photoSource,
        player.careerStartYear,
        player.careerEndYear,
        player.currentTeam,
        player.currentLeague,
        player.marketValueEur,
        player.highestMarketValueEur,
        player.internationalCaps,
        player.internationalGoals,
        player.category,
        player.searchText,
        player.createdAt,
        player.updatedAt
      );

      for (const [source, externalId] of Object.entries(player.externalIds)) {
        if (externalId) {
          externalIdStmt.run(player.id, source, externalId);
        }
      }
    }
  });

  const start = Date.now();
  transaction(players);
  console.log(`Ingested ${players.length} API-Football players in ${Date.now() - start}ms`);
}

async function main(): Promise<void> {
  console.log('Starting API-Football ingestion...\n');

  const apiKey = process.env.API_FOOTBALL_KEY;
  if (!apiKey) {
    console.error('ERROR: API_FOOTBALL_KEY environment variable not set');
    console.log('Get an API key from https://www.api-football.com and set:');
    console.log('  export API_FOOTBALL_KEY="your-api-key"');
    console.log('Free tier: 100 requests/day');
    process.exit(1);
  }

  // Optional: specify league and season to limit scope
  // Major leagues: 39=Premier League, 140=La Liga, 135=Serie A, 78=Bundesliga, 61=Ligue 1
  const leagueId = process.env.LEAGUE_ID ? parseInt(process.env.LEAGUE_ID) : undefined;
  const season = process.env.SEASON ? parseInt(process.env.SEASON) : new Date().getFullYear();

  try {
    const records = await fetchApiFootballPlayers(apiKey, leagueId, season);

    const players: Player[] = [];
    for (const record of records) {
      const player = transformRecord(record);
      if (player) players.push(player);
    }

    console.log(`Transformed ${players.length} valid players\n`);

    ingestPlayers(players);

    console.log('\nAPI-Football ingestion complete!');
    console.log(`Database: ${DB_PATH}`);
  } catch (error) {
    console.error('Ingestion failed:', error);
    process.exit(1);
  }
}

main().catch(console.error);