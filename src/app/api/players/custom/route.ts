import { NextRequest, NextResponse } from 'next/server';
import { PlayerCategory, PlayerPosition, PlayerRole, Currency } from '@/lib/types';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { turso } from '@/lib/turso';

interface CustomPlayerInput {
  name: string;
  firstName?: string;
  lastName?: string;
  nationality?: string;
  nationalityCode?: string;
  position?: PlayerPosition;
  role?: PlayerRole;
  dateOfBirth?: string;
  team: string;
  league?: string;
  category?: PlayerCategory;
  marketValueEur?: number;
  basePrice?: number;
  currency?: Currency;
  shortName?: string;
  secondaryPosition?: PlayerPosition;
}

const UPLOAD_DIR = join(process.cwd(), 'public', 'uploads', 'players');
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

async function ensureUploadDir() {
  try {
    await mkdir(UPLOAD_DIR, { recursive: true });
  } catch {
    // Directory already exists
  }
}

async function saveUploadedImage(file: File, customId: string): Promise<string> {
  await ensureUploadDir();

  const buffer = Buffer.from(await file.arrayBuffer());
  const ext = file.type === 'image/jpeg' ? 'jpg' : file.type === 'image/png' ? 'png' : 'webp';
  const filename = `${customId}.${ext}`;
  const filepath = join(UPLOAD_DIR, filename);

  await writeFile(filepath, buffer);
  return `/uploads/players/${filename}`;
}

function validateImageFile(file: File): string | null {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return 'Please select a valid image file (JPG, PNG, or WEBP)';
  }
  if (file.size > MAX_FILE_SIZE) {
    return 'Image file size must be less than 5MB';
  }
  return null;
}

async function checkDuplicateCustomPlayer(name: string, team: string): Promise<any | null> {
  const row = (await turso.execute({
    sql: `
      SELECT * FROM players
      WHERE source = 'custom'
      AND LOWER(name) = LOWER(?)
      AND LOWER(current_team) = LOWER(?)
    `,
    args: [name.trim(), team.trim()]
  })).rows[0];

  return row || null;
}

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || '';
    let body: CustomPlayerInput = { name: '', team: '' };
    let photoFile: File | null = null;
    let photoUrl: string | null = null;

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();

      body = {
        name: formData.get('name') as string,
        firstName: formData.get('firstName') as string | undefined,
        lastName: formData.get('lastName') as string | undefined,
        nationality: formData.get('nationality') as string | undefined,
        nationalityCode: formData.get('nationalityCode') as string | undefined,
        position: formData.get('position') as PlayerPosition | undefined,
        role: formData.get('role') as PlayerRole | undefined,
        dateOfBirth: formData.get('dateOfBirth') as string | undefined,
        team: formData.get('team') as string,
        league: formData.get('league') as string | undefined,
        category: formData.get('category') as PlayerCategory | undefined,
        marketValueEur: formData.get('marketValueEur') ? parseInt(formData.get('marketValueEur') as string) : undefined,
        basePrice: formData.get('basePrice') ? parseInt(formData.get('basePrice') as string) : undefined,
        currency: formData.get('currency') as Currency | undefined,
        shortName: formData.get('shortName') as string | undefined,
        secondaryPosition: formData.get('secondaryPosition') as PlayerPosition | undefined,
      };

      const photo = formData.get('photo') as File | null;
      if (photo && photo.size > 0) {
        const validationError = validateImageFile(photo);
        if (validationError) {
          return NextResponse.json({ error: validationError }, { status: 400 });
        }
        photoFile = photo;
      }
    } else {
      body = await request.json();
    }

    if (!body.name?.trim() || !body.team?.trim()) {
      return NextResponse.json(
        { error: 'Player name and club are required' },
        { status: 400 }
      );
    }

    if (!body.marketValueEur && !body.basePrice) {
      return NextResponse.json(
        { error: 'Base price or market value is required' },
        { status: 400 }
      );
    }

    const duplicate = await checkDuplicateCustomPlayer(body.name.trim(), body.team.trim());
    if (duplicate) {
      return NextResponse.json(
        {
          error: 'Similar custom player already exists',
          duplicate: {
            id: duplicate.id,
            name: duplicate.name,
            team: duplicate.current_team,
            photoUrl: duplicate.photo_url,
          }
        },
        { status: 409 }
      );
    }

    const customId = `custom-${uuidv4()}`;

    if (photoFile) {
      photoUrl = await saveUploadedImage(photoFile, customId);
    }

    const marketValueEur = body.marketValueEur || body.basePrice || 0;

    const player = {
      id: customId,
      externalIds: {},
      name: body.name.trim(),
      firstName: body.firstName?.trim() || body.name.trim().split(' ')[0],
      lastName: body.lastName?.trim() || body.name.trim().split(' ').slice(1).join(' '),
      nationality: body.nationality?.trim() || 'Unknown',
      nationalityCode: body.nationalityCode?.toUpperCase() || 'XX',
      dateOfBirth: body.dateOfBirth || '2000-01-01',
      primaryPosition: body.position || 'CM',
      secondaryPositions: body.secondaryPosition ? [body.secondaryPosition] : [],
      role: body.role || 'Midfielder',
      photoUrl: photoUrl,
      photoSource: photoUrl ? 'manual' : 'generated',
      careerStartYear: null,
      careerEndYear: null,
      currentTeam: body.team.trim(),
      currentLeague: body.league?.trim() || 'Custom League',
      marketValueEur: marketValueEur,
      highestMarketValueEur: marketValueEur,
      internationalCaps: 0,
      internationalGoals: 0,
      category: body.category || 'CURRENT',
      searchText: `${body.name} ${body.team} ${body.nationality || ''} ${body.shortName || ''}`.toLowerCase(),
      source: 'custom' as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await turso.execute({
      sql: `
        INSERT INTO players (
          id, external_ids, name, first_name, last_name, nationality, nationality_code,
          date_of_birth, primary_position, secondary_positions, role, photo_url, photo_source,
          career_start_year, career_end_year, current_team, current_league,
          market_value_eur, highest_market_value_eur, international_caps, international_goals,
          category, search_text, source, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      args: [
        player.id,
        JSON.stringify(player.externalIds),
        player.name,
        player.firstName,
        player.lastName,
        player.nationality,
        player.nationalityCode,
        player.dateOfBirth,
        player.primaryPosition,
        JSON.stringify(player.secondaryPositions),
        player.role,
        player.photoUrl,
        player.photoSource,
        player.careerStartYear,
        player.careerEndYear,
        player.currentTeam,
        player.currentLeague,
        player.marketValueEur,
        player.highestMarketValueEur,
        player.internationalCaps,
        player.internationalGoals,
        player.category,
        player.searchText,
        player.source,
        player.createdAt,
        player.updatedAt
      ]
    });

    const responsePlayer = {
      id: player.id,
      name: player.name,
      firstName: player.firstName,
      lastName: player.lastName,
      nationality: player.nationality,
      nationalityCode: player.nationalityCode,
      position: player.primaryPosition,
      role: player.role,
      dateOfBirth: player.dateOfBirth,
      photo: player.photoUrl || `data:image/svg+xml;utf8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 100 100"><rect width="100" height="100" fill="#1a1a1f"/><text x="50" y="55" font-family="system-ui" font-size="24" font-weight="bold" fill="#666" text-anchor="middle">' + player.name.charAt(0).toUpperCase() + '</text></svg>')}`,
      team: player.currentTeam,
      league: player.currentLeague,
      category: player.category,
      source: player.source,
    };

    return NextResponse.json({
      success: true,
      player: responsePlayer
    });
  } catch (error) {
    console.error('Custom player creation failed:', error);
    return NextResponse.json(
      { error: 'Failed to create custom player' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const customPlayers = (await turso.execute(`
      SELECT * FROM players WHERE source = 'custom' ORDER BY created_at DESC
    `)).rows;

    return NextResponse.json({ players: customPlayers });
  } catch (error) {
    console.error('Failed to fetch custom players:', error);
    return NextResponse.json(
      { error: 'Failed to fetch custom players' },
      { status: 500 }
    );
  }
}