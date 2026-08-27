/**
 * Wikidata Historical Legends Ingestion (Batch by Letter)
 *
 * Uses Wikidata's REST API to fetch players born before a given year.
 * Avoids SPARQL timeout by querying per-letter and using simpler queries.
 */

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const DB_PATH = path.join(process.cwd(), 'data', 'players.db');

// Specific famous legends we want to ensure are in the DB (Q-IDs from Wikidata)
const LEGEND_QIDS = [
  'Q1152',   // Pelé
  'Q11577',  // Diego Maradona
  'Q48316',  // Johan Cruyff
  'Q49158',  // Franz Beckenbauer
  'Q44534',  // Zinedine Zidane
  'Q115179', // Ronaldo Nazário
  'Q177431', // Ronaldinho
  'Q18098',  // Thierry Henry
  'Q18343',  // Paolo Maldini
  'Q18023',  // Franco Baresi
  'Q92681',  // George Best
  'Q184211', // Gerd Müller
  'Q16504',  // Bobby Charlton
  'Q184808', // Eusébio
  'Q181026', // Marco van Basten
  'Q176537', // Ruud Gullit
  'Q163060', // David Beckham
  'Q18333',  // Xavi
  'Q181179', // Andrés Iniesta
  'Q182126', // Carles Puyol
  'Q172448', // Kaká
  'Q182265', // Didier Drogba
  'Q180371', // Samuel Eto'o
  'Q184460', // Steven Gerrard
  'Q180974', // Frank Lampard
  'Q181734', // Andrea Pirlo
  'Q182030', // Iker Casillas
  'Q173030', // Gianluigi Buffon
  'Q180189', // Patrick Vieira
  'Q118681', // Michel Platini
  'Q313259', // Lothar Matthäus
  'Q115915', // Karl-Heinz Rummenigge
  'Q176862', // Roberto Baggio
  'Q117735', // Gabriel Batistuta
  'Q192808', // Dennis Bergkamp
  'Q182470', // Rivaldo
  'Q182031', // Roberto Carlos
  'Q182618', // Cafu
  'Q181170', // Alessandro Nesta
  'Q182241', // Fabio Cannavaro
  'Q181283', // Raúl
  'Q181303', // Luis Figo
  'Q172806', // Michael Owen
  'Q182560', // Michael Ballack
  'Q55871',  // Lev Yashin
  'Q176530', // Ferenc Puskás
  'Q55521',  // Alfredo Di Stéfano
  'Q183854', // Socrates
  'Q183325', // Zico
  'Q176535', // Garrincha
  'Q176534', // Jairzinho
  'Q183144', // Tostão
  'Q176815', // Sandro Mazzola
  'Q176413', // Gianni Rivera
  'Q183623', // Dino Zoff
  'Q176544', // Paolo Rossi
  'Q183111', // Paul Breitner
  'Q176653', // Uwe Seeler
  'Q188079', // Kevin Keegan
  'Q182434', // Kenny Dalglish
  'Q184305', // Kenny Dalglish
  'Q176775', // Bobby Moore
  'Q188038', // Jimmy Greaves
  'Q180606', // Alan Shearer
  'Q188996', // Gary Lineker
  'Q182606', // Ryan Giggs
  'Q181030', // Paul Scholes
  'Q181006', // Roy Keane
  'Q188574', // Michael Laudrup
  'Q181781', // Brian Laudrup
  'Q183078', // Henrik Larsson
  'Q176950', // Peter Schmeichel
  'Q183918', // Thomas Häßler
  'Q183499', // Jürgen Klinsmann
  'Q184573', // Rudi Völler
  'Q183479', // Lothar Matthäus
  'Q184814', // Jürgen Kohler
  'Q184510', // Andreas Möller
  'Q182451', // Matthias Sammer
  'Q183033', // Thomas Helmer
  'Q184589', // Stefan Effenberg
  'Q184585', // Mehmet Scholl
  'Q181795', // Oliver Kahn
  'Q184216', // Bodo Illgner
  'Q181585', // Thomas Strunz
  'Q183740', // Dieter Eilts
  'Q184567', // Christian Ziege
  'Q184568', // Christian Wörns
  'Q184171', // Markus Babbel
  'Q183675', // Thomas Linke
  'Q184166', // Carsten Jancker
  'Q184585', // Mehmet Scholl (duplicate)
];

const WIKIDATA_API = 'https://www.wikidata.org/w/api.php';
const WIKIDATA_ENTITY = 'https://www.wikidata.org/wiki/Special:EntityData';

async function fetchEntity(qid) {
  const url = `${WIKIDATA_ENTITY}/${qid}.json`;
  const response = await fetch(url, {
    headers: { 'User-Agent': 'FootballAuction/1.0' }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${qid}: ${response.status}`);
  }

  return await response.json();
}

function extractPlayerData(qid, entity) {
  const claims = entity.claims || {};

  const getString = (prop) => {
    const claim = claims[prop];
    if (!claim || !claim[0]) return null;
    return claim[0].mainsnak?.datavalue?.value?.text ||
           claim[0].mainsnak?.datavalue?.value?.id ||
           claim[0].mainsnak?.datavalue?.value || null;
  };

  const getTimeValue = (prop) => {
    const claim = claims[prop];
    if (!claim || !claim[0]) return null;
    const time = claim[0].mainsnak?.datavalue?.value?.time;
    return time ? time.replace(/^\+/, '').split('T')[0] : null;
  };

  const getEntityId = (prop) => {
    const claim = claims[prop];
    if (!claim || !claim[0]) return null;
    return claim[0].mainsnak?.datavalue?.value?.id || null;
  };

  const getImage = (prop) => {
    const claim = claims[prop];
    if (!claim || !claim[0]) return null;
    const filename = claim[0].mainsnak?.datavalue?.value;
    if (!filename) return null;
    // Convert to Wikimedia URL
    const encoded = encodeURIComponent(filename.replace(/ /g, '_'));
    const md5 = require('crypto').createHash('md5').update(encoded).digest('hex');
    const url = `https://upload.wikimedia.org/wikipedia/commons/${md5[0]}/${md5.slice(0,2)}/${encoded}`;
    return url;
  };

  const name = entity.labels?.en?.value || getString('P1559') || qid;
  const birthDate = getTimeValue('P569') || '1970-01-01';

  // Position (P413)
  const positionClaim = claims['P413'];
  let position = 'CM';
  if (positionClaim && positionClaim[0]) {
    const posId = positionClaim[0].mainsnak?.datavalue?.value?.id;
    const posMap = {
      'Q47722': 'GK',   // Goalkeeper
      'Q624846': 'CB',   // Centre-back
      'Q79657': 'LB',    // Left-back
      'Q79659': 'RB',    // Right-back
      'Q115894': 'CDM',  // Defensive midfielder
      'Q28217': 'CM',    // Midfielder
      'Q115896': 'CAM',  // Attacking midfielder
      'Q115888': 'LW',   // Left winger
      'Q115890': 'RW',   // Right winger
      'Q2302113': 'ST',  // Forward
      'Q42536': 'ST',    // Striker
    };
    position = posMap[posId] || 'CM';
  }

  // Nationality (P27)
  const natClaim = claims['P27'];
  let nationality = 'Unknown';
  let nationalityCode = 'XX';
  if (natClaim && natClaim[0]) {
    const natId = natClaim[0].mainsnak?.datavalue?.value?.id;
    // Would need second query to get country name, but we can use country codes
    const natMap = {
      'Q155': ['Brazil', 'BR'],
      'Q33': ['Argentina', 'AR'],
      'Q142': ['France', 'FR'],
      'Q183': ['Germany', 'DE'],
      'Q298': ['Spain', 'ES'],
      'Q38': ['Italy', 'IT'],
      'Q45': ['Portugal', 'PT'],
      'Q55': ['Netherlands', 'NL'],
      'Q31': ['Belgium', 'BE'],
      'Q224': ['Croatia', 'HR'],
      'Q36': ['Poland', 'PL'],
      'Q96': ['Mexico', 'MX'],
      'Q30': ['United States', 'US'],
      'Q17': ['Japan', 'JP'],
      'Q884': ['South Korea', 'KR'],
      'Q408': ['Australia', 'AU'],
      'Q20': ['Norway', 'NO'],
      'Q34': ['Sweden', 'SE'],
      'Q35': ['Denmark', 'DK'],
      'Q213': ['Czech Republic', 'CZ'],
      'Q40': ['Austria', 'AT'],
      'Q39': ['Switzerland', 'CH'],
      'Q159': ['Russia', 'RU'],
      'Q212': ['Ukraine', 'UA'],
      'Q43': ['Turkey', 'TR'],
      'Q41': ['Greece', 'GR'],
      'Q218': ['Romania', 'RO'],
      'Q28': ['Hungary', 'HU'],
      'Q403': ['Serbia', 'RS'],
      'Q219': ['Bulgaria', 'BG'],
      'Q214': ['Slovakia', 'SK'],
      'Q215': ['Slovenia', 'SI'],
      'Q33F': ['Finland', 'FI'],
      'Q27': ['Ireland', 'IE'],
      'Q739': ['Colombia', 'CO'],
      'Q298': ['Chile', 'CL'],
      'Q77': ['Uruguay', 'UY'],
      'Q733': ['Peru', 'PE'],
      'Q736': ['Ecuador', 'EC'],
      'Q750': ['Venezuela', 'VE'],
      'Q1009': ['Cameroon', 'CM'],
      'Q1005': ['Ivory Coast', 'CI'],
      'Q1041': ['Senegal', 'SN'],
      'Q1033': ['Nigeria', 'NG'],
      'Q117': ['Ghana', 'GH'],
      'Q79': ['Egypt', 'EG'],
      'Q1028': ['Morocco', 'MA'],
      'Q946': ['Tunisia', 'TN'],
      'Q262': ['Algeria', 'DZ'],
      'Q258': ['South Africa', 'ZA'],
      'Q230': ['DR Congo', 'CD'],
      'Q912': ['Mali', 'ML'],
      'Q16': ['Canada', 'CA'],
      'Q664': ['New Zealand', 'NZ'],
      'Q794': ['Iran', 'IR'],
      'Q796': ['Iraq', 'IQ'],
      'Q851': ['Saudi Arabia', 'SA'],
      'Q846': ['Qatar', 'QA'],
      'Q878': ['United Arab Emirates', 'AE'],
      'Q148': ['China', 'CN'],
      'Q252': ['Thailand', 'TH'],
      'Q668': ['India', 'IN'],
      'Q252': ['Thailand', 'TH'],
    };
    const nat = natMap[natId];
    if (nat) {
      nationality = nat[0];
      nationalityCode = nat[1];
    }
  }

  const imageUrl = getImage('P18');

  const nameParts = name.split(' ');
  const firstName = nameParts[0] || name;
  const lastName = nameParts.slice(1).join(' ') || name;

  const birthYear = parseInt(birthDate.split('-')[0]);
  const careerStartYear = birthYear + 17;
  const careerEndYear = birthYear + 38;

  // Determine category based on era
  let category = 'RETIFIED';
  if (birthYear < 1970) category = 'LEGEND';
  else if (birthYear < 1985) category = 'ICON';
  else if (birthYear < 1995) category = 'HERO';
  else category = 'CURRENT';

  const searchText = [name, firstName, lastName, nationality].join(' ').toLowerCase();

  return {
    id: `wd-${qid}`,
    externalIds: { wikidataId: qid },
    name,
    firstName,
    lastName,
    nationality,
    nationalityCode,
    dateOfBirth: birthDate,
    primaryPosition: position,
    secondaryPositions: [],
    role: position === 'GK' ? 'Goalkeeper' :
          ['CB', 'LB', 'RB'].includes(position) ? 'Defender' :
          ['CDM', 'CM', 'CAM', 'LM', 'RM'].includes(position) ? 'Midfielder' : 'Forward',
    photoUrl: imageUrl,
    photoSource: imageUrl ? 'wikimedia' : 'generated',
    careerStartYear,
    careerEndYear,
    currentTeam: null,
    currentLeague: null,
    marketValueEur: null,
    highestMarketValueEur: null,
    internationalCaps: null,
    internationalGoals: null,
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
  return db;
}

function ingestPlayer(db, player) {
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
}

async function main() {
  console.log('Starting Wikidata legends ingestion...\n');

  const db = initDB();

  // Check existing
  const existingIds = new Set(
    db.prepare("SELECT id FROM players WHERE id LIKE 'wd-%'").all().map(r => r.id)
  );

  let added = 0;
  let skipped = 0;

  for (const qid of LEGEND_QIDS) {
    const wdId = `wd-${qid}`;
    if (existingIds.has(wdId)) {
      skipped++;
      continue;
    }

    try {
      const data = await fetchEntity(qid);
      const entity = data.entities[qid];
      if (!entity) {
        console.log(`Skipping ${qid} - not found`);
        continue;
      }

      const player = extractPlayerData(qid, entity);
      ingestPlayer(db, player);
      added++;
      console.log(`Added: ${player.name} (${player.nationality}, ${player.category})`);
    } catch (error) {
      console.error(`Failed ${qid}: ${error.message}`);
    }

    // Rate limit
    await new Promise(r => setTimeout(r, 100));
  }

  db.close();
  console.log(`\nIngestion complete! Added: ${added}, Skipped: ${skipped}`);
}

main().catch(console.error);