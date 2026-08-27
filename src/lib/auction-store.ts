import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { AuctionPlayer, Player, PlayerRole, Currency, PlayerStatus, Team, AuctionSettings, AuctionSnapshot } from './types';
import { v4 as uuidv4 } from 'uuid';

const AUCTION_ID = 'main-auction';
const STORAGE_KEY = 'football-auction-data';
const HISTORY_STORAGE_KEY = 'football-auction-history';

interface AuctionState {
  // Core data
  auctionPlayers: AuctionPlayer[];
  teams: Team[];
  settings: AuctionSettings;
  history: AuctionSnapshot[];

  // UI state
  isDrawing: boolean;
  drawnPlayer: AuctionPlayer | null;
  drawPhase: 'idle' | 'cycling' | 'revealing' | 'complete';

  // Actions
  addPlayer: (player: Player, role: PlayerRole, basePrice: number, currency: Currency) => void;
  removePlayer: (auctionPlayerId: string) => void;
  removeMultiplePlayers: (auctionPlayerIds: string[]) => void;
  updatePlayer: (auctionPlayerId: string, updates: Partial<Pick<AuctionPlayer, 'role' | 'basePrice' | 'currency' | 'teamId' | 'soldPrice'>>) => void;
  updatePlayerSoldPrice: (auctionPlayerId: string, soldPrice: number) => void;
  setAuctionPlayers: (players: AuctionPlayer[]) => void;

  // Team actions
  addTeam: (name: string, owner: string) => Team;
  removeTeam: (teamId: string) => void;
  updateTeam: (teamId: string, updates: Partial<Pick<Team, 'name' | 'owner'>>) => void;
  updateTeamBudget: (teamId: string, updates: { customMaxBudget?: number; customBudgetSpent?: number }) => void;
  resetTeamBudget: (teamId: string) => void;
  addTeamExpense: (teamId: string, title: string, amount: number) => void;
  removeTeamExpense: (teamId: string, expenseId: string) => void;
  updateTeamExpense: (teamId: string, expenseId: string, title: string, amount: number) => void;
  getTeams: () => Team[];

  // Settings actions
  updateSettings: (settings: Partial<AuctionSettings>) => void;

  // Sale actions
  confirmSale: (auctionPlayerId: string, teamId: string, soldPrice: number) => void;
  assignMysteryPlayer: (params: {
    mysteryId: string;
    maskedName: string;
    role: PlayerRole;
    position: string;
    nationality: string;
    teamId: string;
    soldPrice: number;
    currency: Currency;
  }) => void;
  updateMysteryPlayerName: (mysteryId: string, name: string) => void;
  removeMysteryPlayers: (mysteryIds: string[]) => void;
  transferPlayer: (auctionPlayerId: string, targetTeamId: string, newSoldPrice: number) => void;
  returnPlayerToPool: (auctionPlayerId: string) => void;
  markPlayerUnsold: (auctionPlayerId: string) => void;
  reAddUnsoldToPool: (auctionPlayerId: string) => void;
  reAddAllUnsoldToPool: () => void;

  // Draw actions
  startDraw: () => void;
  completeDraw: (drawnPlayer: AuctionPlayer) => void;
  resetDraw: () => void;
  setDrawPhase: (phase: AuctionState['drawPhase']) => void;

  // History actions
  completeAuction: () => void;
  getHistory: () => AuctionSnapshot[];
  getAuctionSnapshot: (snapshotId: string) => AuctionSnapshot | undefined;
  removeHistoryItem: (snapshotId: string) => void;
  clearHistory: () => void;

  // Computed
  getAvailablePlayers: () => AuctionPlayer[];
  getDrawnPlayers: () => AuctionPlayer[];
  getUnsoldPlayers: () => AuctionPlayer[];
  getPlayersByRole: (role: PlayerRole) => AuctionPlayer[];
  getTotalPlayers: () => number;
  getAvailableCount: () => number;
  getDrawnCount: () => number;
  getUnsoldCount: () => number;

  // Team computed
  getTeamPlayers: (teamId: string) => AuctionPlayer[];
  getTeamBudgetLeft: (teamId: string) => number;
  getTeamPlayersCount: (teamId: string) => number;
  getPointsTableData: () => Array<{
    team: Team;
    budgetLeft: number;
    budgetSpent: number;
    playersAcquired: number;
  }>;
  getTeamBudgets: () => Array<{
    teamId: string;
    budgetLeft: number;
  }>;
}

const DEFAULT_SETTINGS: AuctionSettings = {
  currency: 'INR',
  maxTeamBudget: 20000000, // ₹2,00,00,000
};

function createAuctionPlayer(
  player: Player,
  role: PlayerRole,
  basePrice: number,
  currency: Currency
): AuctionPlayer {
  return {
    id: uuidv4(),
    auctionId: AUCTION_ID,
    playerId: player.id,
    player,
    role,
    basePrice,
    currency,
    status: 'AVAILABLE',
    drawnAt: null,
    createdAt: new Date().toISOString(),
    teamId: null,
    soldPrice: null,
    soldAt: null,
  };
}

export const useAuctionStore = create<AuctionState>()(
  persist(
    (set, get) => ({
      auctionPlayers: [],
      teams: [],
      settings: DEFAULT_SETTINGS,
      history: [],
      isDrawing: false,
      drawnPlayer: null,
      drawPhase: 'idle',

      addPlayer: (player, role, basePrice, currency) => {
        const existing = get().auctionPlayers.find(ap => ap.playerId === player.id);
        if (existing) return; // Already in auction

        const auctionPlayer = createAuctionPlayer(player, role, basePrice, currency);
        set(state => ({
          auctionPlayers: [...state.auctionPlayers, auctionPlayer],
        }));
      },

      removePlayer: (auctionPlayerId) => {
        set(state => ({
          auctionPlayers: state.auctionPlayers.filter(ap => ap.id !== auctionPlayerId),
        }));
      },

      removeMultiplePlayers: (auctionPlayerIds) => {
        const idSet = new Set(auctionPlayerIds);
        set(state => ({
          auctionPlayers: state.auctionPlayers.filter(ap => !idSet.has(ap.id)),
        }));
      },

      updatePlayer: (auctionPlayerId, updates) => {
        set(state => ({
          auctionPlayers: state.auctionPlayers.map(ap =>
            ap.id === auctionPlayerId ? { ...ap, ...updates } : ap
          ),
        }));
      },

      updatePlayerSoldPrice: (auctionPlayerId, soldPrice) => {
        set(state => ({
          auctionPlayers: state.auctionPlayers.map(ap =>
            ap.id === auctionPlayerId ? { ...ap, soldPrice } : ap
          ),
        }));
      },

      setAuctionPlayers: (players) => {
        set({ auctionPlayers: players });
      },

      startDraw: () => {
        set({
          isDrawing: true,
          drawPhase: 'cycling',
          drawnPlayer: null,
        });
      },

      completeDraw: (drawnPlayer) => {
        set(state => ({
          auctionPlayers: state.auctionPlayers.map(ap =>
            ap.id === drawnPlayer.id
              ? { ...ap, status: 'DRAWN' as PlayerStatus, drawnAt: new Date().toISOString() }
              : ap
          ),
          isDrawing: false,
          drawPhase: 'complete',
          drawnPlayer,
        }));
      },

      resetDraw: () => {
        set({
          isDrawing: false,
          drawnPlayer: null,
          drawPhase: 'idle',
        });
      },

      setDrawPhase: (phase) => {
        set({ drawPhase: phase });
      },

      // Team actions
      addTeam: (name, owner) => {
        const newTeam: Team = {
          id: uuidv4(),
          name,
          owner,
          createdAt: new Date().toISOString(),
          otherExpenses: [],
        };
        set(state => ({
          teams: [...state.teams, newTeam],
        }));
        return newTeam;
      },

      removeTeam: (teamId) => {
        set(state => ({
          teams: state.teams.filter(t => t.id !== teamId),
          auctionPlayers: state.auctionPlayers.map(ap =>
            ap.teamId === teamId ? { ...ap, teamId: null } : ap
          ),
        }));
      },

      updateTeam: (teamId, updates) => {
        set(state => ({
          teams: state.teams.map(t =>
            t.id === teamId ? { ...t, ...updates } : t
          ),
        }));
      },

      updateTeamBudget: (teamId, updates) => {
        set(state => ({
          teams: state.teams.map(t =>
            t.id === teamId ? { ...t, ...updates } : t
          ),
        }));
      },

      resetTeamBudget: (teamId) => {
        set(state => ({
          teams: state.teams.map(t =>
            t.id === teamId ? { ...t, customMaxBudget: undefined, customBudgetSpent: undefined } : t
          ),
        }));
      },

      addTeamExpense: (teamId, title, amount) => {
        const expense = {
          id: uuidv4(),
          title,
          amount,
          createdAt: new Date().toISOString(),
        };
        set(state => ({
          teams: state.teams.map(t =>
            t.id === teamId
              ? { ...t, otherExpenses: [...(t.otherExpenses || []), expense] }
              : t
          ),
        }));
      },

      removeTeamExpense: (teamId, expenseId) => {
        set(state => ({
          teams: state.teams.map(t =>
            t.id === teamId
              ? { ...t, otherExpenses: (t.otherExpenses || []).filter(e => e.id !== expenseId) }
              : t
          ),
        }));
      },

      updateTeamExpense: (teamId, expenseId, title, amount) => {
        set(state => ({
          teams: state.teams.map(t =>
            t.id === teamId
              ? {
                  ...t,
                  otherExpenses: (t.otherExpenses || []).map(e =>
                    e.id === expenseId ? { ...e, title, amount } : e
                  ),
                }
              : t
          ),
        }));
      },

      getTeams: () => {
        return get().teams;
      },

      // Settings actions
      updateSettings: (settings) => {
        set(state => ({
          settings: { ...state.settings, ...settings },
        }));
      },

      // Computed selectors
      getAvailablePlayers: () => {
        return get().auctionPlayers.filter(ap => ap.status === 'AVAILABLE');
      },

      getDrawnPlayers: () => {
        return get().auctionPlayers.filter(ap => ap.status === 'DRAWN');
      },

      getUnsoldPlayers: () => {
        return get().auctionPlayers.filter(ap => ap.status === 'UNSOLD');
      },

      getPlayersByRole: (role) => {
        return get().auctionPlayers.filter(ap => ap.role === role);
      },

      getTotalPlayers: () => {
        return get().auctionPlayers.length;
      },

      getAvailableCount: () => {
        return get().auctionPlayers.filter(ap => ap.status === 'AVAILABLE').length;
      },

      getDrawnCount: () => {
        return get().auctionPlayers.filter(ap => ap.status === 'DRAWN').length;
      },

      getUnsoldCount: () => {
        return get().auctionPlayers.filter(ap => ap.status === 'UNSOLD').length;
      },

      // Team computed
      getTeamPlayers: (teamId) => {
        return get().auctionPlayers.filter(ap => ap.teamId === teamId);
      },

      getTeamBudgetLeft: (teamId) => {
        const { settings, auctionPlayers, teams } = get();
        const team = teams.find(t => t.id === teamId);
        const maxBudget = team?.customMaxBudget ?? settings.maxTeamBudget;
        const teamPlayers = auctionPlayers.filter(ap => ap.teamId === teamId && ap.soldPrice !== null);
        const playersTotalSpent = teamPlayers.reduce((sum, ap) => sum + (ap.soldPrice ?? ap.basePrice), 0);
        const otherExpensesTotal = (team?.otherExpenses || []).reduce((sum, exp) => sum + exp.amount, 0);
        return maxBudget - (playersTotalSpent + otherExpensesTotal);
      },

      getTeamPlayersCount: (teamId) => {
        return get().auctionPlayers.filter(ap => ap.teamId === teamId && ap.soldPrice !== null).length;
      },

      getPointsTableData: () => {
        const { teams, settings, auctionPlayers } = get();
        return teams.map(team => {
          const teamPlayers = auctionPlayers.filter(ap => ap.teamId === team.id && ap.soldPrice !== null);
          const playersTotalSpent = teamPlayers.reduce((sum, ap) => sum + (ap.soldPrice ?? ap.basePrice), 0);
          const otherExpensesTotal = (team.otherExpenses || []).reduce((sum, exp) => sum + exp.amount, 0);
          const totalSpent = playersTotalSpent + otherExpensesTotal;
          const maxBudget = team.customMaxBudget ?? settings.maxTeamBudget;
          return {
            team,
            budgetLeft: maxBudget - totalSpent,
            budgetSpent: totalSpent,
            playersAcquired: teamPlayers.length,
          };
        });
      },

      getTeamBudgets: () => {
        const { teams, settings, auctionPlayers } = get();
        return teams.map(team => {
          const teamPlayers = auctionPlayers.filter(ap => ap.teamId === team.id && ap.soldPrice !== null);
          const playersTotalSpent = teamPlayers.reduce((sum, ap) => sum + (ap.soldPrice ?? ap.basePrice), 0);
          const otherExpensesTotal = (team.otherExpenses || []).reduce((sum, exp) => sum + exp.amount, 0);
          const totalSpent = playersTotalSpent + otherExpensesTotal;
          const maxBudget = team.customMaxBudget ?? settings.maxTeamBudget;
          return {
            teamId: team.id,
            budgetLeft: maxBudget - totalSpent,
          };
        });
      },

      // Sale actions
      confirmSale: (auctionPlayerId: string, teamId: string, soldPrice: number) => {
        set(state => ({
          auctionPlayers: state.auctionPlayers.map(ap =>
            ap.id === auctionPlayerId
              ? { ...ap, teamId, soldPrice, soldAt: new Date().toISOString(), status: 'DRAWN' as PlayerStatus }
              : ap
          ),
        }));
      },

      assignMysteryPlayer: (params) => {
        const existingIdx = get().auctionPlayers.findIndex(
          ap => ap.playerId === params.mysteryId || ap.id === `auction-${params.mysteryId}`
        );

        if (existingIdx >= 0) {
          set(state => ({
            auctionPlayers: state.auctionPlayers.map((ap, i) =>
              i === existingIdx
                ? {
                    ...ap,
                    teamId: params.teamId,
                    soldPrice: params.soldPrice,
                    soldAt: new Date().toISOString(),
                    status: 'DRAWN' as PlayerStatus,
                  }
                : ap
            ),
          }));
        } else {
          const newAuctionPlayer: AuctionPlayer = {
            id: `auction-${params.mysteryId}`,
            auctionId: AUCTION_ID,
            playerId: params.mysteryId,
            player: {
              id: params.mysteryId,
              name: params.maskedName,
              firstName: params.maskedName,
              lastName: '',
              nationality: params.nationality,
              nationalityCode: '',
              position: (params.position || 'ST') as any,
              role: params.role,
              dateOfBirth: '',
              photo: '',
              team: 'Classified',
              league: 'Classified',
              category: 'CURRENT',
            },
            role: params.role,
            basePrice: params.soldPrice,
            currency: params.currency,
            status: 'DRAWN' as PlayerStatus,
            drawnAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            teamId: params.teamId,
            soldPrice: params.soldPrice,
            soldAt: new Date().toISOString(),
            isMystery: true,
          };

          set(state => ({
            auctionPlayers: [...state.auctionPlayers, newAuctionPlayer],
          }));
        }
      },

      updateMysteryPlayerName: (mysteryId, name) => {
        set(state => ({
          auctionPlayers: state.auctionPlayers.map(ap =>
            ap.playerId === mysteryId || ap.id === `auction-${mysteryId}`
              ? {
                  ...ap,
                  player: { ...ap.player, name, firstName: name },
                }
              : ap
          ),
        }));
      },

      removeMysteryPlayers: (mysteryIds) => {
        const idSet = new Set(mysteryIds.map(id => `auction-${id}`));
        const rawSet = new Set(mysteryIds);
        set(state => ({
          auctionPlayers: state.auctionPlayers.filter(
            ap => !idSet.has(ap.id) && !rawSet.has(ap.playerId)
          ),
        }));
      },

      transferPlayer: (auctionPlayerId: string, targetTeamId: string, newSoldPrice: number) => {
        set(state => ({
          auctionPlayers: state.auctionPlayers.map(ap =>
            ap.id === auctionPlayerId
              ? {
                  ...ap,
                  teamId: targetTeamId,
                  soldPrice: newSoldPrice,
                  soldAt: new Date().toISOString(),
                  status: 'DRAWN' as PlayerStatus,
                }
              : ap
          ),
        }));
      },

      returnPlayerToPool: (auctionPlayerId: string) => {
        set(state => ({
          auctionPlayers: state.auctionPlayers.map(ap =>
            ap.id === auctionPlayerId
              ? {
                  ...ap,
                  teamId: null,
                  soldPrice: null,
                  soldAt: null,
                  drawnAt: null,
                  status: 'AVAILABLE' as PlayerStatus,
                }
              : ap
          ),
        }));
      },

      markPlayerUnsold: (auctionPlayerId: string) => {
        set(state => ({
          auctionPlayers: state.auctionPlayers.map(ap =>
            ap.id === auctionPlayerId
              ? {
                  ...ap,
                  teamId: null,
                  soldPrice: null,
                  soldAt: null,
                  status: 'UNSOLD' as PlayerStatus,
                }
              : ap
          ),
          drawnPlayer: null,
          isDrawing: false,
          drawPhase: 'idle',
        }));
      },

      reAddUnsoldToPool: (auctionPlayerId: string) => {
        set(state => ({
          auctionPlayers: state.auctionPlayers.map(ap =>
            ap.id === auctionPlayerId
              ? {
                  ...ap,
                  teamId: null,
                  soldPrice: null,
                  soldAt: null,
                  drawnAt: null,
                  status: 'AVAILABLE' as PlayerStatus,
                }
              : ap
          ),
        }));
      },

      reAddAllUnsoldToPool: () => {
        set(state => ({
          auctionPlayers: state.auctionPlayers.map(ap =>
            ap.status === 'UNSOLD'
              ? {
                  ...ap,
                  teamId: null,
                  soldPrice: null,
                  soldAt: null,
                  drawnAt: null,
                  status: 'AVAILABLE' as PlayerStatus,
                }
              : ap
          ),
        }));
      },

      // History actions
      completeAuction: () => {
        set(state => {
          const { auctionPlayers, teams, settings } = state;

          // Create snapshot of current auction state
          const participants = teams.map(team => {
            const teamPlayers = auctionPlayers.filter(ap => ap.teamId === team.id && ap.soldPrice !== null);
            const playersTotalSpent = teamPlayers.reduce((sum, ap) => sum + (ap.soldPrice ?? ap.basePrice), 0);
            const otherExpensesTotal = (team.otherExpenses || []).reduce((sum, exp) => sum + exp.amount, 0);
            const totalSpent = team.customBudgetSpent !== undefined ? team.customBudgetSpent : (playersTotalSpent + otherExpensesTotal);
            const maxBudget = team.customMaxBudget ?? settings.maxTeamBudget;
            return {
              id: team.id,
              name: team.name,
              owner: team.owner,
              budgetLeft: maxBudget - totalSpent,
              budgetSpent: totalSpent,
              playersAcquired: teamPlayers.length,
              otherExpenses: team.otherExpenses || [],
              players: teamPlayers.map(ap => ({
                playerId: ap.playerId,
                playerName: ap.player.name,
                role: ap.role,
                basePrice: ap.basePrice,
                soldPrice: ap.soldPrice ?? ap.basePrice,
                currency: ap.currency,
              })),
            };
          });

          const totalPlayers = auctionPlayers.filter(ap => ap.soldPrice !== null).length;
          const totalParticipants = teams.length;

          const snapshot: AuctionSnapshot = {
            id: uuidv4(),
            auctionId: AUCTION_ID,
            name: `Auction #${(state.history.length + 1).toString().padStart(2, '0')}`,
            completedAt: new Date().toISOString(),
            settings: { ...settings },
            participants,
            totalPlayers,
            totalParticipants,
          };

          return {
            history: [...state.history, snapshot],
            // Reset current auction state
            auctionPlayers: [],
            teams: [],
            isDrawing: false,
            drawnPlayer: null,
            drawPhase: 'idle' as const,
          };
        });
      },

      getHistory: () => {
        return get().history;
      },

      getAuctionSnapshot: (snapshotId: string) => {
        return get().history.find(s => s.id === snapshotId);
      },

      removeHistoryItem: (snapshotId: string) => {
        set(state => ({
          history: state.history.filter(s => s.id !== snapshotId)
        }));
      },

      clearHistory: () => {
        set({ history: [] });
      },
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        auctionPlayers: state.auctionPlayers,
        teams: state.teams,
        settings: state.settings,
        history: state.history,
      }),
    }
  )
);

// Type for v4 import
declare module 'uuid' {
  export function v4(): string;
}