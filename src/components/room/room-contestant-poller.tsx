'use client';

import { useEffect, useRef } from 'react';
import { useRoomStore } from '@/lib/room-store';
import { useAuctionStore } from '@/lib/auction-store';
import { useHydrated } from '@/lib/use-hydrated';

export function RoomContestantPoller() {
  const activeSession = useRoomStore((state) => state.activeSession);
  const hydrated = useHydrated();
  const isPollingRef = useRef(false);

  useEffect(() => {
    if (!hydrated) return;
    if (!activeSession || activeSession.role !== 'CONTESTANT' || !activeSession.roomCode) return;

    const roomCode = activeSession.roomCode;

    const pollRoomState = async () => {
      if (isPollingRef.current) return;
      isPollingRef.current = true;
      try {
        const res = await fetch(`/api/rooms?code=${encodeURIComponent(roomCode)}`);
        if (!res.ok) {
          isPollingRef.current = false;
          return;
        }

        const data = await res.json();
        const room = data.room;
        if (!room) {
          isPollingRef.current = false;
          return;
        }

        // 1. Sync live draw player state with full field comparison
        const serverDraw = room.currentDraw;
        const currentLocalDrawn = useAuctionStore.getState().drawnPlayer;
        const currentLocalPhase = useAuctionStore.getState().drawPhase;

        const serverPlayer = serverDraw?.drawnPlayer || null;
        const serverPlayerId = serverPlayer?.id || null;
        const localPlayerId = currentLocalDrawn?.id || null;
        const serverTeamId = serverPlayer?.teamId || null;
        const localTeamId = currentLocalDrawn?.teamId || null;
        const serverSoldPrice = serverPlayer?.soldPrice || null;
        const localSoldPrice = currentLocalDrawn?.soldPrice || null;
        const serverStatus = serverPlayer?.status || null;
        const localStatus = currentLocalDrawn?.status || null;
        const serverPhase = serverDraw?.drawPhase || 'idle';

        const hasPlayerChanged =
          serverPlayerId !== localPlayerId ||
          serverTeamId !== localTeamId ||
          serverSoldPrice !== localSoldPrice ||
          serverStatus !== localStatus ||
          serverPhase !== currentLocalPhase ||
          Boolean(serverPlayer) !== Boolean(currentLocalDrawn);

        if (hasPlayerChanged) {
          useAuctionStore.setState({
            drawnPlayer: serverPlayer,
            drawPhase: serverPhase as any,
          });
        }

        // 2. Sync room rosterState (all assigned players and team budgets/expenses from host)
        if (room.rosterState) {
          const { teams: serverTeams, assignedPlayers: serverAssignedPlayers } = room.rosterState;
          
          if (Array.isArray(serverTeams)) {
            useAuctionStore.setState({ teams: serverTeams });
          }

          if (Array.isArray(serverAssignedPlayers)) {
            useAuctionStore.setState({ auctionPlayers: serverAssignedPlayers });
          }
        } else if (room.participants && Array.isArray(room.participants)) {
          // Fallback: sync participants as the isolated team list for this room
          const contestantParticipants = room.participants.filter((p: any) => p.role === 'CONTESTANT');
          const roomTeams = contestantParticipants.map((p: any) => ({
            id: p.id,
            name: p.teamName || p.name || `Club ${p.id}`,
            owner: p.name || `Manager ${p.id}`,
            createdAt: p.joinedAt || new Date().toISOString(),
            otherExpenses: [],
          }));
          useAuctionStore.setState({ teams: roomTeams, auctionPlayers: [] });
        }

        // 3. Sync room currency / max budget settings
        if (room.settings) {
          const currentSettings = useAuctionStore.getState().settings;
          if (
            currentSettings.currency !== room.settings.currency ||
            currentSettings.maxTeamBudget !== room.settings.maxTeamBudget
          ) {
            useAuctionStore.setState({
              settings: {
                ...currentSettings,
                currency: room.settings.currency,
                maxTeamBudget: room.settings.maxTeamBudget,
              },
            });
          }

          const currentSession = useRoomStore.getState().activeSession;
          if (
            currentSession &&
            (!currentSession.settings ||
              currentSession.settings.currency !== room.settings.currency ||
              currentSession.settings.maxTeamBudget !== room.settings.maxTeamBudget)
          ) {
            useRoomStore.setState({
              activeSession: {
                ...currentSession,
                settings: room.settings,
              },
            });
          }
        }

        // 4. Sync room cardsState (Power Cards & Sick Cards with team assignments)
        if (room.cardsState) {
          const { powerCards, sickCards } = room.cardsState;
          try {
            if (Array.isArray(powerCards)) {
              localStorage.setItem('football-auction-power-cards-v2', JSON.stringify(powerCards));
            }
            if (Array.isArray(sickCards)) {
              localStorage.setItem('football-auction-sick-cards-v2', JSON.stringify(sickCards));
            }
          } catch {}

          const currentSession = useRoomStore.getState().activeSession;
          if (currentSession) {
            useRoomStore.setState({
              activeSession: {
                ...currentSession,
                cardsState: room.cardsState,
              },
            });
          }
        }

        // 4. Sync room status (e.g. COMPLETED)
        if (room.status) {
          const currentSession = useRoomStore.getState().activeSession;
          if (currentSession && currentSession.status !== room.status) {
            useRoomStore.setState({
              activeSession: {
                ...currentSession,
                status: room.status,
              },
            });
          }
        }
      } catch (err) {
        console.warn('Contestant room poll warning:', err);
      } finally {
        isPollingRef.current = false;
      }
    };

    // Initial immediate poll
    pollRoomState();

    // High-frequency polling (600ms) for ultra-responsive live sync without page refresh
    const interval = setInterval(pollRoomState, 600);
    return () => clearInterval(interval);
  }, [hydrated, activeSession?.roomCode, activeSession?.role]);

  return null;
}
