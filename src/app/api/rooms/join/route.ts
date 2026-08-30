import { NextResponse } from 'next/server';
import { joinRoom } from '@/lib/room-db';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { code, participantId, name, teamName } = body;

    if (!code || typeof code !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Please enter a valid room code' },
        { status: 400 }
      );
    }

    const result = joinRoom(code, {
      id: participantId,
      name: name || undefined,
      teamName: teamName || undefined,
      role: 'CONTESTANT',
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      room: {
        id: result.room.id,
        code: result.room.code,
        status: result.room.status,
        settings: result.room.settings,
        createdAt: result.room.createdAt,
      },
      session: {
        roomId: result.room.id,
        roomCode: result.room.code,
        role: 'CONTESTANT',
        participantId: result.participant.id,
        name: result.participant.name,
        teamName: result.participant.teamName,
        settings: result.room.settings,
        joinedAt: result.participant.joinedAt,
      },
    });
  } catch (error) {
    console.error('Failed to join room:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to join room' },
      { status: 500 }
    );
  }
}
