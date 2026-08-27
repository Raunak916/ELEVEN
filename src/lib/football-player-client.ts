'use client';

import { Player } from './player-db-types';

export interface SearchOptions {
  query: string;
  limit?: number;
  category?: string[];
  role?: string[];
  nationalityCode?: string[];
}

export interface SearchResult {
  players: Player[];
  total: number;
  query: string;
  tookMs: number;
}

/**
 * Client-side player search - calls the API route
 */
export async function searchPlayers(options: SearchOptions): Promise<SearchResult> {
  const params = new URLSearchParams();
  params.set('q', options.query);
  if (options.limit) params.set('limit', String(options.limit));
  if (options.category?.length) params.set('category', options.category.join(','));
  if (options.role?.length) params.set('role', options.role.join(','));
  if (options.nationalityCode?.length) params.set('nationality', options.nationalityCode.join(','));

  const start = Date.now();
  const res = await fetch(`/api/players/search?${params.toString()}`);
  const data = await res.json();
  return { ...data, tookMs: Date.now() - start };
}

/**
 * Client-side get player by ID
 */
export async function getPlayerById(id: string): Promise<Player | null> {
  try {
    const res = await fetch(`/api/players/${encodeURIComponent(id)}`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}