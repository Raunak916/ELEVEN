export type PlayerCategory = 'LEGEND' | 'ICON' | 'HERO' | 'CURRENT' | 'RETIRED';
export type PlayerPosition = 'GK' | 'CB' | 'LB' | 'RB' | 'CDM' | 'CM' | 'CAM' | 'LM' | 'RM' | 'LW' | 'RW' | 'ST';
export type PlayerRole = 'Goalkeeper' | 'Defender' | 'Midfielder' | 'Forward';
export type PlayerStatus = 'AVAILABLE' | 'DRAWN' | 'UNSOLD';
export type Currency = 'INR' | 'USD' | 'EUR' | 'GBP';
export type PlayerSource = 'database' | 'custom';

export interface Player {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  nationality: string;
  nationalityCode: string;
  position: PlayerPosition;
  role: PlayerRole;
  dateOfBirth: string;
  photo: string;
  team: string;
  league: string;
  category: PlayerCategory;
  status?: PlayerStatus;
  source?: PlayerSource;
}

export interface TeamExpense {
  id: string;
  title: string;
  amount: number;
  createdAt: string;
}

export interface Team {
  id: string;
  name: string;
  owner: string;
  createdAt: string;
  customMaxBudget?: number;
  customBudgetSpent?: number;
  otherExpenses?: TeamExpense[];
}

export interface AuctionSettings {
  currency: Currency;
  maxTeamBudget: number;
  auctionMode?: 'VANILLA' | 'ROOM';
}

export interface AuctionSnapshot {
  id: string;
  auctionId: string;
  roomCode?: string;
  name: string;
  completedAt: string;
  settings: AuctionSettings;
  participants: Array<{
    id: string;
    name: string;
    owner: string;
    budgetLeft: number;
    budgetSpent: number;
    playersAcquired: number;
    otherExpenses?: TeamExpense[];
    players: Array<{
      playerId: string;
      playerName: string;
      role: PlayerRole;
      basePrice: number;
      soldPrice: number;
      currency: Currency;
    }>;
  }>;
  totalPlayers: number;
  totalParticipants: number;
}

export interface Auction {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  settings: AuctionSettings;
  completedAt?: string;
  isCompleted?: boolean;
}

export interface AuctionPlayer {
  id: string;
  auctionId: string;
  playerId: string;
  player: Player;
  role: PlayerRole;
  basePrice: number;
  currency: Currency;
  status: PlayerStatus;
  drawnAt: string | null;
  createdAt: string;
  teamId: string | null; // Team that acquired this player
  soldPrice: number | null; // Actual price player was sold for
  soldAt: string | null; // When the sale was confirmed
  isMystery?: boolean;
}

export interface PlayerDataProvider {
  searchPlayers(query: string): Promise<Player[]>;
  getPlayerById(id: string): Promise<Player | null>;
  getPlayersByCategory(category: PlayerCategory): Promise<Player[]>;
  getAllPlayers(): Promise<Player[]>;
}

export const POSITION_TO_ROLE: Record<PlayerPosition, PlayerRole> = {
  GK: 'Goalkeeper',
  CB: 'Defender',
  LB: 'Defender',
  RB: 'Defender',
  CDM: 'Midfielder',
  CM: 'Midfielder',
  CAM: 'Midfielder',
  LM: 'Midfielder',
  RM: 'Midfielder',
  LW: 'Forward',
  RW: 'Forward',
  ST: 'Forward',
};

export const ROLE_COLORS: Record<PlayerRole, string> = {
  Goalkeeper: 'oklch(0.65 0.2 260)',
  Defender: 'oklch(0.55 0.18 155)',
  Midfielder: 'oklch(0.75 0.15 85)',
  Forward: 'oklch(0.6 0.22 25)',
};

export const ROLE_DRAW_STYLES: Record<
  PlayerRole,
  {
    borderGradient: string;
    glowColor: string;
    pillBg: string;
    pillText: string;
    pillBorder: string;
    accentGlow: string;
  }
> = {
  Forward: {
    borderGradient: 'from-rose-500/85 via-red-500/65 to-red-800/85',
    glowColor: 'rgba(239, 68, 68, 0.45)',
    pillBg: 'bg-rose-500/20',
    pillText: 'text-rose-400',
    pillBorder: 'border-rose-500/40',
    accentGlow: 'shadow-[0_0_40px_rgba(239,68,68,0.35)]',
  },
  Midfielder: {
    borderGradient: 'from-emerald-400/85 via-green-500/65 to-emerald-800/85',
    glowColor: 'rgba(34, 197, 94, 0.45)',
    pillBg: 'bg-emerald-500/20',
    pillText: 'text-emerald-400',
    pillBorder: 'border-emerald-500/40',
    accentGlow: 'shadow-[0_0_40px_rgba(34,197,94,0.35)]',
  },
  Defender: {
    borderGradient: 'from-amber-400/85 via-yellow-500/65 to-amber-700/85',
    glowColor: 'rgba(245, 158, 11, 0.45)',
    pillBg: 'bg-amber-500/20',
    pillText: 'text-amber-400',
    pillBorder: 'border-amber-500/40',
    accentGlow: 'shadow-[0_0_40px_rgba(245,158,11,0.35)]',
  },
  Goalkeeper: {
    borderGradient: 'from-sky-400/85 via-blue-500/65 to-blue-800/85',
    glowColor: 'rgba(59, 130, 246, 0.45)',
    pillBg: 'bg-sky-500/20',
    pillText: 'text-sky-400',
    pillBorder: 'border-sky-500/40',
    accentGlow: 'shadow-[0_0_40px_rgba(59,130,246,0.35)]',
  },
};

export const CATEGORY_LABELS: Record<PlayerCategory, string> = {
  LEGEND: 'LEGEND',
  ICON: 'ICON',
  HERO: 'HERO',
  CURRENT: 'CURRENT',
  RETIRED: 'RETIRED',
};

export const CATEGORY_COLORS: Record<PlayerCategory, string> = {
  LEGEND: 'oklch(0.78 0.16 85)',
  ICON: 'oklch(0.7 0.18 280)',
  HERO: 'oklch(0.65 0.18 155)',
  CURRENT: 'oklch(0.6 0.2 160)',
  RETIRED: 'oklch(0.55 0.1 45)',
};

export const CURRENCY_SYMBOLS: Record<Currency, string> = {
  INR: '₹',
  USD: '$',
  EUR: '€',
  GBP: '£',
};

export const CURRENCY_LOCALES: Record<Currency, string> = {
  INR: 'en-IN',
  USD: 'en-US',
  EUR: 'de-DE',
  GBP: 'en-GB',
};

export function formatCurrency(amount: number, currency?: Currency | string): string {
  const safeCurrency = (currency && CURRENCY_LOCALES[currency as Currency] ? currency : 'INR') as Currency;
  const locale = CURRENCY_LOCALES[safeCurrency] || 'en-IN';
  const num = typeof amount === 'number' && !isNaN(amount) ? amount : 0;
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: safeCurrency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num).replace(/[A-Z]{3}/, '').trim();
  } catch {
    return `${safeCurrency} ${num.toLocaleString()}`;
  }
}

export function getPositionLabel(position: PlayerPosition): string {
  const labels: Record<PlayerPosition, string> = {
    GK: 'GK',
    CB: 'CB',
    LB: 'LB',
    RB: 'RB',
    CDM: 'CDM',
    CM: 'CM',
    CAM: 'CAM',
    LM: 'LM',
    RM: 'RM',
    LW: 'LW',
    RW: 'RW',
    ST: 'ST',
  };
  return labels[position];
}

export function getRoleFromPosition(position: PlayerPosition): PlayerRole {
  return POSITION_TO_ROLE[position];
}

export * from './room-types';