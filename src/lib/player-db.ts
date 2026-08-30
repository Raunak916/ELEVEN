import Database from 'better-sqlite3';
import { join } from 'path';
import { existsSync } from 'fs';
import { Player, PhotoSource, PlayerSource } from './player-db-types';
import { PlayerPosition, PlayerRole, PlayerCategory } from './types';
import { PLAYERS } from './players-data';

// Re-export Player for compatibility
export type { Player };

const DB_PATH = join(process.cwd(), 'data', 'players.db');

let dbInstance: Database.Database | null = null;

export function getPlayerDB(): Database.Database {
  if (dbInstance) return dbInstance;

  // 1. Try opening existing DB in readonly mode (Vercel Serverless safe)
  try {
    if (existsSync(DB_PATH)) {
      try {
        const db = new Database(DB_PATH, { readonly: true, fileMustExist: true });
        dbInstance = db;
        return db;
      } catch (roErr) {
        console.warn('Readonly DB connection failed, creating in-memory fallback:', roErr);
      }
    }
  } catch (fsErr) {
    console.warn('FS check error, creating in-memory fallback:', fsErr);
  }

  // 2. In-Memory fallback database for Serverless / Cloud environments
  try {
    const db = new Database(':memory:');
    db.exec(`
      CREATE TABLE IF NOT EXISTS players (
        id TEXT PRIMARY KEY,
        external_ids TEXT NOT NULL,
        name TEXT NOT NULL,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        nationality TEXT NOT NULL,
        nationality_code TEXT NOT NULL,
        date_of_birth TEXT NOT NULL,
        primary_position TEXT NOT NULL,
        secondary_positions TEXT NOT NULL,
        role TEXT NOT NULL,
        photo_url TEXT,
        photo_source TEXT NOT NULL DEFAULT 'transfermarkt',
        career_start_year INTEGER,
        career_end_year INTEGER,
        current_team TEXT,
        current_league TEXT,
        market_value_eur INTEGER,
        highest_market_value_eur INTEGER,
        international_caps INTEGER,
        international_goals INTEGER,
        category TEXT NOT NULL DEFAULT 'CURRENT',
        search_text TEXT NOT NULL,
        source TEXT NOT NULL DEFAULT 'database',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_players_name ON players(name);
      CREATE INDEX IF NOT EXISTS idx_players_search ON players(search_text);
    `);

    const insertStmt = db.prepare(`
      INSERT OR REPLACE INTO players (
        id, external_ids, name, first_name, last_name, nationality, nationality_code,
        date_of_birth, primary_position, secondary_positions, role, photo_url, photo_source,
        current_team, current_league, category, search_text, source, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertMany = db.transaction((playerList: typeof PLAYERS) => {
      for (const p of playerList) {
        insertStmt.run(
          p.id,
          JSON.stringify({}),
          p.name,
          p.firstName || '',
          p.lastName || '',
          p.nationality || 'Unknown',
          p.nationalityCode || 'XX',
          p.dateOfBirth || '2000-01-01',
          p.position || 'CM',
          JSON.stringify([]),
          p.role || 'Midfielder',
          p.photo || null,
          'generated',
          p.team || 'Unknown',
          p.league || 'Unknown',
          p.category || 'CURRENT',
          `${p.name} ${p.firstName || ''} ${p.lastName || ''} ${p.team || ''} ${p.nationality || ''}`.toLowerCase(),
          p.source || 'database',
          new Date().toISOString(),
          new Date().toISOString()
        );
      }
    });

    insertMany(PLAYERS);
    dbInstance = db;
    return db;
  } catch (memErr) {
    console.error('In-memory DB fallback fatal error:', memErr);
    throw memErr;
  }
}

export function closePlayerDB(): void {
  if (dbInstance) {
    try {
      dbInstance.close();
    } catch {
      // ignore
    }
    dbInstance = null;
  }
}

const POSITION_MAP: Record<string, Player['primaryPosition']> = {
  // Specific Sub-Positions
  'Centre-Forward': 'ST',
  'Second Striker': 'ST',
  'Left Winger': 'LW',
  'Right Winger': 'RW',
  'Centre-Back': 'CB',
  'Left-Back': 'LB',
  'Right-Back': 'RB',
  'Defensive Midfield': 'CDM',
  'Central Midfield': 'CM',
  'Attacking Midfield': 'CAM',
  'Left Midfield': 'LM',
  'Right Midfield': 'RM',
  'Goalkeeper': 'GK',

  // Broad/Generic Positions
  'Attack': 'ST',
  'Defender': 'CB',
  'Midfield': 'CM',
  'Forward': 'ST',
  'Midfielder': 'CM',
};

export function mapPosition(pos: string, subPos?: string): Player['primaryPosition'] {
  if (subPos && POSITION_MAP[subPos]) {
    return POSITION_MAP[subPos];
  }
  if (pos && POSITION_MAP[pos]) {
    return POSITION_MAP[pos];
  }
  return 'CM';
}

export function normalizeNationalityCode(name: string): string {
  const map: Record<string, string> = {
    'England': 'GB',
    'Scotland': 'GB',
    'Wales': 'GB',
    'Northern Ireland': 'GB',
    'Germany': 'DE',
    'France': 'FR',
    'Spain': 'ES',
    'Italy': 'IT',
    'Portugal': 'PT',
    'Brazil': 'BR',
    'Argentina': 'AR',
    'Netherlands': 'NL',
    'Belgium': 'BE',
    'Croatia': 'HR',
    'Poland': 'PL',
    'Mexico': 'MX',
    'United States': 'US',
    'Japan': 'JP',
    'South Korea': 'KR',
    'Australia': 'AU',
    'Norway': 'NO',
    'Sweden': 'SE',
    'Denmark': 'DK',
    'Czech Republic': 'CZ',
    'Austria': 'AT',
    'Switzerland': 'CH',
    'Russia': 'RU',
    'Ukraine': 'UA',
    'Turkey': 'TR',
    'Greece': 'GR',
    'Romania': 'RO',
    'Hungary': 'HU',
    'Serbia': 'RS',
    'Bulgaria': 'BG',
    'Slovakia': 'SK',
    'Slovenia': 'SI',
    'Finland': 'FI',
    'Ireland': 'IE',
    'Colombia': 'CO',
    'Chile': 'CL',
    'Uruguay': 'UY',
    'Paraguay': 'PY',
    'Peru': 'PE',
    'Ecuador': 'EC',
    'Bolivia': 'BO',
    'Venezuela': 'VE',
    'Vietnam': 'VN',
    'Cameroon': 'CM',
    'Ivory Coast': 'CI',
    'Senegal': 'SN',
    'Nigeria': 'NG',
    'Ghana': 'GH',
    'Egypt': 'EG',
    'Morocco': 'MA',
    'Tunisia': 'TN',
    'Algeria': 'DZ',
    'South Africa': 'ZA',
    'DR Congo': 'CD',
    'Mali': 'ML',
    'Canada': 'CA',
    'New Zealand': 'NZ',
    'Iran': 'IR',
    'Iraq': 'IQ',
    'Saudi Arabia': 'SA',
    'Qatar': 'QA',
    'UAE': 'AE',
    'China': 'CN',
    'Thailand': 'TH',
    'India': 'IN',
    'Indonesia': 'ID',
    'Georgia': 'GE',
    'Kazakhstan': 'KZ',
    'Iceland': 'IS',
    'Latvia': 'LV',
    'Estonia': 'EE',
    'Lithuania': 'LT',
    'Belarus': 'BY',
    'Bosnia': 'BA',
    'North Macedonia': 'MK',
    'Montenegro': 'ME',
    'Albania': 'AL',
    'Israel': 'IL',
    'Lebanon': 'LB',
    'Jordan': 'JO',
    'Kuwait': 'KW',
    'Oman': 'OM',
    'Panama': 'PA',
    'Costa Rica': 'CR',
    'Honduras': 'HN',
    'Guatemala': 'GT',
    'El Salvador': 'SV',
    'Jamaica': 'JM',
    'Cuba': 'CU',
    'Haiti': 'HT',
    'Trinidad': 'TT',
    'Suriname': 'SR',
    'Guyana': 'GY',
  };
  return map[name] ?? 'XX';
}

export function getRoleFromPosition(position: Player['primaryPosition']): Player['role'] {
  switch (position) {
    case 'GK': return 'Goalkeeper';
    case 'CB': case 'LB': case 'RB': return 'Defender';
    case 'CDM': case 'CM': case 'CAM': case 'LM': case 'RM': return 'Midfielder';
    default: return 'Forward';
  }
}

interface PlayerRow {
  id: string;
  external_ids: string;
  name: string;
  first_name: string;
  last_name: string;
  nationality: string;
  nationality_code: string;
  date_of_birth: string;
  primary_position: string;
  secondary_positions: string;
  role: string;
  photo_url: string | null;
  photo_source: string;
  career_start_year: number | null;
  career_end_year: number | null;
  current_team: string | null;
  current_league: string | null;
  market_value_eur: number | null;
  highest_market_value_eur: number | null;
  international_caps: number | null;
  international_goals: number | null;
  category: string;
  search_text: string;
  source: string;
  created_at: string;
  updated_at: string;
}

export function rowToPlayer(row: unknown): Player {
  const r = row as PlayerRow;
  let externalIds: Record<string, string> = {};
  try {
    externalIds = r.external_ids ? JSON.parse(r.external_ids) : {};
  } catch {
    externalIds = {};
  }

  let secondaryPositions: PlayerPosition[] = [];
  try {
    secondaryPositions = r.secondary_positions ? JSON.parse(r.secondary_positions) : [];
  } catch {
    secondaryPositions = [];
  }

  return {
    id: r.id,
    externalIds,
    name: r.name || '',
    firstName: r.first_name || '',
    lastName: r.last_name || '',
    nationality: r.nationality || 'Unknown',
    nationalityCode: r.nationality_code || 'XX',
    dateOfBirth: r.date_of_birth || '',
    primaryPosition: (r.primary_position as PlayerPosition) || 'CM',
    secondaryPositions,
    role: (r.role as PlayerRole) || 'Midfielder',
    photoUrl: r.photo_url || null,
    photoSource: (r.photo_source as PhotoSource) || 'generated',
    careerStartYear: r.career_start_year || null,
    careerEndYear: r.career_end_year || null,
    currentTeam: r.current_team || null,
    currentLeague: r.current_league || null,
    marketValueEur: r.market_value_eur || null,
    highestMarketValueEur: r.highest_market_value_eur || null,
    internationalCaps: r.international_caps || null,
    internationalGoals: r.international_goals || null,
    category: (r.category as PlayerCategory) || 'CURRENT',
    searchText: r.search_text || '',
    source: (r.source as PlayerSource) || 'database',
    createdAt: r.created_at || new Date().toISOString(),
    updatedAt: r.updated_at || new Date().toISOString(),
  };
}
