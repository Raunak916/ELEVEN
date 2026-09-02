'use client';

import { useState, useMemo } from 'react';
import Image from 'next/image';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AuctionPlayer, LineupSlot, PlayerRole } from '@/lib/types';
import { CountryFlag } from '@/components/ui/country-flag';
import { ROLE_COLORS, formatCurrency, cn } from '@/lib/utils';
import { Search, X, Check, ArrowRight, UserPlus, Sparkles } from 'lucide-react';

interface PlayerPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slot: LineupSlot | null;
  currentPlayer: AuctionPlayer | null;
  teamPlayers: AuctionPlayer[];
  assignments: Record<string, string | null>;
  onSelectPlayer: (slot: LineupSlot, player: AuctionPlayer) => void;
}

const ROLE_FILTERS: { label: string; value: string }[] = [
  { label: 'ALL', value: 'ALL' },
  { label: 'GK', value: 'Goalkeeper' },
  { label: 'DEF', value: 'Defender' },
  { label: 'MID', value: 'Midfielder' },
  { label: 'FWD', value: 'Forward' },
];

export function PlayerPickerDialog({
  open,
  onOpenChange,
  slot,
  currentPlayer,
  teamPlayers,
  assignments,
  onSelectPlayer,
}: PlayerPickerDialogProps) {
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<string>('ALL');

  // Set default filter based on slot role when opened
  const slotRole = slot?.role || 'ALL';

  // Set of player IDs currently assigned in starting XI
  const assignedPlayerIds = useMemo(() => {
    const set = new Set<string>();
    Object.values(assignments).forEach((id) => {
      if (id) set.add(id);
    });
    return set;
  }, [assignments]);

  const filteredPlayers = useMemo(() => {
    let list = [...teamPlayers];

    // Filter by role
    if (activeFilter !== 'ALL') {
      list = list.filter((p) => p.role === activeFilter);
    }

    // Filter by query
    if (query.trim()) {
      const q = query.toLowerCase().trim();
      list = list.filter(
        (p) =>
          p.player.name.toLowerCase().includes(q) ||
          p.player.team.toLowerCase().includes(q) ||
          p.player.nationality.toLowerCase().includes(q)
      );
    }

    // Sort: Matching slot role first, then unassigned first
    list.sort((a, b) => {
      const aMatchesRole = slot && a.role === slot.role ? 1 : 0;
      const bMatchesRole = slot && b.role === slot.role ? 1 : 0;
      if (aMatchesRole !== bMatchesRole) return bMatchesRole - aMatchesRole;

      const aAssigned = assignedPlayerIds.has(a.id) ? 1 : 0;
      const bAssigned = assignedPlayerIds.has(b.id) ? 1 : 0;
      return aAssigned - bAssigned;
    });

    return list;
  }, [teamPlayers, activeFilter, query, slot, assignedPlayerIds]);

  if (!slot) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className={cn(
          'w-[95vw] sm:max-w-xl max-h-[85vh] p-0 gap-0 overflow-hidden rounded-3xl',
          'bg-[#0a0c10]/98 text-foreground backdrop-blur-3xl border border-white/15 shadow-[0_25px_70px_rgba(0,0,0,0.85)]'
        )}
      >
        {/* Header */}
        <DialogHeader className="p-5 sm:p-6 pb-4 border-b border-white/10 shrink-0 bg-black/40">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-lg sm:text-xl font-heading font-black text-white flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[var(--gold)] shrink-0" />
                <span>ASSIGN TO {slot.label}</span>
                <span
                  style={{ color: ROLE_COLORS[slot.role] }}
                  className="text-xs font-mono px-2 py-0.5 rounded bg-white/5 border border-white/10 ml-1"
                >
                  {slot.role}
                </span>
              </DialogTitle>
              <DialogDescription className="text-white/60 text-xs mt-0.5">
                {currentPlayer
                  ? `Replacing ${currentPlayer.player.name}`
                  : `Select a player from your roster for the ${slot.label} position`}
              </DialogDescription>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="h-8 w-8 rounded-xl text-white/50 hover:text-white hover:bg-white/10 shrink-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Search & Filter Bar */}
          <div className="mt-4 space-y-2.5">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search squad players..."
                className="pl-9 pr-4 py-4 text-xs sm:text-sm bg-white/[0.04] border-white/10 rounded-xl text-white placeholder:text-white/40"
              />
            </div>

            {/* Role Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
              {ROLE_FILTERS.map((f) => {
                const isActive = activeFilter === f.value;
                return (
                  <button
                    key={f.value}
                    type="button"
                    onClick={() => setActiveFilter(f.value)}
                    className={cn(
                      'px-3 py-1 rounded-lg text-xs font-mono font-bold uppercase transition-all',
                      isActive
                        ? 'bg-[var(--gold)] text-black shadow-sm font-black'
                        : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10 border border-white/5'
                    )}
                  >
                    {f.label}
                  </button>
                );
              })}
            </div>
          </div>
        </DialogHeader>

        {/* Players List */}
        <div data-lenis-prevent className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-2 max-h-[50vh] overscroll-contain scrollbar-thin">
          {filteredPlayers.length === 0 ? (
            <div className="text-center py-12 text-white/40 font-mono text-xs">
              No matching players in this team&apos;s squad.
            </div>
          ) : (
            filteredPlayers.map((player) => {
              const isCurrent = currentPlayer?.id === player.id;
              const isAssigned = assignedPlayerIds.has(player.id);
              const roleColor = ROLE_COLORS[player.role] || '#ffd54c';

              return (
                <button
                  key={player.id}
                  type="button"
                  onClick={() => {
                    onSelectPlayer(slot, player);
                    onOpenChange(false);
                  }}
                  className={cn(
                    'w-full group flex items-center justify-between gap-3 p-3 rounded-2xl border text-left transition-all duration-150',
                    isCurrent
                      ? 'border-[var(--gold)] bg-[var(--gold)]/10 ring-1 ring-[var(--gold)]/30'
                      : isAssigned
                      ? 'border-white/5 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.05]'
                      : 'border-white/10 bg-white/[0.03] hover:border-[var(--gold)]/40 hover:bg-white/[0.07]'
                  )}
                >
                  {/* Left: Avatar */}
                  <div className="relative w-11 h-11 sm:w-12 sm:h-12 rounded-xl overflow-hidden bg-black/60 border border-white/10 shrink-0">
                    <Image
                      src={player.player.photo}
                      alt={player.player.name}
                      fill
                      unoptimized={true}
                      className="object-cover object-top"
                      sizes="48px"
                    />
                  </div>

                  {/* Center: Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-heading font-black text-sm text-white truncate group-hover:text-[var(--gold)] transition-colors">
                        {player.player.name}
                      </h4>
                      {isCurrent && (
                        <span className="text-[10px] font-mono font-bold text-[var(--gold)] bg-[var(--gold)]/20 px-1.5 py-0.2 rounded shrink-0">
                          Current
                        </span>
                      )}
                      {!isCurrent && isAssigned && (
                        <span className="text-[10px] font-mono font-bold text-white/50 bg-white/10 px-1.5 py-0.2 rounded shrink-0">
                          In XI
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-white/50 mt-0.5 flex-wrap">
                      <CountryFlag
                        code={player.player.nationalityCode}
                        name={player.player.nationality}
                        className="h-3 w-4 rounded-sm shrink-0"
                      />
                      <span className="truncate max-w-[130px]">{player.player.team}</span>
                      <span className="text-white/20">·</span>
                      <span style={{ color: roleColor }} className="font-mono text-[11px] font-bold">
                        {player.role}
                      </span>
                    </div>
                  </div>

                  {/* Right: Action */}
                  <div className="shrink-0">
                    {isCurrent ? (
                      <Badge className="bg-[var(--gold)] text-black font-mono font-black text-[10px]">
                        SELECTED
                      </Badge>
                    ) : (
                      <span className="text-xs font-mono font-bold text-white/40 group-hover:text-[var(--gold)] flex items-center gap-1 transition-colors">
                        Select <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
