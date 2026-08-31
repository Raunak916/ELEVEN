import { NextResponse } from 'next/server';
import { leaveRoom } from '@/lib/room-db';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { roomId, participantId } = body;

    if (!roomId || !participantId) {
      return NextResponse.json(
        { success: false, error: 'roomId and participantId are required' },
        { status: 400 }
      );
    }

    await leaveRoom(roomId, participantId);

    return NextResponse.json({
      success: true,
      message: 'Left room successfully',
    });
  } catch (error) {
    console.error('Failed to leave room:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to leave room' },
      { status: 500 }
    );
  }
}
