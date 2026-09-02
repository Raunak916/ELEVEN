'use client';

import { useState } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { Formation, LineupSlot, AuctionPlayer, PlayerRole } from '@/lib/types';
import { CountryFlag } from '@/components/ui/country-flag';
import { ROLE_COLORS, cn } from '@/lib/utils';
import { Plus, X, ArrowLeftRight, Sparkles, User } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PitchBoardProps {
  formation: Formation;
  assignments: Record<string, string | null>;
  teamPlayers: AuctionPlayer[];
  onSlotClick: (slot: LineupSlot, currentPlayer: AuctionPlayer | null) => void;
  onSlotDrop: (slot: LineupSlot, auctionPlayerId: string) => void;
  onRemovePlayer: (positionId: string) => void;
  draggedPlayerId: string | null;
  pitchRef?: React.RefObject<HTMLDivElement | null>;
  teamName?: string;
}

export function PitchBoard({
  formation,
  assignments,
  teamPlayers,
  onSlotClick,
  onSlotDrop,
  onRemovePlayer,
  draggedPlayerId,
  pitchRef,
  teamName,
}: PitchBoardProps) {
  const [hoveredSlotId, setHoveredSlotId] = useState<string | null>(null);
  const [dragOverSlotId, setDragOverSlotId] = useState<string | null>(null);

  // Map of auctionPlayerId -> AuctionPlayer for quick lookup
  const playerMap = new Map<string, AuctionPlayer>();
  teamPlayers.forEach((p) => playerMap.set(p.id, p));

  const handleDragOver = (e: React.DragEvent, slot: LineupSlot) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverSlotId !== slot.positionId) {
      setDragOverSlotId(slot.positionId);
    }
  };

  const handleDragLeave = (e: React.DragEvent, slot: LineupSlot) => {
    e.preventDefault();
    e.stopPropagation();
    if (dragOverSlotId === slot.positionId) {
      setDragOverSlotId(null);
    }
  };

  const handleDrop = (e: React.DragEvent, slot: LineupSlot) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverSlotId(null);

    const playerId = e.dataTransfer.getData('text/plain') || draggedPlayerId;
    if (playerId) {
      onSlotDrop(slot, playerId);
    }
  };

  return (
    <div className="relative w-full flex flex-col items-center select-none">
      {/* Pitch Frame with stadium lighting glow */}
      <div
        ref={pitchRef}
        className={cn(
          'relative w-full max-w-[620px] aspect-[1/1.38] rounded-3xl overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.85)]',
          'border border-white/15 bg-gradient-to-b from-[#061c14] via-[#04140e] to-[#020b08]'
        )}
      >
        {/* Subtle Pitch Grass Stripes */}
        <div className="absolute inset-0 pointer-events-none opacity-40">
          <div className="w-full h-full flex flex-col justify-between">
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  'w-full flex-1',
                  i % 2 === 0 ? 'bg-white/[0.02]' : 'bg-transparent'
                )}
              />
            ))}
          </div>
        </div>

        {/* Tactical Pitch Markings (SVG overlay) */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none stroke-white/25 stroke-[1.5] fill-none"
          viewBox="0 0 100 138"
          preserveAspectRatio="none"
        >
          {/* Pitch Outer Boundary with Margin */}
          <rect x="5" y="5" width="90" height="128" rx="2" />

          {/* Halfway Line */}
          <line x1="5" y1="69" x2="95" y2="69" />

          {/* Center Circle & Spot */}
          <circle cx="50" cy="69" r="13" />
          <circle cx="50" cy="69" r="0.8" className="fill-white/40" />

          {/* Top Penalty Area (Attacking end) */}
          <rect x="22" y="5" width="56" height="20" />
          {/* Top Goal Area */}
          <rect x="34" y="5" width="32" height="7.5" />
          {/* Top Penalty Arc (D-box) */}
          <path d="M 38 25 A 11 11 0 0 0 62 25" />
          {/* Top Penalty Spot */}
          <circle cx="50" cy="16" r="0.8" className="fill-white/40" />

          {/* Bottom Penalty Area (Defending end) */}
          <rect x="22" y="113" width="56" height="20" />
          {/* Bottom Goal Area */}
          <rect x="34" y="125.5" width="32" height="7.5" />
          {/* Bottom Penalty Arc (D-box) */}
          <path d="M 38 113 A 11 11 0 0 1 62 113" />
          {/* Bottom Penalty Spot */}
          <circle cx="50" cy="122" r="0.8" className="fill-white/40" />

          {/* Corner Arcs */}
          <path d="M 5 8 A 3 3 0 0 0 8 5" />
          <path d="M 95 8 A 3 3 0 0 1 92 5" />
          <path d="M 5 130 A 3 3 0 0 1 8 133" />
          <path d="M 95 130 A 3 3 0 0 0 92 133" />
        </svg>

        {/* Stadium Corner Floodlights Vignette */}
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-500/10 via-transparent to-black/60" />

        {/* Team Name Watermark on Pitch Center */}
        {teamName && (
          <div className="absolute top-[48%] left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none z-0 opacity-20">
            <p className="font-heading font-black text-2xl sm:text-3xl text-white uppercase tracking-widest whitespace-nowrap">
              {teamName}
            </p>
            <p className="font-mono text-xs text-[var(--gold)] uppercase tracking-widest mt-1">
              {formation.name}
            </p>
          </div>
        )}

        {/* 11 Dynamic Pitch Player Nodes */}
        {formation.slots.map((slot, index) => {
          const assignedId = assignments[slot.positionId];
          const player = assignedId ? playerMap.get(assignedId) : null;
          const isHovered = hoveredSlotId === slot.positionId;
          const isDragTarget = dragOverSlotId === slot.positionId;
          const roleColor = ROLE_COLORS[slot.role] || '#ffd54c';

          return (
            <div
              key={slot.positionId}
              style={{
                top: `${slot.y}%`,
                left: `${slot.x}%`,
              }}
              className="absolute -translate-x-1/2 -translate-y-1/2 z-10"
              onDragOver={(e) => handleDragOver(e, slot)}
              onDragLeave={(e) => handleDragLeave(e, slot)}
              onDrop={(e) => handleDrop(e, slot)}
              onMouseEnter={() => setHoveredSlotId(slot.positionId)}
              onMouseLeave={() => setHoveredSlotId(null)}
            >
              {player ? (
                /* ========================================================= */
                /* ASSIGNED PLAYER NODE                                      */
                /* ========================================================= */
                <motion.div
                  layout
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  whileHover={{ scale: 1.08 }}
                  transition={{ type: 'spring', stiffness: 450, damping: 28 }}
                  onClick={() => onSlotClick(slot, player)}
                  className={cn(
                    'group relative flex flex-col items-center cursor-pointer transition-transform'
                  )}
                >
                  {/* Circular Face Avatar */}
                  <div className="relative">
                    <div
                      className={cn(
                        'relative w-11 h-11 sm:w-13 sm:h-13 rounded-full overflow-hidden bg-black/80',
                        'border-2 shadow-[0_4px_16px_rgba(0,0,0,0.6)] transition-all duration-200',
                        isDragTarget
                          ? 'border-[var(--gold)] ring-4 ring-[var(--gold)]/40 scale-110'
                          : 'border-white/30 group-hover:border-[var(--gold)]'
                      )}
                    >
                      <Image
                        src={player.player.photo}
                        alt={player.player.name}
                        fill
                        unoptimized={true}
                        className="object-cover object-top"
                        sizes="56px"
                      />
                    </div>

                    {/* Nationality Flag Pin */}
                    <div className="absolute -bottom-1 -right-1 z-20">
                      <CountryFlag
                        code={player.player.nationalityCode}
                        name={player.player.nationality}
                        className="h-3 w-4 rounded-sm shadow-md"
                      />
                    </div>

                    {/* Quick Remove Button on Hover */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemovePlayer(slot.positionId);
                      }}
                      className={cn(
                        'absolute -top-1.5 -right-1.5 z-30 w-5 h-5 rounded-full bg-rose-500 text-white',
                        'flex items-center justify-center shadow-lg transition-opacity duration-150',
                        'hover:bg-rose-600 active:scale-95',
                        isHovered ? 'opacity-100' : 'opacity-0 sm:opacity-0 group-hover:opacity-100'
                      )}
                      title="Remove from starting XI"
                      aria-label="Remove player"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Player Name & Slot Tag Badge */}
                  <div className="mt-1 flex flex-col items-center">
                    <div
                      className={cn(
                        'px-2 py-0.5 rounded-md text-[10px] sm:text-[11px] font-heading font-black text-white whitespace-nowrap shadow-md',
                        'bg-black/85 backdrop-blur-md border border-white/20 transition-colors',
                        'group-hover:border-[var(--gold)]/50 group-hover:text-[var(--gold)]',
                        'max-w-[76px] sm:max-w-[94px] truncate text-center'
                      )}
                    >
                      {player.player.lastName || player.player.name.split(' ').pop() || player.player.name}
                    </div>
                    <span
                      style={{ color: roleColor }}
                      className="text-[9px] font-mono font-bold tracking-tight mt-0.5 bg-black/60 px-1 rounded"
                    >
                      {slot.label}
                    </span>
                  </div>
                </motion.div>
              ) : (
                /* ========================================================= */
                /* EMPTY SLOT NODE (+ Sign placeholder)                      */
                /* ========================================================= */
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.12 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => onSlotClick(slot, null)}
                  className={cn(
                    'group relative flex flex-col items-center justify-center focus:outline-none'
                  )}
                  aria-label={`Assign player to ${slot.label}`}
                >
                  {/* Circular Node with Plus Icon */}
                  <div
                    className={cn(
                      'w-11 h-11 sm:w-13 sm:h-13 rounded-full flex items-center justify-center transition-all duration-200',
                      'bg-black/60 backdrop-blur-md border-2 border-dashed shadow-md',
                      isDragTarget
                        ? 'border-[var(--gold)] bg-[var(--gold)]/20 ring-4 ring-[var(--gold)]/40 scale-110 shadow-gold'
                        : 'border-white/30 hover:border-[var(--gold)] hover:bg-black/80'
                    )}
                  >
                    <Plus
                      className={cn(
                        'w-5 h-5 transition-transform duration-200',
                        isDragTarget
                          ? 'text-[var(--gold)] scale-125'
                          : 'text-white/60 group-hover:text-[var(--gold)] group-hover:scale-110'
                      )}
                    />
                  </div>

                  {/* Slot Position Badge */}
                  <div className="mt-1 flex flex-col items-center">
                    <span
                      style={{ color: roleColor }}
                      className={cn(
                        'px-1.5 py-0.5 rounded text-[10px] sm:text-[11px] font-mono font-black tracking-wider uppercase',
                        'bg-black/75 backdrop-blur-sm border border-white/10 shadow-sm transition-colors',
                        'group-hover:border-[var(--gold)]/40'
                      )}
                    >
                      {slot.label}
                    </span>
                  </div>
                </motion.button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
