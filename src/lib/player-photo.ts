import { PlayerCategory, PlayerPosition } from './types';

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

const CATEGORY_HEX: Record<PlayerCategory, string> = {
  LEGEND: '#F59E0B', // Gold Amber
  ICON: '#A855F7',   // Purple
  HERO: '#38BDF8',   // Sky Blue
  CURRENT: '#22C55E', // Emerald Green
  RETIRED: '#94A3B8', // Slate Silver
};

const POSITION_BG_COLORS: Record<PlayerPosition, [string, string]> = {
  GK: ['#0284C7', '#082F49'],
  CB: ['#059669', '#022C22'],
  LB: ['#10B981', '#064E3B'],
  RB: ['#10B981', '#064E3B'],
  CDM: ['#4F46E5', '#1E1B4B'],
  CM: ['#6366F1', '#312E81'],
  CAM: ['#8B5CF6', '#2E1065'],
  LM: ['#06B6D4', '#164E63'],
  RM: ['#06B6D4', '#164E63'],
  LW: ['#E11D48', '#4C0519'],
  RW: ['#E11D48', '#4C0519'],
  ST: ['#DC2626', '#450A0A'],
};

/**
 * Generates a deterministic universal SVG avatar data URI for a player.
 * Uses standard RGB/HEX colors compatible with all browsers and image tags.
 */
export function generatePlayerPhoto(
  name: string,
  category: PlayerCategory = 'CURRENT',
  position: PlayerPosition = 'CM'
): string {
  const accentColor = CATEGORY_HEX[category] || '#38BDF8';
  const [bg1, bg2] = POSITION_BG_COLORS[position] || ['#1E293B', '#0F172A'];
  const hash = hashString(name);
  const gradId = `g${hash}`;
  const init = initials(name);
  const path = POSITION_SILHOUETTE[position] || POSITION_SILHOUETTE.CM;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 100 100">
    <defs>
      <radialGradient id="${gradId}" cx="50%" cy="30%" r="80%">
        <stop offset="0%" stop-color="${bg1}" />
        <stop offset="100%" stop-color="${bg2}" />
      </radialGradient>
    </defs>
    <rect width="100" height="100" fill="url(#${gradId})" />
    <circle cx="50" cy="40" r="32" fill="none" stroke="${accentColor}" stroke-opacity="0.25" stroke-width="1" />
    <circle cx="50" cy="40" r="24" fill="none" stroke="${accentColor}" stroke-opacity="0.15" stroke-width="0.75" />
    <g transform="translate(0, 6)">
      <path d="${path}" fill="none" stroke="#FFFFFF" stroke-opacity="0.65" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
    </g>
    <rect x="18" y="76" width="64" height="18" rx="5" fill="#000000" fill-opacity="0.65" stroke="${accentColor}" stroke-opacity="0.4" stroke-width="0.8" />
    <text x="50" y="89" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="10" font-weight="900"
      fill="#FFFFFF" text-anchor="middle" letter-spacing="1">${init}</text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
