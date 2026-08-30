import { NextRequest, NextResponse } from 'next/server';
import { getFootballPlayerService } from '@/lib/football-player-service';
import { getPlayerDB, rowToPlayer } from '@/lib/player-db';
import { Player, PlayerRole, Currency, PlayerCategory, PlayerPosition } from '@/lib/types';
import { generatePlayerPhoto } from '@/lib/player-photo';

interface ImportRow {
  name: string;
  club?: string;
  basePrice?: number;
  currency?: Currency;
  role?: PlayerRole;
  playerId?: string;
}

interface MatchResult {
  inputRow: ImportRow;
  matches: Player[];
  bestMatch: Player | null;
  confidence: 'high' | 'medium' | 'low' | 'none';
  reason: string;
}

const HIGH_CONFIDENCE_THRESHOLD = 0.80;
const MEDIUM_CONFIDENCE_THRESHOLD = 0.55;
const LOW_CONFIDENCE_THRESHOLD = 0.35;

const CLUB_ALIASES: Record<string, string[]> = {
  'man city': ['manchester city', 'man city', 'manchester city fc'],
  'manchester city': ['manchester city', 'man city', 'manchester city fc'],
  'man utd': ['manchester united', 'man utd', 'manchester united fc', 'man united'],
  'manchester united': ['manchester united', 'man utd', 'manchester united fc', 'man united'],
  'real madrid': ['real madrid', 'real madrid cf'],
  'barca': ['barcelona', 'fc barcelona', 'barca'],
  'barcelona': ['barcelona', 'fc barcelona', 'barca'],
  'psg': ['paris saint germain', 'paris saint-germain', 'psg', 'paris sg'],
  'paris saint germain': ['paris saint germain', 'paris saint-germain', 'psg', 'paris sg'],
  'bayern': ['bayern munich', 'fc bayern munchen', 'bayern munchen', 'bayern'],
  'bayern munich': ['bayern munich', 'fc bayern munchen', 'bayern munchen', 'bayern'],
  'spurs': ['tottenham', 'tottenham hotspur', 'spurs', 'tottenham hotspur fc'],
  'tottenham': ['tottenham', 'tottenham hotspur', 'spurs', 'tottenham hotspur fc'],
  'juve': ['juventus', 'juventus fc', 'juve'],
  'juventus': ['juventus', 'juventus fc', 'juve'],
  'atletico': ['atletico madrid', 'atletico de madrid', 'club atletico de madrid', 'atletico'],
  'atletico madrid': ['atletico madrid', 'atletico de madrid', 'club atletico de madrid', 'atletico'],
  'dortmund': ['borussia dortmund', 'bvb', 'dortmund', 'borussia dortmund 09'],
  'borussia dortmund': ['borussia dortmund', 'bvb', 'dortmund', 'borussia dortmund 09'],
  'inter': ['inter milan', 'internazionale', 'inter', 'fc internazionale milano'],
  'inter milan': ['inter milan', 'internazionale', 'inter', 'fc internazionale milano'],
  'milan': ['ac milan', 'milan', 'associazone calcio milan'],
  'ac milan': ['ac milan', 'milan', 'associazone calcio milan'],
  'arsenal': ['arsenal', 'arsenal fc'],
  'chelsea': ['chelsea', 'chelsea fc'],
  'liverpool': ['liverpool', 'liverpool fc'],
};

function transformToClientPlayer(p: any): Player {
  const hasRealPhoto = p.photoUrl && !p.photoUrl.includes('default.jpg');
  const photo: string =
    hasRealPhoto && p.photoUrl
      ? p.photoUrl
      : generatePlayerPhoto(p.name, p.category, p.primaryPosition || p.position);

  return {
    id: p.id,
    name: p.name,
    firstName: p.firstName || '',
    lastName: p.lastName || '',
    nationality: p.nationality || 'Unknown',
    nationalityCode: p.nationalityCode || 'XX',
    position: (p.primaryPosition || p.position || 'CM') as PlayerPosition,
    role: (p.role || 'Midfielder') as PlayerRole,
    dateOfBirth: p.dateOfBirth || '',
    photo,
    team: p.currentTeam || p.team || 'Unknown',
    league: p.currentLeague || p.league || 'Unknown',
    category: (p.category || 'CURRENT') as PlayerCategory,
    status: (p.careerEndYear && p.careerEndYear < 2020 ? 'RETIRED' : 'ACTIVE') as any,
    source: p.source || 'database',
  };
}

function normalizeString(str: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function calculateNameSimilarity(inputName: string, playerName: string): number {
  const input = normalizeString(inputName);
  const target = normalizeString(playerName);

  if (!input || !target) return 0;
  if (input === target) return 1.0;

  // Substring containment
  if (target.includes(input) || input.includes(target)) {
    return 0.95;
  }

  const inputTokens = input.split(/\s+/).filter(Boolean);
  const targetTokens = target.split(/\s+/).filter(Boolean);

  if (inputTokens.length === 0 || targetTokens.length === 0) return 0;

  const targetSet = new Set(targetTokens);
  const matchingTokens = inputTokens.filter((token) => targetSet.has(token));

  // If all input tokens exist in target (e.g. "Lionel Messi" in "Lionel Andres Messi")
  if (matchingTokens.length === inputTokens.length) {
    return 0.92;
  }

  // Token overlap ratio
  const union = new Set([...inputTokens, ...targetTokens]);
  const jaccard = matchingTokens.length / union.size;

  // If at least one significant token (>= 4 chars) matches
  const hasSignificantMatch = matchingTokens.some((t) => t.length >= 4);
  if (hasSignificantMatch && matchingTokens.length >= 1) {
    return Math.max(0.70, jaccard * 1.3);
  }

  return jaccard;
}

function calculateClubSimilarity(inputClub: string, playerClub: string | null): number {
  if (!inputClub || !playerClub) return 0;

  const input = normalizeString(inputClub);
  const target = normalizeString(playerClub);

  if (!input || !target) return 0;
  if (input === target) return 1.0;

  // Alias lookup
  for (const [key, aliases] of Object.entries(CLUB_ALIASES)) {
    const inputMatches = input.includes(key) || aliases.some((a) => input.includes(a));
    const targetMatches = target.includes(key) || aliases.some((a) => target.includes(a));
    if (inputMatches && targetMatches) {
      return 1.0;
    }
  }

  if (target.includes(input) || input.includes(target)) {
    return 0.90;
  }

  const inputTokens = new Set(input.split(/\s+/).filter((t) => t.length > 2));
  const targetTokens = new Set(target.split(/\s+/).filter((t) => t.length > 2));

  const intersection = new Set([...inputTokens].filter((x) => targetTokens.has(x)));
  if (intersection.size > 0) {
    return 0.85;
  }

  return 0;
}

function calculateConfidence(
  input: ImportRow,
  player: any
): { score: number; reason: string } {
  if (input.playerId && input.playerId === player.id) {
    return { score: 1.0, reason: 'Exact ID match' };
  }

  const nameScore = calculateNameSimilarity(input.name || '', player.name || '');
  const hasClubInput = Boolean(input.club && input.club.trim().length > 0);
  const clubScore = hasClubInput
    ? calculateClubSimilarity(input.club || '', player.currentTeam || player.team || '')
    : 0;

  let finalScore = nameScore;
  let reason = '';

  // Name match is PRIMARY — club is a positive bonus and never a penalty
  if (nameScore >= 0.85) {
    // Strong name match -> High Confidence
    finalScore = clubScore >= 0.8 ? 0.98 : 0.90;
    reason = clubScore >= 0.8
      ? `Exact Match (${player.name} · ${player.currentTeam || player.team || 'Pro'})`
      : `Strong Name Match (${player.name})`;
  } else if (nameScore >= 0.65) {
    if (clubScore >= 0.6) {
      finalScore = 0.88;
      reason = `Good match with club confirmation (${player.name} · ${player.currentTeam || player.team})`;
    } else {
      finalScore = 0.75;
      reason = `Good name match (${player.name})`;
    }
  } else if (nameScore >= 0.40) {
    if (clubScore >= 0.8) {
      finalScore = 0.80;
      reason = `Club-confirmed match (${player.name} · ${player.currentTeam || player.team})`;
    } else {
      finalScore = 0.45;
      reason = `Partial match (${player.name})`;
    }
  } else {
    finalScore = 0.20;
    reason = `Low similarity (${player.name})`;
  }

  // Bonus for role match if specified
  if (input.role && player.role && input.role.toLowerCase() === player.role.toLowerCase()) {
    finalScore = Math.min(1.0, finalScore + 0.05);
  }

  return { score: finalScore, reason };
}

function getConfidenceLabel(score: number): 'high' | 'medium' | 'low' | 'none' {
  if (score >= HIGH_CONFIDENCE_THRESHOLD) return 'high';
  if (score >= MEDIUM_CONFIDENCE_THRESHOLD) return 'medium';
  if (score >= LOW_CONFIDENCE_THRESHOLD) return 'low';
  return 'none';
}

function parseCSVString(content: string): ImportRow[] {
  const lines = content.trim().split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];

  const headers = lines[0]
    .split(',')
    .map((h) => h.trim().toLowerCase().replace(/^["']|["']$/g, '').replace(/\r/g, ''));
  const rows: ImportRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i]
      .split(',')
      .map((v) => v.trim().replace(/^["']|["']$/g, '').replace(/\r/g, ''));
    const row: Record<string, string> = {};

    headers.forEach((header, idx) => {
      row[header] = values[idx] || '';
    });

    const name = row.name || row.playername || row['player name'] || row.fullname || '';
    const club = row.club || row.team || row.currentteam || row['current team'] || '';
    const basePrice = row.baseprice || row['base price'] || row.price || '';
    const currency = row.currency || '';
    const role = row.role || '';
    const playerId = row.playerid || row['player id'] || row.id || '';

    if (name) {
      rows.push({
        name,
        club: club || undefined,
        basePrice: basePrice ? parseInt(basePrice.replace(/[,\.]/g, ''), 10) : undefined,
        currency: (currency?.toUpperCase() as Currency) || undefined,
        role: (role as PlayerRole) || undefined,
        playerId: playerId || undefined,
      });
    }
  }

  return rows;
}

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || '';
    let rows: ImportRow[] = [];

    if (contentType.includes('application/json')) {
      const body = await request.json();
      rows = Array.isArray(body) ? body : body.rows || body.players || [];
    } else if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file') as File | null;

      if (!file) {
        return NextResponse.json({ error: 'No file provided' }, { status: 400 });
      }

      const text = await file.text();
      const ext = file.name.split('.').pop()?.toLowerCase();

      if (ext === 'csv') {
        rows = parseCSVString(text);
      } else if (ext === 'json') {
        try {
          const data = JSON.parse(text);
          rows = Array.isArray(data) ? data : data.players || data.rows || [];
        } catch {
          return NextResponse.json({ error: 'Invalid JSON file format' }, { status: 400 });
        }
      } else {
        rows = parseCSVString(text);
      }
    } else {
      const text = await request.text();
      try {
        const data = JSON.parse(text);
        rows = Array.isArray(data) ? data : data.players || data.rows || [];
      } catch {
        rows = parseCSVString(text);
      }
    }

    if (!rows || rows.length === 0) {
      return NextResponse.json({ error: 'No valid rows found in file' }, { status: 400 });
    }

    if (rows.length > 500) {
      return NextResponse.json({ error: 'Maximum 500 rows per request' }, { status: 400 });
    }

    const service = getFootballPlayerService();
    const db = getPlayerDB();
    const results: MatchResult[] = [];

    for (const row of rows) {
      if (!row.name || typeof row.name !== 'string') continue;

      let dbCandidates: any[] = [];

      try {
        if (row.playerId) {
          const exact = await service.getPlayer(row.playerId);
          if (exact) {
            dbCandidates = [exact];
          }
        }

        if (dbCandidates.length === 0) {
          // 1. Primary search by player name
          let ftsResults = await service.searchPlayers(row.name, 20);

          // 2. If 0 results, try individual tokens (e.g. last name or first name)
          if (ftsResults.length === 0) {
            const tokens = row.name.trim().split(/\s+/).filter((t) => t.length >= 3);
            for (const token of tokens) {
              const tokenResults = await service.searchPlayers(token, 10);
              if (tokenResults.length > 0) {
                ftsResults = tokenResults;
                break;
              }
            }
          }

          dbCandidates = [...ftsResults];

          // 3. Check custom player additions in local DB
          try {
            const cleanName = row.name.replace(/[^a-zA-Z0-9\s]/g, '').trim();
            if (cleanName) {
              const customPlayers = db
                .prepare(`
                  SELECT * FROM players
                  WHERE source = 'custom'
                  AND search_text LIKE ?
                  ORDER BY created_at DESC
                  LIMIT 10
                `)
                .all(`%${cleanName.toLowerCase()}%`)
                .map(rowToPlayer);

              const seen = new Set(dbCandidates.map((p) => p.id));
              for (const c of customPlayers) {
                if (!seen.has(c.id)) {
                  dbCandidates.push(c);
                  seen.add(c.id);
                }
              }
            }
          } catch (customErr) {
            // Ignore custom lookup error
          }
        }
      } catch (searchErr) {
        console.warn(`Search failed for ${row.name}:`, searchErr);
      }

      const candidates = dbCandidates.map(transformToClientPlayer);

      const scored = dbCandidates.map((player, idx) => {
        const { score, reason } = calculateConfidence(row, player);
        return { player: candidates[idx], score, reason };
      });

      scored.sort((a, b) => b.score - a.score);

      const bestMatch = scored[0]?.player || null;
      const bestScore = scored[0]?.score || 0;
      const bestReason = scored[0]?.reason || 'No match found';

      results.push({
        inputRow: row,
        matches: scored.map((s) => s.player),
        bestMatch,
        confidence: getConfidenceLabel(bestScore),
        reason: bestReason,
      });
    }

    return NextResponse.json({
      success: true,
      results,
      total: rows.length,
      matched: results.filter((r) => r.confidence === 'high' || r.confidence === 'medium').length,
    });
  } catch (error: any) {
    console.error('Bulk match error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to process bulk import' },
      { status: 500 }
    );
  }
}