import { NextResponse } from 'next/server';
import { updateRoomFullState } from '@/lib/room-db';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { code, currentDraw, rosterState, cardsState, settings, status, version } = body;

    if (!code) {
      return NextResponse.json(
        { success: false, error: 'Room code is required' },
        { status: 400 }
      );
    }

    await updateRoomFullState(
      code,
      {
        currentDraw,
        rosterState,
        cardsState,
        settings,
        status,
      },
      version
    );

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error('Failed to sync room full state:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
