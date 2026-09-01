'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring } from 'framer-motion';
import { useAuctionStore } from '@/lib/auction-store';
import { useRoomStore } from '@/lib/room-store';
import { formatCurrency, cn } from '@/lib/utils';
import { Sparkles, Check, Ban, Globe, Users, Shield, Trophy } from 'lucide-react';
import { Currency, PlayerRole } from '@/lib/types';
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
  UY: 'UY',
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

export function ContestantDrawTab() {
  const { drawnPlayer, drawPhase, teams, settings, auctionPlayers } = useAuctionStore();
  const { activeSession } = useRoomStore();

  const [persistedPlayer, setPersistedPlayer] = useState<any>(null);
  const [walkoutStage, setWalkoutStage] = useState<'idle' | 'flag' | 'pos' | 'club' | 'walkout' | 'complete'>('complete');
  const lastAnimatedPlayerId = useRef<string | null>(null);
  const timeoutRefs = useRef<ReturnType<typeof setTimeout>[]>([]);

  // When drawnPlayer updates, persist it so it stays visible after assignment until the next live player arrives
  useEffect(() => {
    if (drawnPlayer) {
      setPersistedPlayer(drawnPlayer);
    }
  }, [drawnPlayer]);

  // Find latest player from auctionPlayers roster if drawnPlayer is null (e.g. pending sale or recently assigned)
  const latestFromRoster = React.useMemo(() => {
    if (drawnPlayer) return null;
    const candidates = auctionPlayers.filter(
      (ap) => ap.status === 'DRAWN' || Boolean(ap.teamId) || ap.status === 'UNSOLD' || Boolean(ap.drawnAt) || Boolean(ap.soldAt)
    );
    if (candidates.length === 0) return null;
    return candidates.slice().sort((a, b) => {
      const timeA = new Date(a.soldAt || a.drawnAt || a.createdAt || 0).getTime();
      const timeB = new Date(b.soldAt || b.drawnAt || b.createdAt || 0).getTime();
      return timeB - timeA;
    })[0] || null;
  }, [drawnPlayer, auctionPlayers]);

  // Active player resolution hierarchy: Live drawnPlayer -> Component persistedPlayer -> Latest from roster
  const activePlayer = drawnPlayer || persistedPlayer || latestFromRoster;
  const currentAssignedData = activePlayer
    ? auctionPlayers.find((ap) => ap.id === activePlayer.id)
    : null;

  const displayPlayer = currentAssignedData
    ? {
        ...activePlayer,
        teamId: currentAssignedData.teamId || activePlayer.teamId,
        soldPrice:
          currentAssignedData.soldPrice !== null && currentAssignedData.soldPrice !== undefined
            ? currentAssignedData.soldPrice
            : activePlayer.soldPrice,
        status: currentAssignedData.status || activePlayer.status,
      }
    : activePlayer;

  const roomCurrency = (settings?.currency || activeSession?.settings?.currency || 'USD') as Currency;

  // Trigger Walkout Sequence for Contestant when a new player is drawn live
  useEffect(() => {
    if (!displayPlayer) {
      setWalkoutStage('idle');
      return;
    }

    // Only run the Walkout clue animation if this is a newly drawn player in live phase
    const isNewLiveDraw = displayPlayer.id !== lastAnimatedPlayerId.current && (drawPhase === 'cycling' || drawPhase === 'revealing' || !displayPlayer.teamId);

    if (isNewLiveDraw) {
      lastAnimatedPlayerId.current = displayPlayer.id;

      // Clear any prior sequence
      timeoutRefs.current.forEach((t) => clearTimeout(t));
      timeoutRefs.current = [];

      setWalkoutStage('flag');

      // Clue 2: Position (900ms)
      timeoutRefs.current.push(
        setTimeout(() => {
          setWalkoutStage('pos');
        }, 900)
      );

      // Clue 3: Club (1800ms)
      timeoutRefs.current.push(
        setTimeout(() => {
          setWalkoutStage('club');
        }, 1800)
      );

      // Clue 4: Walkout Blast (2700ms)
      timeoutRefs.current.push(
        setTimeout(() => {
          setWalkoutStage('walkout');
        }, 2700)
      );

      // Clue 5: Complete & Reveal Card (3400ms)
      timeoutRefs.current.push(
        setTimeout(() => {
          setWalkoutStage('complete');
        }, 3400)
      );
    } else if (displayPlayer.id !== lastAnimatedPlayerId.current) {
      lastAnimatedPlayerId.current = displayPlayer.id;
      setWalkoutStage('complete');
    }

    return () => {
      timeoutRefs.current.forEach((t) => clearTimeout(t));
    };
  }, [displayPlayer?.id, drawPhase]);

  // Determine assignment or status
  const isAssigned = Boolean(displayPlayer?.teamId);
  const assignedTeam = isAssigned ? teams.find((t) => t.id === displayPlayer?.teamId) : null;
  const isMyTeamWinner = isAssigned && displayPlayer?.teamId === activeSession?.participantId;
  const isUnsold = displayPlayer?.status === 'UNSOLD';

  const roleStyle = displayPlayer?.player?.role
    ? ROLE_DRAW_STYLES[displayPlayer.player.role as PlayerRole] || ROLE_DRAW_STYLES.Midfielder
    : null;

  const isGoldTier =
    displayPlayer?.player?.category === 'LEGEND' ||
    displayPlayer?.player?.category === 'ICON' ||
    displayPlayer?.player?.category === 'HERO';

  // 3D Mouse Parallax Spring Hooks for Left Card
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const mouseXSpring = useSpring(x, { stiffness: 280, damping: 22 });
  const mouseYSpring = useSpring(y, { stiffness: 280, damping: 22 });
  const rotateX = useTransform(mouseYSpring, [-120, 120], [8, -8]);
  const rotateY = useTransform(mouseXSpring, [-120, 120], [-8, 8]);
  const shineOpacity = useTransform(mouseXSpring, [-120, 120], [0.08, 0.22]);
  const shineX = useTransform(mouseXSpring, [-120, 120], ['-30%', '130%']);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    x.set(e.clientX - (rect.left + rect.width / 2));
    y.set(e.clientY - (rect.top + rect.height / 2));
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-center relative p-2 sm:p-3 overflow-y-auto scrollbar-thin">
      <AnimatePresence mode="wait">
        {displayPlayer ? (
          walkoutStage !== 'complete' ? (
            /* ========================================================================= */
            /* CONTESTANT EA FC 25 WALKOUT CLUE SEQUENCE                                 */
            /* ========================================================================= */
            <motion.div
              key={`walkout-${displayPlayer.id}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 1.1, filter: 'blur(8px)' }}
              transition={{ duration: 0.3 }}
              className="w-full max-w-lg min-h-[460px] rounded-3xl bg-[#090b10] border border-white/10 p-6 flex flex-col items-center justify-center relative overflow-hidden shadow-2xl my-auto"
            >
              {/* Dark Stadium Tunnel Ambient */}
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] h-[250px] bg-white/[0.02] blur-[60px]" />
                <div className="absolute bottom-0 inset-x-0 h-28 bg-gradient-to-t from-black/80 to-transparent" />
              </div>

              <div className="relative z-10 flex flex-col items-center justify-center gap-4 my-auto">
                {/* Clue 1: Nationality */}
                <AnimatePresence>
                  {walkoutStage !== 'idle' && (
                    <motion.div
                      initial={{ opacity: 0, scale: 2.2, y: -30, filter: 'blur(6px)' }}
                      animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
                      transition={{ type: 'spring', damping: 16, stiffness: 180 }}
                      className="flex items-center gap-3 px-6 py-2.5 rounded-2xl bg-[#121620] border border-amber-400/30 backdrop-blur-xl shadow-lg"
                    >
                      <span className="text-2xl drop-shadow-md">
                        {FLAG_MAP[displayPlayer.player.nationalityCode] || '🌐'}
                      </span>
                      <span className="font-heading font-black text-xl text-amber-300 tracking-wider uppercase">
                        {displayPlayer.player.nationality}
                      </span>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Clue 2: Position */}
                <AnimatePresence>
                  {(walkoutStage === 'pos' || walkoutStage === 'club' || walkoutStage === 'walkout') && (
                    <motion.div
                      initial={{ opacity: 0, scale: 2, y: -25, filter: 'blur(6px)' }}
                      animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
                      transition={{ type: 'spring', damping: 16, stiffness: 180 }}
                      className="flex items-center gap-2.5 px-7 py-2.5 rounded-2xl bg-[#121620] border border-white/15 backdrop-blur-xl shadow-md"
                    >
                      <Shield className="w-5 h-5 text-white/80" />
                      <span className="font-heading font-black text-2xl text-white tracking-widest uppercase">
                        {displayPlayer.player.position}
                      </span>
                      <span className="text-xs font-mono font-bold text-white/50 tracking-wider uppercase ml-1">
                        {displayPlayer.player.role}
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
                      <span className="font-heading font-black text-lg text-amber-200 tracking-wide uppercase">
                        {displayPlayer.player.team}
                      </span>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Walkout Light Burst */}
                {walkoutStage === 'walkout' && (
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1.1, opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.4 }}
                    className="flex flex-col items-center justify-center relative mt-2"
                  >
                    <motion.div
                      initial={{ scale: 0, opacity: 0.8 }}
                      animate={{ scale: 2.5, opacity: 0 }}
                      transition={{ duration: 0.6, ease: 'easeOut' }}
                      className="absolute inset-0 rounded-full bg-white/40 blur-[40px] pointer-events-none"
                    />
                    <div className="text-xl font-heading font-black text-white tracking-widest uppercase drop-shadow-[0_0_15px_rgba(255,255,255,0.6)]">
                      WALKOUT
                    </div>
                  </motion.div>
                )}
              </div>
            </motion.div>
          ) : (
            /* ========================================================================= */
            /* REVEALED 2-CARD COMPANION STAGE                                           */
            /* ========================================================================= */
            <motion.div
              key={`revealed-${displayPlayer.id}`}
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: -10 }}
              transition={{ type: 'spring', damping: 18, stiffness: 140 }}
              className="w-full flex flex-col items-center space-y-3 sm:space-y-4 my-auto py-1"
            >
              {/* Live Status Pill Header */}
              <div className="flex items-center gap-2 shrink-0">
                <span className="relative flex h-2.5 w-2.5">
                  <span
                    className={cn(
                      'animate-ping absolute inline-flex h-full w-full rounded-full opacity-75',
                      isAssigned
                        ? isMyTeamWinner
                          ? 'bg-emerald-400'
                          : 'bg-blue-400'
                        : isUnsold
                        ? 'bg-red-400'
                        : 'bg-amber-400'
                    )}
                  />
                  <span
                    className={cn(
                      'relative inline-flex rounded-full h-2.5 w-2.5',
                      isAssigned
                        ? isMyTeamWinner
                          ? 'bg-emerald-500'
                          : 'bg-blue-500'
                        : isUnsold
                        ? 'bg-red-500'
                        : 'bg-amber-500'
                    )}
                  />
                </span>
                <span
                  className={cn(
                    'text-xs sm:text-sm font-mono font-black tracking-[0.2em] uppercase',
                    isAssigned
                      ? isMyTeamWinner
                        ? 'text-emerald-400'
                        : 'text-blue-400'
                      : isUnsold
                      ? 'text-red-400'
                      : 'text-amber-400'
                  )}
                >
                  {isAssigned
                    ? isMyTeamWinner
                      ? '🎉 SOLD TO YOUR CLUB'
                      : `SOLD TO ${assignedTeam?.name?.toUpperCase() || 'ANOTHER CLUB'}`
                    : isUnsold
                    ? 'PLAYER UNSOLD / PASSED'
                    : 'LIVE ON THE AUCTION BLOCK'}
                </span>
              </div>

              {/* Side-by-Side 2-Card Layout */}
              <div className="w-full flex flex-col md:flex-row items-stretch justify-center gap-3.5 sm:gap-4 xl:gap-5 max-w-3xl mx-auto">
                {/* ----------------------------------------------------------------- */}
                {/* LEFT CARD: 3D Holographic Player Showcase                         */}
                {/* ----------------------------------------------------------------- */}
                <div
                  className="w-full md:w-1/2 max-w-[320px] select-none shrink-0 mx-auto md:mx-0 flex flex-col cursor-pointer"
                  onMouseMove={handleMouseMove}
                  onMouseLeave={handleMouseLeave}
                  style={{ perspective: 1000 }}
                >
                  <motion.div
                    style={{ rotateX, rotateY, transformStyle: 'preserve-3d' }}
                    className={cn(
                      'w-full h-full rounded-[22px] p-[1.5px] relative transition-all duration-300 flex flex-col',
                      isAssigned
                        ? isMyTeamWinner
                          ? 'bg-gradient-to-b from-emerald-400/80 via-emerald-600/50 to-slate-900 shadow-[0_10px_30px_-10px_rgba(16,185,129,0.3)]'
                          : 'bg-gradient-to-b from-blue-500/80 via-blue-700/50 to-slate-900 shadow-[0_10px_30px_-10px_rgba(59,130,246,0.25)]'
                        : isUnsold
                        ? 'bg-gradient-to-b from-red-500/60 via-zinc-800 to-black'
                        : isGoldTier
                        ? 'bg-gradient-to-b from-amber-300/80 via-amber-500/50 to-slate-900 shadow-[0_10px_30px_-10px_rgba(245,158,11,0.25)]'
                        : roleStyle?.borderGradient || 'from-white/20 via-white/10 to-black'
                    )}
                  >
                    <div className="w-full h-full rounded-[20.5px] bg-[#0c0e14]/98 backdrop-blur-3xl p-3.5 sm:p-4 border border-white/10 flex flex-col justify-between overflow-hidden relative">
                      {/* Dynamic Specular Sheen */}
                      <motion.div
                        className="absolute inset-0 pointer-events-none bg-gradient-to-tr from-transparent via-white/15 to-transparent -skew-y-12 mix-blend-overlay"
                        style={{
                          opacity: shineOpacity,
                          left: shineX,
                        }}
                      />

                      {/* Photo Box */}
                      <div className="relative h-[155px] sm:h-[175px] xl:h-[190px] w-full rounded-xl overflow-hidden bg-black/60 border border-white/10 shadow-inner group shrink-0">
                        {displayPlayer.player.photo ? (
                          <Image
                            src={displayPlayer.player.photo}
                            alt={displayPlayer.player.name}
                            fill
                            unoptimized={Boolean(displayPlayer.player.photo.startsWith('data:'))}
                            className="object-cover object-top transition-transform duration-700 group-hover:scale-105"
                            sizes="320px"
                            priority
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-zinc-900 to-black text-muted-foreground">
                            <Users className="w-12 h-12 opacity-30" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/15 to-transparent pointer-events-none" />
                      </div>

                      {/* Metadata */}
                      <div className="mt-2 space-y-0.5 z-10">
                        <span className="text-[10.5px] font-mono font-bold uppercase tracking-wider text-amber-400 block truncate">
                          {displayPlayer.player.team || 'Free Agent'}
                        </span>

                        <h3 className="text-base sm:text-lg font-heading font-black text-white truncate tracking-tight">
                          {displayPlayer.player.name}
                        </h3>

                        <div className="flex items-center justify-between pt-1 text-xs text-white/80 font-medium">
                          <span className="flex items-center gap-1.5 truncate">
                            <Globe className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                            <span className="truncate">{displayPlayer.player.nationality || 'International'}</span>
                          </span>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {displayPlayer.player.category && (
                              <span className="px-1.5 py-0.5 rounded-md text-[9px] font-mono font-bold uppercase tracking-wider bg-white/10 text-white/90 border border-white/15">
                                {displayPlayer.player.category}
                              </span>
                            )}
                            <span className="font-mono font-bold text-white text-[11px] px-2 py-0.5 rounded-md bg-white/10 border border-white/20">
                              {displayPlayer.player.position}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </div>

                {/* ----------------------------------------------------------------- */}
                {/* RIGHT CARD: 3D Flip Price & Ownership Card                       */}
                {/* ----------------------------------------------------------------- */}
                <div className="w-full md:w-1/2 max-w-[320px] min-h-[220px] sm:min-h-[240px] perspective-[1200px] select-none shrink-0 mx-auto md:mx-0 flex flex-col">
                  <motion.div
                    animate={{ rotateX: isAssigned ? 180 : 0 }}
                    transition={{ type: 'spring', stiffness: 180, damping: 18 }}
                    className="w-full h-full relative [transform-style:preserve-3d] flex-1 flex flex-col"
                  >
                    {/* FRONT FACE: Active Bidding / Base Price Phase (rotateX = 0deg) */}
                    <div
                      className={cn(
                        'absolute inset-0 rounded-[22px] p-[1.5px] bg-gradient-to-b shadow-xl overflow-hidden [backface-visibility:hidden]',
                        isUnsold
                          ? 'from-red-500/60 via-zinc-800 to-black'
                          : 'from-white/20 via-white/5 to-black'
                      )}
                    >
                      <div className="w-full h-full rounded-[20.5px] bg-[#0c0e14]/98 backdrop-blur-3xl p-4 sm:p-5 border border-white/10 flex flex-col justify-between">
                        {/* Top Row */}
                        <div className="flex items-center justify-between gap-2">
                          {roleStyle ? (
                            <span
                              className={cn(
                                'px-2.5 py-0.5 rounded-lg text-[10.5px] font-mono font-bold uppercase tracking-wider border shadow-sm',
                                roleStyle.pillBg,
                                roleStyle.pillText,
                                roleStyle.pillBorder
                              )}
                            >
                              {displayPlayer.player.role}
                            </span>
                          ) : (
                            <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                              PLAYER
                            </span>
                          )}

                          {isUnsold ? (
                            <span className="px-2.5 py-0.5 rounded-lg bg-red-500/15 border border-red-500/30 text-red-400 font-mono text-[10.5px] font-bold uppercase tracking-wider flex items-center gap-1">
                              <Ban className="w-3.5 h-3.5" /> UNSOLD
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-300 font-mono text-[10.5px] font-bold tracking-wider flex items-center gap-1">
                              <Sparkles className="w-3 h-3 text-amber-400" /> LIVE STAGE
                            </span>
                          )}
                        </div>

                        {/* Center Body: Base Price */}
                        <div className="my-auto py-1.5 space-y-0.5">
                          <span className="block text-[9.5px] font-mono font-bold uppercase tracking-widest text-amber-400/80">
                            BASE PRICE
                          </span>
                          <span className="text-2xl sm:text-3xl font-heading font-black text-white tracking-tight block tabular-nums">
                            <AnimatedNumber
                              value={displayPlayer.basePrice}
                              format={(val) => formatCurrency(Math.round(val), displayPlayer.currency || roomCurrency)}
                              springOptions={{ bounce: 0, duration: 1500 }}
                            />
                          </span>
                        </div>

                        {/* Bottom Footer */}
                        <div className="pt-2 border-t border-white/10 flex items-center justify-between">
                          <span className="text-[10.5px] font-mono text-muted-foreground">
                            Live Bidding Active
                          </span>
                          <span className="text-[10.5px] font-mono text-muted-foreground uppercase">
                            {displayPlayer.currency || roomCurrency}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* BACK FACE: Revealed Winning Team & Final Sale Price (rotateX=180deg) */}
                    <div
                      className={cn(
                        'absolute inset-0 rounded-[22px] p-[1.5px] bg-gradient-to-b shadow-xl overflow-hidden [backface-visibility:hidden] [transform:rotateX(180deg)]',
                        isMyTeamWinner
                          ? 'from-emerald-400/80 via-emerald-600/50 to-slate-900 shadow-[0_10px_30px_-10px_rgba(16,185,129,0.3)]'
                          : 'from-amber-400/80 via-amber-600/50 to-slate-900 shadow-[0_10px_30px_-10px_rgba(245,158,11,0.3)]'
                      )}
                    >
                      <div className="w-full h-full rounded-[20.5px] bg-[#0c0e14]/98 backdrop-blur-3xl p-4 sm:p-5 border border-white/10 flex flex-col justify-between">
                        {/* Top Row */}
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={cn(
                              'px-2.5 py-0.5 rounded-lg text-[10.5px] font-mono font-bold uppercase tracking-wider border shadow-sm',
                              roleStyle?.pillBg,
                              roleStyle?.pillText,
                              roleStyle?.pillBorder
                            )}
                          >
                            {displayPlayer.player.role}
                          </span>

                          <span
                            className={cn(
                              'px-2 py-0.5 rounded-md font-mono text-[10px] font-bold uppercase tracking-wider flex items-center gap-1',
                              isMyTeamWinner
                                ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
                                : 'bg-amber-500/15 border border-amber-500/30 text-amber-300'
                            )}
                          >
                            {isMyTeamWinner ? <Trophy className="w-3.5 h-3.5 text-emerald-400" /> : <Check className="w-3.5 h-3.5" />}
                            {isMyTeamWinner ? 'ACQUIRED' : 'SOLD'}
                          </span>
                        </div>

                        {/* Center Body: Sold to Team Name & Final Price */}
                        <div className="my-auto py-1 space-y-0.5 text-center">
                          <span className="block text-[9.5px] font-mono font-bold uppercase tracking-widest text-muted-foreground">
                            {isMyTeamWinner ? 'JOINED SQUAD FOR' : 'SOLD TO'}
                          </span>

                          <div className="flex items-center justify-center gap-1.5">
                            <Shield className={cn("w-4 h-4 shrink-0", isMyTeamWinner ? "text-emerald-400" : "text-amber-400")} />
                            <h4 className={cn(
                              "text-base sm:text-lg font-heading font-black tracking-tight truncate max-w-[200px]",
                              isMyTeamWinner ? "text-emerald-300" : "text-amber-300"
                            )}>
                              {assignedTeam?.name || 'Club'}
                            </h4>
                          </div>

                          <span className="text-2xl sm:text-3xl font-heading font-black text-white tracking-tight block tabular-nums mt-0.5">
                            <AnimatedNumber
                              value={
                                displayPlayer.soldPrice !== null && displayPlayer.soldPrice !== undefined
                                  ? displayPlayer.soldPrice
                                  : displayPlayer.basePrice
                              }
                              format={(val) => formatCurrency(Math.round(val), displayPlayer.currency || roomCurrency)}
                              springOptions={{ bounce: 0, duration: 1500 }}
                            />
                          </span>
                        </div>

                        {/* Bottom Footer */}
                        <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[10.5px] font-mono">
                          <span className="text-emerald-400 font-semibold flex items-center gap-1">
                            <Check className="w-3 h-3" /> Added to Roster
                          </span>
                          <span className="text-muted-foreground uppercase font-bold">
                            Official
                          </span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </div>
              </div>
            </motion.div>
          )
        ) : (
          /* ========================================================================= */
          /* WAITING / IDLE STAGE                                                      */
          /* ========================================================================= */
          <motion.div
            key="idle-stage"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col items-center justify-center text-center p-8 rounded-3xl bg-[#090b10] border border-white/10 w-full max-w-md shadow-2xl"
          >
            <div className="relative mb-5 flex items-center justify-center">
              <div className="relative h-16 w-16 rounded-2xl bg-black/80 border border-white/15 flex items-center justify-center shadow-xl backdrop-blur-xl">
                <Image
                  src="/logo/eleven.png"
                  alt="Eleven Logo"
                  width={40}
                  height={40}
                  className="object-contain opacity-90 drop-shadow"
                  priority
                />
              </div>
            </div>

            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10.5px] font-mono tracking-widest text-amber-400 uppercase mb-3 font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              <span>LIVE AUCTION COMPANION</span>
            </div>

            <h3 className="font-heading font-black text-xl sm:text-2xl text-white mb-1.5">
              Waiting for Draw
            </h3>
            <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">
              The auctioneer will draw the next player onto the stage. Watch this screen for live reveals and player statistics.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
