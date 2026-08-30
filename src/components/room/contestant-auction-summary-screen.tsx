'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useRoomStore } from '@/lib/room-store';
import { useAuctionStore } from '@/lib/auction-store';
import { formatCurrency, ROLE_COLORS, CATEGORY_COLORS, cn } from '@/lib/utils';
import {
  Trophy,
  Shield,
  Sparkles,
  ArrowRight,
  LogOut,
  Award,
  Users,
  CheckCircle2,
  Wallet,
  Clock,
  TrendingUp,
  PieChart,
  Globe,
  ChevronRight,
  Radio,
} from 'lucide-react';
import { toast } from 'sonner';
import { Currency, PlayerRole, Team } from '@/lib/types';
import { firePlayerRevealConfetti } from '@/lib/confetti';

const POSITIONS: Array<{
  role: PlayerRole;
  label: string;
  shortLabel: string;
  icon: string;
  color: string;
}> = [
  { role: 'Goalkeeper', label: 'Goalkeepers', shortLabel: 'GK', icon: '🥅', color: '#0ea5e9' },
  { role: 'Defender', label: 'Defenders', shortLabel: 'DEF', icon: '🛡️', color: '#f59e0b' },
  { role: 'Midfielder', label: 'Midfielders', shortLabel: 'MID', icon: '⚽', color: '#10b981' },
  { role: 'Forward', label: 'Attackers', shortLabel: 'ATT', icon: '⚡', color: '#f43f5e' },
];

export function ContestantAuctionSummaryScreen() {
  const router = useRouter();
  const { activeSession, leaveRoom } = useRoomStore();
  const { teams, auctionPlayers, settings } = useAuctionStore();

  const myTeamId = activeSession?.participantId;
  const myTeam = teams.find((t) => t.id === myTeamId);
  const myTeamName = myTeam?.name || activeSession?.teamName || 'My Club';
  const myOwnerName = myTeam?.owner || activeSession?.name || 'Manager';

  const roomCurrency = (settings?.currency || activeSession?.settings?.currency || 'USD') as Currency;
  const maxBudget = myTeam?.customMaxBudget ?? (settings?.maxTeamBudget || activeSession?.settings?.maxTeamBudget || 200000000);

  const [selectedTeamId, setSelectedTeamId] = useState<string>(myTeamId || (teams[0]?.id ?? ''));

  // Fire celebratory confetti on mount
  useEffect(() => {
    try {
      firePlayerRevealConfetti();
    } catch {}
  }, []);

  // Filter sold players
  const soldPlayers = auctionPlayers.filter(
    (p) => p.soldPrice !== null && p.soldPrice !== undefined
  );
  const unsoldPlayers = auctionPlayers.filter((p) => p.status === 'UNSOLD');
  const totalVolume = soldPlayers.reduce((sum, p) => sum + (p.soldPrice ?? p.basePrice), 0);

  // Top buys
  const topBuys = soldPlayers
    .slice()
    .sort((a, b) => (b.soldPrice ?? 0) - (a.soldPrice ?? 0))
    .slice(0, 5);

  // Standings table calculation for all teams
  const teamStandings = React.useMemo(() => {
    return teams.map((team) => {
      const teamPlayers = auctionPlayers.filter(
        (ap) => ap.teamId === team.id && ap.soldPrice !== null && ap.soldPrice !== undefined
      );
      const playersTotalSpent = teamPlayers.reduce((sum, ap) => sum + (ap.soldPrice ?? ap.basePrice), 0);
      const otherExpensesTotal = (team.otherExpenses || []).reduce((sum, exp) => sum + exp.amount, 0);
      const totalSpent = team.customBudgetSpent !== undefined ? team.customBudgetSpent : (playersTotalSpent + otherExpensesTotal);
      const teamMaxBudget = team.customMaxBudget ?? (settings?.maxTeamBudget || 200000000);
      const budgetLeft = teamMaxBudget - totalSpent;

      return {
        ...team,
        players: teamPlayers,
        playersAcquired: teamPlayers.length,
        budgetSpent: totalSpent,
        budgetLeft,
        maxBudget: teamMaxBudget,
      };
    }).sort((a, b) => b.playersAcquired - a.playersAcquired || b.budgetSpent - a.budgetSpent);
  }, [teams, auctionPlayers, settings]);

  const selectedTeamData = teamStandings.find((t) => t.id === selectedTeamId) || teamStandings[0];

  const handleLeave = async () => {
    await leaveRoom();
    toast.info('Returned to home workspace.');
    router.push('/');
  };

  return (
    <main className="min-h-screen w-full flex flex-col bg-[#050608] text-foreground select-none relative overflow-x-hidden p-3.5 sm:p-6 lg:p-8 transition-colors">
      {/* Golden Championship Ambient Mesh Glow */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden" aria-hidden="true">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[55rem] h-[55rem] bg-gradient-to-b from-[var(--gold)]/20 via-amber-500/10 to-transparent rounded-full blur-[160px] opacity-90" />
        <div className="absolute top-1/2 right-1/4 w-[45rem] h-[45rem] bg-gradient-to-tr from-emerald-500/15 via-teal-500/5 to-transparent rounded-full blur-[150px] opacity-75" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-transparent via-[#050608]/80 to-[#050608]" />
      </div>

      {/* ========================================================================= */}
      {/* CONTESTANT UI NAVIGATION BAR (Exact branding and contestant badges)      */}
      {/* ========================================================================= */}
      <header className="relative z-10 flex items-center justify-between pb-4 sm:pb-5 border-b border-white/10 max-w-7xl mx-auto w-full">
        {/* Left: Logo + Team Info */}
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="relative h-11 w-11 sm:h-13 sm:w-13 rounded-2xl bg-gradient-to-br from-white/15 to-white/5 border border-white/20 p-2 shadow-2xl flex items-center justify-center backdrop-blur-2xl">
            <Image
              src="/logo/eleven.png"
              alt="Eleven Logo"
              width={44}
              height={44}
              className="object-contain drop-shadow"
              priority
            />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="font-heading font-black text-lg sm:text-xl lg:text-2xl text-foreground tracking-tight">
                {myTeamName}
              </span>
              <span className="px-2 py-0.5 rounded-lg bg-[var(--gold)]/15 border border-[var(--gold)]/30 text-[var(--gold)] font-mono text-[10px] sm:text-xs font-bold uppercase tracking-wider shadow-sm">
                #{activeSession?.participantId}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground font-medium flex items-center gap-1.5 mt-0.5">
              <span>Manager: {myOwnerName}</span>
              <span>•</span>
              <span className="text-[var(--gold)] font-mono font-semibold">Room {activeSession?.roomCode}</span>
            </p>
          </div>
        </div>

        {/* Right: Completed Status + About Me Button + Leave Button */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="hidden sm:inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[var(--gold)]/15 border border-[var(--gold)]/30 text-[var(--gold)] text-xs font-mono font-black tracking-wider uppercase shadow-inner">
            <Trophy className="w-3.5 h-3.5" />
            <span>Auction Completed</span>
          </div>

          {/* ABOUT ME BUTTON (Identical to Landing Page) */}
          <button
            type="button"
            onClick={() => router.push('/credits')}
            className="group inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/40 px-4 sm:px-5 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-white/90 backdrop-blur-md transition-all duration-300 hover:scale-105 hover:border-[var(--gold)]/60 hover:bg-[var(--gold)]/15 hover:text-white shadow-lg"
            title="Read about the creator & experience the 3D credits"
          >
            <span className="relative z-10">ABOUT ME</span>
            <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5 text-[var(--gold)]" />
          </button>

          <button
            type="button"
            onClick={handleLeave}
            className="flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-white/5 hover:bg-rose-500/20 text-muted-foreground hover:text-rose-400 border border-white/10 hover:border-rose-500/30 transition-all duration-200 active:scale-95 shadow-sm"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden xs:inline">Leave Room</span>
          </button>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* AUCTION OVERVIEW DASHBOARD CONTENT                                        */}
      {/* ========================================================================= */}
      <div className="relative z-10 max-w-7xl mx-auto w-full flex-1 flex flex-col space-y-6 sm:space-y-8 my-5 sm:my-7">
        
        {/* Championship Hero Banner */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="relative rounded-3xl bg-gradient-to-r from-amber-950/40 via-black/80 to-[#120e03] border border-[var(--gold)]/30 p-6 sm:p-8 shadow-[0_0_50px_rgba(234,179,8,0.2)] overflow-hidden"
        >
          <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-5 sm:gap-6 text-center lg:text-left">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-[var(--gold)]/15 border border-[var(--gold)]/30 flex items-center justify-center shrink-0 shadow-inner">
                <Trophy className="w-9 h-9 sm:w-11 sm:h-11 text-[var(--gold)] drop-shadow" />
              </div>
              <div className="space-y-1">
                <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-[var(--gold)]/20 text-[var(--gold)] text-xs font-mono font-bold uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>DRAFT FINALE OVERVIEW</span>
                </div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-heading font-black text-white tracking-tight">
                  The Auction Has Concluded
                </h1>
                <p className="text-xs sm:text-sm text-muted-foreground max-w-lg leading-relaxed">
                  All clubs have completed their draft selections. Browse the official room standings, marquee transfers, and club squad rosters below.
                </p>
              </div>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full lg:w-auto shrink-0">
              <div className="p-3.5 rounded-2xl bg-black/60 border border-white/10 text-center">
                <span className="text-[10px] font-mono uppercase text-muted-foreground block font-bold">
                  Total Market Volume
                </span>
                <span className="text-lg sm:text-xl font-heading font-black text-[var(--gold)] block mt-0.5">
                  {formatCurrency(totalVolume, roomCurrency)}
                </span>
              </div>
              <div className="p-3.5 rounded-2xl bg-black/60 border border-white/10 text-center">
                <span className="text-[10px] font-mono uppercase text-muted-foreground block font-bold">
                  Players Drafted
                </span>
                <span className="text-lg sm:text-xl font-heading font-black text-white block mt-0.5">
                  {soldPlayers.length} Sold
                </span>
              </div>
              <div className="p-3.5 rounded-2xl bg-black/60 border border-white/10 text-center col-span-2 sm:col-span-1">
                <span className="text-[10px] font-mono uppercase text-muted-foreground block font-bold">
                  Clubs Participating
                </span>
                <span className="text-lg sm:text-xl font-heading font-black text-emerald-400 block mt-0.5">
                  {teams.length} Clubs
                </span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* 2-Column Overview Grid: Points Table (Left) + Squad Details / Marquee Buys (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT 7 COLS: Official Room Standings & Points Table */}
          <div className="lg:col-span-7 flex flex-col space-y-4">
            <div className="p-5 sm:p-6 rounded-3xl bg-white/[0.03] backdrop-blur-2xl border border-white/10 shadow-2xl">
              <div className="flex items-center justify-between pb-4 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-[var(--gold)]" />
                  <h3 className="font-heading font-black text-base sm:text-lg uppercase tracking-wider text-white">
                    Final Club Standings &amp; Points Table
                  </h3>
                </div>
                <span className="text-xs font-mono text-muted-foreground">
                  {teamStandings.length} Teams
                </span>
              </div>

              {/* Standings Rows */}
              <div className="space-y-2.5 mt-4">
                {teamStandings.map((team, rank) => {
                  const isMyClub = team.id === myTeamId;
                  const isSelected = team.id === selectedTeamId;

                  return (
                    <div
                      key={team.id}
                      onClick={() => setSelectedTeamId(team.id)}
                      className={cn(
                        'flex items-center justify-between p-3.5 sm:p-4 rounded-2xl border transition-all cursor-pointer shadow-sm gap-3',
                        isSelected
                          ? 'bg-[var(--gold)]/10 border-[var(--gold)]/50 ring-1 ring-[var(--gold)]/30 shadow-[0_0_20px_rgba(234,179,8,0.15)]'
                          : isMyClub
                          ? 'bg-emerald-950/25 border-emerald-500/40 hover:border-emerald-500/60'
                          : 'bg-white/[0.03] hover:bg-white/[0.07] border-white/10'
                      )}
                    >
                      {/* Rank & Club Info */}
                      <div className="flex items-center gap-3.5 min-w-0 flex-1">
                        <span
                          className={cn(
                            'h-8 w-8 rounded-xl flex items-center justify-center text-xs font-mono font-black shrink-0 shadow-inner',
                            rank === 0
                              ? 'bg-[var(--gold)] text-black font-black shadow-gold'
                              : rank === 1
                              ? 'bg-zinc-300 text-black font-bold'
                              : rank === 2
                              ? 'bg-amber-700/80 text-white font-bold'
                              : 'bg-white/10 text-muted-foreground'
                          )}
                        >
                          #{rank + 1}
                        </span>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-heading font-black text-base sm:text-lg text-white truncate">
                              {team.name}
                            </p>
                            {isMyClub && (
                              <span className="px-2 py-0.2 rounded text-[9px] font-mono font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                                YOUR SQUAD
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Manager: <span className="text-foreground font-semibold">{team.owner}</span>
                          </p>
                        </div>
                      </div>

                      {/* Stats */}
                      <div className="flex items-center gap-4 sm:gap-6 text-right shrink-0">
                        <div>
                          <span className="text-[10px] font-mono uppercase text-muted-foreground block font-bold">
                            Squad
                          </span>
                          <span className="font-heading font-black text-sm sm:text-base text-white">
                            {team.playersAcquired} / 11
                          </span>
                        </div>
                        <div className="min-w-[90px]">
                          <span className="text-[10px] font-mono uppercase text-muted-foreground block font-bold">
                            Spent
                          </span>
                          <span className="font-heading font-black text-sm sm:text-base text-amber-400 tabular-nums">
                            {formatCurrency(team.budgetSpent, roomCurrency)}
                          </span>
                        </div>
                        <ChevronRight className={cn('w-4 h-4 transition-transform', isSelected && 'text-[var(--gold)] translate-x-1')} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Top 5 Marquee Deals Card */}
            <div className="p-5 sm:p-6 rounded-3xl bg-white/[0.03] backdrop-blur-2xl border border-white/10 shadow-2xl">
              <div className="flex items-center justify-between pb-3.5 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-[var(--gold)]" />
                  <h3 className="font-heading font-black text-base sm:text-lg uppercase tracking-wider text-white">
                    Top 5 Marquee Transfers of the Draft
                  </h3>
                </div>
                <span className="text-xs font-mono text-[var(--gold)] font-bold">
                  Record Signings
                </span>
              </div>

              <div className="space-y-2.5 mt-3.5">
                {topBuys.map((buy, idx) => {
                  const winnerTeam = teams.find((t) => t.id === buy.teamId);
                  return (
                    <div
                      key={buy.id}
                      className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.03] border border-white/10 gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <span className="w-7 h-7 rounded-xl bg-[var(--gold)]/15 text-[var(--gold)] font-mono font-black text-xs flex items-center justify-center shrink-0">
                          #{idx + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="font-heading font-black text-sm sm:text-base text-white truncate">
                            {buy.player.name}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {buy.role} • Won by <span className="text-white font-bold">{winnerTeam?.name || 'Club'}</span>
                          </p>
                        </div>
                      </div>
                      <span className="font-heading font-black text-sm sm:text-base text-[var(--gold)] tabular-nums">
                        {formatCurrency(buy.soldPrice ?? buy.basePrice, buy.currency || roomCurrency)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* RIGHT 5 COLS: Selected Club Squad Roster & Deep Dive */}
          <div className="lg:col-span-5 flex flex-col space-y-4">
            <div className="p-5 sm:p-6 rounded-3xl bg-white/[0.03] backdrop-blur-2xl border border-white/10 shadow-2xl">
              <div className="flex items-center justify-between pb-4 border-b border-white/10">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--gold)] font-bold block">
                    INSPECTING SQUAD
                  </span>
                  <h3 className="font-heading font-black text-lg sm:text-xl text-white truncate mt-0.5">
                    {selectedTeamData?.name || 'Club'}
                  </h3>
                </div>
                <div className="text-right">
                  <span className="text-xs font-mono text-muted-foreground block">
                    Manager: {selectedTeamData?.owner}
                  </span>
                  <span className="text-xs font-heading font-bold text-emerald-400">
                    {formatCurrency(selectedTeamData?.budgetLeft || 0, roomCurrency)} Purse Left
                  </span>
                </div>
              </div>

              {/* Squad Players List */}
              <div className="space-y-2.5 mt-4 max-h-[460px] overflow-y-auto pr-1.5 scrollbar-thin">
                {selectedTeamData?.players?.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground">
                    <p className="text-sm font-semibold">No players signed for this club.</p>
                  </div>
                ) : (
                  selectedTeamData?.players?.map((p, i) => {
                    const roleStyle = ROLE_COLORS[p.role] || {
                      pillBg: 'bg-amber-500/20',
                      pillText: 'text-amber-300',
                      pillBorder: 'border-amber-500/40',
                    };

                    return (
                      <div
                        key={p.id}
                        className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.04] border border-white/10 gap-3"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <span className="text-xs font-mono font-bold text-muted-foreground w-4 text-center shrink-0">
                            {i + 1}
                          </span>

                          <div className="relative h-10 w-10 rounded-xl overflow-hidden bg-black/60 border border-white/10 shrink-0 flex items-center justify-center">
                            {p.player.photo ? (
                              <Image
                                src={p.player.photo}
                                alt={p.player.name}
                                fill
                                unoptimized={Boolean(p.player.photo.startsWith('data:'))}
                                className="object-cover object-top"
                                sizes="40px"
                              />
                            ) : (
                              <span className="text-xs font-mono font-bold text-muted-foreground">
                                {p.player.name.substring(0, 2).toUpperCase()}
                              </span>
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-heading font-black text-white truncate">
                              {p.player.name}
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
                                {p.role}
                              </span>
                              <span className="text-[11px] text-muted-foreground font-mono">
                                {p.player.position}
                              </span>
                            </div>
                          </div>
                        </div>

                        <span className="font-heading font-black text-sm text-[var(--gold)] tabular-nums shrink-0">
                          {formatCurrency(p.soldPrice ?? p.basePrice, p.currency || roomCurrency)}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Bottom Credits & About Me Card */}
            <div className="p-5 rounded-3xl bg-white/[0.03] backdrop-blur-2xl border border-white/10 flex items-center justify-between gap-4">
              <div>
                <h4 className="font-heading font-black text-sm text-white">Experience Eleven Credits</h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Explore the 3D cinematic credits &amp; creator profile.
                </p>
              </div>

              {/* ABOUT ME BUTTON */}
              <button
                type="button"
                onClick={() => router.push('/credits')}
                className="group inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/50 px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.22em] text-white/90 backdrop-blur-md transition-all duration-300 hover:scale-105 hover:border-[var(--gold)]/60 hover:bg-[var(--gold)]/15 hover:text-white shadow-lg shrink-0"
              >
                <span>ABOUT ME</span>
                <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5 text-[var(--gold)]" />
              </button>
            </div>

          </div>

        </div>

      </div>
    </main>
  );
}
