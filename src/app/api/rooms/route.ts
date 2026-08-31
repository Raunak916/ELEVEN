import { NextResponse } from 'next/server';
import { createRoom, getRoomByCode } from '@/lib/room-db';

export async function POST(req: Request) {
  try {
    let hostId: string | undefined;
    let settings: { currency: string; maxTeamBudget: number } | undefined;
    try {
      const body = await req.json();
      hostId = body.hostId;
      settings = body.settings;
    } catch {
      // Body may be empty, which is totally fine
    }

    const room = createRoom(hostId, settings);
    return NextResponse.json({
      success: true,
      room,
    });
  } catch (error) {
    console.error('Failed to create room:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create room' },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');

    if (!code) {
      return NextResponse.json(
        { success: false, error: 'Room code parameter required' },
        { status: 400 }
      );
    }

    const room = getRoomByCode(code);
    if (!room) {
      return NextResponse.json(
        { success: false, error: 'Room not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        room: {
          id: room.id,
          code: room.code,
          status: room.status,
          settings: room.settings,
          currentDraw: room.currentDraw,
          rosterState: room.rosterState,
          cardsState: room.cardsState,
          createdAt: room.createdAt,
          updatedAt: room.updatedAt,
          version: room.version || new Date(room.updatedAt).getTime() || 0,
          participantsCount: room.participants.length,
          participants: room.participants,
        },
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        },
      }
    );
  } catch (error) {
    console.error('Failed to query room:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
