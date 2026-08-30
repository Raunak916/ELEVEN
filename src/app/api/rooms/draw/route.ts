import { NextResponse } from 'next/server';
import { updateRoomDraw } from '@/lib/room-db';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { code, drawnPlayer, drawPhase } = body;

    if (!code) {
      return NextResponse.json(
        { success: false, error: 'Room code is required' },
        { status: 400 }
      );
    }

    const currentDraw = drawnPlayer
      ? {
          drawnPlayer,
          drawPhase: drawPhase || 'complete',
        }
      : null;

    updateRoomDraw(code, currentDraw);

    return NextResponse.json({
      success: true,
      currentDraw,
    });
  } catch (error) {
    console.error('Failed to update room draw:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
