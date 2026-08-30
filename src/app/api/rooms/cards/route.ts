import { NextResponse } from 'next/server';
import { updateRoomCards } from '@/lib/room-db';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { code, powerCards, sickCards } = body;

    if (!code) {
      return NextResponse.json(
        { success: false, error: 'Room code is required' },
        { status: 400 }
      );
    }

    const cardsState = {
      powerCards: Array.isArray(powerCards) ? powerCards : [],
      sickCards: Array.isArray(sickCards) ? sickCards : [],
    };

    updateRoomCards(code, cardsState);

    return NextResponse.json({
      success: true,
      cardsState,
    });
  } catch (error) {
    console.error('Failed to update room cards:', error);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
