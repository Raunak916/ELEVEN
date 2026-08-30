import { NextResponse } from 'next/server';
import { updateRoomRoster } from '@/lib/room-db';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { code, teams, assignedPlayers, settings } = body;

    if (!code) {
      return NextResponse.json(
        { success: false, error: 'Room code is required' },
        { status: 400 }
      );
    }

    const rosterState = {
      teams: teams || [],
      assignedPlayers: assignedPlayers || [],
    };

    updateRoomRoster(code, rosterState, settings || null);

    return NextResponse.json({
      success: true,
      rosterState,
    });
  } catch (error) {
    console.error('Failed to update room roster:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
