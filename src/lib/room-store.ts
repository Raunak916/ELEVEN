import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import { ActiveRoomSession, Room, RoomParticipant, RoomStatus } from './room-types';

interface RoomState {
  // Active session when user has joined another person's room
  activeSession: ActiveRoomSession | null;

  // Last room created by this user as host
  hostedRoom: {
    id: string;
    code: string;
    status: RoomStatus;
    createdAt: string;
  } | null;
  createdCode: string | null;

  // Local client participant ID (persisted for consistent session)
  clientId: string;

  // Status flags
  isCreating: boolean;
  isJoining: boolean;
  joinError: string | null;

  // Actions
  createRoom: (settings?: { currency: string; maxTeamBudget: number }) => Promise<{ success: boolean; code?: string; error?: string }>;
  syncHostedRoomParticipants: () => Promise<RoomParticipant[]>;
  joinRoom: (code: string, contestantId?: string, name?: string, teamName?: string) => Promise<{ success: boolean; code?: string; error?: string }>;
  leaveRoom: () => Promise<void>;
  markHostedRoomCompleted: () => void;
  clearJoinError: () => void;
  clearHostedRoom: () => void;
}

export const useRoomStore = create<RoomState>()(
  persist(
    (set, get) => ({
      activeSession: null,
      hostedRoom: null,
      createdCode: null,
      clientId: uuidv4(),
      isCreating: false,
      isJoining: false,
      joinError: null,

      createRoom: async (settings?: { currency: string; maxTeamBudget: number }) => {
        set({ isCreating: true, joinError: null });
        try {
          const clientId = get().clientId || uuidv4();
          if (!get().clientId) set({ clientId });

          const res = await fetch('/api/rooms', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              hostId: clientId,
              settings: settings || undefined,
            }),
          });

          const data = await res.json();
          if (!res.ok || !data.success) {
            throw new Error(data.error || 'Failed to create room');
          }

          const room: Room = data.room;
          set({
            hostedRoom: {
              id: room.id,
              code: room.code,
              status: room.status,
              createdAt: room.createdAt,
            },
            createdCode: room.code,
            isCreating: false,
          });

          return { success: true, code: room.code };
        } catch (err: unknown) {
          const errorMsg = err instanceof Error ? err.message : 'Failed to create room';
          set({ isCreating: false });
          return { success: false, error: errorMsg };
        }
      },

      syncHostedRoomParticipants: async () => {
        const hosted = get().hostedRoom;
        const code = hosted?.code || get().createdCode;
        if (!code) return [];

        try {
          const res = await fetch(`/api/rooms?code=${encodeURIComponent(code)}`);
          if (!res.ok) return [];
          const data = await res.json();
          const room = data.room;

          // Sync server room status to local hostedRoom state if changed
          // TERMINAL STATUS RULE: If local is already COMPLETED, never revert back to LIVE or CREATED
          if (room && hosted && hosted.status !== 'COMPLETED' && hosted.status !== room.status) {
            set({
              hostedRoom: {
                ...hosted,
                status: room.status,
              },
            });
          }

          return (room?.participants as RoomParticipant[]) || [];
        } catch {
          return [];
        }
      },

      joinRoom: async (code: string, contestantId?: string, name?: string, teamName?: string) => {
        const cleanCode = (code || '').trim().toUpperCase();
        if (!cleanCode) {
          const errorMsg = 'Please enter a room code';
          set({ joinError: errorMsg });
          return { success: false, error: errorMsg };
        }

        set({ isJoining: true, joinError: null });
        try {
          const clientId = get().clientId || uuidv4();
          if (!get().clientId) set({ clientId });

          const finalParticipantId = (contestantId || '').trim().toUpperCase() || clientId;
          const finalName = name?.trim() || undefined;
          const finalTeamName = teamName?.trim() || undefined;

          const res = await fetch('/api/rooms/join', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              code: cleanCode,
              participantId: finalParticipantId,
              name: finalName,
              teamName: finalTeamName,
            }),
          });

          const data = await res.json();
          if (!res.ok || !data.success) {
            const errorMsg = data.error || 'Invalid room code';
            set({ isJoining: false, joinError: errorMsg });
            return { success: false, error: errorMsg };
          }

          const session: ActiveRoomSession = data.session;

          // Clear stale auction state or hydrate existing room roster if already completed
          try {
            const { useAuctionStore } = await import('./auction-store');
            const roomData = data.room;
            if (roomData?.rosterState) {
              const { teams, assignedPlayers } = roomData.rosterState;
              useAuctionStore.setState({
                teams: Array.isArray(teams) ? teams : [],
                auctionPlayers: Array.isArray(assignedPlayers) ? assignedPlayers : [],
                drawnPlayer: roomData.currentDraw?.drawnPlayer || null,
                drawPhase: roomData.currentDraw?.drawPhase || 'idle',
              });
            } else {
              useAuctionStore.setState({
                auctionPlayers: [],
                teams: [],
                drawnPlayer: null,
                drawPhase: 'idle',
              });
            }
          } catch {}

          set({
            activeSession: session,
            isJoining: false,
            joinError: null,
          });

          return { success: true, code: cleanCode };
        } catch (err: unknown) {
          const errorMsg = err instanceof Error ? err.message : 'Network error joining room';
          set({ isJoining: false, joinError: errorMsg });
          return { success: false, error: errorMsg };
        }
      },

      leaveRoom: async () => {
        const active = get().activeSession;
        if (active) {
          try {
            await fetch('/api/rooms/leave', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                roomId: active.roomId,
                participantId: active.participantId,
              }),
            });
          } catch (err) {
            console.warn('Failed to notify room leave:', err);
          }
        }

        // Clean up auction state on leave
        try {
          const { useAuctionStore } = await import('./auction-store');
          useAuctionStore.setState({
            auctionPlayers: [],
            teams: [],
            drawnPlayer: null,
            drawPhase: 'idle',
          });
        } catch {}

        set({ activeSession: null, joinError: null });
      },

      clearJoinError: () => set({ joinError: null }),
      clearHostedRoom: () => set({ hostedRoom: null, createdCode: null }),
      markHostedRoomCompleted: () => {
        const hosted = get().hostedRoom;
        if (hosted) {
          set({
            hostedRoom: {
              ...hosted,
              status: 'COMPLETED',
            },
          });
        }
      },
    }),
    {
      name: 'football-auction-room-v1',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        activeSession: state.activeSession,
        hostedRoom: state.hostedRoom,
        createdCode: state.createdCode,
        clientId: state.clientId,
      }),
    }
  )
);
