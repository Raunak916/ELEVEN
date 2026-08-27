'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { AppLayout } from '@/components/layout/app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuctionStore } from '@/lib/auction-store';
import { AuctionPlayer, Team, Currency, PlayerCategory, PlayerRole } from '@/lib/types';
import { formatCurrency, ROLE_COLORS, CATEGORY_COLORS, cn } from '@/lib/utils';
import { firePlayerRevealConfetti } from '@/lib/confetti';
import {
  Trophy,
  Users,
  RefreshCw,
  Dices,
  Sparkles,
  ArrowRight,
  UserPlus,
  X,
  Ban,
  Star,
  Award,
  Shield,
  Zap,
  Check,
} from 'lucide-react';
import { AssignmentPanel } from './assignment-panel';
import { useHydrated } from '@/lib/use-hydrated';
import { toast } from 'sonner';
import { AnimatedNumber } from '@/components/core/animated-number';

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

const ROLE_DRAW_STYLES: Record<
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

export function DrawScreen() {
  const {
    auctionPlayers,
    getDrawnCount,
    getTotalPlayers,
    isDrawing,
    drawnPlayer,
    drawPhase,
    startDraw,
    completeDraw,
    resetDraw,
    setDrawPhase,
    getTeams,
    confirmSale,
    markPlayerUnsold,
    settings,
    getTeamBudgets,
  } = useAuctionStore();

  const hydrated = useHydrated();

  const availablePlayers = useMemo(
    () => auctionPlayers.filter((ap) => ap.status === 'AVAILABLE'),
    [auctionPlayers]
  );
  const unsoldPlayers = useMemo(
    () => auctionPlayers.filter((ap) => ap.status === 'UNSOLD'),
    [auctionPlayers]
  );
  const availableCount = hydrated ? availablePlayers.length : 0;
  const unsoldCount = hydrated ? unsoldPlayers.length : 0;
  const drawnCount = hydrated ? getDrawnCount() : 0;
  const totalCount = hydrated ? getTotalPlayers() : 0;
  const teams = hydrated ? getTeams() : [];
  const teamBudgets = hydrated ? getTeamBudgets() : [];

  const [isUnsoldDrawMode, setIsUnsoldDrawMode] = useState(false);
  const [cyclePlayer, setCyclePlayer] = useState<AuctionPlayer | null>(null);
  const [cycleIndex, setCycleIndex] = useState(0);
  const [shuffledPool, setShuffledPool] = useState<AuctionPlayer[]>([]);
  const [showAssignmentPanel, setShowAssignmentPanel] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRefs = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Live state of current drawn player
  const currentDrawnPlayer = useMemo(() => {
    if (!drawnPlayer) return null;
    return auctionPlayers.find((ap) => ap.id === drawnPlayer.id) || drawnPlayer;
  }, [auctionPlayers, drawnPlayer]);

  const isCurrentPlayerAssigned = Boolean(
    currentDrawnPlayer?.teamId && currentDrawnPlayer?.soldPrice !== null
  );
  const assignedTeam = isCurrentPlayerAssigned && currentDrawnPlayer?.teamId
    ? teams.find((t) => t.id === currentDrawnPlayer.teamId)
    : null;

  const remainingDrawCount = isUnsoldDrawMode ? unsoldCount : availableCount;
  const canDrawAgain = remainingDrawCount >= 1;
  const hasUnsoldPlayersToDraw = !isUnsoldDrawMode && availableCount === 0 && unsoldCount > 0;

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      timeoutRefs.current.forEach((t) => clearTimeout(t));
    };
  }, []);

  const availablePlayerIds = useMemo(
    () => availablePlayers.map((p) => p.id).join(','),
    [availablePlayers]
  );

  useEffect(() => {
    if (availablePlayers.length > 0) {
      const shuffleTimer = setTimeout(() => {
        const shuffled = [...availablePlayers].sort(() => Math.random() - 0.5);
        setShuffledPool(shuffled);
      }, 0);
      return () => clearTimeout(shuffleTimer);
    } else {
      const clearTimer = setTimeout(() => {
        setShuffledPool([]);
      }, 0);
      return () => clearTimeout(clearTimer);
    }
  }, [availablePlayerIds]);

  const handleDrawStart = useCallback((forceUnsold?: boolean) => {
    const drawingUnsold = forceUnsold ?? (availableCount === 0 && unsoldCount > 0 ? true : isUnsoldDrawMode);
    const targetPool = drawingUnsold ? unsoldPlayers : (shuffledPool.length > 0 ? shuffledPool : availablePlayers);

    if (targetPool.length === 0 || isDrawing) return;

    if (drawingUnsold) {
      setIsUnsoldDrawMode(true);
    }

    startDraw();
    setDrawPhase('cycling');

    const speeds = [50, 50, 50, 60, 60, 80, 80, 100, 120, 140, 170, 210, 260, 320, 400, 520, 680];

    let speedIndex = 0;
    let currentIndex = Math.floor(Math.random() * targetPool.length);

    const cycle = () => {
      currentIndex = (currentIndex + 1) % targetPool.length;
      setCycleIndex(currentIndex);
      setCyclePlayer(targetPool[currentIndex]);

      if (speedIndex < speeds.length - 1) {
        speedIndex++;
        intervalRef.current = setTimeout(
          cycle,
          speeds[speedIndex]
        ) as unknown as ReturnType<typeof setInterval>;
      } else {
        setDrawPhase('revealing');
        timeoutRefs.current.push(
          setTimeout(() => {
            const finalPlayer = targetPool[currentIndex];
            completeDraw(finalPlayer);
            firePlayerRevealConfetti();
          }, 600)
        );
      }
    };

    intervalRef.current = setTimeout(cycle, speeds[0]) as unknown as ReturnType<
      typeof setInterval
    >;
  }, [
    availableCount,
    unsoldCount,
    isUnsoldDrawMode,
    unsoldPlayers,
    shuffledPool,
    availablePlayers,
    isDrawing,
    startDraw,
    setDrawPhase,
    completeDraw,
  ]);

  const handleReset = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    timeoutRefs.current.forEach((t) => clearTimeout(t));
    timeoutRefs.current = [];
    resetDraw();
    setCyclePlayer(null);
    setCycleIndex(0);
    setShowAssignmentPanel(false);
  }, [resetDraw]);

  const handleMarkUnsold = useCallback(() => {
    if (currentDrawnPlayer && !isCurrentPlayerAssigned) {
      const playerName = currentDrawnPlayer.player.name;
      markPlayerUnsold(currentDrawnPlayer.id);
      toast.info(`${playerName} marked as Unsold`, {
        description: 'Player moved to the Unsold section in Player Pool.',
      });
      setShowAssignmentPanel(false);
      handleReset();
    }
  }, [currentDrawnPlayer, isCurrentPlayerAssigned, markPlayerUnsold, handleReset]);

  const progress = totalCount > 0 ? ((totalCount - availableCount) / totalCount) * 100 : 0;

  return (
    <AppLayout>
      <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center relative py-8">
        <div
          className="absolute inset-0 pointer-events-none opacity-25"
          aria-hidden="true"
          style={{
            background:
              drawPhase === 'complete'
                ? 'radial-gradient(circle at 50% 35%, oklch(0.78 0.16 85 / 0.35), transparent 70%)'
                : 'radial-gradient(circle at 50% 35%, oklch(0.65 0.18 155 / 0.25), transparent 70%)',
          }}
        />

        <div className="relative z-10 w-full max-w-4xl px-4 sm:px-6 flex flex-col items-center">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: EASE_OUT_EXPO }}
            className="text-center mb-6"
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[var(--gold)]/10 border border-[var(--gold)]/20 text-[var(--gold)] text-xs font-mono font-bold tracking-widest uppercase mb-3 shadow-sm">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              LIVE AUCTION DRAW
            </div>
            <h1 className="font-heading text-3xl sm:text-5xl font-black text-foreground tracking-tight mb-2">
              {drawPhase === 'complete' ? 'PLAYER UNLOCKED' : 'PLAYER DRAW'}
            </h1>
          </motion.div>

          {totalCount > 0 && (
            <motion.div
              initial={{ opacity: 0, scaleX: 0 }}
              animate={{ opacity: 1, scaleX: 1 }}
              className="w-full max-w-md mb-8"
            >
              <div className="flex justify-between text-xs font-mono font-bold text-muted-foreground mb-2 px-1">
                {isUnsoldDrawMode || availableCount === 0 ? (
                  <span className="flex items-center gap-1.5 text-amber-400">
                    <Ban className="h-3.5 w-3.5" aria-hidden="true" />
                    {unsoldCount} UNSOLD REMAINING
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-primary">
                    <Users className="h-3.5 w-3.5" aria-hidden="true" />
                    {availableCount} REMAINING
                  </span>
                )}
                <span className="flex items-center gap-1.5 text-[var(--gold)]">
                  <Trophy className="h-3.5 w-3.5" aria-hidden="true" />
                  {drawnCount} DRAWN
                </span>
              </div>
              <div className="h-2 w-full rounded-full overflow-hidden bg-muted/40 p-0.5 border border-border/30 shadow-inner">
                <motion.div
                  className={cn(
                    'h-full rounded-full transition-all',
                    isUnsoldDrawMode || availableCount === 0
                      ? 'bg-gradient-to-r from-amber-500 to-[var(--gold)]'
                      : 'bg-gradient-to-r from-[var(--emerald)] to-[var(--gold)]'
                  )}
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.6, ease: EASE_OUT_EXPO }}
                />
              </div>
            </motion.div>
          )}

          <div className="w-full flex flex-col items-center">
            <AnimatePresence mode="wait">
              {drawPhase === 'idle' && (
                <motion.div
                  key="idle"
                  initial={{ opacity: 0, scale: 0.92 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.92 }}
                  className="flex flex-col items-center w-full"
                >
                  {availableCount === 0 ? (
                    unsoldCount > 0 ? (
                      <Card className="glass max-w-lg w-full text-center p-8 sm:p-10 border-amber-500/30 bg-gradient-to-b from-amber-950/20 via-black/40 to-black/60 shadow-2xl rounded-3xl">
                        <CardContent className="pt-2 p-0 flex flex-col items-center space-y-4">
                          <div className="w-16 h-16 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-md">
                            <Ban className="h-8 w-8" />
                          </div>
                          <div className="space-y-1.5">
                            <span className="px-3 py-1 rounded-full text-xs font-mono font-bold uppercase tracking-wider bg-amber-500/15 border border-amber-500/30 text-amber-400">
                              {unsoldCount} UNSOLD {unsoldCount === 1 ? 'PLAYER' : 'PLAYERS'} READY
                            </span>
                            <h3 className="font-heading text-2xl sm:text-3xl font-black text-foreground pt-1">
                              Regular Pool Completed
                            </h3>
                            <p className="text-xs sm:text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
                              All players from the primary pool have been drawn. You can now draw from the unsold roster one by one.
                            </p>
                          </div>

                          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="pt-2 w-full space-y-3">
                            <button
                              onClick={() => {
                                setIsUnsoldDrawMode(true);
                                handleDrawStart(true);
                              }}
                              className="w-full flex items-center justify-center gap-3 px-8 py-5 rounded-2xl bg-gradient-to-r from-amber-500 via-[var(--gold)] to-amber-500 text-black font-heading font-black text-base uppercase tracking-wider shadow-gold hover:shadow-xl transition-all"
                            >
                              <Dices className="h-6 w-6" />
                              <span>DRAW UNSOLD PLAYERS</span>
                            </button>

                            <Link
                              href="/auction/pool?tab=mystery-pot"
                              className="w-full inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl bg-gradient-to-r from-blue-600/30 via-cyan-500/20 to-blue-600/30 border border-cyan-400/40 text-cyan-300 font-heading font-black text-xs uppercase tracking-wider hover:bg-cyan-500/20 hover:border-cyan-400 shadow-[0_0_20px_rgba(56,189,248,0.2)] transition-all hover:scale-[1.02]"
                            >
                              <Sparkles className="h-4 w-4" />
                              <span>Draw from League Phase Mystery Pots</span>
                            </Link>
                          </motion.div>
                        </CardContent>
                      </Card>
                    ) : (
                      <Card className="glass max-w-md w-full text-center p-8 border-border/40 shadow-2xl rounded-3xl">
                        <CardContent className="pt-6 flex flex-col items-center space-y-4">
                          <Trophy className="h-10 w-10 mx-auto text-emerald-400" />
                          <div>
                            <h3 className="font-heading text-xl font-bold text-foreground">Auction Complete!</h3>
                            <p className="text-xs text-muted-foreground mt-1">All regular and unsold players have been drawn.</p>
                          </div>
                          <Link
                            href="/auction/pool?tab=mystery-pot"
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-blue-600/30 via-cyan-500/20 to-blue-600/30 border border-cyan-400/40 text-cyan-300 font-heading font-black text-xs uppercase tracking-wider hover:bg-cyan-500/20 hover:border-cyan-400 shadow-[0_0_20px_rgba(56,189,248,0.2)] transition-all hover:scale-105"
                          >
                            <Sparkles className="h-4 w-4" />
                            <span>Draw from League Phase Mystery Pots</span>
                          </Link>
                        </CardContent>
                      </Card>
                    )
                  ) : (
                    <div className="flex flex-col items-center gap-3">
                      <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="relative group">
                        <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-[var(--gold)] via-amber-500 to-[var(--gold)] opacity-70 blur-xl group-hover:opacity-100 transition-all duration-500 animate-pulse" />
                        <button
                          onClick={() => handleDrawStart(false)}
                          className="relative flex items-center gap-5 sm:gap-6 px-10 sm:px-14 py-6 sm:py-7 rounded-3xl bg-card/90 hover:bg-card backdrop-blur-2xl border border-[var(--gold)]/40 hover:border-[var(--gold)] text-foreground shadow-2xl transition-all duration-300 group-hover:shadow-gold"
                        >
                          <div className="w-14 h-14 rounded-2xl bg-[var(--gold)]/15 border border-[var(--gold)]/30 flex items-center justify-center text-[var(--gold)]">
                            <Dices className="h-7 w-7" />
                          </div>
                          <span className="font-heading font-black text-xl sm:text-2xl">
                            {availableCount === 1 ? 'DRAW FINAL PLAYER' : 'DRAW NEXT PLAYER'}
                          </span>
                        </button>
                      </motion.div>

                      <Link
                        href="/auction/pool?tab=mystery-pot"
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-blue-600/30 via-cyan-500/20 to-blue-600/30 border border-cyan-400/40 text-cyan-300 font-heading font-black text-xs uppercase tracking-wider hover:bg-cyan-500/20 hover:border-cyan-400 shadow-[0_0_20px_rgba(56,189,248,0.2)] transition-all hover:scale-105"
                      >
                        <Sparkles className="h-4 w-4" />
                        <span>Draw from League Phase Mystery Pots</span>
                      </Link>
                    </div>
                  )}
                </motion.div>
              )}

              {drawPhase === 'cycling' && cyclePlayer && (
                <motion.div key="cycling" className="flex flex-col items-center">
                  <div
                    className={cn(
                      'w-72 sm:w-80 h-[420px] rounded-3xl p-1 bg-gradient-to-b border border-border/40 shadow-2xl relative overflow-hidden',
                      ROLE_DRAW_STYLES[cyclePlayer.role]?.borderGradient || 'from-emerald-400 to-emerald-600'
                    )}
                  >
                    <div className="w-full h-full rounded-[22px] bg-card/95 backdrop-blur-xl flex flex-col justify-between p-4 relative">
                      <div className="flex items-center justify-between text-xs font-mono font-bold">
                        <span
                          className={cn(
                            'px-2.5 py-1 rounded-lg border font-mono font-bold uppercase tracking-wider',
                            ROLE_DRAW_STYLES[cyclePlayer.role]?.pillBg,
                            ROLE_DRAW_STYLES[cyclePlayer.role]?.pillText,
                            ROLE_DRAW_STYLES[cyclePlayer.role]?.pillBorder
                          )}
                        >
                          {cyclePlayer.role}
                        </span>
                        <span className="px-2.5 py-1 rounded-lg bg-black/50 border border-white/10 text-foreground">
                          {cyclePlayer.player.nationalityCode}
                        </span>
                      </div>
                      <div className="relative w-44 h-44 mx-auto my-auto rounded-2xl overflow-hidden bg-black/40">
                        <Image src={cyclePlayer.player.photo} alt={cyclePlayer.player.name} fill unoptimized={Boolean(cyclePlayer.player.photo?.startsWith('data:'))} className="object-cover" />
                      </div>
                      <p className="text-center font-black text-lg">{cyclePlayer.player.name}</p>
                    </div>
                  </div>
                </motion.div>
              )}

              {drawPhase === 'revealing' && cyclePlayer && (
                <motion.div key="revealing" className="flex flex-col items-center">
                  <div
                    className={cn(
                      'w-72 sm:w-80 h-[420px] rounded-3xl p-1 bg-gradient-to-b border border-border/40 shadow-2xl relative overflow-hidden',
                      ROLE_DRAW_STYLES[cyclePlayer.role]?.borderGradient || 'from-emerald-400 to-emerald-600'
                    )}
                  >
                    <div className="w-full h-full rounded-[22px] bg-card/95 backdrop-blur-xl flex flex-col justify-between p-4 relative">
                      <div className="relative w-44 h-44 mx-auto my-auto rounded-2xl overflow-hidden bg-black/40">
                        <Image src={cyclePlayer.player.photo} alt={cyclePlayer.player.name} fill unoptimized={Boolean(cyclePlayer.player.photo?.startsWith('data:'))} className="object-cover" />
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {drawPhase === 'complete' && currentDrawnPlayer && (
                <TasteSkillRevealCard
                  key={currentDrawnPlayer.id}
                  player={currentDrawnPlayer}
                  onDrawAgain={() => handleDrawStart()}
                  onReset={handleReset}
                  onUnsold={handleMarkUnsold}
                  canDrawAgain={canDrawAgain}
                  remainingPoolCount={remainingDrawCount}
                  isUnsoldDraw={isUnsoldDrawMode}
                  isAssigned={Boolean(isCurrentPlayerAssigned)}
                  assignedTeamName={assignedTeam?.name}
                  assignedSoldPrice={currentDrawnPlayer.soldPrice}
                  currency={settings.currency}
                  hasUnsoldPlayersToDraw={hasUnsoldPlayersToDraw}
                  onDrawUnsold={() => {
                    setIsUnsoldDrawMode(true);
                    handleDrawStart(true);
                  }}
                />
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Floating Right-Edge Docked Tab */}
        {drawPhase === 'complete' && currentDrawnPlayer && (
          <motion.button
            type="button"
            onClick={() => setShowAssignmentPanel((prev) => !prev)}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            whileHover={{ x: -4, scale: 1.05 }}
            className={cn(
              'fixed right-0 top-1/2 -translate-y-1/2 z-50',
              'flex flex-col items-center justify-center gap-2 p-3 sm:p-3.5',
              'bg-[#0a0e17]/95 hover:bg-black backdrop-blur-2xl',
              'border-l-2 border-t border-b rounded-l-2xl shadow-2xl',
              'transition-all duration-300 cursor-pointer select-none',
              isCurrentPlayerAssigned
                ? 'border-emerald-500 text-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.4)]'
                : showAssignmentPanel
                ? 'border-emerald-500 text-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.4)]'
                : 'border-[var(--gold)] text-[var(--gold)] shadow-[0_0_30px_rgba(255,215,0,0.35)]'
            )}
            title={
              isCurrentPlayerAssigned
                ? `Assigned to ${assignedTeam?.name || 'team'} (Click to change)`
                : showAssignmentPanel
                ? 'Close Assignment Drawer'
                : 'Open Assignment Drawer'
            }
          >
            <div
              className={cn(
                'w-10 h-10 rounded-xl flex items-center justify-center border transition-colors',
                isCurrentPlayerAssigned
                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                  : showAssignmentPanel
                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                  : 'bg-[var(--gold)]/20 border-[var(--gold)]/40 text-[var(--gold)]'
              )}
            >
              {isCurrentPlayerAssigned ? (
                <Check className="h-5 w-5 text-emerald-400" />
              ) : (
                <UserPlus className="h-5 w-5" />
              )}
            </div>
            <span className="font-heading font-black text-[11px] uppercase tracking-wider py-0.5">
              {isCurrentPlayerAssigned ? 'ASSIGNED' : showAssignmentPanel ? 'CLOSE' : 'ASSIGN'}
            </span>
          </motion.button>
        )}

        {showAssignmentPanel && currentDrawnPlayer && (
          <AssignmentPanel
            player={currentDrawnPlayer}
            teams={teams}
            onConfirm={(teamId, soldPrice) => {
              confirmSale(currentDrawnPlayer.id, teamId, soldPrice);
              setShowAssignmentPanel(false);
              toast.success(`${currentDrawnPlayer.player.name} assigned to club!`);

              // Check if pool is completed
              const remainingAvailable = auctionPlayers.filter(
                (ap) => ap.status === 'AVAILABLE' && ap.id !== currentDrawnPlayer.id
              ).length;

              const remainingUnsold = auctionPlayers.filter(
                (ap) => ap.status === 'UNSOLD' && ap.id !== currentDrawnPlayer.id
              ).length;

              if (!isUnsoldDrawMode && remainingAvailable === 0) {
                // Drop the player unlocked animation and display the unsold & mystery player buttons behind
                setTimeout(() => {
                  handleReset();
                }, 800);
              } else if (isUnsoldDrawMode && remainingUnsold === 0) {
                setTimeout(() => {
                  handleReset();
                }, 800);
              }
            }}
            onCancel={() => setShowAssignmentPanel(false)}
            onUnsold={handleMarkUnsold}
            currency={settings.currency}
            basePrice={currentDrawnPlayer.basePrice}
            teamBudgets={teamBudgets}
            maxTeamBudget={settings.maxTeamBudget}
          />
        )}
      </div>
    </AppLayout>
  );
}

interface TasteSkillRevealCardProps {
  player: AuctionPlayer;
  onDrawAgain: () => void;
  onReset: () => void;
  onUnsold: () => void;
  canDrawAgain: boolean;
  remainingPoolCount: number;
  isUnsoldDraw?: boolean;
  isAssigned: boolean;
  assignedTeamName?: string;
  assignedSoldPrice?: number | null;
  currency: Currency;
  hasUnsoldPlayersToDraw?: boolean;
  onDrawUnsold?: () => void;
}

function TasteSkillRevealCard({
  player,
  onDrawAgain,
  onReset,
  onUnsold,
  canDrawAgain,
  remainingPoolCount,
  isUnsoldDraw = false,
  isAssigned,
  assignedTeamName,
  assignedSoldPrice,
  currency,
  hasUnsoldPlayersToDraw = false,
  onDrawUnsold,
}: TasteSkillRevealCardProps) {
  const roleStyle = ROLE_DRAW_STYLES[player.role] || ROLE_DRAW_STYLES.Midfielder;

  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const mouseXSpring = useSpring(x, { stiffness: 260, damping: 20 });
  const mouseYSpring = useSpring(y, { stiffness: 260, damping: 20 });

  const rotateX = useTransform(mouseYSpring, [-150, 150], [10, -10]);
  const rotateY = useTransform(mouseXSpring, [-150, 150], [-10, 10]);
  const shineOpacity = useTransform(mouseXSpring, [-150, 150], [0.15, 0.4]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    x.set(e.clientX - (rect.left + rect.width / 2));
    y.set(e.clientY - (rect.top + rect.height / 2));
  };

  const handleMouseLeave = () => { x.set(0); y.set(0); };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.7, y: 30, rotateX: -12, filter: 'blur(10px)' }}
      animate={{ opacity: 1, scale: 1, y: 0, rotateX: 0, filter: 'blur(0px)' }}
      transition={{ duration: 0.65, ease: EASE_OUT_EXPO }}
      className="flex flex-col items-center"
      style={{ perspective: 1000 }}
    >
      <div className="relative cursor-pointer select-none" onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave}>
        <motion.div
          className="absolute -inset-4 rounded-[28px] pointer-events-none opacity-75 blur-xl"
          style={{ background: isAssigned ? 'rgba(16, 185, 129, 0.4)' : roleStyle.glowColor }}
        />
        <motion.div
          style={{ rotateX, rotateY, transformStyle: 'preserve-3d' }}
          className={cn(
            'w-[280px] sm:w-[320px] rounded-[24px] p-[2px] bg-gradient-to-b shadow-2xl relative transition-all duration-300',
            isAssigned ? 'from-emerald-400/90 via-emerald-600/70 to-emerald-900/90 shadow-[0_0_40px_rgba(16,185,129,0.35)]' : roleStyle.borderGradient,
            isAssigned ? '' : roleStyle.accentGlow
          )}
        >
          <div className="w-full rounded-[22px] bg-gradient-to-b from-[#11161d]/95 via-[#0b0e14]/95 to-[#080a0f]/98 backdrop-blur-2xl p-4 sm:p-5 border border-white/10 flex flex-col justify-between overflow-hidden relative">
            <motion.div className="absolute inset-0 pointer-events-none bg-gradient-to-tr from-transparent via-white/20 to-transparent -skew-y-12" style={{ opacity: shineOpacity }} />
            
            {/* Top Status & Role */}
            <div className="flex items-center justify-between z-10 mb-2">
              <span className={cn('px-2.5 py-0.5 rounded-lg text-[11px] font-mono font-black uppercase tracking-wider border shadow-md', roleStyle.pillBg, roleStyle.pillText, roleStyle.pillBorder)}>
                {player.role}
              </span>
              {isAssigned ? (
                <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 font-mono text-[10px] font-black uppercase tracking-widest flex items-center gap-1 shadow-sm">
                  <Check className="w-3 h-3 text-emerald-400" /> ASSIGNED
                </span>
              ) : isUnsoldDraw ? (
                <span className="px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/30 text-amber-400 font-mono text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
                  <Ban className="w-3 h-3 text-amber-400" /> UNSOLD RE-DRAW
                </span>
              ) : (
                <span className="font-mono text-[11px] font-black uppercase tracking-widest text-white/80 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-[var(--gold)]" /> VERIFIED
                </span>
              )}
            </div>

            {/* Photo & Info */}
            <div className="relative aspect-[3/4] w-full rounded-xl overflow-hidden bg-black/60 border border-white/10 my-2 shadow-inner" style={{ aspectRatio: '3 / 4' }}>
              <Image src={player.player.photo} alt={player.player.name} fill unoptimized={Boolean(player.player.photo?.startsWith('data:'))} className="object-cover object-top" sizes="320px" priority />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent" />
              <div className="absolute bottom-2.5 left-2.5 right-2.5">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--gold)] block">{player.player.team}</span>
                <h3 className="text-lg sm:text-xl font-heading font-black text-white truncate tracking-tight">{player.player.name}</h3>
                <p className="text-[11px] text-white/80 font-medium">{player.player.nationality} • {player.player.position}</p>
              </div>
            </div>

            {/* Price & Assignment Badge Footer */}
            <div className="mt-1.5 p-3 rounded-xl bg-black/50 border border-white/10 flex items-center justify-between backdrop-blur-md">
              <div>
                <span className="block text-[9.5px] font-mono font-bold uppercase tracking-widest text-[var(--gold)]">
                  {isAssigned ? 'SOLD PRICE' : 'BASE PRICE'}
                </span>
                <span className="text-xl sm:text-2xl font-heading font-black text-foreground">
                  <AnimatedNumber
                    value={isAssigned && assignedSoldPrice !== null && assignedSoldPrice !== undefined ? assignedSoldPrice : player.basePrice}
                    format={(val) => formatCurrency(Math.round(val), player.currency)}
                    springOptions={{
                      bounce: 0,
                      duration: 2000,
                    }}
                  />
                </span>
              </div>
              {isAssigned ? (
                <div className="text-right">
                  <span className="block text-[9px] font-mono font-bold uppercase tracking-wider text-emerald-400">CLUB</span>
                  <span className="text-xs font-heading font-black text-foreground truncate max-w-[110px] block">
                    {assignedTeamName || 'Assigned'}
                  </span>
                </div>
              ) : (
                <Star className="h-4 w-4 fill-[var(--gold)]/30 text-[var(--gold)]" />
              )}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Action Buttons */}
      <motion.div className="flex flex-wrap items-center justify-center gap-2.5 mt-5">
        {canDrawAgain ? (
          <Button
            onClick={onDrawAgain}
            size="default"
            className="h-11 bg-gradient-to-r from-[var(--gold)] via-amber-400 to-amber-500 hover:from-[var(--gold)]/90 hover:to-amber-500/90 text-black font-heading font-black text-xs sm:text-sm uppercase px-6 rounded-xl gap-2 shadow-gold hover:scale-105 transition-all"
          >
            <Dices className="h-4 w-4" />
            {remainingPoolCount === 1
              ? (isUnsoldDraw ? 'DRAW FINAL UNSOLD PLAYER' : 'DRAW FINAL PLAYER')
              : (isUnsoldDraw ? 'DRAW NEXT UNSOLD' : 'DRAW NEXT PLAYER')}
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        ) : hasUnsoldPlayersToDraw && onDrawUnsold ? (
          <Button
            onClick={onDrawUnsold}
            size="default"
            className="h-11 bg-gradient-to-r from-amber-500 via-[var(--gold)] to-amber-500 hover:from-amber-500/90 hover:to-amber-500/90 text-black font-heading font-black text-xs sm:text-sm uppercase px-6 rounded-xl gap-2 shadow-gold hover:scale-105 transition-all"
          >
            <Dices className="h-4 w-4" />
            <span>DRAW UNSOLD PLAYERS</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        ) : (
          <Button
            onClick={onReset}
            size="default"
            className="h-11 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-heading font-bold text-xs uppercase px-6 rounded-xl gap-2 shadow-md hover:scale-105 transition-all"
          >
            <Check className="h-4 w-4" />
            <span>FINISH &amp; VIEW ALL DRAW OPTIONS</span>
          </Button>
        )}

        <Button
          onClick={onUnsold}
          disabled={isAssigned}
          variant="outline"
          size="default"
          className={cn(
            'h-11 px-5 rounded-xl gap-1.5 font-heading font-bold text-xs transition-all',
            isAssigned
              ? 'opacity-40 border-border/30 text-muted-foreground cursor-not-allowed hover:bg-transparent'
              : 'border-amber-500/40 text-amber-400 hover:bg-amber-500/10'
          )}
          title={isAssigned ? `Player already assigned to ${assignedTeamName || 'team'}` : 'Mark Player as Unsold'}
        >
          <Ban className="h-3.5 w-3.5" /> {isAssigned ? 'Assigned' : 'Mark Unsold'}
        </Button>

        <Button
          onClick={onReset}
          variant="outline"
          size="default"
          className="h-11 border-border/40 hover:bg-muted px-5 rounded-xl font-heading font-bold text-xs transition-all"
        >
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Reset Draw
        </Button>
      </motion.div>
    </motion.div>
  );
}

export default DrawScreen;