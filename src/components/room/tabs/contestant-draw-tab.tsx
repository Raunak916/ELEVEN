'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuctionStore } from '@/lib/auction-store';
import { useRoomStore } from '@/lib/room-store';
import { formatCurrency, ROLE_COLORS, CATEGORY_COLORS, cn } from '@/lib/utils';
import { Sparkles, Check, Ban, Globe, Users, Shield, Trophy } from 'lucide-react';
import { Currency } from '@/lib/types';

export function ContestantDrawTab() {
  const { drawnPlayer, drawPhase, teams, settings, auctionPlayers } = useAuctionStore();
  const { activeSession } = useRoomStore();

  const [persistedPlayer, setPersistedPlayer] = useState<any>(null);

  // When drawnPlayer updates, persist it so it stays visible after assignment until the next live player arrives
  useEffect(() => {
    if (drawnPlayer) {
      setPersistedPlayer(drawnPlayer);
    }
  }, [drawnPlayer]);

  // If drawnPlayer is null but we have a persisted player, sync with latest auctionPlayers roster if assigned
  const activePlayer = drawnPlayer || persistedPlayer;
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

  // Determine assignment or status
  const isAssigned = Boolean(displayPlayer?.teamId);
  const assignedTeam = isAssigned ? teams.find((t) => t.id === displayPlayer?.teamId) : null;
  const isMyTeamWinner = isAssigned && displayPlayer?.teamId === activeSession?.participantId;
  const isUnsold = displayPlayer?.status === 'UNSOLD';

  const roleStyle = displayPlayer?.player.role
    ? ROLE_COLORS[displayPlayer.player.role] || {
        borderGradient: 'from-amber-400 to-amber-600',
        accentGlow: 'shadow-amber-500/20',
        pillBg: 'bg-amber-500/20',
        pillText: 'text-amber-300',
        pillBorder: 'border-amber-500/40',
      }
    : null;

  const categoryStyle = displayPlayer?.player.category
    ? CATEGORY_COLORS[displayPlayer.player.category] || {
        border: 'border-zinc-500/40',
        bg: 'bg-zinc-500/10',
        text: 'text-zinc-300',
      }
    : null;

  return (
    <div className="w-full h-full flex flex-col items-center justify-center relative p-1 sm:p-2 overflow-y-auto scrollbar-thin">
      <AnimatePresence mode="wait">
        {displayPlayer ? (
          /* ========================================================================= */
          /* ACTIVE DRAWN / PERSISTED PLAYER ON STAGE                                  */
          /* ========================================================================= */
          <motion.div
            key={displayPlayer.id}
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -12 }}
            transition={{ type: 'spring', bounce: 0.15, duration: 0.45 }}
            className="w-full flex flex-col items-center space-y-3 sm:space-y-4 my-auto py-1"
          >
            {/* Live Block Pill Header */}
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
                      : 'bg-[var(--gold)]'
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
                      : 'bg-[var(--gold)]'
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
                    : 'text-[var(--gold)]'
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

            {/* Side-by-Side 2-Card Layout (Matching comp-1-new.png) */}
            <div className="w-full flex flex-col md:flex-row items-center justify-center gap-3.5 sm:gap-5 xl:gap-7 max-w-4xl mx-auto">
              
              {/* =================================================================== */}
              {/* LEFT CARD: Tall Rectangle Player Portrait & Details Card           */}
              {/* =================================================================== */}
              <div
                className={cn(
                  'w-full max-w-[260px] sm:max-w-[290px] xl:max-w-[330px] rounded-[24px] xl:rounded-[28px] p-[2px] bg-gradient-to-b shadow-xl transition-all duration-300 overflow-hidden shrink-0',
                  isAssigned
                    ? isMyTeamWinner
                      ? 'from-emerald-400 via-emerald-600 to-emerald-950 shadow-[0_0_30px_rgba(16,185,129,0.3)]'
                      : 'from-blue-500/80 via-blue-700/60 to-slate-950 shadow-[0_0_25px_rgba(59,130,246,0.25)]'
                    : isUnsold
                    ? 'from-red-500/60 via-zinc-800 to-black'
                    : roleStyle?.borderGradient || 'from-[var(--gold)] via-amber-500/50 to-black'
                )}
              >
                <div className="w-full h-full rounded-[22px] xl:rounded-[26px] bg-gradient-to-b from-[#141a24]/98 via-[#0c0f15]/98 to-[#07090d]/98 backdrop-blur-3xl p-3.5 sm:p-4 xl:p-5 border border-white/15 flex flex-col justify-between">
                  {/* Tall Player Photo Box */}
                  <div className="relative aspect-[3/3.5] w-full rounded-xl xl:rounded-2xl overflow-hidden bg-black/80 border border-white/10 shadow-inner group">
                    {displayPlayer.player.photo ? (
                      <Image
                        src={displayPlayer.player.photo}
                        alt={displayPlayer.player.name}
                        fill
                        unoptimized={Boolean(displayPlayer.player.photo.startsWith('data:'))}
                        className="object-cover object-top transition-transform duration-700 group-hover:scale-105"
                        sizes="(max-width: 768px) 100vw, 340px"
                        priority
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-zinc-900 to-black text-muted-foreground">
                        <Users className="w-16 h-16 xl:w-20 xl:h-20 opacity-30" />
                      </div>
                    )}

                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none" />
                  </div>

                  {/* Player Metadata (Club, Name, Country, Position) */}
                  <div className="mt-2.5 xl:mt-3 space-y-0.5">
                    <span className="text-[11px] sm:text-xs font-mono font-black uppercase tracking-wider text-[var(--gold)] block truncate drop-shadow">
                      {displayPlayer.player.team || 'Free Agent'}
                    </span>

                    <h3 className="text-lg sm:text-xl xl:text-2xl font-heading font-black text-white truncate tracking-tight drop-shadow-md">
                      {displayPlayer.player.name}
                    </h3>

                    <div className="flex items-center justify-between pt-1 text-xs text-white/85 font-medium">
                      <span className="flex items-center gap-1.5 truncate">
                        <Globe className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        <span className="truncate">{displayPlayer.player.nationality || 'International'}</span>
                      </span>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {categoryStyle && (
                          <span
                            className={cn(
                              'px-1.5 xl:px-2 py-0.5 rounded-md text-[9px] xl:text-[10px] font-mono font-bold uppercase tracking-wider border',
                              categoryStyle.bg,
                              categoryStyle.text,
                              categoryStyle.border
                            )}
                          >
                            {displayPlayer.player.category}
                          </span>
                        )}
                        <span className="font-mono font-black text-white text-[11px] xl:text-xs px-2 py-0.5 rounded-md bg-white/15 border border-white/20 shadow-sm">
                          {displayPlayer.player.position}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* =================================================================== */}
              {/* RIGHT CARD: 3D Vertical Flip Price & Ownership Card                 */}
              {/* =================================================================== */}
              <div className="w-full max-w-[270px] sm:max-w-[310px] xl:max-w-[360px] h-[210px] sm:h-[235px] xl:h-[260px] perspective-[1200px] select-none shrink-0">
                <motion.div
                  animate={{ rotateX: isAssigned ? 180 : 0 }}
                  transition={{ type: 'spring', stiffness: 180, damping: 18 }}
                  className="w-full h-full relative [transform-style:preserve-3d]"
                >
                  {/* ---------------------------------------------------------------- */}
                  {/* FRONT FACE: Active Bidding / Base Price Phase (rotateX = 0deg)  */}
                  {/* ---------------------------------------------------------------- */}
                  <div
                    className={cn(
                      'absolute inset-0 rounded-[24px] xl:rounded-[28px] p-[2px] bg-gradient-to-b shadow-xl transition-all duration-300 overflow-hidden [backface-visibility:hidden]',
                      isUnsold
                        ? 'from-red-500/60 via-zinc-800 to-black'
                        : 'from-white/20 via-white/5 to-black'
                    )}
                  >
                    <div className="w-full h-full rounded-[22px] xl:rounded-[26px] bg-gradient-to-b from-[#141a24]/98 via-[#0c0f15]/98 to-[#07090d]/98 backdrop-blur-3xl p-4 sm:p-5 xl:p-6 border border-white/15 flex flex-col justify-between">
                      {/* Top Row */}
                      <div className="flex items-center justify-between gap-2">
                        {roleStyle ? (
                          <span
                            className={cn(
                              'px-2.5 xl:px-3 py-1 rounded-lg xl:rounded-xl text-[11px] xl:text-xs font-mono font-black uppercase tracking-wider border shadow-md',
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
                          <span className="px-2.5 py-1 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 font-mono text-[10px] xl:text-xs font-black uppercase tracking-wider flex items-center gap-1">
                            <Ban className="w-3.5 h-3.5" /> UNSOLD
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-lg bg-white/10 border border-white/15 text-white/90 font-mono text-[10px] xl:text-xs font-bold tracking-wider flex items-center gap-1 shadow-sm">
                            <Sparkles className="w-3 h-3 text-[var(--gold)]" /> ON STAGE
                          </span>
                        )}
                      </div>

                      {/* Center Body: Base Price */}
                      <div className="my-auto py-1.5 space-y-0.5">
                        <span className="block text-[10px] xl:text-xs font-mono font-bold uppercase tracking-widest text-[var(--gold)]">
                          BASE PRICE
                        </span>
                        <span className="text-2xl sm:text-3xl xl:text-4xl font-heading font-black text-foreground tracking-tight block tabular-nums">
                          {formatCurrency(displayPlayer.basePrice, displayPlayer.currency || roomCurrency)}
                        </span>
                      </div>

                      {/* Bottom Footer */}
                      <div className="pt-2 xl:pt-2.5 border-t border-white/10 flex items-center justify-between">
                        <span className="text-[10px] xl:text-xs font-mono text-muted-foreground">
                          {drawPhase === 'drawing' ? 'Drawing...' : 'Live Bidding Active'}
                        </span>
                        <span className="text-[10px] xl:text-xs font-mono text-muted-foreground uppercase">
                          {displayPlayer.currency || roomCurrency}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* ---------------------------------------------------------------- */}
                  {/* BACK FACE: Revealed Winning Team & Final Sale Price (rotateX=180) */}
                  {/* ---------------------------------------------------------------- */}
                  <div
                    className={cn(
                      'absolute inset-0 rounded-[24px] xl:rounded-[28px] p-[2px] bg-gradient-to-b shadow-xl overflow-hidden [backface-visibility:hidden] [transform:rotateX(180deg)]',
                      isMyTeamWinner
                        ? 'from-emerald-400 via-emerald-600 to-emerald-950 shadow-[0_0_35px_rgba(16,185,129,0.35)]'
                        : 'from-[var(--gold)] via-amber-600 to-amber-950 shadow-[0_0_35px_rgba(234,179,8,0.3)]'
                    )}
                  >
                    <div className="w-full h-full rounded-[22px] xl:rounded-[26px] bg-gradient-to-b from-[#141a24]/98 via-[#0c0f15]/98 to-[#07090d]/98 backdrop-blur-3xl p-4 sm:p-5 xl:p-6 border border-white/20 flex flex-col justify-between">
                      {/* Top Row: Role & Result Pill */}
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={cn(
                            'px-2.5 xl:px-3 py-1 rounded-lg xl:rounded-xl text-[11px] xl:text-xs font-mono font-black uppercase tracking-wider border shadow-md',
                            roleStyle?.pillBg,
                            roleStyle?.pillText,
                            roleStyle?.pillBorder
                          )}
                        >
                          {displayPlayer.player.role}
                        </span>

                        <span
                          className={cn(
                            'px-2.5 py-1 rounded-lg font-mono text-[10px] xl:text-xs font-black uppercase tracking-wider flex items-center gap-1 shadow-md',
                            isMyTeamWinner
                              ? 'bg-emerald-500/25 border border-emerald-500/40 text-emerald-300'
                              : 'bg-[var(--gold)]/20 border border-[var(--gold)]/40 text-[var(--gold)]'
                          )}
                        >
                          {isMyTeamWinner ? <Trophy className="w-3.5 h-3.5 text-emerald-400" /> : <Check className="w-3.5 h-3.5" />}
                          {isMyTeamWinner ? 'ACQUIRED' : 'SOLD'}
                        </span>
                      </div>

                      {/* Center Body: Sold to Team Name & Final Price */}
                      <div className="my-auto py-1 space-y-0.5 text-center">
                        <span className="block text-[10px] font-mono font-bold uppercase tracking-widest text-muted-foreground">
                          {isMyTeamWinner ? 'JOINED SQUAD FOR' : 'SOLD TO'}
                        </span>

                        <div className="flex items-center justify-center gap-1.5">
                          <Shield className={cn("w-4 h-4 shrink-0", isMyTeamWinner ? "text-emerald-400" : "text-[var(--gold)]")} />
                          <h4 className={cn(
                            "text-base sm:text-lg xl:text-xl font-heading font-black tracking-tight truncate max-w-[220px]",
                            isMyTeamWinner ? "text-emerald-300" : "text-[var(--gold)]"
                          )}>
                            {assignedTeam?.name || 'Club'}
                          </h4>
                        </div>

                        <span className="text-2xl sm:text-3xl xl:text-4xl font-heading font-black text-white tracking-tight block tabular-nums mt-0.5">
                          {formatCurrency(
                            displayPlayer.soldPrice !== null && displayPlayer.soldPrice !== undefined
                              ? displayPlayer.soldPrice
                              : displayPlayer.basePrice,
                            displayPlayer.currency || roomCurrency
                          )}
                        </span>
                      </div>

                      {/* Bottom Footer */}
                      <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[10px] xl:text-xs font-mono">
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
        ) : (
          /* ========================================================================= */
          /* WAITING / IDLE STAGE (INITIAL ONLY)                                       */
          /* ========================================================================= */
          <motion.div
            key="idle-stage"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col items-center justify-center text-center p-8 sm:p-12 rounded-3xl bg-white/[0.03] backdrop-blur-2xl border border-white/10 w-full max-w-md shadow-2xl"
          >
            {/* Ambient Pulse Crest */}
            <div className="relative mb-6 flex items-center justify-center">
              <div className="absolute w-28 h-28 rounded-full bg-[var(--gold)]/10 animate-ping opacity-30" />
              <div className="absolute w-24 h-24 rounded-full bg-emerald-500/10 animate-pulse" />
              <div className="relative h-16 w-16 sm:h-20 sm:w-20 rounded-3xl bg-black/70 border border-white/15 flex items-center justify-center shadow-2xl backdrop-blur-xl">
                <Image
                  src="/logo/eleven.png"
                  alt="Eleven Logo"
                  width={48}
                  height={48}
                  className="object-contain opacity-90 drop-shadow"
                  priority
                />
              </div>
            </div>

            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-mono tracking-widest text-[var(--gold)] uppercase mb-3 shadow-inner font-bold">
              <span className="w-2 h-2 rounded-full bg-[var(--gold)] animate-pulse" />
              <span>LIVE AUCTION COMPANION</span>
            </div>

            <h3 className="font-heading font-black text-2xl sm:text-3xl text-foreground mb-2">
              Waiting for Draw
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-xs leading-relaxed">
              The auctioneer will draw the next player onto the stage. Watch this screen for live reveals and player statistics.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
