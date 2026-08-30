'use client';

import React from 'react';
import { useRoomStore } from '@/lib/room-store';
import { useHydrated } from '@/lib/use-hydrated';
import { ContestantPlaceholder } from './contestant-placeholder';
import { ContestantCompletedScreen } from './contestant-completed-screen';
import { RoomHostPoller } from './room-host-poller';
import { RoomContestantPoller } from './room-contestant-poller';

export function RoomModeGuard({ children }: { children: React.ReactNode }) {
  const activeSession = useRoomStore((state) => state.activeSession);
  const hydrated = useHydrated();

  // If user is currently joined as a contestant in another person's room
  if (hydrated && activeSession && activeSession.role === 'CONTESTANT' && activeSession.roomId) {
    const isCompleted = activeSession.status === 'COMPLETED';

    return (
      <>
        <RoomContestantPoller />
        {isCompleted ? (
          <ContestantCompletedScreen />
        ) : (
          <ContestantPlaceholder />
        )}
      </>
    );
  }

  return (
    <>
      <RoomHostPoller />
      {children}
    </>
  );
}
