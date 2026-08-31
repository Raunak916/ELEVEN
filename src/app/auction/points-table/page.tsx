'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AppLayout } from '@/components/layout/app-layout';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuctionStore } from '@/lib/auction-store';
import { useHydrated } from '@/lib/use-hydrated';
import { formatCurrency } from '@/lib/utils';
import {
  ChevronRight,
  Users,
  Wallet,
  Trophy,
  ArrowLeft,
  X,
  Shield,
  ArrowUpDown,
  RotateCcw,
  Building2,
  Check,
  AlertTriangle,
  Pencil,
  Plus,
  Trash2,
  Receipt,
  Coins,
  Sparkles,
  Zap,
  History,
  Clock,
  CircleDollarSign,
  Radio,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRoomStore } from '@/lib/room-store';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AuctionPlayer, TeamExpense } from '@/lib/types';
import { toast } from 'sonner';

interface BudgetEditState {
  teamId: string;
  teamName: string;
  field: 'max' | 'left' | 'spent';
  value: string;
}

interface PlayerPriceEditState {
  playerId: string;
  playerName: string;
  role: string;
  currentPrice: number;
  value: string;
}

interface ExpenseModalState {
  teamId: string;
  teamName: string;
  expenseId?: string;
  title: string;
  amount: string;
}

export default function PointsTablePage() {
  const {
    getPointsTableData,
    getTeams,
    settings,
    auctionPlayers,
    transferPlayer,
    returnPlayerToPool,
    updatePlayerSoldPrice,
    updateTeamBudget,
    resetTeamBudget,
    addTeamExpense,
    removeTeamExpense,
    updateTeamExpense,
  } = useAuctionStore();
  const hydrated = useHydrated();
  const hostedRoom = useRoomStore((state) => state.hostedRoom);
  const createdCode = useRoomStore((state) => state.createdCode);
  const currentRoomCode = hostedRoom?.code || createdCode;

  const pointsData = hydrated ? getPointsTableData() : [];
  const teams = hydrated ? getTeams() : [];

  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState<'overview' | 'history'>('overview');

  // Transfer Modal State
  const [transferPlayerItem, setTransferPlayerItem] = useState<AuctionPlayer | null>(null);
  const [actionType, setActionType] = useState<'team' | 'pool'>('team');
  const [targetTeamId, setTargetTeamId] = useState<string>('');
  const [transferPriceInput, setTransferPriceInput] = useState<string>('');

  // Budget Edit State
  const [editingBudget, setEditingBudget] = useState<BudgetEditState | null>(null);

  // Player Price Edit State
  const [editingPlayerPrice, setEditingPlayerPrice] = useState<PlayerPriceEditState | null>(null);

  // Expense Modal State
  const [expenseModal, setExpenseModal] = useState<ExpenseModalState | null>(null);

  // Derived selected team data
  const selectedTeamEntry = pointsData.find((p) => p.team.id === selectedTeamId);
  const selectedTeam = selectedTeamEntry ? selectedTeamEntry.team : null;
  const selectedTeamPlayers = selectedTeamId
    ? auctionPlayers.filter((ap) => ap.teamId === selectedTeamId && ap.soldPrice !== null)
    : [];
  const selectedTeamBudgetSpent = selectedTeamEntry ? selectedTeamEntry.budgetSpent : 0;
  const selectedTeamBudgetLeft = selectedTeamEntry ? selectedTeamEntry.budgetLeft : 0;
  const selectedTeamMaxBudget = selectedTeam?.customMaxBudget ?? settings.maxTeamBudget;
  const selectedTeamExpenses: TeamExpense[] = selectedTeam?.otherExpenses || [];

  const selectedTeamPlayersSpent = selectedTeamPlayers.reduce(
    (sum, ap) => sum + (ap.soldPrice ?? ap.basePrice),
    0
  );
  const selectedTeamExpensesTotal = selectedTeamExpenses.reduce(
    (sum, exp) => sum + exp.amount,
    0
  );

  // Combined Financial History Timeline for the Selected Team
  const financialHistory = React.useMemo(() => {
    if (!selectedTeam) return [];

    type HistoryItem = {
      id: string;
      title: string;
      subtitle: string;
      category: 'player' | 'expense' | 'cap';
      amount: number;
      date: string;
    };

    const items: HistoryItem[] = [];

    // 1. Squad Player Signings
    selectedTeamPlayers.forEach((p) => {
      items.push({
        id: `player-${p.id}`,
        title: `Signed ${p.player.name}`,
        subtitle: `${p.role} acquisition`,
        category: 'player',
        amount: p.soldPrice ?? p.basePrice,
        date: p.soldAt || p.drawnAt || p.createdAt,
      });
    });

    // 2. Other Expenses
    selectedTeamExpenses.forEach((exp) => {
      items.push({
        id: `expense-${exp.id}`,
        title: exp.title,
        subtitle: 'Expense / Contestant Payout',
        category: 'expense',
        amount: exp.amount,
        date: exp.createdAt,
      });
    });

    // 3. Custom Cap entry (if custom max budget set)
    if (selectedTeam.customMaxBudget) {
      items.push({
        id: `cap-${selectedTeam.id}`,
        title: `Max Budget Cap Adjusted`,
        subtitle: `Total Purse Limit set to ${formatCurrency(selectedTeam.customMaxBudget, settings.currency)}`,
        category: 'cap',
        amount: selectedTeam.customMaxBudget,
        date: selectedTeam.createdAt,
      });
    }

    // Sort newest first
    return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [selectedTeam, selectedTeamPlayers, selectedTeamExpenses, settings.currency]);

  const handleTeamClick = (teamId: string) => {
    setSelectedTeamId(teamId);
    setDrawerTab('overview');
    setDrawerOpen(true);
  };

  const handleDrawerClose = () => {
    setDrawerOpen(false);
    setSelectedTeamId(null);
  };

  // Open transfer modal for a player
  const handleOpenTransferModal = (player: AuctionPlayer) => {
    setTransferPlayerItem(player);
    setActionType('team');
    const otherTeams = teams.filter((t) => t.id !== selectedTeamId);
    setTargetTeamId(otherTeams.length > 0 ? otherTeams[0].id : '');
    setTransferPriceInput(String(player.soldPrice ?? player.basePrice));
  };

  // Submit transfer or return to pool
  const handleConfirmAction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferPlayerItem) return;

    if (actionType === 'team') {
      if (!targetTeamId) return;
      const priceNum = parseFloat(transferPriceInput);
      const finalPrice = isNaN(priceNum)
        ? transferPlayerItem.soldPrice ?? transferPlayerItem.basePrice
        : priceNum;
      transferPlayer(transferPlayerItem.id, targetTeamId, finalPrice);
      toast.success(`Transferred to new club`);
    } else {
      returnPlayerToPool(transferPlayerItem.id);
      toast.success(`Returned ${transferPlayerItem.player.name} to auction pool`);
    }

    setTransferPlayerItem(null);
  };

  // Open budget edit dialog
  const handleOpenBudgetEdit = (
    teamId: string,
    teamName: string,
    field: 'max' | 'left' | 'spent',
    currentValue: number
  ) => {
    setEditingBudget({
      teamId,
      teamName,
      field,
      value: String(currentValue),
    });
  };

  // Save budget changes
  const handleSaveBudget = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBudget) return;
    const num = parseFloat(editingBudget.value);
    if (isNaN(num) || num < 0) {
      toast.error('Please enter a valid non-negative amount');
      return;
    }

    const team = teams.find((t) => t.id === editingBudget.teamId);
    if (!team) return;

    const teamPlayers = auctionPlayers.filter(
      (ap) => ap.teamId === editingBudget.teamId && ap.soldPrice !== null
    );
    const playersTotalSpent = teamPlayers.reduce(
      (sum, ap) => sum + (ap.soldPrice ?? ap.basePrice),
      0
    );
    const expensesTotal = (team.otherExpenses || []).reduce((sum, exp) => sum + exp.amount, 0);
    const calculatedSpent = playersTotalSpent + expensesTotal;

    if (editingBudget.field === 'max') {
      updateTeamBudget(editingBudget.teamId, { customMaxBudget: num, customBudgetSpent: undefined });
      toast.success(`${team.name} Max Budget (Purse Cap) updated to ${formatCurrency(num, settings.currency)}`);
    } else if (editingBudget.field === 'left') {
      const newMaxBudget = num + calculatedSpent;
      updateTeamBudget(editingBudget.teamId, { customMaxBudget: newMaxBudget, customBudgetSpent: undefined });
      toast.success(`${team.name} Budget Left updated to ${formatCurrency(num, settings.currency)}`);
    } else {
      const diff = num - calculatedSpent;
      if (diff !== 0) {
        addTeamExpense(editingBudget.teamId, 'Manual Spend Adjustment', diff > 0 ? diff : 0);
      }
      updateTeamBudget(editingBudget.teamId, { customBudgetSpent: undefined });
      toast.success(`${team.name} Budget Spent updated to ${formatCurrency(num, settings.currency)}`);
    }

    setEditingBudget(null);
  };

  const handleResetBudget = () => {
    if (!editingBudget) return;
    resetTeamBudget(editingBudget.teamId);
    toast.success(`${editingBudget.teamName} budget restored to automatic roster calculations`);
    setEditingBudget(null);
  };

  // Open edit player price
  const handleOpenEditPlayerPrice = (player: AuctionPlayer) => {
    setEditingPlayerPrice({
      playerId: player.id,
      playerName: player.player.name,
      role: player.role,
      currentPrice: player.soldPrice ?? player.basePrice,
      value: String(player.soldPrice ?? player.basePrice),
    });
  };

  // Save player price change
  const handleSavePlayerPrice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlayerPrice) return;
    const num = parseFloat(editingPlayerPrice.value);
    if (isNaN(num) || num < 0) {
      toast.error('Please enter a valid non-negative acquisition price');
      return;
    }

    updatePlayerSoldPrice(editingPlayerPrice.playerId, num);
    toast.success(`Updated ${editingPlayerPrice.playerName} acquisition price to ${formatCurrency(num, settings.currency)}`);
    setEditingPlayerPrice(null);
  };

  // Open add expense
  const handleOpenAddExpense = (teamId: string, teamName: string) => {
    setExpenseModal({
      teamId,
      teamName,
      title: '',
      amount: '',
    });
  };

  // Open edit expense
  const handleOpenEditExpense = (teamId: string, teamName: string, expense: TeamExpense) => {
    setExpenseModal({
      teamId,
      teamName,
      expenseId: expense.id,
      title: expense.title,
      amount: String(expense.amount),
    });
  };

  // Save expense
  const handleSaveExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseModal) return;
    if (!expenseModal.title.trim()) {
      toast.error('Please enter a description for the expense');
      return;
    }
    const num = parseFloat(expenseModal.amount);
    if (isNaN(num) || num <= 0) {
      toast.error('Please enter a valid positive amount');
      return;
    }

    if (expenseModal.expenseId) {
      updateTeamExpense(expenseModal.teamId, expenseModal.expenseId, expenseModal.title.trim(), num);
      toast.success('Expense updated successfully');
    } else {
      addTeamExpense(expenseModal.teamId, expenseModal.title.trim(), num);
      toast.success(`Expense added: ${expenseModal.title.trim()}`);
    }
    setExpenseModal(null);
  };

  // Delete expense
  const handleDeleteExpense = (teamId: string, expenseId: string, title: string) => {
    removeTeamExpense(teamId, expenseId);
    toast.success(`Removed expense "${title}"`);
  };

  const otherTeamsList = teams.filter((t) => t.id !== selectedTeamId);

  return (
    <>
      {/* Background Image - Full viewport */}
      <div
        className="fixed inset-0 -z-40 pointer-events-none"
        aria-hidden="true"
        style={{
          backgroundImage: 'url(/backgrounds/for-settings/ucl-2.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          backgroundAttachment: 'fixed',
        }}
      />

      <AppLayout>
        <div className="space-y-8 relative z-10 max-w-[1600px] mx-auto pb-12">
          <PageHeader
            lines={['TEAM TABLE']}
            description="Team standings, budget allocation, power card caps, and squad overview"
          />

          {/* Team Table */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          >
            <Card className="glass overflow-hidden border-sidebar-border shadow-2xl">
              <CardHeader className="border-b border-border/40 py-5 px-6 sm:px-8">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <CardTitle className="font-heading text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
                      <Trophy className="w-6 h-6 text-primary" />
                      Tournament Standings
                    </CardTitle>

                    {/* Room Code Badge: ONLY shown when in ROOM mode and room is actively LIVE */}
                    {settings.auctionMode === 'ROOM' && currentRoomCode && hostedRoom?.status === 'LIVE' && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-mono text-xs sm:text-sm font-black tracking-wider uppercase shadow-sm bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                        <Radio className="w-3.5 h-3.5 animate-pulse text-emerald-400" />
                        <span>ROOM: {currentRoomCode} (LIVE)</span>
                      </span>
                    )}
                  </div>

                  <span className="text-xs sm:text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                    {pointsData.length} Teams Competing
                  </span>
                </div>
              </CardHeader>

              <CardContent className="p-0">
                {pointsData.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
                    <div className="h-16 w-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4 text-primary">
                      <Users className="h-8 w-8 opacity-70" />
                    </div>
                    <h3 className="font-heading text-2xl font-bold text-foreground mb-2">
                      {settings.auctionMode === 'ROOM' ? 'Waiting for Contestants' : 'No Teams Created Yet'}
                    </h3>
                    <p className="text-base text-muted-foreground max-w-md">
                      {settings.auctionMode === 'ROOM'
                        ? `Contestants joining room "${currentRoomCode || ''}" will appear here automatically.`
                        : 'Configure your clubs in Settings to start tracking live standings and budgets.'}
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left" role="table">
                      <thead>
                        <tr className="border-b border-border/30 bg-muted/20">
                          <th
                            className="px-8 py-5 text-sm font-bold uppercase tracking-wider text-muted-foreground"
                            scope="col"
                          >
                            Team
                          </th>
                          <th
                            className="text-right px-8 py-5 text-sm font-bold uppercase tracking-wider text-muted-foreground"
                            scope="col"
                          >
                            Budget Left / Max Cap
                          </th>
                          <th
                            className="text-right px-8 py-5 text-sm font-bold uppercase tracking-wider text-muted-foreground"
                            scope="col"
                          >
                            Budget Spent
                          </th>
                          <th
                            className="text-center px-8 py-5 text-sm font-bold uppercase tracking-wider text-muted-foreground"
                            scope="col"
                          >
                            Players
                          </th>
                          <th
                            className="text-center px-8 py-5 text-sm font-bold uppercase tracking-wider text-muted-foreground"
                            scope="col"
                          >
                            Action
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/20">
                        {pointsData.map((entry, index) => (
                          <motion.tr
                            key={entry.team.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{
                              duration: 0.3,
                              delay: index * 0.04,
                              ease: [0.16, 1, 0.3, 1],
                            }}
                            className={cn(
                              'hover:bg-sidebar-accent/70 transition-colors duration-200 group cursor-pointer'
                            )}
                            onClick={() => handleTeamClick(entry.team.id)}
                          >
                            {/* Team Rank & Name */}
                            <td className="px-8 py-6">
                              <div className="flex items-center gap-4">
                                <span className="text-base sm:text-lg font-heading font-black tabular-nums w-8 text-right text-muted-foreground/70 group-hover:text-primary transition-colors">
                                  #{index + 1}
                                </span>
                                <div>
                                  <p className="text-lg sm:text-xl font-heading font-black text-foreground group-hover:text-primary transition-colors">
                                    {entry.team.name}
                                  </p>
                                  <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                                    Club ID: {entry.team.id.slice(0, 8)}
                                  </p>
                                </div>
                              </div>
                            </td>

                            {/* Budget Left with Dedicated Edit Buttons for Left & Max Budget */}
                            <td className="px-8 py-6 text-right">
                              <div className="inline-flex flex-col items-end gap-1">
                                {/* Top: Budget Left with edit pencil */}
                                <div className="flex items-center gap-2">
                                  <p className="font-heading font-bold text-lg sm:text-xl text-emerald-400 tabular-nums">
                                    {formatCurrency(entry.budgetLeft, settings.currency)}
                                  </p>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleOpenBudgetEdit(entry.team.id, entry.team.name, 'left', entry.budgetLeft);
                                    }}
                                    className="p-1 rounded-lg bg-white/5 hover:bg-emerald-500/20 text-muted-foreground hover:text-emerald-400 border border-white/10 hover:border-emerald-500/30 transition-all opacity-80 hover:opacity-100 hover:scale-105 shadow-sm shrink-0"
                                    title="Edit Budget Left"
                                    aria-label={`Edit ${entry.team.name} budget left`}
                                  >
                                    <Pencil className="w-3 h-3" />
                                  </button>
                                </div>

                                {/* Bottom: Max Budget Cap ("of _") with dedicated edit button */}
                                <div className="flex items-center gap-1.5">
                                  <p className="text-xs sm:text-sm text-muted-foreground">
                                    of{' '}
                                    <span className="font-semibold text-foreground/80">
                                      {formatCurrency(entry.team.customMaxBudget ?? settings.maxTeamBudget, settings.currency)}
                                    </span>
                                  </p>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleOpenBudgetEdit(
                                        entry.team.id,
                                        entry.team.name,
                                        'max',
                                        entry.team.customMaxBudget ?? settings.maxTeamBudget
                                      );
                                    }}
                                    className="p-1 rounded-md bg-white/5 hover:bg-primary/20 text-muted-foreground hover:text-primary border border-white/10 hover:border-primary/30 transition-all opacity-80 hover:opacity-100 hover:scale-105 shadow-sm shrink-0 flex items-center gap-1 text-[10px] font-semibold px-1.5"
                                    title="Edit Max Budget (Total Purse / Power Cards)"
                                    aria-label={`Edit ${entry.team.name} max budget`}
                                  >
                                    <Zap className="w-2.5 h-2.5 text-primary" />
                                    <span>Cap</span>
                                    <Pencil className="w-2.5 h-2.5" />
                                  </button>
                                </div>
                              </div>
                            </td>

                            {/* Budget Spent with Edit Action */}
                            <td className="px-8 py-6 text-right">
                              <div className="inline-flex items-center justify-end gap-2.5">
                                <div className="text-right">
                                  <p className="font-heading font-bold text-lg sm:text-xl text-foreground tabular-nums">
                                    {formatCurrency(entry.budgetSpent, settings.currency)}
                                  </p>
                                  <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                                    total spent
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenBudgetEdit(entry.team.id, entry.team.name, 'spent', entry.budgetSpent);
                                  }}
                                  className="p-1.5 rounded-lg bg-white/5 hover:bg-rose-500/20 text-muted-foreground hover:text-rose-400 border border-white/10 hover:border-rose-500/30 transition-all opacity-80 hover:opacity-100 hover:scale-105 shadow-sm shrink-0"
                                  title="Edit Budget Spent"
                                  aria-label={`Edit ${entry.team.name} budget spent`}
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>

                            {/* Players Acquired */}
                            <td className="px-8 py-6 text-center">
                              <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 border border-primary/25 text-primary text-base font-heading font-black shadow-sm">
                                {entry.playersAcquired}
                              </span>
                            </td>

                            {/* Action Button */}
                            <td className="px-8 py-6 text-center">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleTeamClick(entry.team.id);
                                }}
                                className={cn(
                                  'inline-flex items-center justify-center w-10 h-10 rounded-xl',
                                  'transition-all duration-200',
                                  'bg-muted/40 hover:bg-primary hover:text-primary-foreground group-hover:bg-primary group-hover:text-primary-foreground shadow-sm',
                                  'text-muted-foreground hover:scale-105'
                                )}
                                aria-label={`View ${entry.team.name} details`}
                              >
                                <ChevronRight className="h-5 w-5" aria-hidden="true" />
                              </button>
                            </td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Loading State */}
          {!hydrated && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col items-center justify-center py-20 px-6 text-center"
            >
              <div className="h-12 w-12 rounded-full border-2 border-primary border-t-transparent animate-spin mb-4" />
              <p className="text-base text-muted-foreground">Loading standings...</p>
            </motion.div>
          )}

          {/* Team Detail Drawer with Wide Comfortable Layout */}
          <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
            <DrawerContent
              side="right"
              className="w-[700px] lg:w-[780px] max-w-[95vw] p-6 sm:p-8 bg-card/85 dark:bg-card/80 backdrop-blur-2xl text-foreground border-l border-border/50 shadow-2xl"
            >
              {/* Top Navigation Tabs above Team Header */}
              <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-white/5 border border-white/10 mb-5 shadow-inner">
                <button
                  type="button"
                  onClick={() => setDrawerTab('overview')}
                  className={cn(
                    'flex-1 py-2.5 px-4 rounded-xl text-xs font-heading font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2',
                    drawerTab === 'overview'
                      ? 'bg-primary text-primary-foreground shadow-gold'
                      : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                  )}
                >
                  <Users className="w-4 h-4" />
                  <span>Overview &amp; Squad ({selectedTeamPlayers.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDrawerTab('history')}
                  className={cn(
                    'flex-1 py-2.5 px-4 rounded-xl text-xs font-heading font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2',
                    drawerTab === 'history'
                      ? 'bg-primary text-primary-foreground shadow-gold'
                      : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                  )}
                >
                  <History className="w-4 h-4" />
                  <span>Expense History ({financialHistory.length})</span>
                </button>
              </div>

              <DrawerHeader className="border-b border-border/40 pb-5 px-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3.5">
                    <div className="h-12 w-12 rounded-2xl bg-primary/15 border border-primary/25 flex items-center justify-center text-primary shadow-sm">
                      <Trophy className="h-6 w-6" aria-hidden="true" />
                    </div>
                    <div>
                      <DrawerTitle className="text-xl sm:text-2xl font-heading font-black text-foreground">
                        {selectedTeam?.name}
                      </DrawerTitle>
                      <DrawerDescription className="text-sm text-muted-foreground mt-0.5">
                        {drawerTab === 'overview'
                          ? 'Squad Roster, Standings & Other Expenses'
                          : 'Complete Chronological Expense & Transaction Ledger'}
                      </DrawerDescription>
                    </div>
                  </div>
                  <button
                    onClick={handleDrawerClose}
                    className="rounded-xl p-2 text-muted-foreground hover:bg-white/10 hover:text-foreground transition-colors"
                    aria-label="Close drawer"
                  >
                    <X className="h-5 w-5" aria-hidden="true" />
                  </button>
                </div>
              </DrawerHeader>

              {selectedTeam && (
                <div className="space-y-6 pt-5">
                  {/* Summary Stats with Quick Edit Action (Visible in both tabs) */}
                  <div className="grid grid-cols-3 gap-2.5">
                    {/* Budget Left */}
                    <div className="p-3.5 sm:p-4 bg-white/5 hover:bg-white/10 backdrop-blur-xl border border-white/10 rounded-2xl flex flex-col justify-between shadow-sm min-w-0 overflow-hidden transition-colors relative group">
                      <div className="flex items-center justify-between">
                        <p className="text-[11px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 truncate">
                          Budget Left
                        </p>
                        <button
                          type="button"
                          onClick={() => handleOpenBudgetEdit(selectedTeam.id, selectedTeam.name, 'left', selectedTeamBudgetLeft)}
                          className="p-1 rounded bg-white/5 hover:bg-emerald-500/20 text-muted-foreground hover:text-emerald-400 opacity-60 group-hover:opacity-100 transition-all"
                          title="Edit Budget Left"
                        >
                          <Pencil className="w-2.5 h-2.5" />
                        </button>
                      </div>
                      <p
                        className="font-heading text-sm sm:text-base lg:text-lg font-black text-emerald-400 tabular-nums truncate"
                        title={formatCurrency(selectedTeamBudgetLeft, settings.currency)}
                      >
                        {formatCurrency(selectedTeamBudgetLeft, settings.currency)}
                      </p>
                      <div className="flex items-center justify-between mt-1 text-[10px] text-muted-foreground">
                        <span>Max Cap:</span>
                        <button
                          type="button"
                          onClick={() => handleOpenBudgetEdit(selectedTeam.id, selectedTeam.name, 'max', selectedTeamMaxBudget)}
                          className="hover:text-primary font-semibold flex items-center gap-0.5 underline decoration-dotted"
                          title="Edit Max Purse Cap"
                        >
                          {formatCurrency(selectedTeamMaxBudget, settings.currency)}
                          <Pencil className="w-2 h-2" />
                        </button>
                      </div>
                    </div>

                    {/* Budget Spent */}
                    <div className="p-3.5 sm:p-4 bg-white/5 hover:bg-white/10 backdrop-blur-xl border border-white/10 rounded-2xl flex flex-col justify-between shadow-sm min-w-0 overflow-hidden transition-colors relative group">
                      <div className="flex items-center justify-between">
                        <p className="text-[11px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 truncate">
                          Budget Spent
                        </p>
                        <button
                          type="button"
                          onClick={() => handleOpenBudgetEdit(selectedTeam.id, selectedTeam.name, 'spent', selectedTeamBudgetSpent)}
                          className="p-1 rounded bg-white/5 hover:bg-rose-500/20 text-muted-foreground hover:text-rose-400 opacity-60 group-hover:opacity-100 transition-all"
                          title="Edit Budget Spent"
                        >
                          <Pencil className="w-2.5 h-2.5" />
                        </button>
                      </div>
                      <p
                        className="font-heading text-sm sm:text-base lg:text-lg font-black text-rose-400 tabular-nums truncate"
                        title={formatCurrency(selectedTeamBudgetSpent, settings.currency)}
                      >
                        {formatCurrency(selectedTeamBudgetSpent, settings.currency)}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        Squad + Expenses
                      </p>
                    </div>

                    {/* Squad Size */}
                    <div className="p-3.5 sm:p-4 bg-white/5 hover:bg-white/10 backdrop-blur-xl border border-white/10 rounded-2xl flex flex-col justify-between shadow-sm min-w-0 overflow-hidden transition-colors">
                      <p className="text-[11px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 truncate">
                        Squad Size
                      </p>
                      <p className="font-heading text-sm sm:text-base lg:text-lg font-black text-foreground tabular-nums">
                        {selectedTeamPlayers.length}{' '}
                        <span className="text-xs font-normal text-muted-foreground">signed</span>
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-1 truncate">
                        {selectedTeamExpenses.length} extra {selectedTeamExpenses.length === 1 ? 'expense' : 'expenses'}
                      </p>
                    </div>
                  </div>

                  {/* TAB 1: OVERVIEW & SQUAD */}
                  {drawerTab === 'overview' && (
                    <div className="space-y-6">
                      {/* Section 1: Squad Roster with Edit Player Value and Transfer Action */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="font-heading font-bold text-foreground uppercase tracking-wider text-sm flex items-center gap-2">
                            <Users className="w-4 h-4 text-primary" />
                            Squad Roster ({selectedTeamPlayers.length})
                          </h4>
                          <span className="text-xs text-muted-foreground">
                            Click <Pencil className="w-3 h-3 inline mx-0.5 text-primary" /> to edit price,{' '}
                            <ArrowUpDown className="w-3 h-3 inline mx-0.5 text-primary" /> to transfer
                          </span>
                        </div>

                        {selectedTeamPlayers.length === 0 ? (
                          <div className="text-center py-8 text-muted-foreground bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10">
                            <Users
                              className="h-9 w-9 mx-auto mb-2 opacity-40 text-primary"
                              aria-hidden="true"
                            />
                            <p className="text-sm font-semibold text-foreground">
                              No players acquired yet
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              This team has not signed any players in the auction.
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-2.5 max-h-[36vh] overflow-y-auto pr-1 scrollbar-thin">
                            {selectedTeamPlayers.map((player, i) => {
                              const isMystery = Boolean(
                                player.isMystery ||
                                player.player.name.startsWith('MYSTERY') ||
                                player.id.startsWith('auction-mystery-')
                              );
                              const soldPrice = player.soldPrice ?? player.basePrice;
                              return (
                                <div
                                  key={player.id}
                                  className={cn(
                                    'flex items-center justify-between p-3.5 backdrop-blur-xl rounded-xl border transition-colors shadow-sm gap-3',
                                    isMystery
                                      ? 'bg-gradient-to-r from-blue-950/40 via-cyan-950/25 to-black/40 border-cyan-500/35 shadow-[0_0_18px_rgba(0,180,255,0.15)] hover:border-cyan-400/50'
                                      : 'bg-white/5 hover:bg-white/10 border-white/10'
                                  )}
                                >
                                  {/* Left: Index & Player Info with Edit Name/Value Button */}
                                  <div className="flex items-center gap-3.5 min-w-0 flex-1">
                                    <span
                                      className={cn(
                                        'text-sm font-bold tabular-nums w-6 text-right shrink-0',
                                        isMystery ? 'text-cyan-400' : 'text-muted-foreground'
                                      )}
                                    >
                                      {i + 1}
                                    </span>
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        <p
                                          className={cn(
                                            'text-base font-semibold truncate',
                                            isMystery ? 'text-cyan-200 font-heading font-black tracking-wide' : 'text-foreground'
                                          )}
                                        >
                                          {player.player.name}
                                        </p>
                                        {isMystery && (
                                          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-wider bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                                            MYSTERY
                                          </span>
                                        )}
                                        {/* Edit Player Price Button beside Name */}
                                        <button
                                          type="button"
                                          onClick={() => handleOpenEditPlayerPrice(player)}
                                          className="p-1 rounded-md bg-white/5 hover:bg-primary/20 text-muted-foreground hover:text-primary transition-all shrink-0"
                                          title="Edit player acquisition price / value"
                                          aria-label={`Edit price for ${player.player.name}`}
                                        >
                                          <Pencil className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                      <div className="flex items-center gap-2 mt-0.5">
                                        <span
                                          className={cn(
                                            'text-xs uppercase font-bold tracking-wider',
                                            isMystery ? 'text-cyan-300/80 font-mono' : 'text-muted-foreground'
                                          )}
                                        >
                                          {player.role}
                                        </span>
                                        <span className="text-[11px] text-muted-foreground/60 font-mono">
                                          Base: {formatCurrency(player.basePrice, player.currency)}
                                        </span>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Right: Transfer Button + Edit Button + Sold Price */}
                                  <div className="flex items-center gap-3 shrink-0">
                                    {/* Edit Price Action Button */}
                                    <button
                                      type="button"
                                      onClick={() => handleOpenEditPlayerPrice(player)}
                                      className="p-2 rounded-xl bg-white/5 hover:bg-primary/20 text-muted-foreground hover:text-primary border border-white/10 hover:border-primary/30 transition-all duration-200 hover:scale-105 shadow-sm flex items-center justify-center"
                                      title="Edit Acquisition Value"
                                    >
                                      <Pencil className="w-4 h-4" />
                                    </button>

                                    {/* Swap / Transfer Button */}
                                    <button
                                      type="button"
                                      onClick={() => handleOpenTransferModal(player)}
                                      className="p-2 rounded-xl bg-primary/10 hover:bg-primary text-primary hover:text-primary-foreground border border-primary/25 hover:border-primary transition-all duration-200 hover:scale-105 shadow-sm flex items-center justify-center"
                                      title="Transfer player to another team or return to pool"
                                    >
                                      <ArrowUpDown className="w-4 h-4" />
                                    </button>

                                    {/* Price */}
                                    <span className="font-heading font-bold text-base sm:text-lg text-primary tabular-nums min-w-[85px] text-right">
                                      {formatCurrency(
                                        soldPrice,
                                        player.currency as 'INR' | 'USD' | 'EUR' | 'GBP'
                                      )}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Section 2: Other Expenses */}
                      <div className="space-y-3 pt-4 border-t border-white/10">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Receipt className="w-4 h-4 text-primary" />
                            <h4 className="font-heading font-bold text-foreground uppercase tracking-wider text-sm">
                              Other Expenses ({selectedTeamExpenses.length})
                            </h4>
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => handleOpenAddExpense(selectedTeam.id, selectedTeam.name)}
                            className="h-8 px-3 rounded-lg bg-primary/15 hover:bg-primary text-primary hover:text-primary-foreground border border-primary/30 font-heading font-bold text-xs gap-1.5 transition-all shadow-sm"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            Add Expense
                          </Button>
                        </div>

                        {selectedTeamExpenses.length === 0 ? (
                          <div className="text-center py-6 text-muted-foreground bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10">
                            <Receipt className="h-7 w-7 mx-auto mb-1.5 opacity-40 text-primary" />
                            <p className="text-xs font-semibold text-foreground">
                              No other expenses recorded
                            </p>
                            <p className="text-[11px] text-muted-foreground mt-0.5 max-w-xs mx-auto">
                              Add contestant payouts (e.g. gave 20M to contestant X), penalties, power cards, or trade fees.
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-2.5 max-h-[28vh] overflow-y-auto pr-1 scrollbar-thin">
                            {selectedTeamExpenses.map((exp, idx) => (
                              <div
                                key={exp.id}
                                className="flex items-center justify-between p-3.5 backdrop-blur-xl rounded-xl border bg-white/5 hover:bg-white/10 border-white/10 transition-colors shadow-sm gap-3"
                              >
                                {/* Left: Index & Description */}
                                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                                  <span className="text-sm font-bold tabular-nums w-6 text-right shrink-0 text-muted-foreground">
                                    {idx + 1}
                                  </span>
                                  <div className="min-w-0 flex-1">
                                    <p className="text-base font-semibold text-foreground truncate">
                                      {exp.title}
                                    </p>
                                    <p className="text-xs text-muted-foreground font-mono mt-0.5">
                                      Added {new Date(exp.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                  </div>
                                </div>

                                {/* Right: Actions & Amount */}
                                <div className="flex items-center gap-3 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEditExpense(selectedTeam.id, selectedTeam.name, exp)}
                                    className="p-2 rounded-xl bg-white/5 hover:bg-primary/20 text-muted-foreground hover:text-primary border border-white/10 hover:border-primary/30 transition-all duration-200 hover:scale-105 shadow-sm flex items-center justify-center"
                                    title="Edit Expense"
                                  >
                                    <Pencil className="w-4 h-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteExpense(selectedTeam.id, exp.id, exp.title)}
                                    className="p-2 rounded-xl bg-white/5 hover:bg-rose-500/20 text-muted-foreground hover:text-rose-400 border border-white/10 hover:border-rose-500/30 transition-all duration-200 hover:scale-105 shadow-sm flex items-center justify-center"
                                    title="Delete Expense"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                  <span className="font-heading font-bold text-base sm:text-lg text-primary tabular-nums min-w-[85px] text-right">
                                    {formatCurrency(exp.amount, settings.currency)}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Comprehensive Financial Breakdown Footer */}
                      <div className="pt-4 border-t border-white/10 space-y-2">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>Squad Acquisition Spend</span>
                          <span className="font-mono font-semibold text-foreground">
                            {formatCurrency(selectedTeamPlayersSpent, settings.currency)}
                          </span>
                        </div>
                        {selectedTeamExpensesTotal > 0 && (
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>Other Expenses Total</span>
                            <span className="font-mono font-semibold text-primary">
                              +{formatCurrency(selectedTeamExpensesTotal, settings.currency)}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center justify-between text-sm font-heading font-bold text-foreground pt-1 border-t border-white/5">
                          <span>Total Budget Spent</span>
                          <span className="font-heading font-black text-lg text-rose-400 tabular-nums">
                            {formatCurrency(selectedTeamBudgetSpent, settings.currency)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm font-heading font-bold text-foreground">
                          <span>Budget Left Remaining</span>
                          <span className="font-heading font-black text-xl text-emerald-400 tabular-nums">
                            {formatCurrency(selectedTeamBudgetLeft, settings.currency)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 2: FINANCIAL & EXPENSE HISTORY */}
                  {drawerTab === 'history' && (
                    <div className="space-y-5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <History className="w-4 h-4 text-primary" />
                          <h4 className="font-heading font-bold text-foreground uppercase tracking-wider text-sm">
                            Financial Ledger &amp; Transactions
                          </h4>
                        </div>
                        <span className="text-xs font-mono text-muted-foreground">
                          {financialHistory.length} total entries
                        </span>
                      </div>

                      {/* Financial Snapshot Matrix */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-2xl bg-white/5 border border-white/10">
                        <div className="p-2.5 rounded-xl bg-background/50 border border-white/5">
                          <span className="block text-[10px] font-mono uppercase text-muted-foreground">
                            Max Cap
                          </span>
                          <span className="font-heading font-black text-sm text-foreground">
                            {formatCurrency(selectedTeamMaxBudget, settings.currency)}
                          </span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-background/50 border border-white/5">
                          <span className="block text-[10px] font-mono uppercase text-muted-foreground">
                            Squad Spend
                          </span>
                          <span className="font-heading font-black text-sm text-foreground">
                            {formatCurrency(selectedTeamPlayersSpent, settings.currency)}
                          </span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-background/50 border border-white/5">
                          <span className="block text-[10px] font-mono uppercase text-muted-foreground">
                            Other Expenses
                          </span>
                          <span className="font-heading font-black text-sm text-primary">
                            {formatCurrency(selectedTeamExpensesTotal, settings.currency)}
                          </span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-background/50 border border-white/5">
                          <span className="block text-[10px] font-mono uppercase text-muted-foreground">
                            Purse Left
                          </span>
                          <span className="font-heading font-black text-sm text-emerald-400">
                            {formatCurrency(selectedTeamBudgetLeft, settings.currency)}
                          </span>
                        </div>
                      </div>

                      {financialHistory.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10">
                          <History className="h-9 w-9 mx-auto mb-2 opacity-30 text-primary" />
                          <p className="text-sm font-semibold text-foreground">No financial activity recorded</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Player acquisitions and expenses will appear in this timeline.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2.5 max-h-[50vh] overflow-y-auto pr-1 scrollbar-thin">
                          {financialHistory.map((item) => (
                            <div
                              key={item.id}
                              className="flex items-center justify-between p-3.5 backdrop-blur-xl rounded-xl border bg-white/5 hover:bg-white/10 border-white/10 transition-all shadow-sm gap-3"
                            >
                              <div className="flex items-center gap-3.5 min-w-0 flex-1">
                                <div
                                  className={cn(
                                    'w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border',
                                    item.category === 'player'
                                      ? 'bg-primary/15 text-primary border-primary/30'
                                      : item.category === 'expense'
                                      ? 'bg-primary/10 text-primary border-primary/25'
                                      : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                                  )}
                                >
                                  {item.category === 'player' ? (
                                    <Users className="w-4 h-4" />
                                  ) : item.category === 'expense' ? (
                                    <Receipt className="w-4 h-4" />
                                  ) : (
                                    <Zap className="w-4 h-4" />
                                  )}
                                </div>

                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2">
                                    <p className="text-base font-semibold text-foreground truncate">
                                      {item.title}
                                    </p>
                                    <span
                                      className={cn(
                                        'px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-wider',
                                        item.category === 'player'
                                          ? 'bg-primary/20 text-primary border border-primary/30'
                                          : item.category === 'expense'
                                          ? 'bg-primary/15 text-primary border border-primary/25'
                                          : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                      )}
                                    >
                                      {item.category === 'player'
                                        ? 'Squad'
                                        : item.category === 'expense'
                                        ? 'Expense'
                                        : 'Cap Change'}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                                    <span className="truncate">{item.subtitle}</span>
                                    <span>•</span>
                                    <span className="font-mono">
                                      {new Date(item.date).toLocaleDateString([], {
                                        month: 'short',
                                        day: 'numeric',
                                      })}{' '}
                                      {new Date(item.date).toLocaleTimeString([], {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                      })}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <div className="text-right shrink-0">
                                <span
                                  className={cn(
                                    'font-heading font-bold text-base sm:text-lg tabular-nums min-w-[85px] text-right',
                                    item.category === 'player'
                                      ? 'text-primary'
                                      : item.category === 'expense'
                                      ? 'text-primary'
                                      : 'text-primary'
                                  )}
                                >
                                  {item.category === 'cap' ? '' : '-'}
                                  {formatCurrency(item.amount, settings.currency)}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Transfer & Pool Slide-Over Panel */}
              <AnimatePresence>
                {transferPlayerItem && (
                  <motion.div
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 50 }}
                    transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                    className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-3xl p-6 sm:p-8 flex flex-col justify-between overflow-y-auto border-l border-white/10"
                  >
                    <div className="space-y-5">
                      {/* Panel Header */}
                      <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-0.5 rounded text-xs font-bold uppercase tracking-wider bg-primary/15 text-primary border border-primary/25">
                              {transferPlayerItem.role}
                            </span>
                            <span className="text-xs text-muted-foreground font-mono">
                              Base Price: {formatCurrency(transferPlayerItem.basePrice, transferPlayerItem.currency)}
                            </span>
                          </div>
                          <h3 className="text-2xl font-heading font-black text-foreground mt-1.5">
                            {transferPlayerItem.player.name}
                          </h3>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Current Club: <span className="text-foreground font-semibold">{selectedTeam?.name}</span> (Acquired for{' '}
                            <span className="text-primary font-bold">
                              {formatCurrency(
                                transferPlayerItem.soldPrice ?? transferPlayerItem.basePrice,
                                transferPlayerItem.currency
                              )}
                            </span>
                            )
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setTransferPlayerItem(null)}
                          className="rounded-xl p-2 text-muted-foreground hover:bg-white/10 hover:text-foreground transition-colors"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>

                      {/* Action Option Tabs */}
                      <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-white/5 border border-white/10">
                        <button
                          type="button"
                          onClick={() => setActionType('team')}
                          className={cn(
                            'flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-heading font-bold uppercase tracking-wider transition-all',
                            actionType === 'team'
                              ? 'bg-primary text-primary-foreground shadow-gold'
                              : 'text-muted-foreground hover:text-foreground'
                          )}
                        >
                          <Building2 className="w-4 h-4" />
                          Transfer Club
                        </button>

                        <button
                          type="button"
                          onClick={() => setActionType('pool')}
                          className={cn(
                            'flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-heading font-bold uppercase tracking-wider transition-all',
                            actionType === 'pool'
                              ? 'bg-rose-500 text-white shadow-sm'
                              : 'text-muted-foreground hover:text-foreground'
                          )}
                        >
                          <RotateCcw className="w-4 h-4" />
                          Return to Pool
                        </button>
                      </div>

                      {/* Forms */}
                      <form onSubmit={handleConfirmAction} id="transfer-form" className="space-y-4">
                        {actionType === 'team' ? (
                          <div className="space-y-4">
                            {otherTeamsList.length === 0 ? (
                              <div className="p-5 rounded-2xl bg-muted/30 border border-border text-center text-sm text-muted-foreground">
                                No other teams available to receive transfers. Create additional clubs in Settings.
                              </div>
                            ) : (
                              <>
                                {/* Destination Team */}
                                <div className="space-y-1.5">
                                  <Label className="text-xs font-semibold text-foreground uppercase tracking-wider">
                                    Receiving Club
                                  </Label>
                                  <select
                                    value={targetTeamId}
                                    onChange={(e) => setTargetTeamId(e.target.value)}
                                    className="w-full h-12 px-4 rounded-xl bg-card border border-input text-sm font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                                    required
                                  >
                                    {otherTeamsList.map((team) => {
                                      const teamEntry = pointsData.find((p) => p.team.id === team.id);
                                      const budgetLeft = teamEntry ? teamEntry.budgetLeft : settings.maxTeamBudget;
                                      return (
                                        <option key={team.id} value={team.id} className="bg-popover text-popover-foreground">
                                          {team.name} — Budget Left: {formatCurrency(budgetLeft, settings.currency)}
                                        </option>
                                      );
                                    })}
                                  </select>
                                </div>

                                {/* Transfer Price */}
                                <div className="space-y-1.5">
                                  <Label className="text-xs font-semibold text-foreground uppercase tracking-wider">
                                    Transfer Price ({settings.currency})
                                  </Label>
                                  <Input
                                    type="number"
                                    step="any"
                                    min="0"
                                    placeholder="Enter transfer fee"
                                    value={transferPriceInput}
                                    onChange={(e) => setTransferPriceInput(e.target.value)}
                                    className="h-12 px-4 rounded-xl bg-card border-input text-base font-mono font-bold text-foreground focus:border-primary"
                                    required
                                  />
                                  <p className="text-xs text-muted-foreground">
                                    This fee will be charged to the destination club's budget and credited to your ledger.
                                  </p>
                                </div>
                              </>
                            )}
                          </div>
                        ) : (
                          /* Return to Pool */
                          <div className="space-y-4">
                            <div className="p-5 rounded-2xl bg-rose-500/10 border border-rose-500/25 flex items-start gap-3.5">
                              <AlertTriangle className="w-6 h-6 text-rose-500 shrink-0 mt-0.5" />
                              <div className="text-sm text-foreground leading-relaxed space-y-1.5">
                                <p className="font-bold text-rose-500 text-base">Unassign &amp; Return to Auction Pool</p>
                                <p>
                                  This will release <span className="font-bold text-foreground">{transferPlayerItem.player.name}</span> from{' '}
                                  <span className="font-bold text-foreground">{selectedTeam?.name}</span> and restore your club's budget by{' '}
                                  <span className="font-mono font-bold text-emerald-500 dark:text-emerald-400">
                                    {formatCurrency(
                                      transferPlayerItem.soldPrice ?? transferPlayerItem.basePrice,
                                      transferPlayerItem.currency
                                    )}
                                  </span>
                                  .
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  The player will be made available again in the Draw / Pool with their original base price of{' '}
                                  <span className="font-mono font-semibold text-foreground">
                                    {formatCurrency(transferPlayerItem.basePrice, transferPlayerItem.currency)}
                                  </span>
                                  .
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </form>
                    </div>

                    {/* Action Buttons Footer */}
                    <div className="flex items-center justify-end gap-3 pt-6 border-t border-border">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setTransferPlayerItem(null)}
                        className="text-xs h-11 px-5"
                      >
                        Cancel
                      </Button>

                      {actionType === 'team' ? (
                        <Button
                          type="submit"
                          form="transfer-form"
                          disabled={otherTeamsList.length === 0 || !targetTeamId}
                          className="text-xs h-11 px-6 font-heading font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-gold"
                        >
                          <Check className="w-4 h-4 mr-1.5" />
                          Confirm Transfer
                        </Button>
                      ) : (
                        <Button
                          type="submit"
                          form="transfer-form"
                          className="text-xs h-11 px-6 font-heading font-bold bg-rose-500 hover:bg-rose-600 text-white shadow-sm"
                        >
                          <RotateCcw className="w-4 h-4 mr-1.5" />
                          Return to Pool
                        </Button>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Edit Player Price Modal (Inside DrawerContent with fixed inset-0 z-[150] so it opens IN FRONT) */}
              <AnimatePresence>
                {editingPlayerPrice && (
                  <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={() => setEditingPlayerPrice(null)}
                      className="fixed inset-0 bg-black/60 backdrop-blur-md"
                    />

                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: 10 }}
                      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                      className="relative w-full max-w-md bg-popover text-popover-foreground border border-border rounded-3xl p-6 sm:p-7 shadow-2xl z-10 space-y-5"
                    >
                      <div className="flex items-start justify-between gap-3 border-b border-border pb-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-primary/15 text-primary border border-primary/25">
                              Player Value Edit
                            </span>
                            <span className="text-xs text-muted-foreground font-semibold">
                              {editingPlayerPrice.role}
                            </span>
                          </div>
                          <h3 className="text-xl font-heading font-black text-foreground mt-1.5">
                            {editingPlayerPrice.playerName}
                          </h3>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Update the recorded acquisition value for this player.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setEditingPlayerPrice(null)}
                          className="rounded-xl p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>

                      <form onSubmit={handleSavePlayerPrice} className="space-y-4">
                        <div className="space-y-2">
                          <Label className="text-xs font-semibold text-foreground uppercase tracking-wider">
                            Acquisition Price ({settings.currency})
                          </Label>
                          <Input
                            type="number"
                            step="any"
                            min="0"
                            placeholder="Enter price"
                            value={editingPlayerPrice.value}
                            onChange={(e) => setEditingPlayerPrice({ ...editingPlayerPrice, value: e.target.value })}
                            className="h-12 px-4 rounded-xl bg-card border-input text-base font-mono font-bold text-foreground focus:border-primary"
                            required
                            autoFocus
                          />
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-2">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setEditingPlayerPrice(null)}
                            className="text-xs h-10 px-4 rounded-xl"
                          >
                            Cancel
                          </Button>
                          <Button
                            type="submit"
                            className="text-xs h-10 px-5 rounded-xl font-heading font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-gold"
                          >
                            <Check className="w-4 h-4 mr-1" />
                            Update Price
                          </Button>
                        </div>
                      </form>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>

              {/* Add / Edit Other Expense Modal (Inside DrawerContent with fixed inset-0 z-[150] so it opens IN FRONT) */}
              <AnimatePresence>
                {expenseModal && (
                  <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={() => setExpenseModal(null)}
                      className="fixed inset-0 bg-black/60 backdrop-blur-md"
                    />

                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: 10 }}
                      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                      className="relative w-full max-w-md bg-popover text-popover-foreground border border-border rounded-3xl p-6 sm:p-7 shadow-2xl z-10 space-y-5"
                    >
                      <div className="flex items-start justify-between gap-3 border-b border-border pb-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-primary/15 text-primary border border-primary/25">
                              Other Expense
                            </span>
                            <span className="text-xs text-muted-foreground font-semibold">
                              {expenseModal.teamName}
                            </span>
                          </div>
                          <h3 className="text-xl font-heading font-black text-foreground mt-1.5">
                            {expenseModal.expenseId ? 'Edit Expense' : 'Add Other Expense'}
                          </h3>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Record contestant payouts, penalties, power cards, or side trades.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setExpenseModal(null)}
                          className="rounded-xl p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>

                      <form onSubmit={handleSaveExpense} className="space-y-4">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold text-foreground uppercase tracking-wider">
                            Description / Title
                          </Label>
                          <Input
                            type="text"
                            placeholder="e.g. Gave 20M to contestant X / Penalty fee"
                            value={expenseModal.title}
                            onChange={(e) => setExpenseModal({ ...expenseModal, title: e.target.value })}
                            className="h-12 px-4 rounded-xl bg-card border-input text-sm font-semibold text-foreground focus:border-primary"
                            required
                            autoFocus
                          />
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold text-foreground uppercase tracking-wider">
                            Expense Amount ({settings.currency})
                          </Label>
                          <Input
                            type="number"
                            step="any"
                            min="0"
                            placeholder="Enter amount"
                            value={expenseModal.amount}
                            onChange={(e) => setExpenseModal({ ...expenseModal, amount: e.target.value })}
                            className="h-12 px-4 rounded-xl bg-card border-input text-base font-mono font-bold text-foreground focus:border-primary"
                            required
                          />
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-2">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setExpenseModal(null)}
                            className="text-xs h-10 px-4 rounded-xl"
                          >
                            Cancel
                          </Button>
                          <Button
                            type="submit"
                            className="text-xs h-10 px-5 rounded-xl font-heading font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-gold"
                          >
                            <Check className="w-4 h-4 mr-1" />
                            {expenseModal.expenseId ? 'Save Changes' : 'Add Expense'}
                          </Button>
                        </div>
                      </form>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>
            </DrawerContent>
          </Drawer>

          {/* Quick Edit Budget Modal Popup (For Main Table Clicks) */}
          <AnimatePresence>
            {editingBudget && (
              <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
                {/* Backdrop */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setEditingBudget(null)}
                  className="fixed inset-0 bg-black/60 backdrop-blur-md"
                />

                {/* Dialog Body */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                  transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                  className="relative w-full max-w-md bg-popover text-popover-foreground border border-border rounded-3xl p-6 sm:p-7 shadow-2xl z-10 space-y-5"
                >
                  <div className="flex items-start justify-between gap-3 border-b border-border pb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-primary/15 text-primary border border-primary/25">
                          Financial Control
                        </span>
                        <span className="text-xs text-muted-foreground font-semibold">
                          {editingBudget.field === 'max'
                            ? 'Max Purse Cap / Power Card'
                            : editingBudget.field === 'left'
                            ? 'Budget Left Override'
                            : 'Budget Spent Adjustment'}
                        </span>
                      </div>
                      <h3 className="text-xl font-heading font-black text-foreground mt-1.5">
                        {editingBudget.teamName}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {editingBudget.field === 'max'
                          ? 'Set custom total purse cap (e.g. increase from ₹200M to ₹210M for power cards).'
                          : editingBudget.field === 'left'
                          ? 'Adjust remaining purse. Your cap will adjust automatically.'
                          : 'Manually adjust the total spending recorded for this club.'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEditingBudget(null)}
                      className="rounded-xl p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Field Switcher Buttons */}
                  <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-muted/40 border border-border/40">
                    <button
                      type="button"
                      onClick={() => {
                        const team = teams.find((t) => t.id === editingBudget.teamId);
                        const cur = team?.customMaxBudget ?? settings.maxTeamBudget;
                        setEditingBudget({ ...editingBudget, field: 'max', value: String(cur) });
                      }}
                      className={cn(
                        'py-1.5 px-2 rounded-lg text-xs font-heading font-bold transition-all text-center truncate',
                        editingBudget.field === 'max'
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      )}
                    >
                      Max Cap
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const teamEntry = pointsData.find((p) => p.team.id === editingBudget.teamId);
                        const cur = teamEntry ? teamEntry.budgetLeft : settings.maxTeamBudget;
                        setEditingBudget({ ...editingBudget, field: 'left', value: String(cur) });
                      }}
                      className={cn(
                        'py-1.5 px-2 rounded-lg text-xs font-heading font-bold transition-all text-center truncate',
                        editingBudget.field === 'left'
                          ? 'bg-emerald-500 text-white shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      )}
                    >
                      Budget Left
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const teamEntry = pointsData.find((p) => p.team.id === editingBudget.teamId);
                        const cur = teamEntry ? teamEntry.budgetSpent : 0;
                        setEditingBudget({ ...editingBudget, field: 'spent', value: String(cur) });
                      }}
                      className={cn(
                        'py-1.5 px-2 rounded-lg text-xs font-heading font-bold transition-all text-center truncate',
                        editingBudget.field === 'spent'
                          ? 'bg-rose-500 text-white shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      )}
                    >
                      Budget Spent
                    </button>
                  </div>

                  <form onSubmit={handleSaveBudget} className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-foreground uppercase tracking-wider">
                        {editingBudget.field === 'max'
                          ? 'New Max Budget / Purse Limit'
                          : editingBudget.field === 'left'
                          ? 'New Budget Left'
                          : 'New Budget Spent'}{' '}
                        ({settings.currency})
                      </Label>
                      <Input
                        type="number"
                        step="any"
                        min="0"
                        placeholder="Enter amount"
                        value={editingBudget.value}
                        onChange={(e) => setEditingBudget({ ...editingBudget, value: e.target.value })}
                        className="h-12 px-4 rounded-xl bg-card border-input text-base font-mono font-bold text-foreground focus:border-primary"
                        required
                        autoFocus
                      />
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={handleResetBudget}
                        className="text-xs text-muted-foreground hover:text-rose-400 h-9 px-3 gap-1"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Reset to Auto
                      </Button>

                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setEditingBudget(null)}
                          className="text-xs h-10 px-4 rounded-xl"
                        >
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          className="text-xs h-10 px-5 rounded-xl font-heading font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-gold"
                        >
                          <Check className="w-4 h-4 mr-1" />
                          Save Budget
                        </Button>
                      </div>
                    </div>
                  </form>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </div>
      </AppLayout>
    </>
  );
}