'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useRoomStore } from '@/lib/room-store';
import { useAuctionStore } from '@/lib/auction-store';
import { useHydrated } from '@/lib/use-hydrated';

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
          signal: AbortSignal.timeout(3500),
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

        // ATOMIC MONOTONIC VERSION GUARD:
        // If a lagging serverless container returns a snapshot older than what we already applied,
        // DROP IT INSTANTLY. Prevents any 5-10 second turbulence or state oscillation!
        if (serverVersion < lastAppliedVersionRef.current) {
          return;
        }

        lastAppliedVersionRef.current = serverVersion;

        // 1. Sync live draw player state with Monotonic Progression (never downgrade a confirmed sale to unsold)
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

        // Check if server container is lagging on the same player (e.g. server says unsold/pending when local already knows it was sold)
        const localHasSale = Boolean(localTeamId) || (localSoldPrice !== null && localSoldPrice !== undefined);
        const serverHasSale = Boolean(serverTeamId) || (serverSoldPrice !== null && serverSoldPrice !== undefined);
        const isServerLaggingOnSamePlayer = Boolean(serverPlayerId && serverPlayerId === localPlayerId && localHasSale && !serverHasSale);

        if (!isServerLaggingOnSamePlayer) {
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
        }

        // 2. Sync room rosterState with Monotonic Progression (never wipe squad on lagging server container)
        if (room.rosterState) {
          const { teams: serverTeams, assignedPlayers: serverAssignedPlayers } = room.rosterState;
          const currentLocalAuctionPlayers = useAuctionStore.getState().auctionPlayers;
          const currentLocalTeams = useAuctionStore.getState().teams;

          // Guard against lagging container snapshots for assigned players
          if (Array.isArray(serverAssignedPlayers)) {
            const localSoldCount = currentLocalAuctionPlayers.filter(
              (p) => p.status === 'DRAWN' || Boolean(p.teamId) || (p.soldPrice !== null && p.soldPrice !== undefined)
            ).length;

            const serverSoldCount = serverAssignedPlayers.filter(
              (p) => p.status === 'DRAWN' || Boolean(p.teamId) || (p.soldPrice !== null && p.soldPrice !== undefined)
            ).length;

            // Only update if server has at least as many sales/assignments as local (never downgrade)
            if (serverSoldCount >= localSoldCount) {
              useAuctionStore.setState({ auctionPlayers: serverAssignedPlayers });
            }
          }

          // Guard against lagging container snapshots for teams
          if (Array.isArray(serverTeams)) {
            if (serverTeams.length >= currentLocalTeams.length) {
              useAuctionStore.setState({ teams: serverTeams });
            } else {
              // Merge updated budgets into existing teams without dropping known teams
              const mergedTeams = currentLocalTeams.map((lt) => {
                const st = serverTeams.find((t: any) => t.id === lt.id);
                return st ? { ...lt, ...st } : lt;
              });
              useAuctionStore.setState({ teams: mergedTeams });
            }
          }
        } else if (room.participants && Array.isArray(room.participants)) {
          // Fallback: sync participants as the isolated team list for this room if local teams is empty
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

        // 5. Sync room status with Monotonic Lifecycle (COMPLETED is terminal)
        if (room.status) {
          const currentSession = useRoomStore.getState().activeSession;
          if (
            currentSession &&
            currentSession.status !== 'COMPLETED' &&
            currentSession.status !== room.status
          ) {
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
        if (isMounted) {
          timer = setTimeout(pollRoomState, 2000);
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
  }, [hydrated, activeSession?.roomCode, activeSession?.role]);

  return null;
}
