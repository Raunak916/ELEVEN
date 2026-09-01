'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useRoomStore } from '@/lib/room-store';
import { useAuctionStore } from '@/lib/auction-store';
import { useHydrated } from '@/lib/use-hydrated';
import { Team } from '@/lib/types';

export function RoomHostPoller() {
  const pathname = usePathname();
  const isAuctionRoute = pathname?.startsWith('/auction');

  const hostedRoom = useRoomStore((state) => state.hostedRoom);
  const createdCode = useRoomStore((state) => state.createdCode);
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

  // 1. Participant Sync Heartbeat
  useEffect(() => {
    if (!hydrated || !isAuctionRoute) return;
    if (settings.auctionMode === 'VANILLA') return;
    if (hostedRoom?.status === 'COMPLETED' || hostedRoom?.status === 'CLOSED') return;
    const roomCode = hostedRoom?.code || createdCode;
    if (!roomCode) return;

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
          timer = setTimeout(syncParticipants, 5000);
        }
      }
    };

    syncParticipants();
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [hydrated, isAuctionRoute, hostedRoom?.code, createdCode, settings.auctionMode, syncHostedRoomParticipants]);

  const roomVersionRef = useRef(Date.now());

  // 2. Broadcast Drawn Player
  useEffect(() => {
    if (!hydrated || !isAuctionRoute) return;
    if (hostedRoom?.status === 'COMPLETED' || hostedRoom?.status === 'CLOSED') return;
    const roomCode = hostedRoom?.code || createdCode;
    if (!roomCode) return;

    roomVersionRef.current = Date.now();
    let isMounted = true;
    let timer: NodeJS.Timeout;

    const broadcastDraw = async () => {
      if (!isMounted) return;
      try {
        await fetch('/api/rooms/draw', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code: roomCode,
            drawnPlayer: drawnPlayerRef.current || null,
            drawPhase: drawPhaseRef.current || 'idle',
            version: roomVersionRef.current,
          }),
          signal: AbortSignal.timeout(3000),
        });
      } catch (err) {
        console.warn('Failed to broadcast draw state:', err);
      } finally {
        if (isMounted) {
          timer = setTimeout(broadcastDraw, 10000);
        }
      }
    };

    broadcastDraw();
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [hydrated, isAuctionRoute, hostedRoom?.code, hostedRoom?.status, createdCode, drawnPlayer, drawPhase]);

  // 3. Broadcast Roster & Teams
  useEffect(() => {
    if (!hydrated || !isAuctionRoute) return;
    if (hostedRoom?.status === 'COMPLETED' || hostedRoom?.status === 'CLOSED') return;
    const roomCode = hostedRoom?.code || createdCode;
    if (!roomCode) return;

    roomVersionRef.current = Date.now();
    let isMounted = true;
    let timer: NodeJS.Timeout;

    const broadcastRoster = async () => {
      if (!isMounted) return;
      try {
        const assignedPlayers = auctionPlayersRef.current.filter(
          (p) =>
            p.status === 'UNSOLD' ||
            p.status === 'DRAWN' ||
            Boolean(p.teamId) ||
            (p.soldPrice !== null && p.soldPrice !== undefined)
        );
        await fetch('/api/rooms/roster', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code: roomCode,
            teams: teamsRef.current,
            assignedPlayers,
            settings: {
              currency: settingsRef.current.currency,
              maxTeamBudget: settingsRef.current.maxTeamBudget,
            },
            version: roomVersionRef.current,
          }),
          signal: AbortSignal.timeout(3500),
        });
      } catch (err) {
        console.warn('Failed to broadcast roster state:', err);
      } finally {
        if (isMounted) {
          timer = setTimeout(broadcastRoster, 10000);
        }
      }
    };

    broadcastRoster();
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [hydrated, isAuctionRoute, hostedRoom?.code, hostedRoom?.status, createdCode, teams, auctionPlayers, settings]);

  // 4. Broadcast Cards State
  useEffect(() => {
    if (!hydrated || !isAuctionRoute) return;
    if (hostedRoom?.status === 'COMPLETED' || hostedRoom?.status === 'CLOSED') return;
    const roomCode = hostedRoom?.code || createdCode;
    if (!roomCode) return;

    let isMounted = true;
    let timer: NodeJS.Timeout;

    const broadcastCards = async () => {
      if (!isMounted) return;
      try {
        const powerStr = localStorage.getItem('football-auction-power-cards-v2');
        const sickStr = localStorage.getItem('football-auction-sick-cards-v2');
        const powerCards = powerStr ? JSON.parse(powerStr) : [];
        const sickCards = sickStr ? JSON.parse(sickStr) : [];

        await fetch('/api/rooms/cards', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code: roomCode,
            powerCards,
            sickCards,
            version: roomVersionRef.current,
          }),
          signal: AbortSignal.timeout(3000),
        });
      } catch {} finally {
        if (isMounted) {
          timer = setTimeout(broadcastCards, 15000);
        }
      }
    };

    broadcastCards();
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [hydrated, isAuctionRoute, hostedRoom?.code, createdCode]);

  return null;
}
