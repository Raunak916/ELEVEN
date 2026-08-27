import { NextRequest, NextResponse } from 'next/server';
import { getFootballPlayerService } from '@/lib/football-player-service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const service = getFootballPlayerService();
    const player = await service.getPlayer(id);

    if (!player) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 });
    }

    return NextResponse.json(player);
  } catch (error) {
    console.error('Get player error:', error);
    return NextResponse.json({ error: 'Failed to fetch player' }, { status: 500 });
  }
}