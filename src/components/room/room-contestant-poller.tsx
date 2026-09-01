'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useRoomStore } from '@/lib/room-store';
import { useAuctionStore } from '@/lib/auction-store';
import { useHydrated } from '@/lib/use-hydrated';
import { AuctionPlayer } from '@/lib/types';

export function RoomContestantPoller() {
  const pathname = usePathname();
  const isAuctionRoute = pathname?.startsWith('/auction');

  const activeSession = useRoomStore((state) => state.activeSession);
  const hydrated = useHydrated();
  const lastAppliedVersionRef = useRef(0);

  useEffect(() => {
    if (!hydrated || !isAuctionRoute) return;
    if (!activeSession || activeSession.role !== 'CONTESTANT' || !activeSession.roomCode) return;

    lastAppliedVersionRef.current = 0;
    const roomCode = activeSession.roomCode;
    let isMounted = true;
    let timer: NodeJS.Timeout;

    const pollRoomState = async () => {
      if (!isMounted) return;
      try {
        const res = await fetch(`/api/rooms?code=${encodeURIComponent(roomCode)}`, {
          signal: AbortSignal.timeout(3000),
          cache: 'no-store',
        });

        if (!res.ok || !isMounted) return;

        const data = await res.json();
        const room = data.room;
        if (!room || !isMounted) return;

        const serverVersion =
          typeof room.version === 'number' && room.version > 0
            ? room.version
            : room.updatedAt
            ? new Date(room.updatedAt).getTime()
            : 0;

        // Monotonic check: allow all COMPLETED updates regardless of version to ensure completion is never missed
        if (room.status !== 'COMPLETED' && serverVersion > 0 && serverVersion < lastAppliedVersionRef.current) {
          return;
        }

        lastAppliedVersionRef.current = Math.max(lastAppliedVersionRef.current, serverVersion);

        // 1. Sync room status (COMPLETED is terminal and high priority)
        if (room.status) {
          const currentSession = useRoomStore.getState().activeSession;
          if (
            currentSession &&
            (currentSession.status !== room.status || room.status === 'COMPLETED')
          ) {
            useRoomStore.setState({
              activeSession: {
                ...currentSession,
                status: room.status,
              },
            });
          }
        }

        // 2. Sync live draw player state
        const serverDraw = room.currentDraw;
        const currentLocalDrawn = useAuctionStore.getState().drawnPlayer;
        const currentLocalPhase = useAuctionStore.getState().drawPhase;

        const serverPlayer = serverDraw?.drawnPlayer || null;
        const serverPhase = serverDraw?.drawPhase || 'idle';

        const hasDrawChanged =
          serverPlayer?.id !== currentLocalDrawn?.id ||
          serverPlayer?.teamId !== currentLocalDrawn?.teamId ||
          serverPlayer?.soldPrice !== currentLocalDrawn?.soldPrice ||
          serverPlayer?.status !== currentLocalDrawn?.status ||
          serverPhase !== currentLocalPhase ||
          Boolean(serverPlayer) !== Boolean(currentLocalDrawn);

        if (hasDrawChanged) {
          useAuctionStore.setState({
            drawnPlayer: serverPlayer,
            drawPhase: serverPhase as any,
          });
        }

        // 3. Sync room rosterState: Merge assigned & unsold players into auctionPlayers pool
        if (room.rosterState) {
          const { teams: serverTeams, assignedPlayers: serverAssignedPlayers } = room.rosterState;

          if (Array.isArray(serverAssignedPlayers)) {
            const currentLocalAuctionPlayers = useAuctionStore.getState().auctionPlayers;
            const serverMap = new Map(serverAssignedPlayers.map((p: AuctionPlayer) => [p.id, p]));

            // Atomic Merge: update every player matching by ID without wiping available pool
            const mergedPlayers = currentLocalAuctionPlayers.map((localP) => {
              const serverP = serverMap.get(localP.id);
              if (serverP) {
                return {
                  ...localP,
                  ...serverP,
                };
              }
              return localP;
            });

            // If server has mystery players or new assignments not in initial local pool, append them
            for (const serverP of serverAssignedPlayers) {
              if (!currentLocalAuctionPlayers.some((lp) => lp.id === serverP.id)) {
                mergedPlayers.push(serverP);
              }
            }

            useAuctionStore.setState({ auctionPlayers: mergedPlayers.length > 0 ? mergedPlayers : serverAssignedPlayers });
          }

          // Sync Teams
          if (Array.isArray(serverTeams)) {
            useAuctionStore.setState({ teams: serverTeams });
          }
        } else if (room.participants && Array.isArray(room.participants)) {
          // Fallback: sync participants if local teams is empty
          const currentLocalTeams = useAuctionStore.getState().teams;
          if (currentLocalTeams.length === 0) {
            const contestantParticipants = room.participants.filter((p: any) => p.role === 'CONTESTANT');
            const roomTeams = contestantParticipants.map((p: any) => ({
              id: p.id,
              name: p.teamName || p.name || `Club ${p.id}`,
              owner: p.name || `Manager ${p.id}`,
              createdAt: p.joinedAt || new Date().toISOString(),
              otherExpenses: [],
            }));
            useAuctionStore.setState({ teams: roomTeams });
          }
        }

        // 4. Sync room currency & max budget settings
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

        // 5. Sync room cardsState (Power Cards & Sick Cards)
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
      } catch (err) {
        console.warn('Contestant room poll warning:', err);
      } finally {
        if (isMounted) {
          timer = setTimeout(pollRoomState, 1500);
        }
      }
    };

    pollRoomState();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        pollRoomState();
      }
    };
    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleVisibilityChange);

    return () => {
      isMounted = false;
      clearTimeout(timer);
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleVisibilityChange);
    };
  }, [hydrated, isAuctionRoute, activeSession?.roomCode, activeSession?.role]);

  return null;
}
