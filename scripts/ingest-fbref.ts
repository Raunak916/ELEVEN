#!/usr/bin/env node

/**
 * FBref Ingestion Script (Community Data)
 *
 * FBref does not provide an official public API for bulk player data.
 * This script ingests from community-maintained FBref datasets.
 *
 * Sources:
 * - https://github.com/JaseZiv/worldfootballR_data (FBref player stats)
 * - https://github.com/fbref/fbref-data (community scrapes)
 *
 * Run with: npx ts-node scripts/ingest-fbref.ts
 */

import { parse } from 'csv-parse/sync';
import { join } from 'path';
import { getPlayerDB, mapPosition, normalizeNationalityCode, getRoleFromPosition } from '@/lib/player-db';
import { Player } from '@/lib/player-db-types';
import { existsSync, readFileSync } from 'fs';

const CSV_PATH = join(process.cwd(), 'data', 'fbref-players.csv');
const DB_PATH = join(process.cwd(), 'data', 'players.db');

/**
 * Infer category from player name and career info
 */
function inferCategory(name: string, birthYear: number, lastSeason: number | null): Player['category'] {
  const lowerName = name.toLowerCase();

  // Legends: born before 1980, retired before 2015
  const legendKeywords = ['pele', 'maradona', 'cruyff', 'beckenbauer', 'maldini', 'zidane', 'ronaldo nazario', 'ronaldinho', 'henry', 'puskas', 'di stefano', 'best', 'garrincha', 'charlton', 'eusebio', 'van basten', 'gullit', 'baresi', 'bergkamp', 'batistuta', 'baggio', 'klinsmann', 'vieri', 'suker', 'rivaldo'];
  if (legendKeywords.some(k => lowerName.includes(k)) || (birthYear < 1980 && lastSeason && lastSeason < 2015)) {
    return 'LEGEND';
  }

  // Icons: major stars 1990s-2010s
  const iconKeywords = ['cristiano ronaldo', 'lionel messi', 'neymar', 'suarez', 'aguero', 'lewandowski', 'modric', 'ramos', 'pique', 'alves', 'marcelo', 'silva', 'de bruyne', 'kante', 'pogba', 'griezmann', 'benzema', 'bale', 'ozil', 'muller', 'lahm', 'schweinsteiger', 'neuer'];
  if (iconKeywords.some(k => lowerName.includes(k))) {
    return 'ICON';
  }

  // Heroes: current superstars
  const heroKeywords = ['mbappe', 'haaland', 'vinicius', 'bellingham', 'saka', 'foden', 'pedri', 'gavi', 'rodrygo', 'valverde', 'tchouameni', 'saliba', 'dias', 'alisson', 'courtois', 'ter stegen', 'donnarumma', 'osimhen', 'kvaratskhelia', 'chiesa', 'odegaard', 'rice', 'gvardiol', 'hakimi', 'szoboszlai', 'raphinha', 'lautaro', 'alvarez', 'rashford', 'fernandes'];
  if (heroKeywords.some(k => lowerName.includes(k))) {
    return 'HERO';
  }

  // Retired: ended career
  if (lastSeason && lastSeason < 2023) {
    return 'RETIRED';
  }

  return 'CURRENT';
}

function parseCSV(): unknown[] {
  console.log('Parsing FBref CSV...');
  if (!existsSync(CSV_PATH)) {
    console.error(`FBref CSV not found at ${CSV_PATH}`);
    console.log('Expected columns: player_id, name, country, position, date_of_birth, team, league, photo_url, fbref_id');
    console.log('Download from community sources and place at data/fbref-players.csv');
    return [];
  }

  const content = readFileSync(CSV_PATH, 'utf-8');
  const records = parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });
  console.log(`Parsed ${records.length} FBref records`);
  return records;
}

function transformRecord(record: Record<string, string>): Player | null {
  if (!record.player_id || !record.name) return null;

  const playerId = record.player_id;
  const name = record.name?.trim();
  const firstName = record.first_name?.trim() || name.split(' ')[0];
  const lastName = record.last_name?.trim() || name.split(' ').slice(1).join(' ');
  const nationality = record.country?.trim() || record.nationality?.trim() || 'Unknown';
  const nationalityCode = normalizeNationalityCode(nationality);
  const dateOfBirth = record.date_of_birth?.split(' ')[0] || '1970-01-01';
  const primaryPosition = mapPosition(record.position || 'Central Midfield');
  const secondaryPositions: Player['secondaryPositions'] = [];
  const role = getRoleFromPosition(primaryPosition);
  const photoUrl = record.photo_url?.trim() || record.image_url?.trim() || null;
  const currentTeam = record.team?.trim() || record.current_club_name?.trim() || null;
  const currentLeague = record.league?.trim() || record.current_club_domestic_competition_id?.trim() || null;

  const birthYear = parseInt(dateOfBirth.split('-')[0]);
  const lastSeason = record.last_season ? parseInt(record.last_season) : null;
  const careerStartYear = birthYear + 17;
  const careerEndYear = lastSeason;

  const category = inferCategory(name, birthYear, careerEndYear);

  const searchText = [
    name,
    firstName,
    lastName,
    nationality,
    currentTeam || '',
    currentLeague || '',
  ].join(' ').toLowerCase();

  return {
    id: `fbref-${playerId}`,
    externalIds: {
      fbrefId: playerId,
      transfermarktId: record.transfermarkt_id?.trim() || undefined,
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
    photoSource: 'fbref',
    careerStartYear,
    careerEndYear,
    currentTeam,
    currentLeague,
    marketValueEur: null,
    highestMarketValueEur: null,
    internationalCaps: record.international_caps ? parseInt(record.international_caps) : null,
    internationalGoals: record.international_goals ? parseInt(record.international_goals) : null,
    category,
    searchText,
    source: 'database' as const,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function ingestPlayers(players: Player[]): void {
  console.log('Ingesting FBref players into database...');
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
  console.log(`Ingested ${players.length} FBref players in ${Date.now() - start}ms`);
}

async function main(): Promise<void> {
  console.log('Starting FBref ingestion...\n');

  const records = parseCSV();
  if (records.length === 0) {
    console.log('No records to ingest. Exiting.');
    return;
  }

  const players: Player[] = [];
  for (const record of records) {
    const player = transformRecord(record as Record<string, string>);
    if (player) players.push(player);
  }

  console.log(`Transformed ${players.length} valid players\n`);

  ingestPlayers(players);

  console.log('\nFBref ingestion complete!');
  console.log(`Database: ${DB_PATH}`);
}

main().catch(console.error);