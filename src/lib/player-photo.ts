import { CATEGORY_COLORS, PlayerCategory, PlayerPosition } from './types';

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const POSITION_SILHOUETTE: Record<PlayerPosition, string> = {
  GK: 'M50 18 a12 12 0 1 0 0.01 0 M50 30 c-8 0 -14 6 -14 14 l0 28 28 0 0 -28 c0 -8 -6 -14 -14 -14',
  CB: 'M50 20 a10 10 0 1 0 0.01 0 M50 30 l-18 12 M50 30 l18 12 M50 34 l0 26 M50 38 l-14 20 M50 38 l14 20',
  LB: 'M50 20 a10 10 0 1 0 0.01 0 M50 30 l-18 12 M50 30 l14 8 M50 34 l0 26 M50 38 l14 20',
  RB: 'M50 20 a10 10 0 1 0 0.01 0 M50 30 l18 12 M50 30 l-14 8 M50 34 l0 26 M50 38 l-14 20',
  CDM: 'M50 20 a10 10 0 1 0 0.01 0 M50 30 l-16 14 M50 30 l16 14 M50 34 l0 26 M50 40 l-12 16 M50 40 l12 16',
  CM: 'M50 20 a10 10 0 1 0 0.01 0 M50 30 l-16 14 M50 30 l16 14 M50 34 l0 26 M50 40 l-12 16 M50 40 l12 16',
  CAM: 'M50 20 a10 10 0 1 0 0.01 0 M50 28 l-16 10 M50 28 l16 10 M50 34 l0 24 M50 44 l-12 12 M50 44 l12 12',
  LM: 'M50 20 a10 10 0 1 0 0.01 0 M50 30 l-20 10 M50 30 l12 10 M50 34 l0 26 M50 40 l-10 18',
  RM: 'M50 20 a10 10 0 1 0 0.01 0 M50 30 l20 10 M50 30 l-12 10 M50 34 l0 26 M50 40 l10 18',
  LW: 'M50 20 a10 10 0 1 0 0.01 0 M50 30 l-18 12 M50 30 l14 8 M50 34 l0 24 M50 40 l-12 18',
  RW: 'M50 20 a10 10 0 1 0 0.01 0 M50 30 l18 12 M50 30 l-14 8 M50 34 l0 24 M50 40 l12 18',
  ST: 'M50 20 a10 10 0 1 0 0.01 0 M50 30 l-14 14 M50 30 l14 14 M50 34 l0 24 M50 40 l-12 18 M50 40 l12 18',
};

/**
 * Generates a deterministic premium SVG avatar data URI for a player.
 * This guarantees every player card renders a clean visual even offline,
 * and keeps the UI decoupled from any external image host.
 */
export function generatePlayerPhoto(
  name: string,
  category: PlayerCategory,
  position: PlayerPosition
): string {
  const color = CATEGORY_COLORS[category];
  const hash = hashString(name);
  const hueShift = hash % 30;
  const gradId = `g${hash}`;
  const init = initials(name);
  const path = POSITION_SILHOUETTE[position];

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 100 100">
    <defs>
      <radialGradient id="${gradId}" cx="50%" cy="35%" r="75%">
        <stop offset="0%" stop-color="oklch(0.25 0.04 ${160 + hueShift})"/>
        <stop offset="60%" stop-color="oklch(0.12 0.02 ${150 + hueShift})"/>
        <stop offset="100%" stop-color="oklch(0.06 0.01 ${150 + hueShift})"/>
      </radialGradient>
    </defs>
    <rect width="100" height="100" fill="url(#${gradId})"/>
    <circle cx="50" cy="42" r="30" fill="none" stroke="${color}" stroke-opacity="0.18" stroke-width="0.6"/>
    <circle cx="50" cy="42" r="22" fill="none" stroke="${color}" stroke-opacity="0.12" stroke-width="0.4"/>
    <g transform="translate(0, 8)">
      <path d="${path}" fill="none" stroke="oklch(0.98 0 0 / 0.14)" stroke-width="2.2" stroke-linecap="round"/>
    </g>
    <text x="50" y="86" font-family="system-ui, -apple-system, sans-serif" font-size="11" font-weight="800"
      fill="${color}" fill-opacity="0.9" text-anchor="middle" letter-spacing="0.5">${init}</text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
