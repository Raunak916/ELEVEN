'use client';

import { useState, useMemo } from 'react';
import Image from 'next/image';
import { AuctionPlayer, PlayerRole } from '@/lib/types';
import { CountryFlag } from '@/components/ui/country-flag';
import { ROLE_COLORS, formatCurrency, cn } from '@/lib/utils';
import { Search, GripVertical, Check, Plus, Users, Shield, Zap } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface RosterSidebarProps {
  teamPlayers: AuctionPlayer[];
  assignments: Record<string, string | null>;
  onDragStart: (playerId: string) => void;
  onDragEnd: () => void;
  onAssignToNextSlot?: (player: AuctionPlayer) => void;
}

const ROLE_FILTERS = [
  { label: 'ALL', value: 'ALL' },
  { label: 'GK', value: 'Goalkeeper' },
  { label: 'DEF', value: 'Defender' },
  { label: 'MID', value: 'Midfielder' },
  { label: 'FWD', value: 'Forward' },
];

export function RosterSidebar({
  teamPlayers,
  assignments,
  onDragStart,
  onDragEnd,
  onAssignToNextSlot,
}: RosterSidebarProps) {
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('ALL');

  // Set of player IDs assigned to starting XI
  const assignedPlayerIds = useMemo(() => {
    const set = new Set<string>();
    Object.values(assignments).forEach((id) => {
      if (id) set.add(id);
    });
    return set;
  }, [assignments]);

  const inXICount = assignedPlayerIds.size;
  const benchCount = Math.max(0, teamPlayers.length - inXICount);

  const filteredPlayers = useMemo(() => {
    let list = [...teamPlayers];

    if (activeFilter !== 'ALL') {
      list = list.filter((p) => p.role === activeFilter);
    }

    if (query.trim()) {
      const q = query.toLowerCase().trim();
      list = list.filter(
        (p) =>
          p.player.name.toLowerCase().includes(q) ||
          p.player.team.toLowerCase().includes(q) ||
          p.player.nationality.toLowerCase().includes(q)
      );
    }

    // Sort: Unassigned first, then by role order (GK -> DEF -> MID -> FWD)
    const roleOrder: Record<PlayerRole, number> = {
      Goalkeeper: 0,
      Defender: 1,
      Midfielder: 2,
      Forward: 3,
    };

    list.sort((a, b) => {
      const aAssigned = assignedPlayerIds.has(a.id) ? 1 : 0;
      const bAssigned = assignedPlayerIds.has(b.id) ? 1 : 0;
      if (aAssigned !== bAssigned) return aAssigned - bAssigned;
      return (roleOrder[a.role] ?? 99) - (roleOrder[b.role] ?? 99);
    });

    return list;
  }, [teamPlayers, activeFilter, query, assignedPlayerIds]);

  return (
    <div className="flex flex-col h-full bg-[#0a0c10]/95 backdrop-blur-2xl rounded-3xl border border-white/15 overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="p-5 pb-3 border-b border-white/10 shrink-0 bg-black/40">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-[var(--gold)]" />
            <h3 className="font-heading font-black text-sm text-white uppercase tracking-wider">
              Squad Roster
            </h3>
          </div>
          <span className="font-mono text-xs text-white/50 bg-white/5 px-2 py-0.5 rounded-full border border-white/10">
            {teamPlayers.length} Total
          </span>
        </div>

        {/* Squad Status Pills */}
        <div className="grid grid-cols-2 gap-2 text-center text-xs font-mono font-bold mt-2.5">
          <div className="p-2 rounded-xl bg-white/[0.03] border border-white/10 flex flex-col">
            <span className="text-white/40 text-[10px] uppercase">Starting XI</span>
            <span className={cn('text-sm font-black mt-0.5', inXICount === 11 ? 'text-emerald-400' : 'text-[var(--gold)]')}>
              {inXICount} / 11
            </span>
          </div>
          <div className="p-2 rounded-xl bg-white/[0.03] border border-white/10 flex flex-col">
            <span className="text-white/40 text-[10px] uppercase">Bench / Reserves</span>
            <span className="text-sm font-black text-white/80 mt-0.5">{benchCount}</span>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative mt-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/40" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search squad..."
            className="pl-8 pr-3 py-1.5 h-8 text-xs bg-white/[0.04] border-white/10 rounded-xl text-white placeholder:text-white/40"
          />
        </div>

        {/* Role Filters */}
        <div className="flex items-center gap-1 mt-2.5 overflow-x-auto pb-1 scrollbar-none">
          {ROLE_FILTERS.map((f) => {
            const isActive = activeFilter === f.value;
            return (
              <button
                key={f.value}
                type="button"
                onClick={() => setActiveFilter(f.value)}
                className={cn(
                  'px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold uppercase transition-all shrink-0',
                  isActive
                    ? 'bg-[var(--gold)] text-black font-black shadow-sm'
                    : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10'
                )}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Roster Players List */}
      <div data-lenis-prevent className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2 overscroll-contain scrollbar-thin">
        {filteredPlayers.length === 0 ? (
          <div className="text-center py-12 text-white/40 font-mono text-xs">
            {teamPlayers.length === 0
              ? 'No players acquired by this team yet.'
              : 'No players match your search filter.'}
          </div>
        ) : (
          filteredPlayers.map((player) => {
            const isAssigned = assignedPlayerIds.has(player.id);
            const roleColor = ROLE_COLORS[player.role] || '#ffd54c';

            return (
              <div
                key={player.id}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('text/plain', player.id);
                  onDragStart(player.id);
                }}
                onDragEnd={onDragEnd}
                className={cn(
                  'group relative flex items-center justify-between gap-2.5 p-2.5 rounded-2xl border text-left',
                  'transition-all duration-150 cursor-grab active:cursor-grabbing select-none',
                  isAssigned
                    ? 'border-white/5 bg-white/[0.015] opacity-60 hover:opacity-100 hover:bg-white/[0.04]'
                    : 'border-white/10 bg-white/[0.04] hover:border-[var(--gold)]/40 hover:bg-white/[0.08] shadow-sm'
                )}
              >
                {/* Drag Handle Icon */}
                <div className="text-white/20 group-hover:text-white/60 transition-colors shrink-0">
                  <GripVertical className="w-4 h-4" />
                </div>

                {/* Avatar */}
                <div className="relative w-10 h-10 rounded-xl overflow-hidden bg-black/60 border border-white/10 shrink-0">
                  <Image
                    src={player.player.photo}
                    alt={player.player.name}
                    fill
                    unoptimized={true}
                    className="object-cover object-top"
                    sizes="40px"
                  />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0 pr-1">
                  <div className="flex items-center gap-1.5">
                    <h4 className="font-heading font-black text-xs text-white truncate group-hover:text-[var(--gold)] transition-colors">
                      {player.player.name}
                    </h4>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-white/50 mt-0.5 flex-wrap">
                    <CountryFlag
                      code={player.player.nationalityCode}
                      name={player.player.nationality}
                      className="h-2.5 w-3.5 rounded-sm shrink-0"
                    />
                    <span className="truncate max-w-[100px]">{player.player.team}</span>
                    <span className="text-white/20">·</span>
                    <span style={{ color: roleColor }} className="font-mono text-[10px] font-bold">
                      {player.role}
                    </span>
                  </div>
                </div>

                {/* Status Badge / Quick Action */}
                <div className="shrink-0">
                  {isAssigned ? (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                      <Check className="w-3 h-3" />
                      XI
                    </span>
                  ) : onAssignToNextSlot ? (
                    <button
                      type="button"
                      onClick={() => onAssignToNextSlot(player)}
                      className="px-2 py-1 rounded-lg text-[10px] font-mono font-bold bg-white/5 hover:bg-[var(--gold)] hover:text-black text-white/70 border border-white/10 transition-colors"
                      title="Auto-place in next open position"
                    >
                      + Place
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Helper */}
      <div className="p-3 border-t border-white/10 bg-black/40 text-center shrink-0">
        <p className="text-[11px] text-white/40 font-mono">
          💡 Drag player onto pitch or click a slot to assign
        </p>
      </div>
    </div>
  );
}
