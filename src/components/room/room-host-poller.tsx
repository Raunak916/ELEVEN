'use client';

import { useEffect, useRef } from 'react';
import { useRoomStore } from '@/lib/room-store';
import { useAuctionStore } from '@/lib/auction-store';
import { useHydrated } from '@/lib/use-hydrated';
import { Team } from '@/lib/types';

export function RoomHostPoller() {
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

  // 1. Participant Sync Heartbeat (Pulls contestants into host teams list when in ROOM mode)
  useEffect(() => {
    if (!hydrated) return;
    if (settings.auctionMode === 'VANILLA') return;
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
        
        // Additive Cumulative Merging: Never remove an already connected contestant across serverless polls
        const updatedTeams: Team[] = [...currentTeams];
        let hasChanges = false;

        for (const p of contestantParticipants) {
          const clubId = p.id;
          const isGenericTeam = !p.teamName || p.teamName === `Team ${clubId}` || p.teamName === `Club ${clubId}`;
          const isGenericOwner = !p.name || p.name === `Manager ${clubId}`;

          const existingIdx = updatedTeams.findIndex((t) => t.id === clubId);
          if (existingIdx === -1) {
            // New contestant joined -> append to tournament teams list!
            updatedTeams.push({
              id: clubId,
              name: !isGenericTeam ? p.teamName : `Club ${clubId}`,
              owner: !isGenericOwner ? p.name : `Manager ${clubId}`,
              createdAt: p.joinedAt || new Date().toISOString(),
              otherExpenses: [],
            });
            hasChanges = true;
          } else {
            // Existing contestant -> update names if customized
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
          timer = setTimeout(syncParticipants, 600);
        }
      }
    };

    syncParticipants();
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [hydrated, hostedRoom?.code, createdCode, settings.auctionMode, syncHostedRoomParticipants]);

  // 2. Broadcast Drawn Player (Immediate on change + 1.2s heartbeat)
  useEffect(() => {
    if (!hydrated) return;
    const roomCode = hostedRoom?.code || createdCode;
    if (!roomCode) return;

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
          }),
          signal: AbortSignal.timeout(3000),
        });
      } catch (err) {
        console.warn('Failed to broadcast draw state:', err);
      } finally {
        if (isMounted) {
          timer = setTimeout(broadcastDraw, 800);
        }
      }
    };

    broadcastDraw();
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [hydrated, hostedRoom?.code, createdCode, drawnPlayer, drawPhase]);

  // 3. Broadcast Roster & Teams (Immediate on change + 900ms heartbeat)
  useEffect(() => {
    if (!hydrated) return;
    const roomCode = hostedRoom?.code || createdCode;
    if (!roomCode) return;

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
          }),
          signal: AbortSignal.timeout(3500),
        });
      } catch (err) {
        console.warn('Failed to broadcast roster state:', err);
      } finally {
        if (isMounted) {
          timer = setTimeout(broadcastRoster, 900);
        }
      }
    };

    broadcastRoster();
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [hydrated, hostedRoom?.code, createdCode, teams, auctionPlayers, settings]);

  // 4. Broadcast Cards State (Every 3s)
  useEffect(() => {
    if (!hydrated) return;
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
          }),
          signal: AbortSignal.timeout(3000),
        });
      } catch {} finally {
        if (isMounted) {
          timer = setTimeout(broadcastCards, 3000);
        }
      }
    };

    broadcastCards();
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [hydrated, hostedRoom?.code, createdCode]);

  return null;
}
