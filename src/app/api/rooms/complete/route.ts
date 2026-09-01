import { NextResponse } from 'next/server';
import { updateRoomFullState } from '@/lib/room-db';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { code, teams, assignedPlayers, settings, version } = body;

    if (!code) {
      return NextResponse.json(
        { success: false, error: 'Room code is required' },
        { status: 400 }
      );
    }

    const effectiveVersion = version && version > 0 ? version : Date.now();

    const updated = await updateRoomFullState(
      code,
      {
        currentDraw: null,
        rosterState:
          Array.isArray(teams) && Array.isArray(assignedPlayers)
            ? { teams, assignedPlayers }
            : undefined,
        settings: settings || undefined,
        status: 'COMPLETED',
      },
      effectiveVersion
    );

    if (!updated) {
      return NextResponse.json(
        { success: false, error: 'Failed to update room status' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Room marked as COMPLETED',
    });
  } catch (err) {
    console.error('Failed to complete room:', err);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
