'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CustomAuctionCard } from '@/components/cards/cards-data';
import {
  Zap,
  Flame,
  Sparkles,
  Eye,
  Shield,
  Layers,
  CheckCircle2,
  RotateCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRoomStore } from '@/lib/room-store';

const STORAGE_POWER_KEY = 'football-auction-power-cards-v2';
const STORAGE_SICK_KEY = 'football-auction-sick-cards-v2';

export function ContestantCardsTab() {
  const { activeSession } = useRoomStore();

  const [activeTab, setActiveTab] = useState<'power' | 'sick'>('power');
  const [powerCards, setPowerCards] = useState<CustomAuctionCard[]>([]);
  const [sickCards, setSickCards] = useState<CustomAuctionCard[]>([]);
  const [flippedIds, setFlippedIds] = useState<Set<string>>(new Set());

  const myTeamId = activeSession?.participantId;
  const myTeamName = activeSession?.teamName || 'My Club';
  const myManagerName = activeSession?.name || 'Manager';

  // Load from session cardsState or localStorage
  const loadCards = () => {
    try {
      if (activeSession?.cardsState) {
        if (Array.isArray(activeSession.cardsState.powerCards)) {
          setPowerCards(activeSession.cardsState.powerCards);
        }
        if (Array.isArray(activeSession.cardsState.sickCards)) {
          setSickCards(activeSession.cardsState.sickCards);
        }
        return;
      }

      const savedPower = localStorage.getItem(STORAGE_POWER_KEY);
      if (savedPower) {
        const parsed = JSON.parse(savedPower);
        if (Array.isArray(parsed)) setPowerCards(parsed);
      }
      const savedSick = localStorage.getItem(STORAGE_SICK_KEY);
      if (savedSick) {
        const parsed = JSON.parse(savedSick);
        if (Array.isArray(parsed)) setSickCards(parsed);
      }
    } catch {}
  };

  useEffect(() => {
    loadCards();
  }, [activeSession?.cardsState]);

  // Listen to cross-tab storage changes
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_POWER_KEY || e.key === STORAGE_SICK_KEY) {
        loadCards();
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const toggleFlip = (id: string) => {
    setFlippedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Filter ONLY cards assigned to this contestant's team
  const isCardAssignedToMe = (card: CustomAuctionCard) => {
    if (!myTeamId && !myTeamName) return false;
    const matchId = card.assignedTeamId && myTeamId && card.assignedTeamId === myTeamId;
    const matchName =
      card.assignedTeamName &&
      myTeamName &&
      card.assignedTeamName.trim().toLowerCase() === myTeamName.trim().toLowerCase();
    return Boolean(matchId || matchName);
  };

  const assignedPowerCards = powerCards.filter(isCardAssignedToMe);
  const assignedSickCards = sickCards.filter(isCardAssignedToMe);

  const displayedCards = activeTab === 'power' ? assignedPowerCards : assignedSickCards;

  return (
    <div className="w-full h-full flex flex-col space-y-4">
      {/* Top Banner: Club Identity & Two-Tab Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-card/60 border border-white/10 backdrop-blur-xl shadow-lg shrink-0">
        {/* Left: Club Identity */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--gold)]/15 border border-[var(--gold)]/30 flex items-center justify-center text-[var(--gold)] shrink-0 shadow-inner">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-heading font-black text-sm sm:text-base text-foreground tracking-tight flex items-center gap-2">
              <span>{myTeamName}</span>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[var(--gold)]/10 text-[var(--gold)] border border-[var(--gold)]/20 uppercase">
                PIN: {myTeamId}
              </span>
            </h4>
            <p className="text-xs text-muted-foreground">Manager: {myManagerName}</p>
          </div>
        </div>

        {/* Exactly Two Tabs: Power Cards vs Sick Cards */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-black/40 border border-white/10 shrink-0">
          {/* Tab 1: Power Cards */}
          <button
            type="button"
            onClick={() => setActiveTab('power')}
            className={cn(
              'px-4 py-2 rounded-lg text-xs font-heading font-bold uppercase tracking-wider transition-all flex items-center gap-2',
              activeTab === 'power'
                ? 'bg-gradient-to-r from-[var(--gold)] via-amber-400 to-amber-500 text-black shadow-gold font-black'
                : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
            )}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Power Cards</span>
            <span
              className={cn(
                'px-1.5 py-0.2 rounded text-[10px] font-mono font-black',
                activeTab === 'power' ? 'bg-black/30 text-black' : 'bg-white/10 text-muted-foreground'
              )}
            >
              {assignedPowerCards.length}
            </span>
          </button>

          {/* Tab 2: Sick Cards */}
          <button
            type="button"
            onClick={() => setActiveTab('sick')}
            className={cn(
              'px-4 py-2 rounded-lg text-xs font-heading font-bold uppercase tracking-wider transition-all flex items-center gap-2',
              activeTab === 'sick'
                ? 'bg-gradient-to-r from-rose-500 to-red-600 text-white shadow-lg font-black'
                : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
            )}
          >
            <Flame className="w-3.5 h-3.5 text-rose-300" />
            <span>Sick Cards</span>
            <span
              className={cn(
                'px-1.5 py-0.2 rounded text-[10px] font-mono font-black',
                activeTab === 'sick' ? 'bg-black/30 text-white' : 'bg-white/10 text-muted-foreground'
              )}
            >
              {assignedSickCards.length}
            </span>
          </button>
        </div>
      </div>

      {/* Main Centered Stage */}
      <div className="flex-1 flex flex-col items-center justify-center min-h-[420px] p-2 sm:p-4">
        {displayedCards.length === 0 ? (
          /* Empty State - Centered Hero Card Placeholder */
          <div className="w-full max-w-[400px] min-h-[360px] p-8 rounded-3xl bg-card/40 border border-dashed border-white/15 backdrop-blur-xl flex flex-col items-center justify-center text-center shadow-xl space-y-4">
            <div
              className={cn(
                'w-16 h-16 rounded-2xl border flex items-center justify-center shadow-inner',
                activeTab === 'power'
                  ? 'bg-[var(--gold)]/10 border-[var(--gold)]/30 text-[var(--gold)]'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
              )}
            >
              {activeTab === 'power' ? <Zap className="w-8 h-8 opacity-80" /> : <Flame className="w-8 h-8 opacity-80" />}
            </div>

            <div className="space-y-1.5">
              <h4 className="font-heading font-black text-xl text-foreground">
                No {activeTab === 'power' ? 'Power' : 'Sick'} Cards Assigned
              </h4>
              <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
                When the auctioneer assigns a {activeTab === 'power' ? 'Power Card' : 'Sick Card'} to <strong>{myTeamName}</strong>, it will appear right here in real time.
              </p>
            </div>

            <div className="inline-flex items-center gap-2 text-xs font-mono text-muted-foreground bg-black/40 px-3.5 py-1.5 rounded-full border border-white/10">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Awaiting Auctioneer Assignment</span>
            </div>
          </div>
        ) : (
          /* Centered Large Card Display */
          <div className="w-full flex-1 flex flex-col items-center justify-center py-2">
            <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-8 w-full max-w-4xl mx-auto">
              <AnimatePresence mode="popLayout">
                {displayedCards.map((card) => {
                  const isFlipped = flippedIds.has(card.id) || card.isFlipped;
                  const isPower = card.category === 'power';

                  return (
                    <motion.div
                      key={card.id}
                      layout
                      initial={{ opacity: 0, scale: 0.9, y: 15 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ type: 'spring', bounce: 0.2, duration: 0.45 }}
                      onClick={() => toggleFlip(card.id)}
                      className="cursor-pointer group relative perspective-[1200px] w-full max-w-[360px] sm:max-w-[420px] h-[400px] sm:h-[450px] select-none shrink-0"
                    >
                      <motion.div
                        animate={{ rotateY: isFlipped ? 180 : 0 }}
                        transition={{ type: 'spring', stiffness: 220, damping: 20 }}
                        className="w-full h-full relative [transform-style:preserve-3d]"
                      >
                        {/* Front Face: Large Mystery Card Back */}
                        <div
                          className={cn(
                            'absolute inset-0 rounded-[32px] p-7 sm:p-8 flex flex-col justify-between border-2 backdrop-blur-2xl shadow-2xl [backface-visibility:hidden] transition-all duration-300',
                            isPower
                              ? 'bg-gradient-to-br from-amber-950/70 via-black to-[#0e0903] border-[var(--gold)]/60 group-hover:border-[var(--gold)] shadow-[0_0_35px_rgba(234,179,8,0.25)]'
                              : 'bg-gradient-to-br from-rose-950/70 via-black to-[#140406] border-rose-500/60 group-hover:border-rose-500 shadow-[0_0_35px_rgba(244,63,94,0.25)]'
                          )}
                        >
                          {/* Card Header */}
                          <div className="flex items-center justify-between">
                            <span
                              className={cn(
                                'px-3.5 py-1.5 rounded-xl font-mono text-sm sm:text-base font-black uppercase tracking-wider border shadow-md',
                                isPower
                                  ? 'bg-[var(--gold)]/20 text-[var(--gold)] border-[var(--gold)]/40'
                                  : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                              )}
                            >
                              #{card.number}
                            </span>

                            <span className="inline-flex items-center gap-1.5 text-xs font-mono font-bold px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 shadow-sm">
                              <Shield className="w-3.5 h-3.5 text-emerald-400" />
                              <span>{myTeamName}</span>
                            </span>
                          </div>

                          {/* Card Emblem & Title */}
                          <div className="text-center my-auto space-y-3 py-4">
                            <div
                              className={cn(
                                'w-20 h-20 mx-auto rounded-3xl flex items-center justify-center border-2 shadow-2xl transition-transform group-hover:scale-105 duration-300',
                                isPower
                                  ? 'bg-gradient-to-br from-[var(--gold)]/25 to-amber-600/10 text-[var(--gold)] border-[var(--gold)]/40 shadow-[0_0_25px_rgba(234,179,8,0.3)]'
                                  : 'bg-gradient-to-br from-rose-500/25 to-pink-600/10 text-rose-400 border-rose-500/40 shadow-[0_0_25px_rgba(244,63,94,0.3)]'
                              )}
                            >
                              {isPower ? <Zap className="w-10 h-10" /> : <Flame className="w-10 h-10" />}
                            </div>

                            <div className="space-y-1">
                              <h3 className="font-heading font-black text-2xl sm:text-3xl uppercase tracking-wider text-foreground">
                                {isPower ? 'Power Card' : 'Sick Card'}
                              </h3>
                              <p className="text-xs sm:text-sm font-mono font-bold text-emerald-400 tracking-wide uppercase">
                                ✓ Assigned to Your Club
                              </p>
                            </div>
                          </div>

                          {/* Card Footer Prompt */}
                          <div className="text-center pt-3 border-t border-white/10 flex items-center justify-between text-xs font-mono">
                            <span className="text-emerald-400 font-black tracking-wider uppercase flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                              Ready To Play
                            </span>
                            <span className="text-muted-foreground font-semibold flex items-center gap-1.5 group-hover:text-foreground transition-colors">
                              <Eye className="w-4 h-4" /> Tap to Flip
                            </span>
                          </div>
                        </div>

                        {/* Back Face: Revealed Secret Perk (Full Clear Typography) */}
                        <div
                          className={cn(
                            'absolute inset-0 rounded-[32px] p-7 sm:p-8 flex flex-col justify-between border-2 backdrop-blur-2xl shadow-2xl [backface-visibility:hidden] [transform:rotateY(180deg)] transition-all duration-300',
                            isPower
                              ? 'bg-gradient-to-br from-[#101e0e] via-black to-[#051408] border-emerald-500/70 shadow-[0_0_40px_rgba(16,185,129,0.3)] text-emerald-100'
                              : 'bg-gradient-to-br from-[#26080e] via-black to-[#140407] border-rose-500/70 shadow-[0_0_40px_rgba(244,63,94,0.3)] text-rose-100'
                          )}
                        >
                          {/* Back Header */}
                          <div className="flex items-center justify-between">
                            <span
                              className={cn(
                                'px-3 py-1 rounded-xl font-mono text-xs sm:text-sm font-black uppercase tracking-wider border',
                                isPower
                                  ? 'bg-emerald-500/25 text-emerald-300 border-emerald-500/40'
                                  : 'bg-rose-500/25 text-rose-300 border-rose-500/40'
                              )}
                            >
                              #{card.number} {isPower ? 'POWER' : 'SICK'}
                            </span>

                            <span className="text-xs font-mono text-emerald-300 font-black bg-emerald-500/20 px-3 py-1 rounded-full border border-emerald-500/40 uppercase tracking-wider">
                              Active Perk
                            </span>
                          </div>

                          {/* Back Center: Perk Text (Large, spacious, unclipped) */}
                          <div className="my-auto py-4 px-2 sm:px-4 rounded-2xl bg-black/40 border border-white/5 shadow-inner">
                            <p className="text-lg sm:text-xl font-bold leading-relaxed text-center font-heading text-white">
                              {card.text}
                            </p>
                          </div>

                          {/* Back Footer */}
                          <div className="text-center pt-3 border-t border-white/10 flex items-center justify-between text-xs font-mono text-muted-foreground">
                            <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                              <Shield className="w-3.5 h-3.5" />
                              <strong className="text-emerald-300 truncate max-w-[160px]">{myTeamName}</strong>
                            </span>
                            <span className="flex items-center gap-1 font-semibold text-muted-foreground group-hover:text-foreground transition-colors">
                              <RotateCw className="w-3.5 h-3.5" /> Tap to Flip
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
