import { NextRequest, NextResponse } from 'next/server';
import { getFootballPlayerService } from '@/lib/football-player-service';
import { getPlayerDB, rowToPlayer } from '@/lib/player-db';
import { Player as DBPlayerType } from '@/lib/player-db-types';
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

const NAME_MATCH_WEIGHT = 0.6;
const CLUB_MATCH_WEIGHT = 0.4;
const HIGH_CONFIDENCE_THRESHOLD = 0.85;
const MEDIUM_CONFIDENCE_THRESHOLD = 0.65;
const LOW_CONFIDENCE_THRESHOLD = 0.4;

function transformToClientPlayer(p: any): Player {
  const hasRealPhoto = p.photoUrl && !p.photoUrl.includes('default.jpg');
  const photo: string = hasRealPhoto && p.photoUrl
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
    .replace(/[^a-z0-9\s]/g, '')
    .trim();
}

function calculateNameSimilarity(inputName: string, playerName: string): number {
  const input = normalizeString(inputName);
  const target = normalizeString(playerName);

  if (!input || !target) return 0;
  if (input === target) return 1.0;
  if (target.includes(input) || input.includes(target)) return 0.9;

  const inputTokens = new Set(input.split(/\s+/).filter(Boolean));
  const targetTokens = new Set(target.split(/\s+/).filter(Boolean));

  const intersection = new Set([...inputTokens].filter(x => targetTokens.has(x)));
  const union = new Set([...inputTokens, ...targetTokens]);

  if (union.size === 0) return 0;
  return intersection.size / union.size;
}

function calculateClubSimilarity(inputClub: string, playerClub: string | null): number {
  if (!inputClub || !playerClub) return 0;

  const input = normalizeString(inputClub);
  const target = normalizeString(playerClub);

  if (!input || !target) return 0;
  if (input === target) return 1.0;
  if (target.includes(input) || input.includes(target)) return 0.9;

  const inputTokens = new Set(input.split(/\s+/).filter(Boolean));
  const targetTokens = new Set(target.split(/\s+/).filter(Boolean));

  const intersection = new Set([...inputTokens].filter(x => targetTokens.has(x)));
  const union = new Set([...inputTokens, ...targetTokens]);

  if (union.size === 0) return 0;
  return intersection.size / union.size;
}

function calculateConfidence(input: ImportRow, player: any): { score: number; reason: string } {
  if (input.playerId && input.playerId === player.id) {
    return { score: 1.0, reason: 'Exact ID match' };
  }

  const nameScore = calculateNameSimilarity(input.name || '', player.name || '');
  const hasClubInput = Boolean(input.club && input.club.trim().length > 0);
  const clubScore = hasClubInput ? calculateClubSimilarity(input.club || '', player.currentTeam || player.team || '') : 0;

  // If club was provided, use weighted average; otherwise name is 100% of the score
  let weightedScore = hasClubInput 
    ? (nameScore * NAME_MATCH_WEIGHT) + (clubScore * CLUB_MATCH_WEIGHT)
    : nameScore;

  // Bonus for role match if role was specified in input
  if (input.role && player.role && input.role.toLowerCase() === player.role.toLowerCase()) {
    weightedScore = Math.min(1.0, weightedScore + 0.05);
  }

  let reason = '';
  if (hasClubInput) {
    if (weightedScore >= HIGH_CONFIDENCE_THRESHOLD) {
      reason = `Strong match (name: ${Math.round(nameScore * 100)}%, club: ${Math.round(clubScore * 100)}%)`;
    } else if (weightedScore >= MEDIUM_CONFIDENCE_THRESHOLD) {
      reason = `Good match (name: ${Math.round(nameScore * 100)}%, club: ${Math.round(clubScore * 100)}%)`;
    } else if (weightedScore >= LOW_CONFIDENCE_THRESHOLD) {
      reason = `Partial match (name: ${Math.round(nameScore * 100)}%, club: ${Math.round(clubScore * 100)}%)`;
    } else {
      reason = `Low similarity match (name: ${Math.round(nameScore * 100)}%)`;
    }
  } else {
    if (weightedScore >= HIGH_CONFIDENCE_THRESHOLD) {
      reason = `Strong name match (${Math.round(nameScore * 100)}%)`;
    } else if (weightedScore >= MEDIUM_CONFIDENCE_THRESHOLD) {
      reason = `Good name match (${Math.round(nameScore * 100)}%)`;
    } else if (weightedScore >= LOW_CONFIDENCE_THRESHOLD) {
      reason = `Partial name match (${Math.round(nameScore * 100)}%)`;
    } else {
      reason = `Low similarity (${Math.round(nameScore * 100)}%)`;
    }
  }

  return { score: weightedScore, reason };
}

function getConfidenceLabel(score: number): 'high' | 'medium' | 'low' | 'none' {
  if (score >= HIGH_CONFIDENCE_THRESHOLD) return 'high';
  if (score >= MEDIUM_CONFIDENCE_THRESHOLD) return 'medium';
  if (score >= LOW_CONFIDENCE_THRESHOLD) return 'low';
  return 'none';
}

function parseCSVString(content: string): ImportRow[] {
  const lines = content.trim().split(/\r?\n/).filter(l => l.trim().length > 0);
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/^["']|["']$/g, '').replace(/\r/g, ''));
  const rows: ImportRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/^["']|["']$/g, '').replace(/\r/g, ''));
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
        rows = Array.isArray(data) ? data : data.rows || data.players || [];
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
          // First search by player name
          let ftsResults = await service.searchPlayers(row.name, 15);

          // If no results and club was provided, try combined search or vice versa
          if (ftsResults.length === 0 && row.club) {
            ftsResults = await service.searchPlayers(`${row.name} ${row.club}`, 15);
          }

          dbCandidates = [...ftsResults];

          try {
            const cleanName = row.name.replace(/[^a-zA-Z0-9\s]/g, '').trim();
            if (cleanName) {
              const customPlayers = db.prepare(`
                SELECT * FROM players
                WHERE source = 'custom'
                AND search_text LIKE ?
                ORDER BY created_at DESC
                LIMIT 10
              `).all(`%${cleanName.toLowerCase()}%`).map(rowToPlayer);

              const seen = new Set(dbCandidates.map(p => p.id));
              for (const c of customPlayers) {
                if (!seen.has(c.id)) {
                  dbCandidates.push(c);
                  seen.add(c.id);
                }
              }
            }
          } catch (customErr) {
            console.warn('Custom player query failed:', customErr);
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
        matches: scored.map(s => s.player),
        bestMatch,
        confidence: getConfidenceLabel(bestScore),
        reason: bestReason,
      });
    }

    return NextResponse.json({
      success: true,
      results,
      total: rows.length,
      matched: results.filter(r => r.confidence !== 'none').length,
    });
  } catch (error: any) {
    console.error('Bulk match error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to process bulk import' },
      { status: 500 }
    );
  }
}