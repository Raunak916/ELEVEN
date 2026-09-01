'use client';

import { useEffect, useRef, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { useRoomStore } from '@/lib/room-store';
import { useAuctionStore } from '@/lib/auction-store';
import { useHydrated } from '@/lib/use-hydrated';
import { Team } from '@/lib/types';

export function RoomHostPoller() {
  const pathname = usePathname();
  const isAuctionRoute = pathname?.startsWith('/auction');

  const hostedRoom = useRoomStore((state) => state.hostedRoom);
  const syncHostedRoomParticipants = useRoomStore((state) => state.syncHostedRoomParticipants);
  const hydrated = useHydrated();

  const drawnPlayer = useAuctionStore((state) => state.drawnPlayer);
  const drawPhase = useAuctionStore((state) => state.drawPhase);
  const teams = useAuctionStore((state) => state.teams);
  const auctionPlayers = useAuctionStore((state) => state.auctionPlayers);
  const settings = useAuctionStore((state) => state.settings);

  const drawnPlayerRef = useRef(drawnPlayer);
  drawnPlayerRef.current = drawnPlayer;
  const drawPhaseRef = useRef(drawPhase);
  drawPhaseRef.current = drawPhase;
  const teamsRef = useRef(teams);
  teamsRef.current = teams;
  const auctionPlayersRef = useRef(auctionPlayers);
  auctionPlayersRef.current = auctionPlayers;
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  const activeRoomCode = hostedRoom?.code;
  const isCompletedOrClosed = hostedRoom?.status === 'COMPLETED' || hostedRoom?.status === 'CLOSED';

  // 1. Participant Sync Heartbeat
  useEffect(() => {
    if (!hydrated || !isAuctionRoute || !activeRoomCode || isCompletedOrClosed) return;
    if (settings.auctionMode === 'VANILLA') return;

    let isMounted = true;
    let timer: NodeJS.Timeout;

    const syncParticipants = async () => {
      if (!isMounted) return;
      try {
        const participants = await syncHostedRoomParticipants();
        if (!participants || !isMounted) return;

        const currentTeams = useAuctionStore.getState().teams;
        const contestantParticipants = participants.filter((p) => p.role === 'CONTESTANT');

        // Additive Cumulative Merging
        const updatedTeams: Team[] = [...currentTeams];
        let hasChanges = false;

        for (const p of contestantParticipants) {
          const clubId = p.id;
          const isGenericTeam = !p.teamName || p.teamName === `Team ${clubId}` || p.teamName === `Club ${clubId}`;
          const isGenericOwner = !p.name || p.name === `Manager ${clubId}`;

          const existingIdx = updatedTeams.findIndex((t) => t.id === clubId);
          if (existingIdx === -1) {
            updatedTeams.push({
              id: clubId,
              name: !isGenericTeam ? p.teamName : `Club ${clubId}`,
              owner: !isGenericOwner ? p.name : `Manager ${clubId}`,
              createdAt: p.joinedAt || new Date().toISOString(),
              otherExpenses: [],
            });
            hasChanges = true;
          } else {
            const existing = updatedTeams[existingIdx];
            const newName = !isGenericTeam ? p.teamName : existing.name;
            const newOwner = !isGenericOwner ? p.name : existing.owner;
            if (existing.name !== newName || existing.owner !== newOwner) {
              updatedTeams[existingIdx] = {
                ...existing,
                name: newName,
                owner: newOwner,
              };
              hasChanges = true;
            }
          }
        }

        if (hasChanges) {
          useAuctionStore.setState({ teams: updatedTeams });
        }
      } catch (err) {
        console.warn('Host room participant sync warning:', err);
      } finally {
        if (isMounted) {
          timer = setTimeout(syncParticipants, 4000);
        }
      }
    };

    syncParticipants();
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [hydrated, isAuctionRoute, activeRoomCode, isCompletedOrClosed, settings.auctionMode, syncHostedRoomParticipants]);

  // 2. High-Speed Unified Room Sync Broadcast (Atomic Snapshot)
  const broadcastSync = useCallback(async () => {
    const hosted = useRoomStore.getState().hostedRoom;
    if (!hosted || hosted.status === 'COMPLETED' || hosted.status === 'CLOSED') return;
    const roomCode = hosted.code;
    if (!roomCode) return;

    try {
      const assignedPlayers = auctionPlayersRef.current.filter(
        (p) =>
          p.status === 'UNSOLD' ||
          p.status === 'DRAWN' ||
          Boolean(p.teamId) ||
          (p.soldPrice !== null && p.soldPrice !== undefined) ||
          Boolean(p.drawnAt)
      );

      let powerCards: any[] = [];
      let sickCards: any[] = [];
      try {
        const powerStr = localStorage.getItem('football-auction-power-cards-v2');
        const sickStr = localStorage.getItem('football-auction-sick-cards-v2');
        powerCards = powerStr ? JSON.parse(powerStr) : [];
        sickCards = sickStr ? JSON.parse(sickStr) : [];
      } catch {}

      await fetch('/api/rooms/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: roomCode,
          currentDraw: {
            drawnPlayer: drawnPlayerRef.current || null,
            drawPhase: drawPhaseRef.current || 'idle',
          },
          rosterState: {
            teams: teamsRef.current,
            assignedPlayers,
          },
          cardsState: {
            powerCards,
            sickCards,
          },
          settings: {
            currency: settingsRef.current.currency,
            maxTeamBudget: settingsRef.current.maxTeamBudget,
          },
          status: hosted.status || 'LIVE',
          version: Date.now(),
        }),
        signal: AbortSignal.timeout(3500),
      });
    } catch (err) {
      console.warn('Failed to broadcast unified room state:', err);
    }
  }, []);

  // Reactive trigger on any state change with heartbeat
  useEffect(() => {
    if (!hydrated || !isAuctionRoute || !activeRoomCode || isCompletedOrClosed) return;

    let isMounted = true;
    let timer: NodeJS.Timeout;

    // Immediately sync on change
    broadcastSync();

    // Heartbeat every 2.5 seconds
    const runHeartbeat = async () => {
      if (!isMounted) return;
      await broadcastSync();
      if (isMounted) {
        timer = setTimeout(runHeartbeat, 2500);
      }
    };

    timer = setTimeout(runHeartbeat, 2500);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [
    hydrated,
    isAuctionRoute,
    activeRoomCode,
    isCompletedOrClosed,
    drawnPlayer,
    drawPhase,
    teams,
    auctionPlayers,
    settings,
    broadcastSync,
  ]);

  return null;
}
