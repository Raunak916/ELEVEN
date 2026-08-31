export type RoomStatus = 'CREATED' | 'WAITING' | 'LIVE' | 'COMPLETED' | 'CLOSED';

export interface RoomParticipant {
  id: string;
  name: string;
  teamName: string;
  role: 'CONTESTANT' | 'SPECTATOR';
  joinedAt: string;
  lastSeenAt?: string;
}

export interface Room {
  id: string;
  code: string;
  hostId: string;
  status: RoomStatus;
  settings?: {
    currency: string;
    maxTeamBudget: number;
  };
  currentDraw?: {
    drawnPlayer: any;
    drawPhase: string;
  } | null;
  rosterState?: {
    teams: any[];
    assignedPlayers: any[];
  } | null;
  cardsState?: {
    powerCards: any[];
    sickCards: any[];
  } | null;
  createdAt: string;
  updatedAt: string;
  version?: number;
  participants: RoomParticipant[];
}

export interface ActiveRoomSession {
  roomId: string;
  roomCode: string;
  role: 'CONTESTANT' | 'HOST';
  participantId: string;
  name: string;
  teamName: string;
  status?: RoomStatus;
  settings?: {
    currency: string;
    maxTeamBudget: number;
  };
  currentDraw?: {
    drawnPlayer: any;
    drawPhase: string;
  } | null;
  rosterState?: {
    teams: any[];
    assignedPlayers: any[];
  } | null;
  cardsState?: {
    powerCards: any[];
    sickCards: any[];
  } | null;
  joinedAt: string;
}



