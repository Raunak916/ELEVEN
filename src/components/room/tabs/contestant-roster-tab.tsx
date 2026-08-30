'use client';

import React from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuctionStore } from '@/lib/auction-store';
import { useRoomStore } from '@/lib/room-store';
import { formatCurrency, ROLE_DRAW_STYLES, cn } from '@/lib/utils';
import { Users, Receipt, Shield, Sparkles } from 'lucide-react';
import { Currency, PlayerRole } from '@/lib/types';

export function ContestantRosterTab() {
  const { auctionPlayers, teams, settings } = useAuctionStore();
  const { activeSession } = useRoomStore();

  const myTeamId = activeSession?.participantId;
  const myTeam = teams.find((t) => t.id === myTeamId);
  const myTeamName = myTeam?.name || activeSession?.teamName || 'My Club';
  const myOwnerName = myTeam?.owner || activeSession?.name;

  const roomCurrency = (settings?.currency || activeSession?.settings?.currency || 'USD') as Currency;
  const maxBudget = myTeam?.customMaxBudget ?? (settings?.maxTeamBudget || activeSession?.settings?.maxTeamBudget || 200000000);

  // Filter signed players for this contestant's club
  const myPlayers = auctionPlayers.filter(
    (p) => p.teamId === myTeamId && p.soldPrice !== null && p.soldPrice !== undefined
  );

  const playersTotalSpent = myPlayers.reduce(
    (sum, p) => sum + (p.soldPrice ?? p.basePrice),
    0
  );
  const myExpenses = myTeam?.otherExpenses || [];
  const otherExpensesTotal = myExpenses.reduce((sum, exp) => sum + exp.amount, 0);

  return (
    <div className="w-full h-full flex-1 flex flex-col space-y-3.5 min-h-0">
      {/* Main Signed Players Section */}
      <div className="flex-1 flex flex-col space-y-3 min-h-0">
        <div className="flex items-center justify-between px-1 shrink-0">
          <h4 className="font-heading font-black text-sm sm:text-base uppercase tracking-wider text-foreground flex items-center gap-2">
            <Shield className="w-4 h-4 text-[var(--gold)]" />
            <span>Starting Squad ({myPlayers.length} / 11)</span>
          </h4>
          <span className="text-xs font-mono font-bold text-[var(--gold)] px-2.5 py-0.5 rounded-full bg-[var(--gold)]/10 border border-[var(--gold)]/20">
            {11 - myPlayers.length} spots remaining
          </span>
        </div>

        {myPlayers.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 sm:p-12 rounded-3xl bg-white/[0.02] border border-white/10 text-center min-h-[220px]">
            <div className="w-14 h-14 rounded-2xl bg-[var(--gold)]/10 border border-[var(--gold)]/20 flex items-center justify-center mb-3 text-[var(--gold)] shadow-lg">
              <Users className="w-7 h-7 opacity-80" />
            </div>
            <p className="font-heading font-black text-base sm:text-lg text-foreground">
              No players signed yet
            </p>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-[280px] leading-relaxed">
              When you win players on the live auction block, they will appear in your starting squad roster here.
            </p>
          </div>
        ) : (
          <div className="flex-1 min-h-0 space-y-2.5 overflow-y-auto pr-1.5 scrollbar-thin">
            <AnimatePresence initial={false}>
              {myPlayers.map((player, i) => {
                const isMystery = Boolean(
                  player.isMystery ||
                  player.player.name.startsWith('MYSTERY') ||
                  player.id.startsWith('auction-mystery-')
                );
                const soldPrice = player.soldPrice ?? player.basePrice;
                const roleStyle = ROLE_DRAW_STYLES[player.role as PlayerRole] || ROLE_DRAW_STYLES.Midfielder;

                return (
                  <motion.div
                    key={player.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.25, delay: i * 0.03 }}
                    className={cn(
                      'flex items-center justify-between p-3.5 sm:p-4 rounded-2xl border backdrop-blur-xl transition-all shadow-md gap-3',
                      isMystery
                        ? 'bg-gradient-to-r from-blue-950/40 via-cyan-950/30 to-black/60 border-cyan-500/40 shadow-[0_0_20px_rgba(0,180,255,0.1)]'
                        : 'bg-white/[0.04] hover:bg-white/[0.08] border-white/10'
                    )}
                  >
                    {/* Index & Player Info with Large Photo Thumbnail */}
                    <div className="flex items-center gap-3.5 min-w-0 flex-1">
                      <span className="text-xs sm:text-sm font-mono font-bold text-muted-foreground w-4 text-center shrink-0">
                        {i + 1}
                      </span>

                      {/* Large Rounded Square Player Photo */}
                      <div className="relative h-12 w-12 sm:h-14 sm:w-14 rounded-2xl overflow-hidden bg-black/70 border border-white/15 shrink-0 shadow-inner flex items-center justify-center">
                        {player.player.photo ? (
                          <Image
                            src={player.player.photo}
                            alt={player.player.name}
                            fill
                            unoptimized={Boolean(player.player.photo.startsWith('data:'))}
                            className="object-cover object-top"
                            sizes="56px"
                          />
                        ) : (
                          <span className="text-xs sm:text-sm font-mono font-bold text-muted-foreground">
                            {player.player.name.substring(0, 2).toUpperCase()}
                          </span>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-base sm:text-lg font-heading font-black text-white truncate tracking-tight">
                            {player.player.name}
                          </p>
                          {isMystery && (
                            <span className="px-2 py-0.5 rounded-md text-[9px] font-mono font-black uppercase tracking-wider bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                              MYSTERY
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2.5 mt-1 flex-wrap">
                          <span
                            className={cn(
                              'px-2 py-0.5 rounded-lg text-[10px] sm:text-xs font-mono font-black uppercase tracking-wider border',
                              roleStyle.pillBg,
                              roleStyle.pillText,
                              roleStyle.pillBorder
                            )}
                          >
                            {player.role}
                          </span>
                          <span className="text-xs text-muted-foreground/80 font-mono font-medium">
                            Base: {formatCurrency(player.basePrice, player.currency || roomCurrency)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Sold Price Badge */}
                    <div className="text-right shrink-0">
                      <span className="block text-[9.5px] sm:text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground">
                        ACQUIRED FOR
                      </span>
                      <span className="font-heading font-black text-base sm:text-xl text-[var(--gold)] tabular-nums block mt-0.5">
                        {formatCurrency(soldPrice, player.currency || roomCurrency)}
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Other Expenses Section (if any) */}
      {myExpenses.length > 0 && (
        <div className="pt-3.5 border-t border-white/10 space-y-2.5">
          <div className="flex items-center justify-between px-1">
            <h4 className="font-heading font-bold text-xs sm:text-sm uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Receipt className="w-4 h-4 text-rose-400" />
              <span>Other Expenses ({myExpenses.length})</span>
            </h4>
            <span className="text-xs sm:text-sm font-heading font-black text-rose-400">
              -{formatCurrency(otherExpensesTotal, roomCurrency)}
            </span>
          </div>

          <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1 scrollbar-thin">
            {myExpenses.map((exp, idx) => (
              <div
                key={exp.id}
                className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10 text-xs sm:text-sm gap-2"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-foreground truncate">{exp.title}</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground font-mono mt-0.5">
                    {new Date(exp.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <span className="font-heading font-bold text-rose-400 shrink-0 text-sm">
                  -{formatCurrency(exp.amount, roomCurrency)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
