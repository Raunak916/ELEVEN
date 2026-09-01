'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring } from 'framer-motion';
import Image from 'next/image';
import { AppLayout } from '@/components/layout/app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuctionStore } from '@/lib/auction-store';
import { AuctionPlayer, Currency, PlayerRole } from '@/lib/types';
import { formatCurrency, cn } from '@/lib/utils';
import { firePlayerRevealConfetti } from '@/lib/confetti';
import {
  Trophy,
  RefreshCw,
  Dices,
  Sparkles,
  ArrowRight,
  UserPlus,
  Ban,
  Star,
  Shield,
  Check,
} from 'lucide-react';
import { AssignmentPanel } from './assignment-panel';
import { PlayerHype } from './player-hype';
import { useHydrated } from '@/lib/use-hydrated';
import { toast } from 'sonner';
import { AnimatedNumber } from '@/components/core/animated-number';

const FLAG_MAP: Record<string, string> = {
  GB: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  BR: '🇧🇷',
  FR: '🇫🇷',
  DE: '🇩🇪',
  ES: '🇪🇸',
  IT: '🇮🇹',
  PT: '🇵🇹',
  AR: '🇦🇷',
  NL: '🇳🇱',
  BE: '🇧🇪',
  HR: '🇭🇷',
  PL: '🇵🇱',
  NO: '🇳🇴',
  SE: '🇸🇪',
  DK: '🇩🇰',
  UY: '🇺🇾',
  CO: '🇨🇴',
  SN: '🇸🇳',
  EG: '🇪🇬',
  NG: '🇳🇬',
  MA: '🇲🇦',
  JP: '🇯🇵',
  KR: '🇰🇷',
  US: '🇺🇸',
  MX: '🇲🇽',
  CI: '🇨🇮',
  GH: '🇬🇭',
  DZ: '🇩🇿',
  CM: '🇨🇲',
  CL: '🇨🇱',
};

const ROLE_DRAW_STYLES: Record<
  PlayerRole,
  {
    borderGradient: string;
    glowColor: string;
    pillBg: string;
    pillText: string;
    pillBorder: string;
  }
> = {
  Forward: {
    borderGradient: 'from-rose-500/60 via-red-600/40 to-slate-900',
    glowColor: 'rgba(239, 68, 68, 0.15)',
    pillBg: 'bg-rose-500/10',
    pillText: 'text-rose-400',
    pillBorder: 'border-rose-500/30',
  },
  Midfielder: {
    borderGradient: 'from-emerald-500/60 via-emerald-600/40 to-slate-900',
    glowColor: 'rgba(34, 197, 94, 0.15)',
    pillBg: 'bg-emerald-500/10',
    pillText: 'text-emerald-400',
    pillBorder: 'border-emerald-500/30',
  },
  Defender: {
    borderGradient: 'from-amber-500/60 via-amber-600/40 to-slate-900',
    glowColor: 'rgba(245, 158, 11, 0.15)',
    pillBg: 'bg-amber-500/10',
    pillText: 'text-amber-400',
    pillBorder: 'border-amber-500/30',
  },
  Goalkeeper: {
    borderGradient: 'from-sky-500/60 via-blue-600/40 to-slate-900',
    glowColor: 'rgba(59, 130, 246, 0.15)',
    pillBg: 'bg-sky-500/10',
    pillText: 'text-sky-400',
    pillBorder: 'border-sky-500/30',
  },
};

export function DrawScreen() {
  const {
    auctionPlayers,
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
  const teams = hydrated ? getTeams() : [];
  const teamBudgets = hydrated ? getTeamBudgets() : [];

  const [isUnsoldDrawMode, setIsUnsoldDrawMode] = useState(false);
  const [cyclePlayer, setCyclePlayer] = useState<AuctionPlayer | null>(null);
  const [walkoutStage, setWalkoutStage] = useState<'tunnel' | 'flag' | 'pos' | 'club' | 'walkout'>('tunnel');
  const [shuffledPool, setShuffledPool] = useState<AuctionPlayer[]>([]);
  const [showAssignmentPanel, setShowAssignmentPanel] = useState(false);
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

  // EA FC 25 Walkout Sequential Clue Driver
  const handleDrawStart = useCallback((forceUnsold?: boolean) => {
    const drawingUnsold = forceUnsold ?? (availableCount === 0 && unsoldCount > 0 ? true : isUnsoldDrawMode);
    const targetPool = drawingUnsold ? unsoldPlayers : (shuffledPool.length > 0 ? shuffledPool : availablePlayers);

    if (targetPool.length === 0 || isDrawing) return;

    if (drawingUnsold) {
      setIsUnsoldDrawMode(true);
    }

    // Pick target player immediately
    const targetIndex = Math.floor(Math.random() * targetPool.length);
    const finalPlayer = targetPool[targetIndex];

    setCyclePlayer(finalPlayer);
    setWalkoutStage('tunnel');
    startDraw();
    setDrawPhase('cycling');

    // Sequential Walkout Clues
    timeoutRefs.current.push(
      setTimeout(() => {
        setWalkoutStage('flag');
      }, 200)
    );

    timeoutRefs.current.push(
      setTimeout(() => {
        setWalkoutStage('pos');
      }, 1000)
    );

    timeoutRefs.current.push(
      setTimeout(() => {
        setWalkoutStage('club');
      }, 1900)
    );

    timeoutRefs.current.push(
      setTimeout(() => {
        setWalkoutStage('walkout');
        setDrawPhase('revealing');
      }, 2800)
    );

    timeoutRefs.current.push(
      setTimeout(() => {
        completeDraw(finalPlayer);
        firePlayerRevealConfetti();
      }, 3500)
    );
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
    timeoutRefs.current.forEach((t) => clearTimeout(t));
    timeoutRefs.current = [];
    resetDraw();
    setCyclePlayer(null);
    setWalkoutStage('tunnel');
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

  const hasActiveReveal = Boolean(drawnPlayer && currentDrawnPlayer && drawPhase === 'complete');

  return (
    <AppLayout>
      <div className="flex flex-col gap-4 max-w-7xl mx-auto p-4 sm:p-5 lg:p-6 w-full">
        {/* Top Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div>
            <h1 className="text-xl sm:text-2xl font-heading font-black text-white uppercase tracking-tight">
              Live Auction Draw
            </h1>
            <p className="text-[11px] sm:text-xs text-white/50 font-mono">
              Broadcast stadium walkout stage with real-time bidding &amp; team allocation
            </p>
          </div>

          <div className="flex items-center gap-2">
            {isUnsoldDrawMode ? (
              <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/30 px-2.5 py-0.5 font-mono text-[11px]">
                <Ban className="w-3 h-3 mr-1" /> UNSOLD POOL ({unsoldCount})
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 px-2.5 py-0.5 font-mono text-[11px]">
                AVAILABLE POOL ({availableCount})
              </Badge>
            )}

            {drawnPlayer && (
              <Button
                onClick={() => setShowAssignmentPanel(true)}
                variant="outline"
                size="sm"
                className={cn(
                  'h-8 px-3 font-heading font-bold text-xs uppercase transition-all',
                  isCurrentPlayerAssigned
                    ? 'border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10'
                    : 'bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20'
                )}
              >
                <UserPlus className="h-3.5 w-3.5 mr-1.5" />
                {isCurrentPlayerAssigned ? 'Re-Assign Team' : 'Assign Team'}
              </Button>
            )}
          </div>
        </div>

        {/* Main Arena: 2-Column Broadcast Grid on Reveal */}
        <div className={cn(
          'w-full grid gap-5 items-stretch transition-all duration-500',
          hasActiveReveal
            ? 'grid-cols-1 lg:grid-cols-12'
            : 'grid-cols-1 max-w-4xl mx-auto'
        )}>
          {/* Left Column: Scout Report (Side Companion) */}
          {hasActiveReveal && currentDrawnPlayer && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4 }}
              className="lg:col-span-5 xl:col-span-4 h-full flex flex-col min-h-[480px]"
            >
              <PlayerHype
                playerId={currentDrawnPlayer.playerId}
                playerName={currentDrawnPlayer.player.name}
                role={currentDrawnPlayer.player.role}
              />
            </motion.div>
          )}

          {/* Center / Right Column: Stadium Walkout Stage */}
          <div className={cn(
            'w-full flex flex-col items-center justify-center',
            hasActiveReveal ? 'lg:col-span-7 xl:col-span-8' : 'col-span-1'
          )}>
            <div className="w-full min-h-[520px] rounded-3xl bg-[#090b10] border border-white/10 p-5 sm:p-6 flex flex-col items-center justify-center relative overflow-hidden shadow-2xl">
              {/* Refined Dark Ambient Stadium Lighting */}
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-white/[0.02] blur-[80px]" />
                <div className="absolute bottom-0 inset-x-0 h-32 bg-gradient-to-t from-black/80 to-transparent" />
                <div
                  className="absolute inset-0 opacity-[0.02]"
                  style={{
                    backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
                    backgroundSize: '24px 24px',
                  }}
                />
              </div>

              <div className="relative z-10 w-full flex flex-col items-center justify-center min-h-[440px]">
                {/* 1. IDLE STATE */}
                {drawPhase === 'idle' && (
                  <motion.div
                    key="idle"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="text-center flex flex-col items-center max-w-md my-auto"
                  >
                    {availableCount === 0 ? (
                      unsoldCount > 0 ? (
                        <Card className="glass max-w-md w-full text-center p-8 border-border/40 shadow-2xl rounded-3xl">
                          <CardContent className="pt-6 flex flex-col items-center space-y-4">
                            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                              <Ban className="h-8 w-8" />
                            </div>
                            <div>
                              <span className="px-3 py-1 rounded-full text-xs font-mono font-bold uppercase tracking-wider bg-amber-500/15 border border-amber-500/30 text-amber-400">
                                {unsoldCount} UNSOLD {unsoldCount === 1 ? 'PLAYER' : 'PLAYERS'} READY
                              </span>
                              <h3 className="font-heading text-2xl font-black text-foreground pt-1">
                                Regular Pool Completed
                              </h3>
                              <p className="text-xs sm:text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
                                All players from the primary pool have been drawn. You can now draw from the unsold roster.
                              </p>
                            </div>

                            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="pt-2 w-full space-y-3">
                              <button
                                onClick={() => {
                                  setIsUnsoldDrawMode(true);
                                  handleDrawStart(true);
                                }}
                                className="w-full flex items-center justify-center gap-3 px-8 py-4.5 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-black font-heading font-black text-sm uppercase tracking-wider shadow-md hover:shadow-lg transition-all"
                              >
                                <Dices className="h-5 w-5" />
                                <span>DRAW UNSOLD PLAYERS</span>
                              </button>
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
                          </CardContent>
                        </Card>
                      )
                    ) : (
                      <div className="flex flex-col items-center gap-3">
                        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="relative group">
                          <button
                            onClick={() => handleDrawStart(false)}
                            className="relative flex items-center gap-5 sm:gap-6 px-10 sm:px-12 py-5 sm:py-6 rounded-3xl bg-[#11141c] hover:bg-[#141824] border border-white/10 hover:border-amber-400/40 text-foreground shadow-2xl transition-all duration-300"
                          >
                            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                              <Dices className="h-6 w-6" />
                            </div>
                            <span className="font-heading font-black text-lg sm:text-xl text-white">
                              {availableCount === 1 ? 'DRAW FINAL PLAYER' : 'DRAW NEXT PLAYER'}
                            </span>
                          </button>
                        </motion.div>
                      </div>
                    )}
                  </motion.div>
                )}

                {/* 2. EA FC 25 WALKOUT CLUE SEQUENCE */}
                {drawPhase === 'cycling' && cyclePlayer && (
                  <motion.div
                    key="walkout_clues"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, scale: 1.2, filter: 'blur(10px)' }}
                    transition={{ duration: 0.3 }}
                    className="flex flex-col items-center justify-center gap-5 my-auto"
                  >
                    {/* Clue 1: Nationality */}
                    <AnimatePresence>
                      {walkoutStage !== 'tunnel' && (
                        <motion.div
                          initial={{ opacity: 0, scale: 2.2, y: -40, filter: 'blur(8px)' }}
                          animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
                          transition={{ type: 'spring', damping: 16, stiffness: 180 }}
                          className="relative flex items-center gap-3 px-6 py-2.5 rounded-2xl bg-[#121620] border border-amber-400/30 backdrop-blur-xl shadow-lg"
                        >
                          <span className="text-2xl drop-shadow-md">
                            {FLAG_MAP[cyclePlayer.player.nationalityCode] || '🌐'}
                          </span>
                          <span className="font-heading font-black text-xl text-amber-300 tracking-wider uppercase">
                            {cyclePlayer.player.nationality}
                          </span>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Clue 2: Position */}
                    <AnimatePresence>
                      {(walkoutStage === 'pos' || walkoutStage === 'club' || walkoutStage === 'walkout') && (
                        <motion.div
                          initial={{ opacity: 0, scale: 2, y: -30, filter: 'blur(6px)' }}
                          animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
                          transition={{ type: 'spring', damping: 16, stiffness: 180 }}
                          className="flex items-center gap-2.5 px-7 py-2.5 rounded-2xl bg-[#121620] border border-white/15 backdrop-blur-xl shadow-md"
                        >
                          <Shield className="w-5 h-5 text-white/80" />
                          <span className="font-heading font-black text-2xl text-white tracking-widest uppercase">
                            {cyclePlayer.player.position}
                          </span>
                          <span className="text-xs font-mono font-bold text-white/50 tracking-wider uppercase ml-1">
                            {cyclePlayer.role}
                          </span>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Clue 3: Club */}
                    <AnimatePresence>
                      {(walkoutStage === 'club' || walkoutStage === 'walkout') && (
                        <motion.div
                          initial={{ opacity: 0, scale: 1.8, y: -20, filter: 'blur(6px)' }}
                          animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
                          transition={{ type: 'spring', damping: 16, stiffness: 180 }}
                          className="flex items-center gap-2.5 px-7 py-2 rounded-2xl bg-[#121620] border border-amber-400/25 backdrop-blur-xl shadow-md"
                        >
                          <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                          <span className="font-heading font-black text-lg sm:text-xl text-amber-200 tracking-wide uppercase">
                            {cyclePlayer.player.team}
                          </span>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )}

                {/* 3. THE WALKOUT BLAST TRANSITION */}
                {drawPhase === 'revealing' && cyclePlayer && (
                  <motion.div
                    key="walkout_blast"
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1.1, opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.4 }}
                    className="flex flex-col items-center justify-center relative"
                  >
                    <motion.div
                      initial={{ scale: 0, opacity: 0.8 }}
                      animate={{ scale: 2.5, opacity: 0 }}
                      transition={{ duration: 0.6, ease: 'easeOut' }}
                      className="absolute inset-0 rounded-full bg-white/40 blur-[50px] pointer-events-none"
                    />
                    <div className="text-2xl font-heading font-black text-white tracking-widest uppercase drop-shadow-[0_0_15px_rgba(255,255,255,0.6)]">
                      WALKOUT
                    </div>
                  </motion.div>
                )}

                {/* 4. COMPLETED REVEAL CARD */}
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
                    isAssigned={isCurrentPlayerAssigned}
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
              </div>
            </div>
          </div>
        </div>

        {/* Clean Drawer Mount (No double modal backdrop) */}
        {showAssignmentPanel && currentDrawnPlayer && (
          <AssignmentPanel
            player={currentDrawnPlayer}
            teams={teams}
            basePrice={currentDrawnPlayer.basePrice}
            currency={settings.currency}
            teamBudgets={teamBudgets}
            maxTeamBudget={settings.maxTeamBudget}
            onConfirm={(teamId: string, soldPrice: number) => {
              confirmSale(currentDrawnPlayer.id, teamId, soldPrice);
              setShowAssignmentPanel(false);
            }}
            onCancel={() => setShowAssignmentPanel(false)}
            onUnsold={handleMarkUnsold}
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
  isAssigned?: boolean;
  assignedTeamName?: string;
  assignedSoldPrice?: number | null;
  currency?: Currency;
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

  const mouseXSpring = useSpring(x, { stiffness: 280, damping: 22 });
  const mouseYSpring = useSpring(y, { stiffness: 280, damping: 22 });

  const rotateX = useTransform(mouseYSpring, [-150, 150], [10, -10]);
  const rotateY = useTransform(mouseXSpring, [-150, 150], [-10, 10]);
  const shineOpacity = useTransform(mouseXSpring, [-150, 150], [0.08, 0.25]);
  const shineX = useTransform(mouseXSpring, [-150, 150], ['-30%', '130%']);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    x.set(e.clientX - (rect.left + rect.width / 2));
    y.set(e.clientY - (rect.top + rect.height / 2));
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  const isGoldTier =
    player.player.category === 'LEGEND' ||
    player.player.category === 'ICON' ||
    player.player.category === 'HERO';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.2, y: 80, rotateX: 30 }}
      animate={{ opacity: 1, scale: 1, y: 0, rotateX: 0 }}
      transition={{
        type: 'spring',
        damping: 18,
        stiffness: 130,
        mass: 0.8,
      }}
      className="flex flex-col items-center"
      style={{ perspective: 1200 }}
    >
      <div
        className="relative cursor-pointer select-none group"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        {/* Subtle Ambient Back-Glow */}
        <motion.div
          className="absolute -inset-4 rounded-[30px] pointer-events-none opacity-30 group-hover:opacity-60 transition-opacity duration-700 blur-[25px] z-[-1]"
          style={{
            background: isAssigned
              ? 'rgba(16, 185, 129, 0.4)'
              : isGoldTier
              ? 'rgba(245, 158, 11, 0.3)'
              : roleStyle.glowColor,
          }}
        />

        <motion.div
          style={{ rotateX, rotateY, transformStyle: 'preserve-3d' }}
          className={cn(
            'w-[290px] sm:w-[320px] rounded-[24px] p-[1.5px] relative transition-all duration-300',
            isAssigned
              ? 'bg-gradient-to-b from-emerald-400/80 via-emerald-600/50 to-slate-900 shadow-[0_15px_40px_-10px_rgba(16,185,129,0.3)]'
              : isGoldTier
              ? 'bg-gradient-to-b from-amber-300/80 via-amber-500/50 to-slate-900 shadow-[0_15px_40px_-10px_rgba(245,158,11,0.25)]'
              : roleStyle.borderGradient
          )}
        >
          <div className="w-full rounded-[22.5px] bg-[#0c0e14]/98 backdrop-blur-2xl p-4 border border-white/10 flex flex-col justify-between overflow-hidden relative">
            {/* Subtle Specular Sheen */}
            <motion.div
              className="absolute inset-0 pointer-events-none bg-gradient-to-tr from-transparent via-white/15 to-transparent -skew-y-12 mix-blend-overlay"
              style={{
                opacity: shineOpacity,
                left: shineX,
              }}
            />

            {/* Top Status & Role Header */}
            <div className="flex items-center justify-between z-10 mb-2">
              <span
                className={cn(
                  'px-2.5 py-0.5 rounded-lg text-[10.5px] font-mono font-bold uppercase tracking-wider border shadow-sm flex items-center gap-1',
                  roleStyle.pillBg,
                  roleStyle.pillText,
                  roleStyle.pillBorder
                )}
              >
                {player.player.category === 'LEGEND' ? (
                  <Trophy className="w-3 h-3 text-amber-400" />
                ) : (
                  <Shield className="w-3 h-3 text-current" />
                )}
                <span>{player.role}</span>
              </span>

              {isAssigned ? (
                <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-mono text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                  <Check className="w-3 h-3 text-emerald-400" /> ASSIGNED
                </span>
              ) : isUnsoldDraw ? (
                <span className="px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/30 text-amber-400 font-mono text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                  <Ban className="w-3 h-3 text-amber-400" /> UNSOLD RE-DRAW
                </span>
              ) : (
                <span className="font-mono text-[10.5px] font-bold uppercase tracking-wider text-amber-400/90 flex items-center gap-1 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                  <Sparkles className="w-3 h-3" /> VERIFIED
                </span>
              )}
            </div>

            {/* Photo & Info Showcase */}
            <div className="relative aspect-[3/4] w-full rounded-xl overflow-hidden bg-black/50 border border-white/10 my-1.5 shadow-inner">
              <Image
                src={player.player.photo}
                alt={player.player.name}
                fill
                unoptimized={Boolean(player.player.photo?.startsWith('data:'))}
                className="object-cover object-top filter contrast-[1.04]"
                sizes="320px"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/15 to-transparent" />
              <div className="absolute bottom-2.5 left-2.5 right-2.5 z-10">
                <div className="flex items-center gap-1 mb-0.5">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-400">
                    {player.player.team}
                  </span>
                </div>
                <h3 className="text-lg sm:text-xl font-heading font-black text-white truncate tracking-tight">
                  {player.player.name}
                </h3>
                <p className="text-[10.5px] text-white/70 font-medium tracking-wide">
                  {player.player.nationality} • {player.player.position}
                </p>
              </div>
            </div>

            {/* Price & Assignment Badge Footer */}
            <div className="mt-1 p-2.5 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-between backdrop-blur-md">
              <div>
                <span className="block text-[8.5px] font-mono font-bold uppercase tracking-widest text-amber-400/80">
                  {isAssigned ? 'SOLD PRICE' : 'BASE PRICE'}
                </span>
                <span className="text-lg sm:text-xl font-heading font-black text-white">
                  <AnimatedNumber
                    value={
                      isAssigned && assignedSoldPrice !== null && assignedSoldPrice !== undefined
                        ? assignedSoldPrice
                        : player.basePrice
                    }
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
                  <span className="block text-[8.5px] font-mono font-bold uppercase tracking-wider text-emerald-400">
                    CLUB
                  </span>
                  <span className="text-xs font-heading font-black text-foreground truncate max-w-[100px] block">
                    {assignedTeamName || 'Assigned'}
                  </span>
                </div>
              ) : (
                <Star className="h-4 w-4 fill-amber-400/20 text-amber-400/60" />
              )}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Stage Actions */}
      <motion.div className="flex flex-wrap items-center justify-center gap-2 mt-4">
        {canDrawAgain ? (
          <Button
            onClick={onDrawAgain}
            size="sm"
            className="h-9.5 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-500 text-black font-heading font-black text-xs uppercase px-5 rounded-xl gap-2 shadow-sm hover:scale-[1.02] transition-all"
          >
            <Dices className="h-4 w-4" />
            {remainingPoolCount === 1
              ? isUnsoldDraw
                ? 'DRAW FINAL UNSOLD'
                : 'DRAW FINAL PLAYER'
              : isUnsoldDraw
              ? 'DRAW NEXT UNSOLD'
              : 'DRAW NEXT PLAYER'}
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        ) : hasUnsoldPlayersToDraw && onDrawUnsold ? (
          <Button
            onClick={onDrawUnsold}
            size="sm"
            className="h-9.5 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-500/90 hover:to-amber-500/90 text-black font-heading font-black text-xs uppercase px-5 rounded-xl gap-2 shadow-sm hover:scale-[1.02] transition-all"
          >
            <Dices className="h-4 w-4" />
            <span>DRAW UNSOLD PLAYERS</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        ) : (
          <Button
            onClick={onReset}
            size="sm"
            className="h-9.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-heading font-bold text-xs uppercase px-5 rounded-xl gap-2 shadow-sm hover:scale-[1.02] transition-all"
          >
            <Check className="h-4 w-4" />
            <span>FINISH &amp; VIEW OPTIONS</span>
          </Button>
        )}

        <Button
          onClick={onUnsold}
          disabled={isAssigned}
          variant="outline"
          size="sm"
          className={cn(
            'h-9.5 px-4 rounded-xl gap-1.5 font-heading font-bold text-xs transition-all',
            isAssigned
              ? 'opacity-40 border-border/30 text-muted-foreground cursor-not-allowed hover:bg-transparent'
              : 'border-amber-500/30 text-amber-400 hover:bg-amber-500/10'
          )}
          title={isAssigned ? `Player already assigned to ${assignedTeamName || 'team'}` : 'Mark Player as Unsold'}
        >
          <Ban className="h-3.5 w-3.5" /> {isAssigned ? 'Assigned' : 'Mark Unsold'}
        </Button>

        <Button
          onClick={onReset}
          variant="outline"
          size="sm"
          className="h-9.5 border-border/40 hover:bg-muted px-4 rounded-xl font-heading font-bold text-xs transition-all"
        >
          <RefreshCw className="h-3.5 w-3.5 mr-1" /> Reset
        </Button>
      </motion.div>
    </motion.div>
  );
}