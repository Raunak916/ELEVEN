import Database from 'better-sqlite3';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { Room, RoomParticipant, RoomStatus } from './room-types';

// In serverless / Vercel environments, the only writable disk directory is /tmp
const IS_SERVERLESS = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.LAMBDA_TASK_ROOT);
const LOCAL_DATA_DIR = join(process.cwd(), 'data');
const DB_PATH = IS_SERVERLESS ? '/tmp/rooms.db' : join(LOCAL_DATA_DIR, 'rooms.db');

let dbInstance: Database.Database | null = null;

// Global in-memory cache to guarantee cross-request room availability on warm serverless instances
declare global {
  // eslint-disable-next-line no-var
  var __ACTIVE_ROOMS_CACHE: Map<string, Room> | undefined;
}

if (!globalThis.__ACTIVE_ROOMS_CACHE) {
  globalThis.__ACTIVE_ROOMS_CACHE = new Map<string, Room>();
}

const roomsCache = globalThis.__ACTIVE_ROOMS_CACHE;

// Unambiguous characters for readable, confusion-free room codes (avoiding 0, O, 1, I, L)
const CODE_CHARSET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS rooms (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      host_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'CREATED',
      settings_json TEXT DEFAULT '{}',
      current_draw_json TEXT DEFAULT NULL,
      roster_state_json TEXT DEFAULT NULL,
      cards_state_json TEXT DEFAULT NULL,
      participants_json TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_rooms_code ON rooms(code);
    CREATE INDEX IF NOT EXISTS idx_rooms_host ON rooms(host_id);
  `);

  // Migration: ensure all columns exist
  try {
    const tableInfo = db.prepare("PRAGMA table_info(rooms)").all() as Array<{ name: string }>;
    const hasSettings = tableInfo.some((col) => col.name === 'settings_json');
    if (!hasSettings) {
      db.exec("ALTER TABLE rooms ADD COLUMN settings_json TEXT DEFAULT '{}'");
    }
    const hasDraw = tableInfo.some((col) => col.name === 'current_draw_json');
    if (!hasDraw) {
      db.exec("ALTER TABLE rooms ADD COLUMN current_draw_json TEXT DEFAULT NULL");
    }
    const hasRoster = tableInfo.some((col) => col.name === 'roster_state_json');
    if (!hasRoster) {
      db.exec("ALTER TABLE rooms ADD COLUMN roster_state_json TEXT DEFAULT NULL");
    }
    const hasCards = tableInfo.some((col) => col.name === 'cards_state_json');
    if (!hasCards) {
      db.exec("ALTER TABLE rooms ADD COLUMN cards_state_json TEXT DEFAULT NULL");
    }
    const hasVersion = tableInfo.some((col) => col.name === 'version');
    if (!hasVersion) {
      db.exec("ALTER TABLE rooms ADD COLUMN version INTEGER DEFAULT 0");
    }
  } catch {
    // Ignore migration if already exists
  }
}

export function getRoomDB(): Database.Database {
  if (dbInstance) return dbInstance;

  try {
    if (!IS_SERVERLESS && !existsSync(LOCAL_DATA_DIR)) {
      mkdirSync(LOCAL_DATA_DIR, { recursive: true });
    }

    const db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initSchema(db);
    dbInstance = db;
    return db;
  } catch (err) {
    console.warn(`Failed to open rooms DB at ${DB_PATH}, trying /tmp fallback:`, err);
    try {
      const db = new Database('/tmp/rooms.db');
      db.pragma('journal_mode = WAL');
      initSchema(db);
      dbInstance = db;
      return db;
    } catch (tmpErr) {
      console.warn('Falling back to in-memory room DB:', tmpErr);
      const db = new Database(':memory:');
      initSchema(db);
      dbInstance = db;
      return db;
    }
  }
}

interface RoomRow {
  id: string;
  code: string;
  host_id: string;
  status: string;
  settings_json?: string;
  current_draw_json?: string;
  roster_state_json?: string;
  cards_state_json?: string;
  participants_json: string;
  version?: number;
  created_at: string;
  updated_at: string;
}

function mapRowToRoom(row: RoomRow): Room {
  let participants: RoomParticipant[] = [];
  try {
    participants = JSON.parse(row.participants_json || '[]');
  } catch {
    participants = [];
  }

  let settings: { currency: string; maxTeamBudget: number } | undefined = undefined;
  try {
    if (row.settings_json) {
      const parsed = JSON.parse(row.settings_json);
      if (parsed && typeof parsed === 'object') {
        settings = parsed;
      }
    }
  } catch {
    settings = undefined;
  }

  let currentDraw: { drawnPlayer: any; drawPhase: string } | null = null;
  try {
    if (row.current_draw_json) {
      currentDraw = JSON.parse(row.current_draw_json);
    }
  } catch {
    currentDraw = null;
  }

  let rosterState: { teams: any[]; assignedPlayers: any[] } | null = null;
  try {
    if (row.roster_state_json) {
      rosterState = JSON.parse(row.roster_state_json);
    }
  } catch {
    rosterState = null;
  }

  let cardsState: { powerCards: any[]; sickCards: any[] } | null = null;
  try {
    if (row.cards_state_json) {
      cardsState = JSON.parse(row.cards_state_json);
    }
  } catch {
    cardsState = null;
  }

  const roomVersion =
    row.version && row.version > 0
      ? row.version
      : row.updated_at
      ? new Date(row.updated_at).getTime()
      : Date.now();

  const room: Room = {
    id: row.id,
    code: row.code,
    hostId: row.host_id,
    status: row.status as RoomStatus,
    settings,
    currentDraw,
    rosterState,
    cardsState,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    version: roomVersion,
    participants,
  };

  // Sync to memory cache
  roomsCache.set(room.code, room);
  roomsCache.set(room.id, room);

  return room;
}

export function generateUniqueRoomCode(length: number = 4): string {
  const db = getRoomDB();
  const checkStmt = db.prepare('SELECT 1 FROM rooms WHERE code = ? LIMIT 1');

  for (let attempt = 0; attempt < 100; attempt++) {
    let code = '';
    for (let i = 0; i < length; i++) {
      const idx = Math.floor(Math.random() * CODE_CHARSET.length);
      code += CODE_CHARSET[idx];
    }

    const exists = checkStmt.get(code);
    if (!exists && !roomsCache.has(code)) {
      return code;
    }
  }

  // Fallback to 6 characters if 4 chars are crowded
  let fallbackCode = '';
  for (let i = 0; i < 6; i++) {
    const idx = Math.floor(Math.random() * CODE_CHARSET.length);
    fallbackCode += CODE_CHARSET[idx];
  }
  return fallbackCode;
}

export function ensureRoom(code: string, hostId?: string): Room {
  const cleanCode = (code || '').trim().toUpperCase();
  const existing = getRoomByCode(cleanCode);
  if (existing) return existing;

  const db = getRoomDB();
  const id = uuidv4();
  const now = new Date().toISOString();
  const finalHostId = hostId || uuidv4();
  const initialStatus: RoomStatus = 'LIVE';
  const settingsJson = JSON.stringify({ currency: 'INR', maxTeamBudget: 20000000 });

  try {
    const stmt = db.prepare(`
      INSERT INTO rooms (id, code, host_id, status, settings_json, participants_json, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(code) DO UPDATE SET updated_at = excluded.updated_at
    `);
    stmt.run(id, cleanCode, finalHostId, initialStatus, settingsJson, JSON.stringify([]), now, now);
  } catch (err) {
    console.warn(`Failed to insert room ${cleanCode} to SQLite:`, err);
  }

  const room: Room = {
    id,
    code: cleanCode,
    hostId: finalHostId,
    status: initialStatus,
    settings: { currency: 'INR', maxTeamBudget: 20000000 },
    createdAt: now,
    updatedAt: now,
    participants: [],
  };

  roomsCache.set(cleanCode, room);
  roomsCache.set(id, room);

  return room;
}

export function createRoom(
  hostId?: string,
  settings?: { currency: string; maxTeamBudget: number }
): Room {
  const db = getRoomDB();
  const id = uuidv4();
  const code = generateUniqueRoomCode(4);
  const now = new Date().toISOString();
  const finalHostId = hostId || uuidv4();
  const initialStatus: RoomStatus = 'CREATED';
  const settingsJson = JSON.stringify(settings || { currency: 'INR', maxTeamBudget: 20000000 });

  try {
    const stmt = db.prepare(`
      INSERT INTO rooms (id, code, host_id, status, settings_json, participants_json, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(id, code, finalHostId, initialStatus, settingsJson, JSON.stringify([]), now, now);
  } catch (err) {
    console.warn('Failed to insert new room to SQLite:', err);
  }

  const room: Room = {
    id,
    code,
    hostId: finalHostId,
    status: initialStatus,
    settings: settings || { currency: 'INR', maxTeamBudget: 20000000 },
    createdAt: now,
    updatedAt: now,
    participants: [],
  };

  roomsCache.set(code, room);
  roomsCache.set(id, room);

  return room;
}

export function getRoomByCode(code: string): Room | null {
  if (!code) return null;
  const cleanCode = code.trim().toUpperCase();

  try {
    const db = getRoomDB();
    const stmt = db.prepare('SELECT * FROM rooms WHERE code = ? LIMIT 1');
    const row = stmt.get(cleanCode) as RoomRow | undefined;

    if (row) {
      return mapRowToRoom(row);
    }
  } catch (err) {
    console.warn(`Error querying room code ${cleanCode}:`, err);
  }

  // Check memory cache fallback
  if (roomsCache.has(cleanCode)) {
    return roomsCache.get(cleanCode) || null;
  }

  return null;
}

export function getRoomById(id: string): Room | null {
  if (!id) return null;

  try {
    const db = getRoomDB();
    const stmt = db.prepare('SELECT * FROM rooms WHERE id = ? LIMIT 1');
    const row = stmt.get(id) as RoomRow | undefined;

    if (row) {
      return mapRowToRoom(row);
    }
  } catch (err) {
    console.warn(`Error querying room id ${id}:`, err);
  }

  if (roomsCache.has(id)) {
    return roomsCache.get(id) || null;
  }

  return null;
}

export function joinRoom(
  code: string,
  participant: { id?: string; name?: string; teamName?: string; role?: 'CONTESTANT' | 'SPECTATOR' }
): { success: true; room: Room; participant: RoomParticipant } | { success: false; error: string } {
  const cleanCode = (code || '').trim().toUpperCase();
  if (!cleanCode) {
    return { success: false, error: 'Please enter a room code.' };
  }

  // Ensure room exists across any serverless lambda container
  let room = getRoomByCode(cleanCode);
  if (!room) {
    if (cleanCode.length >= 3) {
      room = ensureRoom(cleanCode);
    } else {
      return { success: false, error: `Room "${cleanCode}" not found. Please check the code and try again.` };
    }
  }

  if (room.status === 'CLOSED') {
    return { success: false, error: 'This room has been closed by the host.' };
  }

  const participantId = participant.id?.trim().toUpperCase() || uuidv4();
  const now = new Date().toISOString();

  // Check if participant already exists in room
  const existingParticipant = room.participants.find((p) => p.id === participantId);

  // Also check if team already registered in room.rosterState.teams
  const existingRosterTeam = room.rosterState?.teams?.find((t: any) => t.id === participantId);

  // Preserve previously established name & teamName if not provided on reconnect
  const finalName =
    participant.name?.trim() ||
    existingParticipant?.name ||
    existingRosterTeam?.owner ||
    `Manager ${participantId}`;

  const finalTeamName =
    participant.teamName?.trim() ||
    existingParticipant?.teamName ||
    existingRosterTeam?.name ||
    `Team ${participantId}`;

  const newParticipant: RoomParticipant = {
    id: participantId,
    name: finalName,
    teamName: finalTeamName,
    role: participant.role || existingParticipant?.role || 'CONTESTANT',
    joinedAt: existingParticipant?.joinedAt || now,
    lastSeenAt: now,
  };

  const existingIdx = room.participants.findIndex((p) => p.id === participantId);
  const updatedParticipants = [...room.participants];

  if (existingIdx >= 0) {
    updatedParticipants[existingIdx] = {
      ...updatedParticipants[existingIdx],
      name: finalName,
      teamName: finalTeamName,
      lastSeenAt: now,
    };
  } else {
    updatedParticipants.push(newParticipant);
  }

  try {
    const db = getRoomDB();
    const updateStmt = db.prepare(`
      UPDATE rooms
      SET participants_json = ?, updated_at = ?
      WHERE id = ?
    `);
    updateStmt.run(JSON.stringify(updatedParticipants), now, room.id);
  } catch (err) {
    console.warn('Failed to persist join update to SQLite:', err);
  }

  const updatedRoom: Room = {
    ...room,
    participants: updatedParticipants,
    updatedAt: now,
  };

  roomsCache.set(updatedRoom.code, updatedRoom);
  roomsCache.set(updatedRoom.id, updatedRoom);

  return { success: true, room: updatedRoom, participant: newParticipant };
}

export function getRoomParticipants(code: string): RoomParticipant[] {
  const room = getRoomByCode(code);
  return room ? room.participants : [];
}

export function leaveRoom(roomId: string, participantId: string): boolean {
  if (!roomId || !participantId) return false;
  const room = getRoomById(roomId);
  if (!room) return false;

  const now = new Date().toISOString();
  const updatedParticipants = room.participants.filter((p) => p.id !== participantId);

  try {
    const db = getRoomDB();
    const updateStmt = db.prepare(`
      UPDATE rooms
      SET participants_json = ?, updated_at = ?
      WHERE id = ?
    `);
    updateStmt.run(JSON.stringify(updatedParticipants), now, room.id);
  } catch (err) {
    console.warn('Failed to persist leave update to SQLite:', err);
  }

  const updatedRoom: Room = {
    ...room,
    participants: updatedParticipants,
    updatedAt: now,
  };

  roomsCache.set(updatedRoom.code, updatedRoom);
  roomsCache.set(updatedRoom.id, updatedRoom);

  return true;
}

export function updateRoomDraw(
  code: string,
  currentDraw: { drawnPlayer: any; drawPhase: string } | null,
  version?: number
): boolean {
  if (!code) return false;
  const room = ensureRoom(code);

  const now = new Date().toISOString();
  const effectiveVersion = version && version > 0 ? version : Date.now();
  const drawJson = currentDraw ? JSON.stringify(currentDraw) : null;
  const nextStatus: RoomStatus = currentDraw?.drawnPlayer ? 'LIVE' : room.status;

  try {
    const db = getRoomDB();
    const stmt = db.prepare(`
      UPDATE rooms
      SET current_draw_json = ?, status = ?, version = ?, updated_at = ?
      WHERE id = ?
    `);
    stmt.run(drawJson, nextStatus, effectiveVersion, now, room.id);
  } catch (err) {
    console.warn('Failed to persist draw update to SQLite:', err);
  }

  const updatedRoom: Room = {
    ...room,
    currentDraw,
    status: nextStatus,
    version: effectiveVersion,
    updatedAt: now,
  };

  roomsCache.set(updatedRoom.code, updatedRoom);
  roomsCache.set(updatedRoom.id, updatedRoom);

  return true;
}

export function updateRoomRoster(
  code: string,
  rosterState: { teams: any[]; assignedPlayers: any[] } | null,
  settings?: { currency: string; maxTeamBudget: number } | null,
  version?: number
): boolean {
  if (!code) return false;
  const room = ensureRoom(code);

  const now = new Date().toISOString();
  const effectiveVersion = version && version > 0 ? version : Date.now();
  const rosterJson = rosterState ? JSON.stringify(rosterState) : null;

  // Cumulative participant merge: populate this container's participants with all host teams
  const updatedParticipants = [...room.participants];
  if (rosterState?.teams && Array.isArray(rosterState.teams)) {
    for (const t of rosterState.teams) {
      const exists = updatedParticipants.some((p) => p.id === t.id);
      if (!exists) {
        updatedParticipants.push({
          id: t.id,
          name: t.owner || `Manager ${t.id}`,
          teamName: t.name || `Club ${t.id}`,
          role: 'CONTESTANT',
          joinedAt: t.createdAt || now,
          lastSeenAt: now,
        });
      }
    }
  }

  const participantsJson = JSON.stringify(updatedParticipants);

  try {
    const db = getRoomDB();
    if (settings) {
      const settingsJson = JSON.stringify(settings);
      const stmt = db.prepare(`
        UPDATE rooms
        SET roster_state_json = ?, settings_json = ?, participants_json = ?, version = ?, updated_at = ?
        WHERE id = ?
      `);
      stmt.run(rosterJson, settingsJson, participantsJson, effectiveVersion, now, room.id);
    } else {
      const stmt = db.prepare(`
        UPDATE rooms
        SET roster_state_json = ?, participants_json = ?, version = ?, updated_at = ?
        WHERE id = ?
      `);
      stmt.run(rosterJson, participantsJson, effectiveVersion, now, room.id);
    }
  } catch (err) {
    console.warn('Failed to persist roster update to SQLite:', err);
  }

  const updatedRoom: Room = {
    ...room,
    rosterState,
    participants: updatedParticipants,
    settings: settings || room.settings,
    version: effectiveVersion,
    updatedAt: now,
  };

  roomsCache.set(updatedRoom.code, updatedRoom);
  roomsCache.set(updatedRoom.id, updatedRoom);

  return true;
}

export function updateRoomStatus(code: string, status: RoomStatus, version?: number): boolean {
  if (!code) return false;
  const room = ensureRoom(code);

  const now = new Date().toISOString();
  const effectiveVersion = version && version > 0 ? version : Date.now();

  try {
    const db = getRoomDB();
    const stmt = db.prepare(`
      UPDATE rooms
      SET status = ?, version = ?, updated_at = ?
      WHERE id = ?
    `);
    stmt.run(status, effectiveVersion, now, room.id);
  } catch (err) {
    console.warn('Failed to persist status update to SQLite:', err);
  }

  const updatedRoom: Room = {
    ...room,
    status,
    version: effectiveVersion,
    updatedAt: now,
  };

  roomsCache.set(updatedRoom.code, updatedRoom);
  roomsCache.set(updatedRoom.id, updatedRoom);

  return true;
}

export function updateRoomCards(
  code: string,
  cardsState: { powerCards: any[]; sickCards: any[] } | null,
  version?: number
): boolean {
  if (!code) return false;
  const room = ensureRoom(code);

  const now = new Date().toISOString();
  const effectiveVersion = version && version > 0 ? version : Date.now();
  const cardsJson = cardsState ? JSON.stringify(cardsState) : null;

  try {
    const db = getRoomDB();
    const stmt = db.prepare(`
      UPDATE rooms
      SET cards_state_json = ?, version = ?, updated_at = ?
      WHERE id = ?
    `);
    stmt.run(cardsJson, effectiveVersion, now, room.id);
  } catch (err) {
    console.warn('Failed to persist cards update to SQLite:', err);
  }

  const updatedRoom: Room = {
    ...room,
    cardsState,
    version: effectiveVersion,
    updatedAt: now,
  };

  roomsCache.set(updatedRoom.code, updatedRoom);
  roomsCache.set(updatedRoom.id, updatedRoom);

  return true;
}
