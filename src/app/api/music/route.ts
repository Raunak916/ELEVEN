import { NextResponse } from 'next/server';
import { getAllVinylCategoriesFromDB, addSongToVinylDB, removeSongFromVinylDB } from '@/lib/music-db';

export async function GET() {
  try {
    const vinyls = await getAllVinylCategoriesFromDB();
    return NextResponse.json({ success: true, vinyls });
  } catch (error) {
    console.error('Failed to fetch vinyls from DB:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch vinyls' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { vinylId, song } = body;

    if (!vinylId || !song || !song.title || !song.url) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    await addSongToVinylDB(vinylId, {
      title: song.title.trim(),
      artist: (song.artist || 'Original Soundtrack').trim(),
      url: song.url.trim(),
    });

    const updatedVinyls = await getAllVinylCategoriesFromDB();
    return NextResponse.json({ success: true, vinyls: updatedVinyls });
  } catch (error) {
    console.error('Failed to add song to vinyl DB:', error);
    return NextResponse.json({ success: false, error: 'Failed to add song' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const body = await req.json();
    const { vinylId, title } = body;

    if (!vinylId || !title) {
      return NextResponse.json({ success: false, error: 'Missing vinylId or title' }, { status: 400 });
    }

    await removeSongFromVinylDB(vinylId, title);
    const updatedVinyls = await getAllVinylCategoriesFromDB();
    return NextResponse.json({ success: true, vinyls: updatedVinyls });
  } catch (error) {
    console.error('Failed to delete song from vinyl DB:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete song' }, { status: 500 });
  }
}
