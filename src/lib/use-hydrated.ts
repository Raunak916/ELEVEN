'use client';

import { useEffect, useState } from 'react';

/**
 * Returns true after the component has mounted on the client.
 *
 * Intended for avoiding Zustand hydration mismatches: during SSR the persisted
 * store has its default (empty) state, so any values derived from it should be
 * suppressed until the client has rehydrated from localStorage.
 */
export function useHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setHydrated(true), 0);
    return () => clearTimeout(timer);
  }, []);

  return hydrated;
}
