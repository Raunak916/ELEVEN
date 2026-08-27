import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Player, PlayerRole, Currency, PlayerPosition, PlayerCategory } from './types';

export interface MysteryPlayer {
  id: string;
  player: Player;
  role: PlayerRole;
  basePrice: number;
  currency: Currency;
  isRevealed: boolean;
  isLocked?: boolean;
  assignedTeamId?: string | null;
  assignedTeamName?: string | null;
  soldPrice?: number | null;
  createdAt: string;
}

export interface MysteryPot {
  id: string;
  title: string;
  subtitle: string;
  tabGradient: string;
  players: MysteryPlayer[];
}

const DEFAULT_POT_GRADIENTS = [
  'from-[#0047FF] to-[#1A5CFF]',
  'from-[#002D9C] to-[#0A47CD]',
  'from-[#005B52] to-[#00897B]',
  'from-[#6B21A8] to-[#9333EA]',
  'from-[#C2410C] to-[#EA580C]',
  'from-[#B91C1C] to-[#E11D48]',
];

interface MysteryPotState {
  pots: MysteryPot[];
  activePotId: string | null;
  selectedPlayerId: string | null;

  // Pot actions
  addPot: (title?: string, subtitle?: string) => string;
  removePot: (potId: string) => void;
  setActivePotId: (potId: string) => void;
  setSelectedPlayerId: (playerId: string | null) => void;

  // Player actions
  addPlayerToPot: (
    potId: string,
    player: Player,
    role: PlayerRole,
    basePrice: number,
    currency?: Currency
  ) => void;
  updatePlayerInPot: (
    potId: string,
    playerId: string,
    updates: {
      name?: string;
      nationality?: string;
      nationalityCode?: string;
      position?: PlayerPosition;
      role?: PlayerRole;
      team?: string;
      league?: string;
      basePrice?: number;
      currency?: Currency;
    }
  ) => void;
  assignPlayerToTeam: (
    potId: string,
    playerId: string,
    teamId: string,
    teamName: string,
    soldPrice: number
  ) => void;
  unassignPlayerFromTeam: (potId: string, playerId: string) => void;
  removePlayerFromPot: (potId: string, playerId: string) => void;
  toggleRevealPlayer: (potId: string, playerId: string) => void;
  toggleLockPlayer: (potId: string, playerId: string) => void;
  resetPotAssignments: (potId: string) => void;
  setPlayerRevealed: (potId: string, playerId: string, isRevealed: boolean) => void;
  revealAllInPot: (potId: string) => void;
  hideAllInPot: (potId: string) => void;
}

export const useMysteryPotStore = create<MysteryPotState>()(
  persist(
    (set, get) => ({
      pots: [
        {
          id: 'pot-1',
          title: 'POT 1',
          subtitle: 'FIRST MYSTERY SEED',
          tabGradient: DEFAULT_POT_GRADIENTS[0],
          players: [],
        },
      ],
      activePotId: 'pot-1',
      selectedPlayerId: null,

      addPot: (title, subtitle) => {
        const { pots } = get();
        const nextNum = pots.length + 1;
        const newPotId = `pot-${Date.now()}`;
        const gradIdx = (nextNum - 1) % DEFAULT_POT_GRADIENTS.length;

        const newPot: MysteryPot = {
          id: newPotId,
          title: title || `POT ${nextNum}`,
          subtitle: subtitle || `MYSTERY SEED ${nextNum}`,
          tabGradient: DEFAULT_POT_GRADIENTS[gradIdx],
          players: [],
        };

        set({
          pots: [...pots, newPot],
          activePotId: newPotId,
          selectedPlayerId: null,
        });

        return newPotId;
      },

      removePot: (potId) => {
        const { pots, activePotId } = get();
        const updatedPots = pots.filter((p) => p.id !== potId);
        let nextActiveId = activePotId;
        if (activePotId === potId) {
          nextActiveId = updatedPots[0]?.id || null;
        }

        set({
          pots: updatedPots,
          activePotId: nextActiveId,
          selectedPlayerId: null,
        });
      },

      setActivePotId: (potId) => {
        set({ activePotId: potId, selectedPlayerId: null });
      },

      setSelectedPlayerId: (playerId) => set({ selectedPlayerId: playerId }),

      addPlayerToPot: (potId, player, role, basePrice, currency = 'INR') => {
        const { pots } = get();
        const newMysteryPlayer: MysteryPlayer = {
          id: `mystery-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          player,
          role,
          basePrice,
          currency,
          isRevealed: false,
          assignedTeamId: null,
          assignedTeamName: null,
          soldPrice: null,
          createdAt: new Date().toISOString(),
        };

        const updatedPots = pots.map((p) => {
          if (p.id === potId) {
            return {
              ...p,
              players: [...p.players, newMysteryPlayer],
            };
          }
          return p;
        });

        set({
          pots: updatedPots,
          selectedPlayerId: newMysteryPlayer.id,
        });
      },

      updatePlayerInPot: (potId, playerId, updates) => {
        const { pots } = get();
        const updatedPots = pots.map((p) => {
          if (p.id === potId) {
            return {
              ...p,
              players: p.players.map((mp) => {
                if (mp.id === playerId) {
                  const updatedPlayer: Player = {
                    ...mp.player,
                    name: updates.name ?? mp.player.name,
                    nationality: updates.nationality ?? mp.player.nationality,
                    nationalityCode: updates.nationalityCode ?? mp.player.nationalityCode,
                    position: updates.position ?? mp.player.position,
                    role: updates.role ?? mp.role,
                    team: updates.team ?? mp.player.team,
                    league: updates.league ?? mp.player.league,
                  };
                  return {
                    ...mp,
                    player: updatedPlayer,
                    role: updates.role ?? mp.role,
                    basePrice: updates.basePrice ?? mp.basePrice,
                    currency: updates.currency ?? mp.currency,
                  };
                }
                return mp;
              }),
            };
          }
          return p;
        });

        set({ pots: updatedPots });
      },

      assignPlayerToTeam: (potId, playerId, teamId, teamName, soldPrice) => {
        const { pots } = get();
        const updatedPots = pots.map((p) => {
          if (p.id === potId) {
            return {
              ...p,
              players: p.players.map((mp) => {
                if (mp.id === playerId) {
                  return {
                    ...mp,
                    assignedTeamId: teamId,
                    assignedTeamName: teamName,
                    soldPrice: soldPrice,
                  };
                }
                return mp;
              }),
            };
          }
          return p;
        });

        set({ pots: updatedPots });
      },

      unassignPlayerFromTeam: (potId, playerId) => {
        const { pots } = get();
        const updatedPots = pots.map((p) => {
          if (p.id === potId) {
            return {
              ...p,
              players: p.players.map((mp) => {
                if (mp.id === playerId) {
                  return {
                    ...mp,
                    assignedTeamId: null,
                    assignedTeamName: null,
                    soldPrice: null,
                  };
                }
                return mp;
              }),
            };
          }
          return p;
        });

        set({ pots: updatedPots });
      },

      removePlayerFromPot: (potId, playerId) => {
        const { pots, selectedPlayerId } = get();
        const updatedPots = pots.map((p) => {
          if (p.id === potId) {
            return {
              ...p,
              players: p.players.filter((mp) => mp.id !== playerId),
            };
          }
          return p;
        });

        const currentPot = updatedPots.find((p) => p.id === potId);
        const nextSelectedId =
          selectedPlayerId === playerId
            ? null
            : selectedPlayerId;

        set({
          pots: updatedPots,
          selectedPlayerId: nextSelectedId,
        });
      },

      toggleRevealPlayer: (potId, playerId) => {
        const { pots } = get();
        const updatedPots = pots.map((p) => {
          if (p.id === potId) {
            return {
              ...p,
              players: p.players.map((mp) =>
                mp.id === playerId ? { ...mp, isRevealed: !mp.isRevealed } : mp
              ),
            };
          }
          return p;
        });

        set({ pots: updatedPots });
      },

      toggleLockPlayer: (potId, playerId) => {
        const { pots } = get();
        const updatedPots = pots.map((p) => {
          if (p.id === potId) {
            return {
              ...p,
              players: p.players.map((mp) =>
                mp.id === playerId ? { ...mp, isLocked: !mp.isLocked } : mp
              ),
            };
          }
          return p;
        });

        set({ pots: updatedPots });
      },

      resetPotAssignments: (potId) => {
        const { pots } = get();
        const updatedPots = pots.map((p) => {
          if (p.id === potId) {
            return {
              ...p,
              players: p.players.map((mp) => ({
                ...mp,
                assignedTeamId: null,
                assignedTeamName: null,
                soldPrice: null,
                isLocked: false,
              })),
            };
          }
          return p;
        });

        set({ pots: updatedPots });
      },

      setPlayerRevealed: (potId, playerId, isRevealed) => {
        const { pots } = get();
        const updatedPots = pots.map((p) => {
          if (p.id === potId) {
            return {
              ...p,
              players: p.players.map((mp) =>
                mp.id === playerId ? { ...mp, isRevealed } : mp
              ),
            };
          }
          return p;
        });

        set({ pots: updatedPots });
      },

      revealAllInPot: (potId) => {
        const { pots } = get();
        const updatedPots = pots.map((p) => {
          if (p.id === potId) {
            return {
              ...p,
              players: p.players.map((mp) => ({ ...mp, isRevealed: true })),
            };
          }
          return p;
        });
        set({ pots: updatedPots });
      },

      hideAllInPot: (potId) => {
        const { pots } = get();
        const updatedPots = pots.map((p) => {
          if (p.id === potId) {
            return {
              ...p,
              players: p.players.map((mp) => ({ ...mp, isRevealed: false })),
            };
          }
          return p;
        });
        set({ pots: updatedPots });
      },
    }),
    {
      name: 'auction-mystery-pots-storage',
    }
  )
);
