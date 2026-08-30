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
  const isSyncingRef = useRef(false);

  useEffect(() => {
    if (!hydrated) return;
    if (hostedRoom?.status === 'COMPLETED') return;
    const roomCode = hostedRoom?.code || createdCode;
    if (!roomCode) return;

    const syncParticipants = async () => {
      if (isSyncingRef.current) return;
      isSyncingRef.current = true;
      try {
        const participants = await syncHostedRoomParticipants();
        if (!participants || participants.length === 0) {
          isSyncingRef.current = false;
          return;
        }

        const currentTeams = useAuctionStore.getState().teams;
        let hasChanges = false;
        const contestantParticipants = participants.filter((p) => p.role === 'CONTESTANT');
        const updatedTeams: Team[] = [];

        for (const p of contestantParticipants) {
          const clubId = p.id;
          const isGenericTeam = !p.teamName || p.teamName === `Team ${clubId}` || p.teamName === `Club ${clubId}`;
          const isGenericOwner = !p.name || p.name === `Manager ${clubId}`;

          const existing = currentTeams.find((t) => t.id === clubId);
          if (!existing) {
            updatedTeams.push({
              id: clubId,
              name: isGenericTeam ? `Club ${clubId}` : p.teamName,
              owner: isGenericOwner ? `Manager ${clubId}` : p.name,
              createdAt: p.joinedAt || new Date().toISOString(),
              otherExpenses: [],
            });
            hasChanges = true;
          } else {
            const newName = !isGenericTeam ? p.teamName : existing.name;
            const newOwner = !isGenericOwner ? p.name : existing.owner;
            updatedTeams.push({
              ...existing,
              name: newName,
              owner: newOwner,
            });
            if (existing.name !== newName || existing.owner !== newOwner) {
              hasChanges = true;
            }
          }
        }

        if (hasChanges || updatedTeams.length !== currentTeams.length) {
          useAuctionStore.setState({ teams: updatedTeams });
        }
      } catch (err) {
        console.warn('Host room participant sync warning:', err);
      } finally {
        isSyncingRef.current = false;
      }
    };

    // Initial immediate sync
    syncParticipants();

    // Poll every 800ms for live contestants joining the room
    const interval = setInterval(syncParticipants, 800);
    return () => clearInterval(interval);
  }, [hydrated, hostedRoom?.code, hostedRoom?.status, createdCode, syncHostedRoomParticipants]);

  // Host: Broadcast current draw state to room
  const drawnPlayer = useAuctionStore((state) => state.drawnPlayer);
  const drawPhase = useAuctionStore((state) => state.drawPhase);

  useEffect(() => {
    if (!hydrated) return;
    if (hostedRoom?.status === 'COMPLETED') return;
    const roomCode = hostedRoom?.code || createdCode;
    if (!roomCode) return;

    const broadcastDraw = async () => {
      try {
        await fetch('/api/rooms/draw', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code: roomCode,
            drawnPlayer: drawnPlayer || null,
            drawPhase: drawPhase || 'idle',
          }),
        });
      } catch (err) {
        console.warn('Failed to broadcast draw state:', err);
      }
    };

    broadcastDraw();
  }, [hydrated, hostedRoom?.code, hostedRoom?.status, createdCode, drawnPlayer, drawPhase]);

  // Host: Broadcast teams, expenses, and assigned roster players to room
  const teams = useAuctionStore((state) => state.teams);
  const auctionPlayers = useAuctionStore((state) => state.auctionPlayers);
  const settings = useAuctionStore((state) => state.settings);

  useEffect(() => {
    if (!hydrated) return;
    if (hostedRoom?.status === 'COMPLETED') return;
    const roomCode = hostedRoom?.code || createdCode;
    if (!roomCode) return;

    const broadcastRoster = async () => {
      try {
        const assignedPlayers = auctionPlayers.filter(
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
            teams,
            assignedPlayers,
            settings: {
              currency: settings.currency,
              maxTeamBudget: settings.maxTeamBudget,
            },
          }),
        });
      } catch (err) {
        console.warn('Failed to broadcast roster state:', err);
      }
    };

    broadcastRoster();
  }, [hydrated, hostedRoom?.code, hostedRoom?.status, createdCode, teams, auctionPlayers, settings]);

  // Host: Broadcast cards state to room on interval and on changes
  useEffect(() => {
    if (!hydrated) return;
    if (hostedRoom?.status === 'COMPLETED') return;
    const roomCode = hostedRoom?.code || createdCode;
    if (!roomCode) return;

    const broadcastCards = async () => {
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
        });
      } catch {}
    };

    broadcastCards();
    const interval = setInterval(broadcastCards, 3000);
    return () => clearInterval(interval);
  }, [hydrated, hostedRoom?.code, hostedRoom?.status, createdCode]);

  return null;
}
