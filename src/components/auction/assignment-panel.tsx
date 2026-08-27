'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Team, AuctionPlayer, Currency } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, X, ChevronRight, AlertTriangle, Ban } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TeamPriceState {
  teamId: string;
  price: string; // formatted string for input
  isLocked: boolean;
  rawPrice: number | null; // actual numeric value
  budgetLeft: number; // team's remaining budget
}

interface TeamBudgetInfo {
  teamId: string;
  budgetLeft: number;
}

interface AssignmentPanelProps {
  player: AuctionPlayer;
  teams: Team[];
  onConfirm: (teamId: string, soldPrice: number) => void;
  onCancel: () => void;
  onUnsold?: () => void;
  currency: Currency;
  basePrice: number;
  teamBudgets: TeamBudgetInfo[];
  maxTeamBudget: number;
}

export function AssignmentPanel({ player, teams, onConfirm, onCancel, onUnsold, currency, basePrice, teamBudgets, maxTeamBudget }: AssignmentPanelProps) {
  const [teamStates, setTeamStates] = useState<Record<string, TeamPriceState>>({});
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);

  // Initialize team states with base price
  useEffect(() => {
    const initialStates: Record<string, TeamPriceState> = {};
    teams.forEach(team => {
      const budgetInfo = teamBudgets.find(b => b.teamId === team.id);
      const budgetLeft = budgetInfo ? budgetInfo.budgetLeft : maxTeamBudget;
      initialStates[team.id] = {
        teamId: team.id,
        price: formatCurrency(basePrice, currency).replace(/[^\d.,]/g, '').trim(),
        isLocked: false,
        rawPrice: basePrice,
        budgetLeft,
      };
    });
    setTeamStates(initialStates);
    if (teams.length > 0) {
      setSelectedTeamId(teams[0].id);
    }
  }, [teams, basePrice, currency, teamBudgets, maxTeamBudget]);

  const handlePriceChange = (teamId: string, value: string) => {
    const state = teamStates[teamId];
    if (!state || state.isLocked) return;

    // Allow only numbers, commas, and dots
    const sanitized = value.replace(/[^\d.,]/g, '');
    const rawValue = parseFloat(sanitized.replace(/,/g, ''));

    setTeamStates(prev => ({
      ...prev,
      [teamId]: {
        ...prev[teamId],
        price: sanitized,
        rawPrice: isNaN(rawValue) ? null : rawValue,
      },
    }));
  };

  const handleLock = (teamId: string) => {
    const state = teamStates[teamId];
    if (!state || state.rawPrice === null) return;

    setTeamStates(prev => ({
      ...prev,
      [teamId]: { ...prev[teamId], isLocked: true },
    }));
    setSelectedTeamId(teamId);
  };

  const handleUnlock = (teamId: string) => {
    setTeamStates(prev => ({
      ...prev,
      [teamId]: { ...prev[teamId], isLocked: false, rawPrice: basePrice, price: formatCurrency(basePrice, currency).replace(/[^\d.,]/g, '').trim() },
    }));
  };

  const handleHereWeGo = () => {
    if (selectedTeamId) {
      const state = teamStates[selectedTeamId];
      if (state && state.rawPrice !== null) {
        onConfirm(selectedTeamId, state.rawPrice);
      }
    }
  };

  const canConfirm = selectedTeamId && teamStates[selectedTeamId]?.isLocked && teamStates[selectedTeamId]?.rawPrice !== null;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="assignment-panel"
        initial={{ opacity: 0, x: 100 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 100 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="fixed right-0 top-0 z-50 h-full w-[420px] max-w-[90vw] bg-card border-l border-border shadow-[-20px_0_40px_rgba(0,0,0,0.15)] flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-labelledby="assignment-title"
      >
        {/* Lightened overlay for click outside to close (keeps player card and stats clearly visible) */}
        <div
          className="fixed inset-0 bg-black/15 backdrop-blur-[1px] z-[-1]"
          onClick={onCancel}
          aria-hidden="true"
        />

        <div className="flex flex-col h-full bg-card">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-[var(--gold)]/10 flex items-center justify-center">
                <ChevronRight className="h-5 w-5 text-[var(--gold)]" aria-hidden="true" />
              </div>
              <div>
                <h2 id="assignment-title" className="font-heading text-lg font-semibold text-foreground">Assign Player</h2>
                <p className="text-xs text-muted-foreground">{player.player.name}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onCancel}
              className="text-muted-foreground hover:text-foreground"
              aria-label="Close assignment"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </Button>
          </div>

          {/* Teams List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 px-1">Assign To</p>

            {teams.map((team, teamIndex) => {
              const state = teamStates[team.id];
              const isSelected = selectedTeamId === team.id;
              const budgetLeft = state?.budgetLeft ?? 0;
              const rawPrice = state?.rawPrice ?? 0;
              const isOverBudget = rawPrice > budgetLeft && budgetLeft > 0;
              const isInsufficient = basePrice > budgetLeft;

              return (
                <motion.div
                  key={team.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: teamIndex * 0.05 }}
                  className={cn(
                    'relative p-4 rounded-xl border transition-all duration-200',
                    isSelected ? 'border-border/50 bg-muted/30' : 'border-border bg-muted/30 hover:border-border/50',
                    state?.isLocked && 'border-[var(--emerald)]/50 bg-[var(--emerald)]/5',
                    isInsufficient && 'opacity-50 border-destructive/30'
                  )}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold bg-muted text-muted-foreground">
                        {teamIndex + 1}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{team.name}</p>
                        {team.owner && <p className="text-xs text-muted-foreground">{team.owner}</p>}
                        {isInsufficient && (
                          <p className="text-xs text-destructive font-medium flex items-center gap-1 mt-1">
                            <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                            Budget Insufficient
                          </p>
                        )}
                      </div>
                    </div>
                    {state?.isLocked && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full bg-[var(--emerald)]/20 text-[var(--emerald)]">
                        Locked
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">
                        {currency === 'INR' ? '₹' : currency === 'USD' ? '$' : currency === 'EUR' ? '€' : '£'}
                      </span>
                      <Input
                        type="text"
                        value={state?.price || ''}
                        onChange={(e) => handlePriceChange(team.id, e.target.value)}
                        disabled={state?.isLocked || isInsufficient}
                        className={cn(
                          'pl-8 pr-10 text-right font-mono tabular-nums',
                          state?.isLocked ? 'bg-muted/50 cursor-not-allowed' : 'bg-card border-input',
                          isInsufficient && 'bg-muted/50 cursor-not-allowed text-destructive/50'
                        )}
                        placeholder="0"
                        aria-label={`Sale price for ${team.name}`}
                      />
                    </div>

                    {!state?.isLocked && !isInsufficient ? (
                      <Button
                        size="icon"
                        variant="default"
                        onClick={() => handleLock(team.id)}
                        disabled={state?.rawPrice === null}
                        className="bg-[var(--gold)] hover:bg-[var(--gold)]/90 text-primary-foreground h-9 w-9"
                        aria-label={`Lock price for ${team.name}`}
                      >
                        <Check className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    ) : (
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleUnlock(team.id)}
                        className="text-muted-foreground hover:text-destructive h-9 w-9"
                        aria-label={`Unlock price for ${team.name}`}
                      >
                        <X className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Here We Go & Unsold Buttons */}
          <div className="p-4 border-t border-border space-y-2.5">
            <Button
              onClick={handleHereWeGo}
              disabled={!canConfirm}
              className={cn(
                'w-full py-4 text-lg font-heading font-semibold rounded-xl gap-2 transition-all duration-200',
                canConfirm
                  ? 'bg-gradient-to-r from-[var(--gold)] to-[var(--emerald)] text-primary-foreground shadow-[0_0_30px_rgba(255,215,0,0.4)] hover:shadow-[0_0_40px_rgba(255,215,0,0.6)] hover:scale-[1.02]'
                  : 'bg-muted text-muted-foreground cursor-not-allowed'
              )}
            >
              <span className="flex items-center gap-2">
                <span className="relative">
                  <span className="absolute -inset-1 bg-gradient-to-r from-[var(--gold)] to-[var(--emerald)] opacity-30 blur rounded-xl animate-pulse" aria-hidden="true" />
                </span>
                Here We Go
                <ChevronRight className="h-5 w-5" aria-hidden="true" />
              </span>
            </Button>

            {onUnsold && (
              <Button
                type="button"
                variant="outline"
                onClick={onUnsold}
                className="w-full py-2.5 border-amber-500/40 text-amber-400 hover:bg-amber-500/10 hover:border-amber-500 hover:text-amber-300 font-heading uppercase tracking-wider text-xs font-bold rounded-xl gap-2 transition-all"
              >
                <Ban className="h-4 w-4" aria-hidden="true" />
                Mark as Unsold
              </Button>
            )}

            <p className="text-xs text-center text-muted-foreground pt-1">
              Lock a price to confirm sale, or mark as unsold
            </p>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}