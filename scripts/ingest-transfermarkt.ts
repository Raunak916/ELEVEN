#!/usr/bin/env node

/**
 * Transfermarkt Datasets Ingestion Script
 *
 * Downloads and ingests the transfermarkt-datasets CSV into the local SQLite database.
 * Run with: npx ts-node scripts/ingest-transfermarkt.ts
 */

import { parse } from 'csv-parse/sync';
import { createGunzip } from 'zlib';
import { join } from 'path';
import { getPlayerDB, mapPosition, normalizeNationalityCode, getRoleFromPosition } from '@/lib/player-db';
import { Player } from '@/lib/player-db-types';
import { createWriteStream, createReadStream, readFileSync } from 'fs';
import { pipeline } from 'stream/promises';

const CSV_PATH = join(process.cwd(), 'players.csv');
const DB_PATH = join(process.cwd(), 'data', 'players.db');

const CATEGORY_KEYWORDS = {
  LEGEND: ['pele', 'maradona', 'cruyff', 'beckenbauer', 'maldini', 'zidane', 'ronaldo', 'ronaldinho', 'henry', 'puskas', 'di stefano', 'best', 'garrincha', 'charlton', 'eusebio', 'van basten', 'gullit', 'baresi', 'bergkamp', 'batistuta', 'baggio', 'klinsmann', 'vieri', 'suker', 'rivaldo', 'kaka', 'ronaldinho', 'roberto carlos', 'cafu', 'nesta', 'cannavaro', 'buffon', 'casillas', 'pirlo', 'xavi', 'iniesta', 'puyol', 'viola', 'totti', 'del piero', 'salgado', 'hierarchy', 'raúl', 'raul', 'zamora', 'suarez', 'amancio', 'gento', 'puskás', 'kocsis', 'hidegkuti', 'cubilla', 'moreno', 'valdano', 'burruchaga', 'oliveira', 'zico', 'socrates', 'falcao', 'cerezo', 'jr', 'toninho cerezo', 'aleman', 'edu', 'leao', 'tostao', 'jairzinho', 'riva', 'rivera', 'mazzola', 'facchetti', 'burgnich', 'giannetti', 'burgio', 'picchi', 'suarez', 'cubillas', 'chumpitaz', 'gallardo', 'serna', 'asprilla', 'valderrama', 'rincon', 'gaviria', 'arriaga', 'bermudez', 'cordoba', 'ramos', 'pereira', 'higuita'],
  ICON: ['cristiano ronaldo', 'lionel messi', 'neymar', 'suarez', 'aguero', 'lewandowski', 'modric', 'ramos', 'pique', 'alves', 'marcelo', 'silva', 'de bruyne', 'kante', 'pogba', 'griezmann', 'benzema', 'bale', 'ozil', 'muller', 'lahm', 'schweinsteiger', 'neuer', 'boateng', 'hummels', 'alaba', 'kimmich', 'david silva', 'xavi', 'iniesta', 'busquets', 'alba', 'jordi alba', 'is', 'pedro', 'villa', 'torres', 'mata', 'cazorla', 'fabregas', 'casillas', 'pique', 'ramos', 'alves', 'marcelo', 'modric', 'kroos', 'casemiro', 'varane', 'courtois', 'navas', 'oblak', 'godin', 'gimenez', 'koke', 'saul', 'griezmann', 'correa', 'felix', 'morata', 'diaz', 'llorente', 'trippier', 'james', 'rodriguez', 'falcao', 'martinez', 'quintero', 'cuadrado', 'ojeda', 'ospina', 'sanchez', 'muriel', 'bacca', 'guarin', 'sanchez', 'moreno', 'rios', 'arias', 'murillo', 'zapata', 'muriel', 'diaz', 'castro', 'lerma', 'borre', 'sinisterra', 'duran'],
  HERO: ['mbappe', 'haaland', 'vinicius', 'bellingham', 'saka', 'foden', 'pedri', 'gavi', 'rodrygo', 'valverde', 'tchouameni', 'saliba', 'dias', 'alisson', 'courtois', 'neuer', 'ter stegen', 'kepa', 'donnarumma', 'maignan', 'osimhen', 'kvaratskhelia', 'chiesa', 'odegaard', 'rice', 'gvardiol', 'hernandez', 'hakimi', 'szoboszlai', 'raphinha', 'lautaro', 'alvarez', 'julian alvarez', 'rashford', 'fernandes', 'sancho', 'greenwood', 'mount', 'chilwell', 'james', 'reece james', 'tomori', 'abraham', 'calvert-lewin', 'greaves', 'kane', 'son', 'sterling', 'mahrez', 'grealish', 'walker', 'stones', 'dias', 'cancelo', 'mendy', 'laporte', 'aké', 'gomez', 'alexander-arnold', 'robertson', 'tsimikas', 'williams', 'bradley', 'elliott', 'jones', 'henderson', 'milner', 'keita', 'wijnaldum', 'fabinho', 'alisson', 'adrian', 'kelleher', 'pellegrini', 'zaniolo', 'pellegrini', 'spinazzola', 'darmian', 'bastoni', 'barella', 'calhanoglu', 'brovska', 'mkhitaryan', 'dzeko', 'lautaro', 'correa', 'sanchez', 'dumfries', 'dimarco', 'damfries', 'darmian', 'bastoni', 'barella', 'calhanoglu', 'brovska', 'mkhitaryan', 'dzeko', 'lautaro', 'correa', 'sanchez', 'dumfries', 'dimarco'],
  CURRENT: [],
  RETIRED: ['retired'],
};

function inferCategory(name: string, careerEndYear: number | null): string {
  const lowerName = name.toLowerCase();

  if (careerEndYear && careerEndYear < 2015) {
    return 'RETIRED';
  }

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (category === 'RETIRED') continue;
    for (const keyword of keywords) {
      if (lowerName.includes(keyword)) {
        return category;
      }
    }
  }

  // Default: check birth year for rough classification
  return 'CURRENT';
}

async function downloadCSV(): Promise<void> {
  const url = 'https://pub-e682421888d945d684bcae8890b0ec20.r2.dev/data/players.csv.gz';
  const outputPath = CSV_PATH;

  console.log('Downloading transfermarkt-datasets CSV...');

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download: ${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Decompress gzip
  const gunzipStream = createGunzip();
  await pipeline(createReadStream(buffer), gunzipStream, createWriteStream(outputPath));
}

function parseCSV(): unknown[] {
  console.log('Parsing CSV...');
  const content = readFileSync(CSV_PATH, 'utf-8');
  const records = parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });
  console.log(`Parsed ${records.length} records`);
  return records;
}

function transformRecord(record: Record<string, string>): Player | null {
  // Skip invalid records
  if (!record.player_id || !record.name) return null;

  const playerId = record.player_id;
  const name = record.name?.trim();
  const firstName = record.first_name?.trim() || name.split(' ')[0];
  const lastName = record.last_name?.trim() || name.split(' ').slice(1).join(' ');
  const nationality = record.country_of_citizenship?.trim() || record.country_of_birth?.trim() || 'Unknown';
  const nationalityCode = normalizeNationalityCode(nationality);
  const dateOfBirth = record.date_of_birth?.split(' ')[0] || '1970-01-01';
  const primaryPosition = mapPosition(record.position || 'Central Midfield');
  const secondaryPositions = record.sub_position ? [mapPosition(record.sub_position)] : [];
  const role = getRoleFromPosition(primaryPosition);
  const photoUrl = record.image_url?.trim() || null;
  const currentTeam = record.current_club_name?.trim() || null;
  const currentLeague = record.current_club_domestic_competition_id?.trim() || null;
  const marketValueEur = record.market_value_in_eur ? parseInt(record.market_value_in_eur) : null;
  const highestMarketValueEur = record.highest_market_value_in_eur ? parseInt(record.highest_market_value_in_eur) : null;
  const internationalCaps = record.international_caps ? parseInt(record.international_caps) : null;
  const internationalGoals = record.international_goals ? parseInt(record.international_goals) : null;

  // Estimate career years from last_season
  const lastSeason = record.last_season ? parseInt(record.last_season) : null;
  const birthYear = parseInt(dateOfBirth.split('-')[0]);
  const careerStartYear = birthYear + 17; // Rough estimate
  const careerEndYear = lastSeason;

  const category = inferCategory(name, careerEndYear) as Player['category'];

  // Build search text
  const searchText = [
    name,
    firstName,
    lastName,
    nationality,
    currentTeam || '',
    currentLeague || '',
  ].join(' ').toLowerCase();

  return {
    id: `tm-${playerId}`,
    externalIds: {
      transfermarktId: playerId,
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
    photoSource: 'transfermarkt',
    careerStartYear,
    careerEndYear,
    currentTeam,
    currentLeague,
    marketValueEur,
    highestMarketValueEur,
    internationalCaps,
    internationalGoals,
    category,
    searchText,
    source: 'database' as const,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function ingestPlayers(players: Player[]): void {
  console.log('Ingesting into database...');
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
  console.log(`Ingested ${players.length} players in ${Date.now() - start}ms`);
}

async function main(): Promise<void> {
  console.log('Starting transfermarkt-datasets ingestion...\n');

  // Download if not exists
  if (!existsSync(CSV_PATH)) {
    await downloadCSV();
  }

  // Parse and transform
  const records = parseCSV();
  const players: Player[] = [];

  for (const record of records) {
    const player = transformRecord(record as Record<string, string>);
    if (player) players.push(player);
  }

  console.log(`Transformed ${players.length} valid players\n`);

  // Ingest
  ingestPlayers(players);

  console.log('\nIngestion complete!');
  console.log(`Database: ${DB_PATH}`);
}

import { existsSync } from 'fs';

main().catch(console.error);