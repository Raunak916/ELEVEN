'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuctionStore } from '@/lib/auction-store';
import { useRoomStore } from '@/lib/room-store';
import { formatCurrency, CATEGORY_COLORS, cn } from '@/lib/utils';
import { Clock, Shield, Trophy, Ban } from 'lucide-react';
import { Currency } from '@/lib/types';

export function ContestantHistoryTab() {
  const { auctionPlayers, teams, settings } = useAuctionStore();
  const { activeSession } = useRoomStore();

  const roomCurrency = (settings?.currency || activeSession?.settings?.currency || 'USD') as Currency;

  // Filter all drawn or sold players across the entire auction room
  const drawnOrSoldPlayers = React.useMemo(() => {
    const drawn = auctionPlayers.filter(
      (ap) =>
        ap.status === 'DRAWN' ||
        ap.status === 'UNSOLD' ||
        ap.soldPrice !== null ||
        ap.teamId !== null ||
        ap.drawnAt !== null
    );

    return drawn
      .slice()
      .sort((a, b) => {
        const timeA = new Date(a.soldAt || a.drawnAt || a.createdAt || 0).getTime();
        const timeB = new Date(b.soldAt || b.drawnAt || b.createdAt || 0).getTime();
        return timeB - timeA;
      });
  }, [auctionPlayers]);

  return (
    <div className="w-full h-full flex-1 flex flex-col space-y-3.5 min-h-0">
      {/* Top Header */}
      <div className="flex items-center justify-between px-1 shrink-0">
        <h4 className="font-heading font-black text-sm sm:text-base uppercase tracking-wider text-foreground flex items-center gap-2">
          <Clock className="w-4 h-4 text-[var(--gold)]" />
          <span>Global Auction Feed ({drawnOrSoldPlayers.length})</span>
        </h4>
        <span className="text-xs font-mono font-bold text-muted-foreground/90">
          All Draft Events
        </span>
      </div>

      {/* Main Stream of Completed Sales & Draws */}
      {drawnOrSoldPlayers.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 sm:p-12 rounded-3xl bg-white/[0.02] border border-white/10 text-center min-h-[240px]">
          <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-3 text-muted-foreground shadow-lg">
            <Trophy className="w-7 h-7 opacity-40" />
          </div>
          <p className="font-heading font-black text-base sm:text-lg text-foreground">
            No sales recorded yet
          </p>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-[280px] leading-relaxed">
            As players are drawn and sold to clubs across the room, the live feed will update here in real time.
          </p>
        </div>
      ) : (
        <div className="flex-1 min-h-0 space-y-3 overflow-y-auto pr-1.5 scrollbar-thin">
          <AnimatePresence initial={false}>
            {drawnOrSoldPlayers.map((ap, index) => {
              const assignedTeam = teams.find((t) => t.id === ap.teamId);
              const isMyTeam = ap.teamId === activeSession?.participantId;
              const isMystery = Boolean(
                ap.isMystery ||
                ap.player.name.startsWith('MYSTERY') ||
                ap.id.startsWith('auction-mystery-')
              );
              const isUnsold = ap.status === 'UNSOLD';
              const price = isUnsold ? 0 : (ap.soldPrice ?? ap.basePrice);
              const categoryColor = CATEGORY_COLORS[ap.player.category] || '#eab308';

              return (
                <motion.div
                  key={ap.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.25, delay: index * 0.02 }}
                  className={cn(
                    'flex items-center justify-between p-4 rounded-2xl border backdrop-blur-xl transition-all shadow-md gap-3.5',
                    isMyTeam
                      ? 'bg-emerald-950/30 border-emerald-500/40 shadow-[0_0_20px_rgba(16,185,129,0.15)]'
                      : isMystery
                      ? 'bg-gradient-to-r from-blue-950/40 via-cyan-950/25 to-black/60 border-cyan-500/40'
                      : 'bg-white/[0.04] hover:bg-white/[0.08] border-white/10'
                  )}
                >
                  {/* Left: Index badge */}
                  <div
                    className="h-10 w-10 sm:h-11 sm:w-11 rounded-2xl flex items-center justify-center text-xs sm:text-sm font-mono font-black shrink-0 shadow-inner"
                    style={{
                      backgroundColor: `${categoryColor}25`,
                      color: categoryColor,
                      border: `1px solid ${categoryColor}50`,
                    }}
                  >
                    #{drawnOrSoldPlayers.length - index}
                  </div>

                  {/* Middle: Player Name, Role & Assigned Team */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p
                        className={cn(
                          'font-heading font-black truncate text-base sm:text-lg tracking-tight',
                          isMystery ? 'text-cyan-200' : 'text-foreground'
                        )}
                      >
                        {ap.player.name}
                      </p>
                      {isMystery && (
                        <span className="px-2 py-0.5 rounded-md text-[9px] font-mono font-black uppercase tracking-wider bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                          MYSTERY
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="text-xs sm:text-sm text-muted-foreground capitalize font-medium">
                        {ap.role}
                      </span>
                      <span className="text-xs text-muted-foreground/50">•</span>
                      {isUnsold ? (
                        <span className="inline-flex items-center gap-1 text-xs sm:text-sm font-bold text-red-400">
                          <Ban className="w-3.5 h-3.5" /> Unsold
                        </span>
                      ) : assignedTeam ? (
                        <span
                          className={cn(
                            'inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold truncate max-w-[160px]',
                            isMyTeam ? 'text-emerald-400 font-black' : 'text-[var(--gold)]'
                          )}
                        >
                          <Shield className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">
                            {isMyTeam ? 'Your Squad' : assignedTeam.name}
                          </span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs sm:text-sm font-medium text-amber-400/90">
                          <span>Pending Sale</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right: Final Price & Status */}
                  <div className="text-right shrink-0">
                    <p className="font-heading font-black text-base sm:text-xl text-foreground tabular-nums">
                      {formatCurrency(price, ap.currency || roomCurrency)}
                    </p>
                    <span className="text-[10px] sm:text-[11px] font-mono font-bold uppercase tracking-wider text-muted-foreground block mt-0.5">
                      {isUnsold ? 'Passed' : ap.soldPrice !== null ? 'Final Sale' : 'Base Price'}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
