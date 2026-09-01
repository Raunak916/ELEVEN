'use client';

import React, { useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useRoomStore } from '@/lib/room-store';
import { useAuctionStore } from '@/lib/auction-store';
import { formatCurrency, ROLE_DRAW_STYLES, CATEGORY_COLORS, cn } from '@/lib/utils';
import { Trophy, Shield, Sparkles, ArrowRight, LogOut, Award, Users, CheckCircle2, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { Currency, PlayerRole } from '@/lib/types';
import { firePlayerRevealConfetti } from '@/lib/confetti';

export function ContestantCompletedScreen({ onDismiss }: { onDismiss?: () => void }) {
  const router = useRouter();
  const { activeSession, leaveRoom } = useRoomStore();
  const { teams, auctionPlayers, settings } = useAuctionStore();

  const myTeamId = activeSession?.participantId;
  const myTeam =
    teams.find((t) => t.id === myTeamId) ||
    teams.find((t) => t.name.toLowerCase() === (activeSession?.teamName || '').toLowerCase()) ||
    (teams.length === 1 ? teams[0] : null);
  const myTeamName = myTeam?.name || activeSession?.teamName || 'My Club';
  const myOwnerName = myTeam?.owner || activeSession?.name || 'Manager';

  const roomCurrency = (settings?.currency || activeSession?.settings?.currency || 'USD') as Currency;
  const maxBudget = myTeam?.customMaxBudget ?? (settings?.maxTeamBudget || activeSession?.settings?.maxTeamBudget || 200000000);

  // My squad calculations
  const targetTeamId = myTeam?.id || myTeamId;
  const myPlayers = auctionPlayers.filter(
    (p) => p.teamId === targetTeamId && p.soldPrice !== null && p.soldPrice !== undefined
  );
  const myPlayerPurchases = myPlayers.reduce((sum, p) => sum + (p.soldPrice ?? p.basePrice), 0);
  const myExpenses = myTeam?.otherExpenses || [];
  const myExpensesTotal = myExpenses.reduce((sum, exp) => sum + exp.amount, 0);
  const myBudgetSpent = myTeam?.customBudgetSpent !== undefined ? myTeam.customBudgetSpent : (myPlayerPurchases + myExpensesTotal);
  const myBudgetLeft = maxBudget - myBudgetSpent;

  // Global draft statistics
  const allSoldPlayers = auctionPlayers.filter(
    (p) => p.soldPrice !== null && p.soldPrice !== undefined
  );
  const totalVolume = allSoldPlayers.reduce((sum, p) => sum + (p.soldPrice ?? p.basePrice), 0);

  // Top buy of the entire auction
  const topBuy = allSoldPlayers.slice().sort((a, b) => (b.soldPrice ?? 0) - (a.soldPrice ?? 0))[0];
  const topBuyTeam = topBuy ? teams.find((t) => t.id === topBuy.teamId) : null;

  // Fire celebratory confetti on mount
  useEffect(() => {
    try {
      firePlayerRevealConfetti();
    } catch {}
  }, []);

  const handleLeave = async () => {
    await leaveRoom();
    toast.info('Returned to home workspace.');
    router.push('/');
  };

  return (
    <main className="min-h-screen w-full flex flex-col bg-[#050608] text-foreground select-none relative overflow-x-hidden p-4 sm:p-6 lg:p-10 transition-colors">
      {/* Golden Championship Ambient Mesh Glow */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden" aria-hidden="true">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[55rem] h-[55rem] bg-gradient-to-b from-[var(--gold)]/20 via-amber-500/10 to-transparent rounded-full blur-[150px] opacity-90" />
        <div className="absolute bottom-0 right-1/4 w-[45rem] h-[45rem] bg-gradient-to-tr from-emerald-500/15 via-teal-500/5 to-transparent rounded-full blur-[140px] opacity-75" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-transparent via-[#050608]/80 to-[#050608]" />
      </div>

      {/* Top Navigation */}
      <header className="relative z-10 flex items-center justify-between pb-4 sm:pb-6 border-b border-white/10 max-w-6xl mx-auto w-full">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="relative h-11 w-11 sm:h-14 sm:w-14 rounded-2xl bg-gradient-to-br from-white/15 to-white/5 border border-white/20 p-2 shadow-2xl flex items-center justify-center backdrop-blur-2xl">
            <Image
              src="/logo/eleven.png"
              alt="Eleven Logo"
              width={48}
              height={48}
              className="object-contain drop-shadow"
              priority
            />
          </div>

          <div>
            <span className="font-heading font-black text-xl sm:text-2xl lg:text-3xl text-foreground tracking-tight block">
              {myTeamName}
            </span>
            <p className="text-xs sm:text-sm text-muted-foreground font-medium flex items-center gap-1.5 mt-0.5">
              <span>Manager: {myOwnerName}</span>
              <span>•</span>
              <span className="text-[var(--gold)] font-mono font-semibold">Room {activeSession?.roomCode}</span>
            </p>
          </div>
        </div>

        {/* Right buttons */}
        <div className="flex items-center gap-3">
          {onDismiss && (
            <button
              type="button"
              onClick={onDismiss}
              className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-white/10 hover:bg-white/15 text-foreground border border-white/15 transition-all duration-200"
            >
              <span>View Companion Tabs</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleLeave}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-white/5 hover:bg-rose-500/20 text-muted-foreground hover:text-rose-400 border border-white/10 hover:border-rose-500/30 transition-all duration-200 active:scale-95 shadow-sm"
          >
            <LogOut className="h-4 w-4" />
            <span>Leave Room</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <div className="relative z-10 max-w-6xl mx-auto w-full flex-1 flex flex-col space-y-6 sm:space-y-8 my-6 sm:my-8">
        
        {/* Banner Hero */}
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: 'spring', bounce: 0.15, duration: 0.5 }}
          className="text-center flex flex-col items-center space-y-3"
        >
          <div className="relative inline-flex items-center justify-center">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-[var(--gold)]/15 border border-[var(--gold)]/30 flex items-center justify-center shadow-[0_0_50px_rgba(234,179,8,0.3)] backdrop-blur-2xl">
              <Trophy className="w-10 h-10 sm:w-12 sm:h-12 text-[var(--gold)] drop-shadow" />
            </div>
            <Sparkles className="w-6 h-6 text-amber-300 absolute -top-2 -right-2 animate-bounce" />
          </div>

          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[var(--gold)]/15 border border-[var(--gold)]/30 text-xs font-mono font-black tracking-widest text-[var(--gold)] uppercase shadow-inner">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>OFFICIAL AUCTION DRAFT COMPLETED</span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-heading font-black text-white tracking-tight drop-shadow-md">
              Congratulations, {myOwnerName}!
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground max-w-md mx-auto leading-relaxed">
              The draft gavel has fallen. Your Starting XI squad and room finances are finalized below.
            </p>
          </div>
        </motion.div>

        {/* 3 Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          
          {/* Card 1: Final Squad Size */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="p-5 sm:p-6 rounded-3xl bg-white/[0.04] backdrop-blur-2xl border border-white/10 flex items-center gap-4 shadow-xl"
          >
            <div className="w-12 h-12 rounded-2xl bg-[var(--gold)]/10 border border-[var(--gold)]/20 flex items-center justify-center shrink-0 text-[var(--gold)]">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground block font-bold">
                Players Signed
              </span>
              <span className="font-heading text-2xl sm:text-3xl font-black text-foreground block mt-0.5">
                {myPlayers.length} <span className="text-sm font-normal text-muted-foreground font-sans">/ 11 Target</span>
              </span>
            </div>
          </motion.div>

          {/* Card 2: Total Spent */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="p-5 sm:p-6 rounded-3xl bg-white/[0.04] backdrop-blur-2xl border border-white/10 flex items-center gap-4 shadow-xl"
          >
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0 text-amber-400">
              <Wallet className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground block font-bold">
                Total Budget Spent
              </span>
              <span className="font-heading text-2xl sm:text-3xl font-black text-amber-400 block mt-0.5">
                {formatCurrency(myBudgetSpent, roomCurrency)}
              </span>
            </div>
          </motion.div>

          {/* Card 3: Remaining Purse */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="p-5 sm:p-6 rounded-3xl bg-white/[0.04] backdrop-blur-2xl border border-white/10 flex items-center gap-4 shadow-xl"
          >
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0 text-[var(--emerald)]">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground block font-bold">
                Purse Remaining
              </span>
              <span className="font-heading text-2xl sm:text-3xl font-black text-[var(--emerald)] block mt-0.5">
                {formatCurrency(myBudgetLeft, roomCurrency)}
              </span>
            </div>
          </motion.div>

        </div>

        {/* Superlatives & Top Deals Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6">
          
          {/* Left: Your Final Squad Roster */}
          <div className="p-5 sm:p-6 rounded-3xl bg-white/[0.03] backdrop-blur-2xl border border-white/10 shadow-2xl flex flex-col space-y-4">
            <div className="flex items-center justify-between px-1">
              <h3 className="font-heading font-black text-base sm:text-lg uppercase tracking-wider text-foreground flex items-center gap-2">
                <Shield className="w-4 h-4 text-[var(--gold)]" />
                <span>Your Starting Squad ({myPlayers.length})</span>
              </h3>
              <span className="text-xs font-mono font-bold text-[var(--gold)]">
                {myTeamName}
              </span>
            </div>

            {myPlayers.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                <p className="text-sm font-semibold">No players were acquired during this draft.</p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1.5 scrollbar-thin">
                {myPlayers.map((player, idx) => {
                  const roleStyle = ROLE_DRAW_STYLES[player.role as PlayerRole] || ROLE_DRAW_STYLES.Midfielder;
                  return (
                    <div
                      key={player.id}
                      className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.04] border border-white/10 shadow-sm gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <span className="text-xs font-mono font-bold text-muted-foreground w-4 text-center shrink-0">
                          {idx + 1}
                        </span>

                        <div className="relative h-10 w-10 rounded-xl overflow-hidden bg-black/60 border border-white/10 shrink-0 flex items-center justify-center">
                          {player.player.photo ? (
                            <Image
                              src={player.player.photo}
                              alt={player.player.name}
                              fill
                              unoptimized={Boolean(player.player.photo.startsWith('data:'))}
                              className="object-cover object-top"
                              sizes="40px"
                            />
                          ) : (
                            <span className="text-xs font-mono font-bold text-muted-foreground">
                              {player.player.name.substring(0, 2).toUpperCase()}
                            </span>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-heading font-black text-white truncate">
                            {player.player.name}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span
                              className={cn(
                                'px-1.5 py-0.2 rounded text-[9px] font-mono font-bold uppercase tracking-wider border',
                                roleStyle.pillBg,
                                roleStyle.pillText,
                                roleStyle.pillBorder
                              )}
                            >
                              {player.role}
                            </span>
                            <span className="text-[11px] text-muted-foreground font-mono">
                              {player.player.position}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="font-heading font-black text-sm sm:text-base text-[var(--gold)] tabular-nums">
                          {formatCurrency(player.soldPrice ?? player.basePrice, player.currency || roomCurrency)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right: Room Draft Highlights & Marquee Deals */}
          <div className="p-5 sm:p-6 rounded-3xl bg-white/[0.03] backdrop-blur-2xl border border-white/10 shadow-2xl flex flex-col justify-between space-y-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <h3 className="font-heading font-black text-base sm:text-lg uppercase tracking-wider text-foreground flex items-center gap-2">
                  <Award className="w-4 h-4 text-[var(--gold)]" />
                  <span>Auction Draft Superlatives</span>
                </h3>
                <span className="text-xs font-mono font-bold text-muted-foreground">
                  Room Stats
                </span>
              </div>

              {/* Superlative 1: Marquee Buy */}
              {topBuy && (
                <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-950/40 via-black/80 to-[#120e03] border border-[var(--gold)]/30 shadow-[0_0_20px_rgba(234,179,8,0.15)] flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3.5 min-w-0 flex-1">
                    <div className="w-12 h-12 rounded-2xl bg-[var(--gold)]/15 border border-[var(--gold)]/30 flex items-center justify-center shrink-0 text-[var(--gold)] shadow-inner">
                      <Trophy className="w-6 h-6" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] font-mono font-black uppercase tracking-widest text-[var(--gold)] block">
                        MARQUEE SIGNING OF THE DRAFT
                      </span>
                      <h4 className="text-base sm:text-lg font-heading font-black text-white truncate">
                        {topBuy.player.name}
                      </h4>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Won by <span className="text-white font-bold">{topBuyTeam?.name || 'Club'}</span>
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-heading font-black text-base sm:text-xl text-[var(--gold)] block tabular-nums">
                      {formatCurrency(topBuy.soldPrice ?? topBuy.basePrice, topBuy.currency || roomCurrency)}
                    </span>
                  </div>
                </div>
              )}

              {/* Superlative 2: Total Market Volume */}
              <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-between gap-3">
                <div>
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground block">
                    TOTAL MARKET EXCHANGE VOLUME
                  </span>
                  <span className="text-xl sm:text-2xl font-heading font-black text-foreground block mt-0.5">
                    {formatCurrency(totalVolume, roomCurrency)}
                  </span>
                </div>
                <span className="px-3 py-1 rounded-xl bg-white/10 border border-white/15 text-xs font-mono font-bold text-white">
                  {allSoldPlayers.length} Deals Completed
                </span>
              </div>
            </div>

            {/* Bottom Footer */}
            <div className="pt-4 border-t border-white/10 flex items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">
                Engineered for live football auctions &amp; competitive draft rooms.
              </p>
            </div>
          </div>

        </div>

      </div>
    </main>
  );
}
