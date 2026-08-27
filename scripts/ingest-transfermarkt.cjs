/**
 * Transfermarkt Datasets Ingestion Script (CommonJS for ts-node)
 *
 * Run with: npx ts-node -P tsconfig.scripts.json scripts/ingest-transfermarkt.cjs
 */

const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const zlib = require('zlib');
const { promisify } = require('util');
const crypto = require('crypto');
const Database = require('better-sqlite3');

const CSV_PATH = path.join(process.cwd(), 'players.csv');
const DB_PATH = path.join(process.cwd(), 'data', 'players.db');

const POSITION_MAP = {
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

function mapPosition(pos, subPos) {
  if (subPos && POSITION_MAP[subPos]) {
    return POSITION_MAP[subPos];
  }
  if (pos && POSITION_MAP[pos]) {
    return POSITION_MAP[pos];
  }
  return 'CM';
}

const NATIONALITY_CODE_MAP = {
  'England': 'GB', 'Scotland': 'GB', 'Wales': 'GB', 'Northern Ireland': 'GB',
  'Germany': 'DE', 'France': 'FR', 'Spain': 'ES', 'Italy': 'IT', 'Portugal': 'PT',
  'Brazil': 'BR', 'Argentina': 'AR', 'Netherlands': 'NL', 'Belgium': 'BE',
  'Croatia': 'HR', 'Poland': 'PL', 'Mexico': 'MX', 'United States': 'US',
  'Japan': 'JP', 'South Korea': 'KR', 'Australia': 'AU', 'Norway': 'NO',
  'Sweden': 'SE', 'Denmark': 'DK', 'Czech Republic': 'CZ', 'Austria': 'AT',
  'Switzerland': 'CH', 'Russia': 'RU', 'Ukraine': 'UA', 'Turkey': 'TR',
  'Greece': 'GR', 'Romania': 'RO', 'Hungary': 'HU', 'Serbia': 'RS',
  'Bulgaria': 'BG', 'Slovakia': 'SK', 'Slovenia': 'SI', 'Finland': 'FI',
  'Ireland': 'IE', 'Colombia': 'CO', 'Chile': 'CL', 'Uruguay': 'UY',
  'Paraguay': 'PY', 'Peru': 'PE', 'Ecuador': 'EC', 'Bolivia': 'BO',
  'Venezuela': 'VE', 'Cameroon': 'CM', 'Ivory Coast': 'CI', 'Senegal': 'SN',
  'Nigeria': 'NG', 'Ghana': 'GH', 'Egypt': 'EG', 'Morocco': 'MA',
  'Tunisia': 'TN', 'Algeria': 'DZ', 'South Africa': 'ZA', 'DR Congo': 'CD',
  'Mali': 'ML', 'Canada': 'CA', 'New Zealand': 'NZ', 'Iran': 'IR',
  'Iraq': 'IQ', 'Saudi Arabia': 'SA', 'Qatar': 'QA', 'UAE': 'AE',
  'China': 'CN', 'Thailand': 'TH', 'India': 'IN', 'Indonesia': 'ID',
  'Georgia': 'GE', 'Kazakhstan': 'KZ', 'Iceland': 'IS', 'Latvia': 'LV',
  'Estonia': 'EE', 'Lithuania': 'LT', 'Belarus': 'BY', 'Bosnia': 'BA',
  'North Macedonia': 'MK', 'Montenegro': 'ME', 'Albania': 'AL',
  'Israel': 'IL', 'Lebanon': 'LB', 'Jordan': 'JO', 'Kuwait': 'KW',
  'Oman': 'OM', 'Panama': 'PA', 'Costa Rica': 'CR', 'Honduras': 'HN',
  'Guatemala': 'GT', 'El Salvador': 'SV', 'Jamaica': 'JM', 'Cuba': 'CU',
  'Haiti': 'HT', 'Trinidad': 'TT', 'Suriname': 'SR', 'Guyana': 'GY',
  'Vietnam': 'VN', 'Philippines': 'PH', 'Malaysia': 'MY', 'Singapore': 'SG',
  'Hong Kong': 'HK',
};

const CATEGORY_KEYWORDS = {
  LEGEND: ['pele', 'maradona', 'cruyff', 'beckenbauer', 'maldini', 'zidane', 'ronaldo', 'ronaldinho', 'henry', 'puskas', 'di stefano', 'best', 'garrincha', 'charlton', 'eusebio', 'van basten', 'gullit', 'baresi', 'bergkamp', 'batistuta', 'baggio', 'klinsmann', 'vieri', 'suker', 'rivaldo', 'kaka', 'roberto carlos', 'cafu', 'nesta', 'cannavaro', 'buffon', 'casillas', 'pirlo', 'xavi', 'iniesta', 'puyol', 'totti', 'del piero', 'salgado', 'raúl', 'raul', 'zamora', 'suarez', 'amancio', 'gento', 'puskás', 'kocsis', 'hidegkuti', 'cubilla', 'moreno', 'valdano', 'burruchaga', 'oliveira', 'zico', 'socrates', 'falcao', 'cerezo', 'jr', 'toninho cerezo', 'aleman', 'edu', 'leao', 'tostao', 'jairzinho', 'riva', 'rivera', 'mazzola', 'facchetti', 'burgnich', 'giannetti', 'burgio', 'picchi', 'suarez', 'cubillas', 'chumpitaz', 'gallardo', 'serna', 'asprilla', 'valderrama', 'rincon', 'gaviria', 'arriaga', 'bermudez', 'cordoba', 'ramos', 'pereira', 'higuita'],
  ICON: ['cristiano ronaldo', 'lionel messi', 'neymar', 'suarez', 'aguero', 'lewandowski', 'modric', 'ramos', 'pique', 'alves', 'marcelo', 'silva', 'de bruyne', 'kante', 'pogba', 'griezmann', 'benzema', 'bale', 'ozil', 'muller', 'lahm', 'schweinsteiger', 'neuer', 'boateng', 'hummels', 'alaba', 'kimmich', 'david silva', 'xavi', 'iniesta', 'busquets', 'alba', 'jordi alba', 'pedro', 'villa', 'torres', 'mata', 'cazorla', 'fabregas', 'casillas', 'pique', 'ramos', 'alves', 'marcelo', 'modric', 'kroos', 'casemiro', 'varane', 'courtois', 'navas', 'oblak', 'godin', 'gimenez', 'koke', 'saul', 'griezmann', 'correa', 'felix', 'morata', 'diaz', 'llorente', 'trippier', 'james', 'rodriguez', 'falcao', 'martinez', 'quintero', 'cuadrado', 'ojeda', 'ospina', 'sanchez', 'muriel', 'bacca', 'guarin', 'sanchez', 'moreno', 'rios', 'arias', 'murillo', 'zapata', 'muriel', 'diaz', 'castro', 'lerma', 'borre', 'sinisterra', 'duran'],
  HERO: ['mbappe', 'haaland', 'vinicius', 'bellingham', 'saka', 'foden', 'pedri', 'gavi', 'rodrygo', 'valverde', 'tchouameni', 'saliba', 'dias', 'alisson', 'courtois', 'neuer', 'ter stegen', 'kepa', 'donnarumma', 'maignan', 'osimhen', 'kvaratskhelia', 'chiesa', 'odegaard', 'rice', 'gvardiol', 'hernandez', 'hakimi', 'szoboszlai', 'raphinha', 'lautaro', 'alvarez', 'julian alvarez', 'rashford', 'fernandes', 'sancho', 'greenwood', 'mount', 'chilwell', 'james', 'reece james', 'tomori', 'abraham', 'calvert-lewin', 'greaves', 'kane', 'son', 'sterling', 'mahrez', 'grealish', 'walker', 'stones', 'dias', 'cancelo', 'mendy', 'laporte', 'aké', 'gomez', 'alexander-arnold', 'robertson', 'tsimikas', 'williams', 'bradley', 'elliott', 'jones', 'henderson', 'milner', 'keita', 'wijnaldum', 'fabinho', 'alisson', 'adrian', 'kelleher', 'pellegrini', 'zaniolo', 'pellegrini', 'spinazzola', 'darmian', 'bastoni', 'barella', 'calhanoglu', 'brovska', 'mkhitaryan', 'dzeko', 'lautaro', 'correa', 'sanchez', 'dumfries', 'dimarco', 'damfries', 'darmian', 'bastoni', 'barella', 'calhanoglu', 'brovska', 'mkhitaryan', 'dzeko', 'lautaro', 'correa', 'sanchez', 'dumfries', 'dimarco'],
  CURRENT: [],
  RETIRED: ['retired'],
};

function normalizeNationalityCode(name) {
  return NATIONALITY_CODE_MAP[name] || 'XX';
}

function getRoleFromPosition(position) {
  if (position === 'GK') return 'Goalkeeper';
  if (['CB', 'LB', 'RB'].includes(position)) return 'Defender';
  if (['CDM', 'CM', 'CAM', 'LM', 'RM'].includes(position)) return 'Midfielder';
  return 'Forward';
}

function inferCategory(name, careerEndYear) {
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

  return 'CURRENT';
}

function transformRecord(record) {
  if (!record.player_id || !record.name) return null;

  const playerId = record.player_id;
  const name = record.name?.trim();
  const firstName = record.first_name?.trim() || name.split(' ')[0];
  const lastName = record.last_name?.trim() || name.split(' ').slice(1).join(' ');
  const nationality = record.country_of_citizenship?.trim() || record.country_of_birth?.trim() || 'Unknown';
  const nationalityCode = normalizeNationalityCode(nationality);
  const dateOfBirth = record.date_of_birth?.split(' ')[0] || '1970-01-01';
  const primaryPosition = mapPosition(record.position, record.sub_position);
  const secondaryPositions = record.sub_position ? [mapPosition(record.position, record.sub_position)] : [];
  const role = getRoleFromPosition(primaryPosition);
  const photoUrl = record.image_url?.trim() || null;
  const currentTeam = record.current_club_name?.trim() || null;
  const currentLeague = record.current_club_domestic_competition_id?.trim() || null;
  const marketValueEur = record.market_value_in_eur ? parseInt(record.market_value_in_eur) : null;
  const highestMarketValueEur = record.highest_market_value_in_eur ? parseInt(record.highest_market_value_in_eur) : null;
  const internationalCaps = record.international_caps ? parseInt(record.international_caps) : null;
  const internationalGoals = record.international_goals ? parseInt(record.international_goals) : null;

  const lastSeason = record.last_season ? parseInt(record.last_season) : null;
  const birthYear = parseInt(dateOfBirth.split('-')[0]);
  const careerStartYear = birthYear + 17;
  const careerEndYear = lastSeason;

  const category = inferCategory(name, careerEndYear);

  const searchText = [
    name, firstName, lastName, nationality, currentTeam || '', currentLeague || ''
  ].join(' ').toLowerCase();

  return {
    id: `tm-${playerId}`,
    externalIds: { transfermarktId: playerId },
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
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function initDB() {
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

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
    CREATE INDEX IF NOT EXISTS idx_players_nationality ON players(nationality_code);
    CREATE INDEX IF NOT EXISTS idx_players_category ON players(category);
    CREATE INDEX IF NOT EXISTS idx_players_search ON players(search_text);

    CREATE TABLE IF NOT EXISTS player_external_ids (
      player_id TEXT NOT NULL,
      source TEXT NOT NULL,
      external_id TEXT NOT NULL,
      PRIMARY KEY (source, external_id),
      FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_external_ids_player ON player_external_ids(player_id);

    CREATE VIRTUAL TABLE IF NOT EXISTS players_fts USING fts5(
      id UNINDEXED,
      name,
      first_name,
      last_name,
      nationality,
      current_team,
      content='players',
      content_rowid='rowid',
      tokenize='unicode61 remove_diacritics 2'
    );

    CREATE TRIGGER IF NOT EXISTS players_ai AFTER INSERT ON players BEGIN
      INSERT INTO players_fts(rowid, name, first_name, last_name, nationality, current_team)
      VALUES (new.rowid, new.name, new.first_name, new.last_name, new.nationality, new.current_team);
    END;

    CREATE TRIGGER IF NOT EXISTS players_ad AFTER DELETE ON players BEGIN
      DELETE FROM players_fts WHERE rowid = old.rowid;
    END;

    CREATE TRIGGER IF NOT EXISTS players_au AFTER UPDATE ON players BEGIN
      UPDATE players_fts SET
        name = new.name,
        first_name = new.first_name,
        last_name = new.last_name,
        nationality = new.nationality,
        current_team = new.current_team
      WHERE rowid = new.rowid;
    END;
  `);

  return db;
}

function ingestPlayers(db, players) {
  const insertStmt = db.prepare(`
    INSERT OR REPLACE INTO players (
      id, external_ids, name, first_name, last_name, nationality, nationality_code,
      date_of_birth, primary_position, secondary_positions, role, photo_url, photo_source,
      career_start_year, career_end_year, current_team, current_league,
      market_value_eur, highest_market_value_eur, international_caps, international_goals,
      category, search_text, created_at, updated_at
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
    )
  `);

  const externalIdStmt = db.prepare(`
    INSERT OR REPLACE INTO player_external_ids (player_id, source, external_id)
    VALUES (?, ?, ?)
  `);

  const transaction = db.transaction((players) => {
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

async function downloadCSV() {
  const url = 'https://pub-e682421888d945d684bcae8890b0ec20.r2.dev/data/players.csv.gz';
  console.log('Downloading transfermarkt-datasets CSV...');

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download: ${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  return new Promise((resolve, reject) => {
    const gunzip = zlib.createGunzip();
    const writeStream = fs.createWriteStream(CSV_PATH);
    const readStream = require('stream').Readable.from(buffer);

    readStream
      .pipe(gunzip)
      .pipe(writeStream)
      .on('finish', resolve)
      .on('error', reject);
  });
}

async function main() {
  console.log('Starting transfermarkt-datasets ingestion...\n');

  // Download if not exists
  if (!fs.existsSync(CSV_PATH)) {
    await downloadCSV();
  }

  // Parse and transform
  console.log('Parsing CSV...');
  const content = fs.readFileSync(CSV_PATH, 'utf-8');
  const records = parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });
  console.log(`Parsed ${records.length} records`);

  const players = [];
  for (const record of records) {
    const player = transformRecord(record);
    if (player) players.push(player);
  }

  console.log(`Transformed ${players.length} valid players\n`);

  // Ingest
  const db = initDB();
  ingestPlayers(db, players);
  db.close();

  console.log('\nIngestion complete!');
  console.log(`Database: ${DB_PATH}`);
}

main().catch(console.error);