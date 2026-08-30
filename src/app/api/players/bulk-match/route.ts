import { NextRequest, NextResponse } from 'next/server';
import { getFootballPlayerService } from '@/lib/football-player-service';
import { getPlayerDB, rowToPlayer, stripAccents } from '@/lib/player-db';
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

function calculateNameSimilarity(inputName: string, playerName: string): number {
  const input = stripAccents(inputName);
  const target = stripAccents(playerName);

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
    return 0.94;
  }

  // If last name matches
  const lastInputToken = inputTokens[inputTokens.length - 1];
  const lastTargetToken = targetTokens[targetTokens.length - 1];
  if (lastInputToken.length >= 3 && (lastInputToken === lastTargetToken || targetSet.has(lastInputToken))) {
    return 0.88;
  }

  // If first name matches and there is only 1 token in target
  if (targetTokens.length === 1 && targetTokens[0] === inputTokens[0]) {
    return 0.90;
  }

  // Token overlap ratio
  const union = new Set([...inputTokens, ...targetTokens]);
  return matchingTokens.length / union.size;
}

function calculateClubSimilarity(inputClub: string, playerClub: string | null): number {
  if (!inputClub || !playerClub) return 0;

  const input = stripAccents(inputClub);
  const target = stripAccents(playerClub);

  if (!input || !target) return 0;
  if (input === target) return 1.0;

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
): { score: number; reason: string; confidence: 'high' | 'medium' | 'low' | 'none' } {
  if (input.playerId && input.playerId === player.id) {
    return { score: 1.0, reason: 'Exact ID match', confidence: 'high' };
  }

  const nameScore = calculateNameSimilarity(input.name || '', player.name || '');
  const hasClubInput = Boolean(input.club && input.club.trim().length > 0);
  const clubScore = hasClubInput
    ? calculateClubSimilarity(input.club || '', player.currentTeam || player.team || '')
    : 0;

  let confidence: 'high' | 'medium' | 'low' | 'none' = 'none';
  let reason = '';
  let score = nameScore;

  if (nameScore >= 0.80) {
    confidence = 'high';
    score = 0.95;
    reason = clubScore >= 0.8
      ? `Exact Match (${player.name} · ${player.currentTeam || player.team || 'Pro'})`
      : `Strong Name Match (${player.name})`;
  } else if (nameScore >= 0.50) {
    if (clubScore >= 0.6) {
      confidence = 'high';
      score = 0.88;
      reason = `Club-confirmed match (${player.name} · ${player.currentTeam || player.team})`;
    } else {
      confidence = 'medium';
      score = 0.72;
      reason = `Good name match (${player.name})`;
    }
  } else if (nameScore >= 0.30) {
    if (clubScore >= 0.8) {
      confidence = 'medium';
      score = 0.65;
      reason = `Club-matched player (${player.name} · ${player.currentTeam || player.team})`;
    } else {
      confidence = 'low';
      score = 0.40;
      reason = `Partial match (${player.name})`;
    }
  } else {
    confidence = 'none';
    score = 0.10;
    reason = `Low similarity (${player.name})`;
  }

  return { score, reason, confidence };
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
          // Primary search
          let ftsResults = await service.searchPlayers(row.name, 20);

          // If no results, try last name or tokens
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
          } catch {
            // Ignore
          }
        }
      } catch (searchErr) {
        console.warn(`Search failed for ${row.name}:`, searchErr);
      }

      const candidates = dbCandidates.map(transformToClientPlayer);

      const scored = dbCandidates.map((player, idx) => {
        const { score, reason, confidence } = calculateConfidence(row, player);
        return { player: candidates[idx], score, reason, confidence };
      });

      scored.sort((a, b) => b.score - a.score);

      const bestMatch = scored[0]?.player || null;
      const bestConfidence = scored[0]?.confidence || 'none';
      const bestReason = scored[0]?.reason || 'No match found';

      results.push({
        inputRow: row,
        matches: scored.map((s) => s.player),
        bestMatch,
        confidence: bestConfidence,
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