'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { AppLayout } from '@/components/layout/app-layout';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AddPlayerModal } from '@/components/auction/add-player-modal';
import { useAuctionStore } from '@/lib/auction-store';
import { useHydrated } from '@/lib/use-hydrated';
import {
  ROLE_COLORS,
  CATEGORY_COLORS,
  formatCurrency,
  cn,
} from '@/lib/utils';
import { PlayerRole } from '@/lib/types';
import {
  Plus,
  ArrowRight,
  Clock,
  Trophy,
  Sparkles,
  History,
  ChevronRight,
  ChevronLeft,
  PieChart,
  Shield,
  Zap,
  Flame,
  Target,
} from 'lucide-react';

const POSITIONS: Array<{
  role: PlayerRole;
  label: string;
  shortLabel: string;
  icon: string;
  color: string;
  borderColor: string;
  bgGradient: string;
  glow: string;
  badgeBg: string;
  badgeText: string;
}> = [
  {
    role: 'Goalkeeper',
    label: 'Goalkeepers',
    shortLabel: 'GK',
    icon: '🥅',
    color: '#38bdf8',
    borderColor: 'border-white/10 hover:border-white/20',
    bgGradient: 'bg-white/[0.03] hover:bg-white/[0.06]',
    glow: 'hover:shadow-[0_12px_30px_-8px_rgba(0,0,0,0.6)]',
    badgeBg: 'bg-white/5 border-white/10',
    badgeText: 'text-white/80',
  },
  {
    role: 'Defender',
    label: 'Defenders',
    shortLabel: 'DEF',
    icon: '🛡️',
    color: '#fbbf24',
    borderColor: 'border-white/10 hover:border-white/20',
    bgGradient: 'bg-white/[0.03] hover:bg-white/[0.06]',
    glow: 'hover:shadow-[0_12px_30px_-8px_rgba(0,0,0,0.6)]',
    badgeBg: 'bg-white/5 border-white/10',
    badgeText: 'text-white/80',
  },
  {
    role: 'Midfielder',
    label: 'Midfielders',
    shortLabel: 'MID',
    icon: '⚽',
    color: '#34d399',
    borderColor: 'border-white/10 hover:border-white/20',
    bgGradient: 'bg-white/[0.03] hover:bg-white/[0.06]',
    glow: 'hover:shadow-[0_12px_30px_-8px_rgba(0,0,0,0.6)]',
    badgeBg: 'bg-white/5 border-white/10',
    badgeText: 'text-white/80',
  },
  {
    role: 'Forward',
    label: 'Attackers',
    shortLabel: 'ATT',
    icon: '⚡',
    color: '#fb7185',
    borderColor: 'border-white/10 hover:border-white/20',
    bgGradient: 'bg-white/[0.03] hover:bg-white/[0.06]',
    glow: 'hover:shadow-[0_12px_30px_-8px_rgba(0,0,0,0.6)]',
    badgeBg: 'bg-white/5 border-white/10',
    badgeText: 'text-white/80',
  },
];

export default function DashboardPage() {
  const {
    getTotalPlayers,
    getAvailableCount,
    getDrawnCount,
    getHistory,
    auctionPlayers,
    teams,
    settings,
  } = useAuctionStore();

  const hydrated = useHydrated();
  const totalPlayers = getTotalPlayers();
  const availableCount = getAvailableCount();
  const drawnCount = getDrawnCount();

  const recentlyDrawn = React.useMemo(() => {
    if (!hydrated) return [];
    const drawn = auctionPlayers.filter(
      (ap) => ap.status === 'DRAWN' || ap.soldPrice !== null || ap.teamId !== null || ap.drawnAt !== null
    );
    return drawn
      .slice()
      .sort((a, b) => {
        const timeA = new Date(a.soldAt || a.drawnAt || a.createdAt || 0).getTime();
        const timeB = new Date(b.soldAt || b.drawnAt || b.createdAt || 0).getTime();
        return timeB - timeA;
      })
      .slice(0, 5);
  }, [auctionPlayers, hydrated]);

  const [showAddModal, setShowAddModal] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [slideDirection, setSlideDirection] = useState<'left' | 'right'>('right');

  const history = hydrated ? getHistory() : [];
  const reversedHistory = React.useMemo(() => history.slice().reverse(), [history]);

  // Handle Carousel navigation
  const handlePrevSlide = () => {
    if (currentSlide > 0) {
      setSlideDirection('left');
      setCurrentSlide((prev) => prev - 1);
    }
  };

  const handleNextSlide = () => {
    if (currentSlide < reversedHistory.length - 1) {
      setSlideDirection('right');
      setCurrentSlide((prev) => prev + 1);
    }
  };

  // Display values during SSR to prevent hydration mismatch
  const displayTotalPlayers = hydrated ? totalPlayers : 0;
  const displayAvailableCount = hydrated ? availableCount : 0;
  const displayDrawnCount = hydrated ? drawnCount : 0;
  const displayRecentlyDrawn = hydrated ? recentlyDrawn : [];

  // Compute Pool Position / Role breakdown (Goalkeepers, Defenders, Midfielders, Attackers)
  const positionBreakdown = React.useMemo(() => {
    if (!hydrated) {
      return POSITIONS.map((pos) => ({
        ...pos,
        count: 0,
        progress: 0,
      }));
    }

    return POSITIONS.map((pos) => {
      const count = auctionPlayers.filter((ap) => ap.role === pos.role).length;
      const progress = totalPlayers > 0 ? (count / totalPlayers) * 100 : 0;
      return {
        ...pos,
        count,
        progress,
      };
    });
  }, [hydrated, auctionPlayers, totalPlayers]);

  const activeSnapshot = reversedHistory[currentSlide];

  return (
    <AppLayout>
      <div className="space-y-8">
        <PageHeader
          lines={['AUCTION', 'OVERVIEW']}
          description="Overview of your football auction pool, history snapshots, and live categories"
          action={
            <Button
              onClick={() => setShowAddModal(true)}
              className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2 px-6 py-3 shadow-lg"
              size="lg"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Add Player
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          }
        />

        {/* Top Grid: History Snapshots Carousel + Recently Drawn */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Auction History Slide Carousel (Left 2 cols) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-2"
          >
            <Card className="glass h-full overflow-hidden border-border/40 shadow-xl flex flex-col justify-between">
              {/* Card Header with Carousel Controls */}
              <CardHeader className="pb-4 border-b border-border/20">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-[var(--gold)]/10 border border-[var(--gold)]/20 flex items-center justify-center text-[var(--gold)] shrink-0">
                      <Trophy className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <div>
                      <CardTitle className="font-heading text-lg sm:text-xl font-bold tracking-tight">
                        Auction History &amp; Snapshots
                      </CardTitle>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Archived rosters, sale records, and expenditure snapshots
                      </p>
                    </div>
                  </div>

                  {/* Carousel Controls */}
                  {reversedHistory.length > 0 ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-muted-foreground font-semibold px-2 py-1 rounded-md bg-muted/40 border border-border/30">
                        {currentSlide + 1} of {reversedHistory.length}
                      </span>
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={handlePrevSlide}
                          disabled={currentSlide === 0}
                          className="h-8 w-8 rounded-lg border-border/40 hover:bg-muted active:scale-95 transition-all"
                          aria-label="Previous Auction Snapshot"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={handleNextSlide}
                          disabled={currentSlide === reversedHistory.length - 1}
                          className="h-8 w-8 rounded-lg border-border/40 hover:bg-muted active:scale-95 transition-all"
                          aria-label="Next Auction Snapshot"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </div>
              </CardHeader>

              {/* Card Content (One Auction Slide at a time) */}
              <CardContent className="p-5 sm:p-6 flex-1 flex flex-col justify-between">
                {reversedHistory.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 px-4 text-center my-auto">
                    <div className="h-14 w-14 rounded-2xl bg-muted/30 border border-border/40 flex items-center justify-center mb-4 text-muted-foreground/50">
                      <History className="h-7 w-7" aria-hidden="true" />
                    </div>
                    <h4 className="font-heading text-lg font-bold text-foreground mb-1.5">
                      No Auction Snapshots Yet
                    </h4>
                    <p className="text-xs sm:text-sm text-muted-foreground max-w-md mb-5 leading-relaxed">
                      Finalize and archive your auction in Settings to save permanent snapshots of team squads, player bids, and expenditures.
                    </p>
                    <Link
                      href="/auction/settings"
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 text-xs font-heading font-bold uppercase tracking-wider transition-all"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>Go to Settings to Archive</span>
                    </Link>
                  </div>
                ) : activeSnapshot ? (
                  <div className="flex-1 flex flex-col justify-between space-y-5">
                    {/* Animated Slide Transition */}
                    <AnimatePresence mode="wait" custom={slideDirection}>
                      <motion.div
                        key={activeSnapshot.id}
                        custom={slideDirection}
                        initial={{ opacity: 0, x: slideDirection === 'right' ? 30 : -30 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: slideDirection === 'right' ? -30 : 30 }}
                        transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
                        className="p-5 sm:p-6 rounded-2xl border border-border/30 bg-muted/15 flex flex-col justify-between space-y-4"
                      >
                        {/* Snapshot Top Meta */}
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 pb-3 border-b border-border/20">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="h-3 w-3 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                            <h4 className="font-heading font-black text-lg sm:text-xl text-foreground truncate">
                              {activeSnapshot.name}
                            </h4>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono shrink-0">
                            <Clock className="h-3.5 w-3.5" />
                            <span>
                              {format(new Date(activeSnapshot.completedAt), 'dd MMMM yyyy, hh:mm a')}
                            </span>
                          </div>
                        </div>

                        {/* Snapshot Metrics Bar */}
                        {(() => {
                          const totalSpent = activeSnapshot.participants.reduce(
                            (sum, p) => sum + (p.budgetSpent || 0),
                            0
                          );
                          const totalSold = activeSnapshot.participants.reduce(
                            (sum, p) => sum + (p.playersAcquired || 0),
                            0
                          );

                          return (
                            <div className="grid grid-cols-3 gap-3 text-center sm:text-left">
                              <div className="p-3 rounded-xl bg-background/50 border border-border/20">
                                <span className="block text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground">
                                  Clubs
                                </span>
                                <span className="text-base sm:text-xl font-heading font-black text-foreground tabular-nums">
                                  {activeSnapshot.participants.length}
                                </span>
                              </div>

                              <div className="p-3 rounded-xl bg-background/50 border border-border/20">
                                <span className="block text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground">
                                  Players Sold
                                </span>
                                <span className="text-base sm:text-xl font-heading font-black text-emerald-400 tabular-nums">
                                  {totalSold}
                                </span>
                              </div>

                              <div className="p-3 rounded-xl bg-background/50 border border-border/20">
                                <span className="block text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground">
                                  Total Spent
                                </span>
                                <span className="text-base sm:text-xl font-heading font-black text-[var(--gold)] tabular-nums truncate block">
                                  {formatCurrency(totalSpent, activeSnapshot.settings?.currency || 'INR')}
                                </span>
                              </div>
                            </div>
                          );
                        })()}

                        {/* Participating Teams Chips */}
                        <div className="space-y-2 pt-1">
                          <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-muted-foreground block">
                            Participating Clubs Roster
                          </span>
                          <div className="flex flex-wrap gap-2">
                            {activeSnapshot.participants.slice(0, 6).map((p) => (
                              <span
                                key={p.id}
                                className="px-3 py-1.5 rounded-xl bg-card border border-border/40 text-xs font-semibold text-foreground flex items-center gap-2 shadow-sm"
                              >
                                <span className="truncate max-w-[120px]">{p.name}</span>
                                <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 font-mono font-bold text-[10px]">
                                  {p.playersAcquired} signed
                                </span>
                              </span>
                            ))}
                            {activeSnapshot.participants.length > 6 && (
                              <span className="px-2.5 py-1.5 rounded-xl bg-muted/40 text-xs font-mono text-muted-foreground flex items-center">
                                +{activeSnapshot.participants.length - 6} more clubs
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Action Link to Full Snapshot */}
                        <div className="pt-2 flex items-center justify-between border-t border-border/20">
                          <Link
                            href="/auction/history"
                            className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                          >
                            View All {reversedHistory.length} Archives
                          </Link>

                          <Link
                            href={`/auction/history/${activeSnapshot.id}`}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[var(--gold)] text-black font-heading font-bold text-xs uppercase tracking-wider transition-transform hover:scale-105 shadow-gold"
                          >
                            <span>View Full Snapshot</span>
                            <ChevronRight className="h-3.5 w-3.5" />
                          </Link>
                        </div>
                      </motion.div>
                    </AnimatePresence>

                    {/* Dot Pagination Indicators */}
                    {reversedHistory.length > 1 && (
                      <div className="flex items-center justify-center gap-1.5 pt-2">
                        {reversedHistory.map((_, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => {
                              setSlideDirection(i > currentSlide ? 'right' : 'left');
                              setCurrentSlide(i);
                            }}
                            className={cn(
                              'h-2 rounded-full transition-all duration-300',
                              i === currentSlide
                                ? 'w-6 bg-[var(--gold)] shadow-sm'
                                : 'w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50'
                            )}
                            aria-label={`Go to snapshot slide ${i + 1}`}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </motion.div>

          {/* Recently Drawn (Right 1 col) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          >
            <Card className="glass h-full overflow-hidden border-border/40 shadow-xl flex flex-col justify-between">
              <CardHeader className="pb-4 border-b border-border/20">
                <div className="flex items-center justify-between">
                  <CardTitle className="font-heading text-lg font-semibold">Recently Drawn</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                </div>
              </CardHeader>
              <CardContent className="p-5 flex-1 flex flex-col justify-center">
                {displayRecentlyDrawn.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-48 text-center my-auto">
                    <Trophy className="h-12 w-12 text-muted-foreground/30 mb-3" aria-hidden="true" />
                    <p className="text-muted-foreground font-medium">No players drawn yet</p>
                    <p className="text-xs text-muted-foreground/50 mt-1">Start the auction to see live draws here</p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {displayRecentlyDrawn.map((ap, index) => {
                      const assignedTeam = teams.find((t) => t.id === ap.teamId);
                      const isMystery = Boolean(
                        ap.isMystery ||
                        ap.player.name.startsWith('MYSTERY') ||
                        ap.id.startsWith('auction-mystery-')
                      );
                      const price = ap.soldPrice ?? ap.basePrice;

                      return (
                        <motion.div
                          key={ap.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3, delay: index * 0.05, ease: [0.16, 1, 0.3, 1] }}
                          className={cn(
                            'flex items-center justify-between p-3 rounded-xl border transition-all duration-200 gap-3 shadow-sm',
                            isMystery
                              ? 'bg-gradient-to-r from-blue-950/40 via-cyan-950/20 to-black/40 border-cyan-500/30 hover:border-cyan-400/50'
                              : 'glass hover:bg-card-glass-hover border-border/30'
                          )}
                        >
                          {/* Left: Index badge */}
                          <div
                            className="h-9 w-9 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 shadow-inner"
                            style={{
                              backgroundColor: `${CATEGORY_COLORS[ap.player.category]}20`,
                              color: CATEGORY_COLORS[ap.player.category],
                            }}
                          >
                            #{index + 1}
                          </div>

                          {/* Middle: Player Name, Role & Assigned Team */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className={cn(
                                'font-medium truncate text-sm',
                                isMystery ? 'text-cyan-200 font-heading font-black' : 'text-foreground'
                              )}>
                                {ap.player.name}
                              </p>
                              {isMystery && (
                                <span className="px-1.5 py-0.2 rounded text-[8px] font-mono font-bold uppercase tracking-wider bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                                  MYSTERY
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                              <span className="text-[11px] text-muted-foreground capitalize font-medium">
                                {ap.role}
                              </span>
                              <span className="text-[10px] text-muted-foreground/50">•</span>
                              {assignedTeam ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 truncate max-w-[120px]">
                                  <Shield className="w-3 h-3 shrink-0" />
                                  <span className="truncate">{assignedTeam.name}</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-400/90">
                                  <span>Pending Sale</span>
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Right: Value & Sold status */}
                          <div className="text-right shrink-0">
                            <p className="font-heading font-black text-sm text-primary tabular-nums">
                              {formatCurrency(price, ap.currency || settings.currency)}
                            </p>
                            <p className="text-[10px] font-mono text-muted-foreground mt-0.5">
                              {ap.soldPrice !== null ? 'Acquired' : 'Base'}
                            </p>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Bottom Section: Position Pool Distribution with Rounded Progress Bar & Large Gauges */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.28, ease: [0.16, 1, 0.3, 1] }}
        >
          <Card className="glass overflow-hidden border-border/40 shadow-xl">
            <CardHeader className="pb-4 border-b border-border/20">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 rounded-2xl bg-primary/15 border border-primary/30 flex items-center justify-center text-primary shrink-0 shadow-sm">
                    <PieChart className="h-6 w-6" aria-hidden="true" />
                  </div>
                  <div>
                    <CardTitle className="font-heading text-xl sm:text-2xl font-black tracking-tight text-foreground">
                      Pool Position Distribution
                    </CardTitle>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 font-medium">
                      Squad role allocations: Goalkeepers, Defenders, Midfielders, and Attackers
                    </p>
                  </div>
                </div>

                <Badge
                  variant="outline"
                  className="px-4 py-1.5 text-xs sm:text-sm font-mono font-bold border-[var(--gold)]/50 text-[var(--gold)] bg-[var(--gold)]/10 self-start sm:self-auto shadow-sm"
                >
                  {displayTotalPlayers} TOTAL PLAYERS
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="p-6 sm:p-8 space-y-7">
              {/* Multi-Segment Rounded Progress Bar */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs sm:text-sm text-muted-foreground font-mono font-bold">
                  <span className="uppercase tracking-wider text-foreground">Position Allocation Ratio</span>
                  <span>{displayTotalPlayers > 0 ? '100% POOL ACTIVE' : '0 PLAYERS'}</span>
                </div>

                {/* The Rounded Progress Track */}
                <div className="h-5 w-full rounded-full bg-muted/40 p-0.5 flex gap-1.5 overflow-hidden border border-border/40 shadow-inner">
                  {positionBreakdown.map(
                    (pos) =>
                      pos.count > 0 && (
                        <motion.div
                          key={pos.role}
                          initial={{ width: 0 }}
                          animate={{ width: `${pos.progress}%` }}
                          transition={{ duration: 0.85, ease: [0.16, 1, 0.3, 1] }}
                          className="h-full rounded-full transition-all hover:brightness-125 cursor-pointer relative group shadow-sm"
                          style={{ backgroundColor: pos.color }}
                          title={`${pos.label}: ${pos.count} players (${pos.progress.toFixed(1)}%)`}
                        />
                      )
                  )}
                  {displayTotalPlayers === 0 && (
                    <div className="h-full w-full rounded-full bg-muted/20" />
                  )}
                </div>
              </div>

              {/* 4 Position Large Gauges & Metrics Grid (Distinct Premium Cards) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                {positionBreakdown.map((pos, idx) => (
                  <motion.div
                    key={pos.role}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, delay: 0.3 + idx * 0.06, ease: [0.16, 1, 0.3, 1] }}
                    className={cn(
                      'p-5 sm:p-6 rounded-2xl border backdrop-blur-xl transition-all duration-300',
                      'flex flex-col items-center justify-between gap-4 text-center group shadow-xl hover:scale-[1.02]',
                      pos.bgGradient,
                      pos.borderColor,
                      pos.glow
                    )}
                  >
                    {/* Top Row: Icon container & Short Tag */}
                    <div className="flex items-center justify-between w-full px-1">
                      <div className="w-11 h-11 rounded-2xl bg-black/50 border border-white/10 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform duration-300">
                        <span className="text-2xl filter drop-shadow-sm">{pos.icon}</span>
                      </div>
                      <span
                        className={cn(
                          'px-3 py-1 rounded-full text-xs font-mono font-black uppercase tracking-wider border shadow-sm',
                          pos.badgeBg,
                          pos.badgeText
                        )}
                      >
                        {pos.shortLabel}
                      </span>
                    </div>

                    {/* Circular Gauge with Large Visible Percentage */}
                    <div className="relative w-20 h-20 sm:w-24 sm:h-24 flex items-center justify-center my-1">
                      <svg className="w-20 h-20 sm:w-24 sm:h-24 -rotate-90" viewBox="0 0 80 80">
                        <circle
                          cx="40"
                          cy="40"
                          r="32"
                          strokeWidth="6"
                          fill="transparent"
                          className="stroke-white/10"
                        />
                        <motion.circle
                          cx="40"
                          cy="40"
                          r="32"
                          strokeWidth="6"
                          fill="transparent"
                          stroke={pos.color}
                          strokeLinecap="round"
                          strokeDasharray={2 * Math.PI * 32}
                          initial={{ strokeDashoffset: 2 * Math.PI * 32 }}
                          animate={{
                            strokeDashoffset:
                              2 * Math.PI * 32 - (pos.progress / 100) * (2 * Math.PI * 32),
                          }}
                          transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
                        />
                      </svg>
                      <div className="absolute flex flex-col items-center justify-center">
                        <span className="font-heading font-black text-base sm:text-lg text-white tabular-nums drop-shadow-sm">
                          {pos.progress.toFixed(0)}%
                        </span>
                      </div>
                    </div>

                    {/* Large Bold Typography for Count & Label */}
                    <div className="w-full space-y-1 pt-1">
                      <h4 className="font-heading font-bold text-xs sm:text-sm uppercase tracking-wider text-white/60 group-hover:text-white transition-colors">
                        {pos.label}
                      </h4>
                      <p className="font-heading text-2xl sm:text-3xl font-black text-white tabular-nums">
                        {pos.count}{' '}
                        <span className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-white/40">
                          {pos.count === 1 ? 'player' : 'players'}
                        </span>
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <AddPlayerModal open={showAddModal} onOpenChange={setShowAddModal} />
      </div>
    </AppLayout>
  );
}