'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useRoomStore } from '@/lib/room-store';
import { useAuctionStore } from '@/lib/auction-store';
import { formatCurrency, cn } from '@/lib/utils';
import { LogOut, Sparkles, Users, History, Layers, ArrowLeftRight, Wallet, TrendingUp, ShieldCheck, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

import { ContestantDrawTab } from './tabs/contestant-draw-tab';
import { ContestantRosterTab } from './tabs/contestant-roster-tab';
import { ContestantHistoryTab } from './tabs/contestant-history-tab';
import { ContestantCardsTab } from './tabs/contestant-cards-tab';
import { ContestantTransactionsTab } from './tabs/contestant-transactions-tab';
import { ContestantCompletedScreen } from './contestant-completed-screen';
import { Currency } from '@/lib/types';

type LeftTab = 'DRAW' | 'ROSTER';
type RightTab = 'HISTORY' | 'CARD' | 'TRANSACTIONS';
type MobileTab = 'DRAW' | 'ROSTER' | 'HISTORY' | 'CARD' | 'TRANSACTIONS';

export function ContestantPlaceholder() {
  const router = useRouter();
  const { activeSession, leaveRoom } = useRoomStore();
  const { teams, auctionPlayers, settings } = useAuctionStore();
  
  const [leftTab, setLeftTab] = useState<LeftTab>('DRAW');
  const [rightTab, setRightTab] = useState<RightTab>('HISTORY');
  const [mobileTab, setMobileTab] = useState<MobileTab>('DRAW');
  const [showCompletedManual, setShowCompletedManual] = useState(false);

  // Scoped team lookup using the contestant's primary key ID
  const myTeam = teams.find((t) => t.id === activeSession?.participantId);
  const myTeamName = myTeam?.name || activeSession?.teamName || 'My Club';
  const myOwnerName = myTeam?.owner || activeSession?.name || 'Manager';

  // Live currency and budget calculations scoped to this room & contestant ID
  const activeCurrency = (settings?.currency || activeSession?.settings?.currency || 'USD') as Currency;
  const maxBudget = myTeam?.customMaxBudget ?? (settings?.maxTeamBudget || activeSession?.settings?.maxTeamBudget || 200000000);
  
  const teamPlayers = auctionPlayers.filter(
    (p) => p.teamId === activeSession?.participantId && p.soldPrice !== null && p.soldPrice !== undefined
  );
  const playerPurchases = teamPlayers.reduce((sum, p) => sum + (p.soldPrice ?? p.basePrice), 0);
  const otherExpenses = (myTeam?.otherExpenses || []).reduce((sum, e) => sum + e.amount, 0);
  
  const budgetSpent = myTeam?.customBudgetSpent !== undefined
    ? myTeam.customBudgetSpent
    : (playerPurchases + otherExpenses);
  const budgetLeft = maxBudget - budgetSpent;
  const playersAcquired = teamPlayers.length;
  const squadProgressPercent = Math.min(100, Math.round((playersAcquired / 11) * 100));

  const handleLeave = async () => {
    await leaveRoom();
    toast.info('Left room. Returned to your auction workspace.');
  };

  // If the host completed the auction or user clicked summary
  const isAuctionCompleted = activeSession?.status === 'COMPLETED' || showCompletedManual;

  if (isAuctionCompleted) {
    return (
      <ContestantCompletedScreen
        onDismiss={showCompletedManual ? () => setShowCompletedManual(false) : undefined}
      />
    );
  }

  return (
    <main className="min-h-screen 2xl:h-screen 2xl:max-h-screen overflow-y-auto 2xl:overflow-hidden w-full flex flex-col bg-[#050608] text-foreground select-none relative p-3 sm:p-4 lg:p-5 transition-colors scrollbar-thin">
      {/* Dynamic Ambient Mesh Glow */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden" aria-hidden="true">
        <div className="absolute -top-40 left-1/4 -translate-x-1/2 w-[45rem] h-[45rem] bg-gradient-to-tr from-[var(--gold)]/10 via-amber-500/5 to-transparent rounded-full blur-[140px] opacity-80" />
        <div className="absolute top-1/2 right-1/4 w-[40rem] h-[40rem] bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent rounded-full blur-[140px] opacity-70" />
        <div className="absolute -bottom-40 left-1/3 w-[45rem] h-[45rem] bg-gradient-to-tr from-indigo-500/10 via-blue-500/5 to-transparent rounded-full blur-[150px] opacity-70" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-transparent via-[#050608]/75 to-[#050608]" />
      </div>

      {/* Top Header Bar */}
      <header className="relative z-10 shrink-0 flex items-center justify-between pb-3 sm:pb-4 border-b border-white/10">
        {/* Left: Brand + Team */}
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <div className="relative h-10 w-10 sm:h-12 sm:w-12 rounded-xl sm:rounded-2xl bg-gradient-to-br from-white/10 to-white/5 border border-white/15 p-1 sm:p-1.5 shadow-xl flex items-center justify-center backdrop-blur-xl shrink-0">
            <Image
              src="/logo/eleven.png"
              alt="Eleven Logo"
              width={40}
              height={40}
              className="object-contain drop-shadow"
              priority
            />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-heading font-black text-lg sm:text-xl lg:text-2xl text-foreground tracking-tight truncate max-w-[160px] sm:max-w-[260px]">
                {myTeamName}
              </span>
              <span className="px-2 py-0.5 rounded-lg bg-[var(--gold)]/15 border border-[var(--gold)]/30 text-[var(--gold)] font-mono text-[10px] sm:text-xs font-bold uppercase tracking-wider shadow-sm shrink-0">
                #{activeSession?.participantId}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground font-medium truncate">
              <span className="truncate">Manager: <strong className="text-white/90">{myOwnerName}</strong></span>
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-white/20 shrink-0" />
              <span className="text-[var(--gold)] font-mono font-bold tracking-wider uppercase shrink-0">Room {activeSession?.roomCode}</span>
            </div>
          </div>
        </div>

        {/* Right: Live Room Indicator + About Me + Leave Button */}
        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
          <div className="hidden sm:inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs font-mono font-bold tracking-wider uppercase shadow-inner">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span>Live Companion</span>
          </div>

          {/* ABOUT ME BUTTON */}
          <button
            type="button"
            onClick={() => router.push('/credits')}
            className="group hidden xl:inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-black/40 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-white/90 backdrop-blur-md transition-all duration-300 hover:scale-105 hover:border-[var(--gold)]/60 hover:bg-[var(--gold)]/15 hover:text-white shadow-sm"
            title="Read about the creator & experience the 3D credits"
          >
            <span className="relative z-10">ABOUT ME</span>
            <ArrowRight className="h-3 w-3 transition-transform duration-300 group-hover:translate-x-0.5 text-[var(--gold)]" />
          </button>

          <button
            type="button"
            onClick={handleLeave}
            className="flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-white/5 hover:bg-rose-500/20 text-muted-foreground hover:text-rose-400 border border-white/10 hover:border-rose-500/30 transition-all duration-200 active:scale-95 shadow-sm"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden xs:inline">Leave</span>
          </button>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* MOBILE / TABLET UNIFIED 5-TAB SWITCHER (< lg: 1024px)                     */}
      {/* ========================================================================= */}
      <div className="lg:hidden flex items-center gap-1.5 p-1 my-2.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl shadow-inner overflow-x-auto scrollbar-none shrink-0">
        <button
          type="button"
          onClick={() => setMobileTab('DRAW')}
          className={cn(
            'relative flex-1 flex items-center justify-center gap-1 py-2 px-3 rounded-xl text-xs font-heading font-black tracking-wider uppercase transition-all duration-200 whitespace-nowrap',
            mobileTab === 'DRAW'
              ? 'bg-gradient-to-r from-[var(--gold)] via-amber-400 to-amber-500 text-black shadow-gold font-black'
              : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
          )}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>(1) Draw</span>
        </button>

        <button
          type="button"
          onClick={() => setMobileTab('ROSTER')}
          className={cn(
            'relative flex-1 flex items-center justify-center gap-1 py-2 px-3 rounded-xl text-xs font-heading font-black tracking-wider uppercase transition-all duration-200 whitespace-nowrap',
            mobileTab === 'ROSTER'
              ? 'bg-gradient-to-r from-[var(--gold)] via-amber-400 to-amber-500 text-black shadow-gold font-black'
              : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
          )}
        >
          <Users className="w-3.5 h-3.5" />
          <span>(2) Squad ({teamPlayers.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setMobileTab('HISTORY')}
          className={cn(
            'relative flex-1 flex items-center justify-center gap-1 py-2 px-3 rounded-xl text-xs font-heading font-black tracking-wider uppercase transition-all duration-200 whitespace-nowrap',
            mobileTab === 'HISTORY'
              ? 'bg-gradient-to-r from-[var(--gold)] via-amber-400 to-amber-500 text-black shadow-gold font-black'
              : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
          )}
        >
          <History className="w-3.5 h-3.5" />
          <span>(4) Standings</span>
        </button>

        <button
          type="button"
          onClick={() => setMobileTab('CARD')}
          className={cn(
            'relative flex-1 flex items-center justify-center gap-1 py-2 px-3 rounded-xl text-xs font-heading font-black tracking-wider uppercase transition-all duration-200 whitespace-nowrap',
            mobileTab === 'CARD'
              ? 'bg-gradient-to-r from-[var(--gold)] via-amber-400 to-amber-500 text-black shadow-gold font-black'
              : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
          )}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>(5) Cards</span>
        </button>

        <button
          type="button"
          onClick={() => setMobileTab('TRANSACTIONS')}
          className={cn(
            'relative flex-1 flex items-center justify-center gap-1 py-2 px-3 rounded-xl text-xs font-heading font-black tracking-wider uppercase transition-all duration-200 whitespace-nowrap',
            mobileTab === 'TRANSACTIONS'
              ? 'bg-gradient-to-r from-[var(--gold)] via-amber-400 to-amber-500 text-black shadow-gold font-black'
              : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
          )}
        >
          <ArrowLeftRight className="w-3.5 h-3.5" />
          <span>(6) Ledger</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* MOBILE / TABLET CONTENT STAGE (< lg)                                      */}
      {/* ========================================================================= */}
      <div className="lg:hidden flex-1 flex flex-col min-h-0 space-y-3">
        <div className="min-h-[420px] rounded-3xl bg-white/[0.03] backdrop-blur-2xl border border-white/10 p-3.5 sm:p-4 flex flex-col justify-start relative shadow-2xl">
          <AnimatePresence mode="wait" initial={false}>
            {mobileTab === 'DRAW' && <ContestantDrawTab key="mob-draw" />}
            {mobileTab === 'ROSTER' && <ContestantRosterTab key="mob-roster" />}
            {mobileTab === 'HISTORY' && <ContestantHistoryTab key="mob-history" />}
            {mobileTab === 'CARD' && <ContestantCardsTab key="mob-cards" />}
            {mobileTab === 'TRANSACTIONS' && <ContestantTransactionsTab key="mob-transactions" />}
          </AnimatePresence>
        </div>

        {/* ======================================================================= */}
        {/* COMPONENT 3: REDESIGNED PREMIUM LUXURY VITALS CARDS (MOBILE)            */}
        {/* ======================================================================= */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 shrink-0 pt-1 pb-4">
          
          {/* Card 1: AVAILABLE BUDGET */}
          <div className="rounded-2xl bg-gradient-to-b from-white/[0.06] to-white/[0.02] backdrop-blur-2xl border border-white/10 p-3.5 shadow-xl flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 shadow-md">
              <Wallet className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground block">
                Available Budget
              </span>
              <span className="text-lg font-heading font-black text-emerald-400 tracking-tight block truncate">
                {formatCurrency(budgetLeft, activeCurrency)}
              </span>
              <span className="text-[10px] text-white/50 font-mono block">
                Cap {formatCurrency(maxBudget, activeCurrency)}
              </span>
            </div>
          </div>

          {/* Card 2: TOTAL INVESTED */}
          <div className="rounded-2xl bg-gradient-to-b from-white/[0.06] to-white/[0.02] backdrop-blur-2xl border border-white/10 p-3.5 shadow-xl flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 shadow-md">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground block">
                Total Invested
              </span>
              <span className="text-lg font-heading font-black text-amber-400 tracking-tight block truncate">
                {formatCurrency(budgetSpent, activeCurrency)}
              </span>
              <span className="text-[10px] text-white/50 font-mono block">
                Purchases & Expenses
              </span>
            </div>
          </div>

          {/* Card 3: SQUAD SIGNED */}
          <div className="rounded-2xl bg-gradient-to-b from-white/[0.06] to-white/[0.02] backdrop-blur-2xl border border-white/10 p-3.5 shadow-xl flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--gold)]/15 border border-[var(--gold)]/30 flex items-center justify-center text-[var(--gold)] shrink-0 shadow-md">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground block">
                Squad Completed
              </span>
              <span className="text-lg font-heading font-black text-white tracking-tight block">
                {playersAcquired} <span className="text-xs text-muted-foreground font-sans font-normal">/ 11 Players</span>
              </span>
              {/* Progress Track */}
              <div className="w-full bg-white/10 rounded-full h-1.5 mt-1 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-emerald-500 to-[var(--gold)] h-full rounded-full transition-all duration-500"
                  style={{ width: `${squadProgressPercent}%` }}
                />
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* ========================================================================= */}
      {/* DESKTOP & 15" LAPTOP 2-COLUMN LAYOUT (lg: >= 1024px)                       */}
      {/* ========================================================================= */}
      <div className="hidden lg:grid relative z-10 flex-1 min-h-0 grid-cols-2 gap-4 xl:gap-5 mt-3 items-stretch">
        
        {/* LEFT COLUMN: (1) DRAW / (2) ROSTER + (3) REDESIGNED VITALS CARDS */}
        <div className="flex flex-col space-y-3 h-full min-h-0">
          
          {/* Left Tabs Bar */}
          <div className="shrink-0 flex items-center gap-1.5 p-1 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl shadow-inner">
            <button
              type="button"
              onClick={() => setLeftTab('DRAW')}
              className={cn(
                'relative flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-heading font-black tracking-wider uppercase transition-all duration-200',
                leftTab === 'DRAW'
                  ? 'bg-gradient-to-r from-[var(--gold)] via-amber-400 to-amber-500 text-black shadow-gold font-black'
                  : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
              )}
            >
              <Sparkles className="w-4 h-4" />
              <span>(1) LIVE DRAW</span>
              {leftTab === 'DRAW' && (
                <motion.span
                  layoutId="left-active-pill"
                  className="absolute inset-0 rounded-xl bg-white/20 pointer-events-none mix-blend-overlay"
                  transition={{ type: 'spring', bounce: 0.15, duration: 0.4 }}
                />
              )}
            </button>

            <button
              type="button"
              onClick={() => setLeftTab('ROSTER')}
              className={cn(
                'relative flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-heading font-black tracking-wider uppercase transition-all duration-200',
                leftTab === 'ROSTER'
                  ? 'bg-gradient-to-r from-[var(--gold)] via-amber-400 to-amber-500 text-black shadow-gold font-black'
                  : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
              )}
            >
              <Users className="w-4 h-4" />
              <span>(2) SQUAD ROSTER ({teamPlayers.length})</span>
              {leftTab === 'ROSTER' && (
                <motion.span
                  layoutId="left-active-pill"
                  className="absolute inset-0 rounded-xl bg-white/20 pointer-events-none mix-blend-overlay"
                  transition={{ type: 'spring', bounce: 0.15, duration: 0.4 }}
                />
              )}
            </button>
          </div>

          {/* Left Main Display Box */}
          <div className="flex-1 min-h-[380px] xl:min-h-0 rounded-3xl bg-white/[0.03] backdrop-blur-2xl border border-white/10 p-4 xl:p-5 flex flex-col justify-start relative overflow-hidden shadow-2xl">
            <AnimatePresence mode="wait" initial={false}>
              {leftTab === 'DRAW' ? (
                <ContestantDrawTab key="contestant-draw-tab" />
              ) : (
                <ContestantRosterTab key="contestant-roster-tab" />
              )}
            </AnimatePresence>
          </div>

          {/* ===================================================================== */}
          {/* COMPONENT 3: REDESIGNED LUXURY VITALS METRIC CARDS (DESKTOP)          */}
          {/* ===================================================================== */}
          <div className="shrink-0 grid grid-cols-3 gap-2.5 xl:gap-3">
            
            {/* Card 1: AVAILABLE BUDGET */}
            <div className="rounded-2xl bg-gradient-to-b from-white/[0.06] to-white/[0.02] backdrop-blur-2xl border border-white/10 p-3 xl:p-3.5 shadow-xl flex items-center gap-3">
              <div className="w-10 h-10 xl:w-11 xl:h-11 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 shadow-md">
                <Wallet className="w-5 h-5 xl:w-5.5 xl:h-5.5" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[10px] xl:text-[11px] font-mono font-bold uppercase tracking-wider text-muted-foreground block truncate">
                  Available Budget
                </span>
                <span className="text-base xl:text-xl font-heading font-black text-emerald-400 tracking-tight block truncate mt-0.5">
                  {formatCurrency(budgetLeft, activeCurrency)}
                </span>
                <span className="text-[10px] text-white/45 font-mono block truncate">
                  Cap {formatCurrency(maxBudget, activeCurrency)}
                </span>
              </div>
            </div>

            {/* Card 2: TOTAL INVESTED */}
            <div className="rounded-2xl bg-gradient-to-b from-white/[0.06] to-white/[0.02] backdrop-blur-2xl border border-white/10 p-3 xl:p-3.5 shadow-xl flex items-center gap-3">
              <div className="w-10 h-10 xl:w-11 xl:h-11 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 shadow-md">
                <TrendingUp className="w-5 h-5 xl:w-5.5 xl:h-5.5" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[10px] xl:text-[11px] font-mono font-bold uppercase tracking-wider text-muted-foreground block truncate">
                  Total Invested
                </span>
                <span className="text-base xl:text-xl font-heading font-black text-amber-400 tracking-tight block truncate mt-0.5">
                  {formatCurrency(budgetSpent, activeCurrency)}
                </span>
                <span className="text-[10px] text-white/45 font-mono block truncate">
                  Purchases & Fees
                </span>
              </div>
            </div>

            {/* Card 3: SQUAD SIGNED */}
            <div className="rounded-2xl bg-gradient-to-b from-white/[0.06] to-white/[0.02] backdrop-blur-2xl border border-white/10 p-3 xl:p-3.5 shadow-xl flex items-center gap-3">
              <div className="w-10 h-10 xl:w-11 xl:h-11 rounded-xl bg-[var(--gold)]/15 border border-[var(--gold)]/30 flex items-center justify-center text-[var(--gold)] shrink-0 shadow-md">
                <ShieldCheck className="w-5 h-5 xl:w-5.5 xl:h-5.5" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[10px] xl:text-[11px] font-mono font-bold uppercase tracking-wider text-muted-foreground block truncate">
                  Squad Completed
                </span>
                <span className="text-base xl:text-xl font-heading font-black text-white tracking-tight block mt-0.5">
                  {playersAcquired} <span className="text-xs text-muted-foreground font-sans font-normal">/ 11</span>
                </span>
                {/* Progress Track */}
                <div className="w-full bg-white/10 rounded-full h-1.5 mt-1 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-emerald-500 to-[var(--gold)] h-full rounded-full transition-all duration-500"
                    style={{ width: `${squadProgressPercent}%` }}
                  />
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* RIGHT COLUMN: (4) HISTORY / (5) CARD / (6) TRANSACTIONS */}
        <div className="flex flex-col space-y-3 h-full min-h-0">
          
          {/* Right Tabs Bar */}
          <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl shadow-inner overflow-x-auto scrollbar-none shrink-0">
            <button
              type="button"
              onClick={() => setRightTab('HISTORY')}
              className={cn(
                'relative flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-heading font-black tracking-wider uppercase transition-all duration-200 whitespace-nowrap',
                rightTab === 'HISTORY'
                  ? 'bg-gradient-to-r from-[var(--gold)] via-amber-400 to-amber-500 text-black shadow-gold font-black'
                  : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
              )}
            >
              <History className="w-4 h-4" />
              <span>(4) STANDINGS</span>
              {rightTab === 'HISTORY' && (
                <motion.span
                  layoutId="right-active-pill"
                  className="absolute inset-0 rounded-xl bg-white/20 pointer-events-none mix-blend-overlay"
                  transition={{ type: 'spring', bounce: 0.15, duration: 0.4 }}
                />
              )}
            </button>

            <button
              type="button"
              onClick={() => setRightTab('CARD')}
              className={cn(
                'relative flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-heading font-black tracking-wider uppercase transition-all duration-200 whitespace-nowrap',
                rightTab === 'CARD'
                  ? 'bg-gradient-to-r from-[var(--gold)] via-amber-400 to-amber-500 text-black shadow-gold font-black'
                  : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
              )}
            >
              <Layers className="w-4 h-4" />
              <span>(5) CARDS</span>
              {rightTab === 'CARD' && (
                <motion.span
                  layoutId="right-active-pill"
                  className="absolute inset-0 rounded-xl bg-white/20 pointer-events-none mix-blend-overlay"
                  transition={{ type: 'spring', bounce: 0.15, duration: 0.4 }}
                />
              )}
            </button>

            <button
              type="button"
              onClick={() => setRightTab('TRANSACTIONS')}
              className={cn(
                'relative flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-heading font-black tracking-wider uppercase transition-all duration-200 whitespace-nowrap',
                rightTab === 'TRANSACTIONS'
                  ? 'bg-gradient-to-r from-[var(--gold)] via-amber-400 to-amber-500 text-black shadow-gold font-black'
                  : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
              )}
            >
              <ArrowLeftRight className="w-4 h-4" />
              <span>(6) LEDGER</span>
              {rightTab === 'TRANSACTIONS' && (
                <motion.span
                  layoutId="right-active-pill"
                  className="absolute inset-0 rounded-xl bg-white/20 pointer-events-none mix-blend-overlay"
                  transition={{ type: 'spring', bounce: 0.15, duration: 0.4 }}
                />
              )}
            </button>
          </div>

          {/* Right Main Display Box */}
          <div className="flex-1 min-h-[380px] xl:min-h-0 h-full rounded-3xl bg-white/[0.03] backdrop-blur-2xl border border-white/10 p-4 xl:p-5 flex flex-col justify-start relative overflow-hidden shadow-2xl">
            <AnimatePresence mode="wait" initial={false}>
              {rightTab === 'HISTORY' && (
                <ContestantHistoryTab key="contestant-history-tab" />
              )}

              {rightTab === 'CARD' && (
                <ContestantCardsTab key="contestant-cards-tab" />
              )}

              {rightTab === 'TRANSACTIONS' && (
                <ContestantTransactionsTab key="contestant-transactions-tab" />
              )}
            </AnimatePresence>
          </div>
        </div>

      </div>
    </main>
  );
}
