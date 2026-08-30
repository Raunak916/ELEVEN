'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuctionStore } from '@/lib/auction-store';
import { useRoomStore } from '@/lib/room-store';
import { formatCurrency, cn } from '@/lib/utils';
import { History, Users, Receipt, Zap } from 'lucide-react';
import { Currency, TeamExpense } from '@/lib/types';

export function ContestantTransactionsTab() {
  const { auctionPlayers, teams, settings } = useAuctionStore();
  const { activeSession } = useRoomStore();

  const myTeamId = activeSession?.participantId;
  const myTeam = teams.find((t) => t.id === myTeamId);
  const roomCurrency = (settings?.currency || activeSession?.settings?.currency || 'USD') as Currency;
  const maxBudget = myTeam?.customMaxBudget ?? (settings?.maxTeamBudget || activeSession?.settings?.maxTeamBudget || 200000000);

  // Filter signed players and expenses for this contestant's club
  const signedPlayers = auctionPlayers.filter(
    (p) => p.teamId === myTeamId && p.soldPrice !== null && p.soldPrice !== undefined
  );
  const teamExpenses: TeamExpense[] = myTeam?.otherExpenses || [];

  // Combined Financial History Timeline (Exact replica of Points Table drawer)
  const financialHistory = React.useMemo(() => {
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
    signedPlayers.forEach((p) => {
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
    teamExpenses.forEach((exp) => {
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
    if (myTeam?.customMaxBudget) {
      items.push({
        id: `cap-${myTeam.id}`,
        title: `Max Budget Cap Adjusted`,
        subtitle: `Total Purse Limit set to ${formatCurrency(myTeam.customMaxBudget, roomCurrency)}`,
        category: 'cap',
        amount: myTeam.customMaxBudget,
        date: myTeam.createdAt || new Date().toISOString(),
      });
    }

    // Sort newest first
    return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [signedPlayers, teamExpenses, myTeam, roomCurrency]);

  return (
    <div className="w-full h-full flex-1 flex flex-col space-y-3.5 min-h-0">
      {/* Top Header */}
      <div className="flex items-center justify-between px-1 shrink-0">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-[var(--gold)]" />
          <h4 className="font-heading font-black text-sm sm:text-base uppercase tracking-wider text-foreground">
            Financial Ledger &amp; Transactions
          </h4>
        </div>
        <span className="text-xs font-mono font-bold text-muted-foreground/90">
          {financialHistory.length} total entries
        </span>
      </div>

      {/* Main Financial History Timeline */}
      {financialHistory.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 sm:p-12 rounded-3xl bg-white/[0.02] border border-white/10 text-center min-h-[240px]">
          <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-3 text-muted-foreground shadow-lg">
            <History className="h-7 w-7 opacity-30 text-[var(--gold)]" />
          </div>
          <p className="font-heading font-black text-base sm:text-lg text-foreground">
            No financial activity recorded
          </p>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-[280px] leading-relaxed">
            Player acquisitions, fees, trade payouts, and adjustments will appear in this timeline.
          </p>
        </div>
      ) : (
        <div className="flex-1 min-h-0 space-y-3 overflow-y-auto pr-1.5 scrollbar-thin">
          <AnimatePresence initial={false}>
            {financialHistory.map((item, idx) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.25, delay: idx * 0.02 }}
                className="flex items-center justify-between p-4 rounded-2xl border bg-white/[0.04] hover:bg-white/[0.08] border-white/10 transition-all shadow-md gap-3.5 backdrop-blur-xl"
              >
                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                  <div
                    className={cn(
                      'w-10 h-10 sm:w-11 sm:h-11 rounded-2xl flex items-center justify-center shrink-0 border shadow-inner',
                      item.category === 'player'
                        ? 'bg-[var(--gold)]/15 text-[var(--gold)] border-[var(--gold)]/30'
                        : item.category === 'expense'
                        ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                        : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                    )}
                  >
                    {item.category === 'player' ? (
                      <Users className="w-4 h-4 sm:w-5 sm:h-5" />
                    ) : item.category === 'expense' ? (
                      <Receipt className="w-4 h-4 sm:w-5 sm:h-5" />
                    ) : (
                      <Zap className="w-4 h-4 sm:w-5 sm:h-5" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-base sm:text-lg font-heading font-black text-foreground truncate tracking-tight">
                        {item.title}
                      </p>
                      <span
                        className={cn(
                          'px-2 py-0.5 rounded-md text-[9px] sm:text-[10px] font-mono font-black uppercase tracking-wider',
                          item.category === 'player'
                            ? 'bg-[var(--gold)]/20 text-[var(--gold)] border border-[var(--gold)]/30'
                            : item.category === 'expense'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        )}
                      >
                        {item.category === 'player'
                          ? 'Squad'
                          : item.category === 'expense'
                          ? 'Expense'
                          : 'Cap'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs sm:text-sm text-muted-foreground">
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
                      'font-heading font-black text-base sm:text-xl tabular-nums block',
                      item.category === 'player'
                        ? 'text-foreground'
                        : item.category === 'expense'
                        ? 'text-rose-400'
                        : 'text-amber-400'
                    )}
                  >
                    {item.category === 'expense' ? '-' : ''}
                    {formatCurrency(item.amount, roomCurrency)}
                  </span>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
