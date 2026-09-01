import { Player, PhotoSource, PlayerSource } from './player-db-types';
import { PlayerPosition, PlayerRole, PlayerCategory } from './types';

// Re-export Player for compatibility
export type { Player };

export function stripAccents(str: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
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

export interface PlayerRow {
  id: string;
  external_ids?: string;
  name: string;
  first_name?: string;
  last_name?: string;
  nationality?: string;
  nationality_code?: string;
  date_of_birth?: string;
  primary_position?: string;
  secondary_positions?: string;
  role?: string;
  photo_url?: string | null;
  photo_source?: string;
  career_start_year?: number | null;
  career_end_year?: number | null;
  current_team?: string | null;
  current_league?: string | null;
  market_value_eur?: number | null;
  highest_market_value_eur?: number | null;
  international_caps?: number | null;
  international_goals?: number | null;
  category?: string;
  search_text?: string;
  source?: string;
  created_at?: string;
  updated_at?: string;
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
