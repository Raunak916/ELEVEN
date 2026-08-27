import { NextRequest, NextResponse } from 'next/server';
import { getFootballPlayerService } from '@/lib/football-player-service';
import { getPlayerDB, rowToPlayer } from '@/lib/player-db';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q') || '';
  const limit = parseInt(searchParams.get('limit') || '50', 10);
  const category = searchParams.get('category')?.split(',').filter(Boolean);
  const role = searchParams.get('role')?.split(',').filter(Boolean);
  const nationalityCode = searchParams.get('nationality')?.split(',').filter(Boolean);

  const start = Date.now();

  try {
    const service = getFootballPlayerService();

    // For now, use simple search
    // Future: add filters
    const players = await service.searchPlayers(query, limit);

    // Also search custom players from database
    const db = getPlayerDB();
    const customPlayers = db.prepare(`
      SELECT * FROM players
      WHERE source = 'custom'
      AND search_text LIKE ?
      ORDER BY created_at DESC
      LIMIT ?
    `).all(`%${query.toLowerCase()}%`, limit).map(rowToPlayer);

    // Combine and deduplicate (database players take precedence)
    const allPlayers = [...players];
    const seen = new Set(players.map(p => p.id));

    for (const custom of customPlayers) {
      if (!seen.has(custom.id)) {
        allPlayers.push(custom);
        seen.add(custom.id);
      }
    }

    // Apply client-side filters if needed
    let filtered = allPlayers;
    if (category?.length) {
      filtered = filtered.filter(p => category.includes(p.category));
    }
    if (role?.length) {
      filtered = filtered.filter(p => role.includes(p.role));
    }
    if (nationalityCode?.length) {
      const codes = nationalityCode.map(c => c.toUpperCase());
      filtered = filtered.filter(p => codes.includes(p.nationalityCode));
    }

    const tookMs = Date.now() - start;

    return NextResponse.json({
      players: filtered,
      total: filtered.length,
      query,
      tookMs,
    });
  } catch (error) {
    console.error('Player search error:', error);
    return NextResponse.json(
      { error: 'Search failed', players: [], total: 0, query, tookMs: Date.now() - start },
      { status: 500 }
    );
  }
}