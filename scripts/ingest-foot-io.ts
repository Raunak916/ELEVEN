#!/usr/bin/env node

/**
 * foot.io Ingestion Script
 *
 * foot.io provides a football data API with player information.
 * This script ingests player data from foot.io API.
 *
 * Documentation: https://foot.io/docs
 * Requires API key - set FOOT_IO_API_KEY environment variable
 *
 * Run with: npx ts-node scripts/ingest-foot-io.ts
 */

import { join } from 'path';
import { getPlayerDB, mapPosition, normalizeNationalityCode, getRoleFromPosition } from '@/lib/player-db';
import { Player } from '@/lib/player-db-types';

const DB_PATH = join(process.cwd(), 'data', 'players.db');
const FOOT_IO_BASE_URL = 'https://api.foot.io/v1';

interface FootIoPlayer {
  id: string;
  name: string;
  firstname: string;
  lastname: string;
  nationality: string;
  birthdate: string;
  position: string;
  height: number;
  weight: number;
  photo_url: string;
  club: {
    id: string;
    name: string;
    league: string;
  } | null;
}

interface FootIoResponse {
  data: FootIoPlayer[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

function inferCategory(name: string, birthYear: number, currentClub: string | null): Player['category'] {
  const lowerName = name.toLowerCase();

  const legendKeywords = ['pele', 'maradona', 'cruyff', 'beckenbauer', 'maldini', 'zidane', 'ronaldo nazario', 'ronaldinho', 'henry', 'puskas', 'di stefano', 'best', 'garrincha', 'charlton', 'eusebio'];
  if (legendKeywords.some(k => lowerName.includes(k))) {
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

  // If no current club and born before 1995, likely retired
  if (!currentClub && birthYear < 1995) {
    return 'RETIRED';
  }

  return 'CURRENT';
}

async function fetchFootIoPlayers(apiKey: string): Promise<FootIoPlayer[]> {
  const allPlayers: FootIoPlayer[] = [];
  let page = 1;
  const perPage = 100;

  console.log('Fetching players from foot.io API...');

  while (true) {
    const url = `${FOOT_IO_BASE_URL}/players?page=${page}&per_page=${perPage}`;
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`foot.io API error: ${response.status} ${response.statusText}`);
    }

    const data: FootIoResponse = await response.json();
    allPlayers.push(...data.data);

    console.log(`  Fetched page ${page}/${data.meta.last_page} (${allPlayers.length}/${data.meta.total})`);

    if (page >= data.meta.last_page) break;
    page++;

    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  return allPlayers;
}

function transformRecord(record: FootIoPlayer): Player | null {
  if (!record.id || !record.name) return null;

  const name = record.name?.trim();
  const firstName = record.firstname?.trim() || name.split(' ')[0];
  const lastName = record.lastname?.trim() || name.split(' ').slice(1).join(' ');
  const nationality = record.nationality?.trim() || 'Unknown';
  const nationalityCode = normalizeNationalityCode(nationality);
  const dateOfBirth = record.birthdate?.split('T')[0] || record.birthdate?.split(' ')[0] || '1970-01-01';
  const primaryPosition = mapPosition(record.position || 'Central Midfield');
  const secondaryPositions: Player['secondaryPositions'] = [];
  const role = getRoleFromPosition(primaryPosition);
  const photoUrl = record.photo_url?.trim() || null;
  const currentTeam = record.club?.name?.trim() || null;
  const currentLeague = record.club?.league?.trim() || null;

  const birthYear = parseInt(dateOfBirth.split('-')[0]);
  const careerStartYear = birthYear + 17;
  const careerEndYear = currentTeam ? null : birthYear + 35; // Estimate

  const category = inferCategory(name, birthYear, currentTeam);

  const searchText = [
    name,
    firstName,
    lastName,
    nationality,
    currentTeam || '',
    currentLeague || '',
  ].join(' ').toLowerCase();

  return {
    id: `footio-${record.id}`,
    externalIds: {
      footIoId: record.id,
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
    photoSource: 'foot_io',
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
  console.log('Ingesting foot.io players into database...');
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
  console.log(`Ingested ${players.length} foot.io players in ${Date.now() - start}ms`);
}

async function main(): Promise<void> {
  console.log('Starting foot.io ingestion...\n');

  const apiKey = process.env.FOOT_IO_API_KEY;
  if (!apiKey) {
    console.error('ERROR: FOOT_IO_API_KEY environment variable not set');
    console.log('Get an API key from https://foot.io and set:');
    console.log('  export FOOT_IO_API_KEY="your-api-key"');
    process.exit(1);
  }

  try {
    const records = await fetchFootIoPlayers(apiKey);

    const players: Player[] = [];
    for (const record of records) {
      const player = transformRecord(record);
      if (player) players.push(player);
    }

    console.log(`Transformed ${players.length} valid players\n`);

    ingestPlayers(players);

    console.log('\nfoot.io ingestion complete!');
    console.log(`Database: ${DB_PATH}`);
  } catch (error) {
    console.error('Ingestion failed:', error);
    process.exit(1);
  }
}

main().catch(console.error);