'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { cn, formatCurrency, getRoleFromPosition, ROLE_COLORS, CATEGORY_COLORS } from '@/lib/utils';
import { Player, AuctionPlayer, PlayerRole, PlayerCategory } from '@/lib/types';
import { MoreHorizontal, Trash2, Edit, Award, Star } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { CountryFlag } from '@/components/ui/country-flag';

const ROLE_CARD_STYLES: Record<
  PlayerRole,
  {
    border: string;
    glow: string;
    pillBg: string;
    pillText: string;
    pillBorder: string;
  }
> = {
  Forward: {
    border: 'from-rose-500/85 via-red-500/65 to-red-800/85',
    glow: 'hover:shadow-[0_10px_35px_-6px_rgba(239,68,68,0.4)]',
    pillBg: 'bg-rose-500/15',
    pillText: 'text-rose-400',
    pillBorder: 'border-rose-500/40',
  },
  Midfielder: {
    border: 'from-emerald-400/85 via-green-500/65 to-emerald-800/85',
    glow: 'hover:shadow-[0_10px_35px_-6px_rgba(34,197,94,0.4)]',
    pillBg: 'bg-emerald-500/15',
    pillText: 'text-emerald-400',
    pillBorder: 'border-emerald-500/40',
  },
  Defender: {
    border: 'from-amber-400/85 via-yellow-500/65 to-amber-700/85',
    glow: 'hover:shadow-[0_10px_35px_-6px_rgba(245,158,11,0.4)]',
    pillBg: 'bg-amber-500/15',
    pillText: 'text-amber-400',
    pillBorder: 'border-amber-500/40',
  },
  Goalkeeper: {
    border: 'from-sky-400/85 via-blue-500/65 to-blue-800/85',
    glow: 'hover:shadow-[0_10px_35px_-6px_rgba(59,130,246,0.4)]',
    pillBg: 'bg-sky-500/15',
    pillText: 'text-sky-400',
    pillBorder: 'border-sky-500/40',
  },
};

export function PlayerCard({
  player,
  variant = 'pool',
  onAdd,
  onRemove,
  onEdit,
  selectable = false,
  isSelected = false,
  onToggleSelect,
  className,
}: PlayerCardProps) {
  const isAuctionPlayer = 'role' in player && 'basePrice' in player;
  const auctionPlayer = isAuctionPlayer ? player : null;
  const basePlayer = isAuctionPlayer ? player.player : player;
  const role = auctionPlayer?.role ?? getRoleFromPosition(basePlayer.position);
  const status = auctionPlayer?.status ?? basePlayer.status ?? 'AVAILABLE';
  const basePrice = auctionPlayer?.basePrice;
  const currency = auctionPlayer?.currency;
  const roleStyle = ROLE_CARD_STYLES[role] || ROLE_CARD_STYLES.Midfielder;

  const isDrawn = status === 'DRAWN';
  const isUnsold = status === 'UNSOLD';
  const isPool = variant === 'pool';
  const isSearch = variant === 'search';

  // 3D interactive physics tilt state
  const [hovered, setHovered] = React.useState(false);
  const [hoverCoords, setHoverCoords] = React.useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (selectable) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
    setHoverCoords({ x, y });
  };

  const cardStyle = {
    transformStyle: 'preserve-3d' as const,
    perspective: 1000,
    transform:
      hovered && !isDrawn && !isUnsold && !selectable
        ? `rotateX(${-hoverCoords.y * 5}deg) rotateY(${hoverCoords.x * 5}deg) translateZ(4px)`
        : 'translateZ(0)',
    transition: 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
  };

  // ─────────────────────────────────────────────────────────────────────────
  // POOL VARIANT: COLLECTIBLE TRADING CARD (Role-based border glow, large face)
  // ─────────────────────────────────────────────────────────────────────────
  if (isPool) {
    return (
      <motion.div
        key={auctionPlayer?.id ?? basePlayer.id}
        initial={{ opacity: 0, y: 16, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -16, scale: 0.95 }}
        transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
        className={cn(
          'relative group w-full',
          isDrawn && 'opacity-65',
          selectable && 'cursor-pointer',
          className
        )}
        onClick={() => {
          if (selectable && onToggleSelect) {
            onToggleSelect();
          }
        }}
      >
        <div
          className={cn(
            'relative rounded-2xl p-[1.5px] bg-gradient-to-b transition-all duration-300',
            roleStyle.border,
            roleStyle.glow,
            isDrawn && 'from-border/30 to-border/10 shadow-none',
            isSelected && 'ring-2 ring-destructive ring-offset-2 ring-offset-background shadow-[0_0_25px_rgba(239,68,68,0.4)]'
          )}
          style={cardStyle}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => {
            setHovered(false);
            setHoverCoords({ x: 0, y: 0 });
          }}
          onMouseMove={handleMouseMove}
        >
          {/* Card Inner Glass Body */}
          <div className="relative rounded-[14.5px] bg-[#0c1017]/95 backdrop-blur-xl flex flex-col justify-between overflow-hidden border border-white/5">
            {/* Top Action Menu & Role Pill (Category Removed) */}
            <div className="p-2.5 pb-1.5 flex items-center justify-between gap-1.5 relative z-20">
              <span
                className={cn(
                  'px-2.5 py-0.5 rounded-md text-[10.5px] font-mono font-black uppercase tracking-wider border',
                  roleStyle.pillBg,
                  roleStyle.pillText,
                  roleStyle.pillBorder
                )}
              >
                {role}
              </span>

              {selectable ? (
                <div
                  className={cn(
                    'flex h-6 w-6 items-center justify-center rounded-lg border transition-all duration-200',
                    isSelected
                      ? 'bg-destructive border-destructive text-white shadow-sm scale-110'
                      : 'border-white/30 bg-black/40 hover:border-white/60'
                  )}
                >
                  {isSelected && <span className="text-xs font-bold leading-none">✓</span>}
                </div>
              ) : isAuctionPlayer ? (
                <DropdownMenu>
                  <DropdownMenuTrigger
                    className="flex h-6 w-6 items-center justify-center rounded-lg bg-white/5 hover:bg-white/15 text-muted-foreground hover:text-foreground transition-all duration-200 cursor-pointer border border-white/10"
                    aria-label="Player options"
                  >
                    <MoreHorizontal className="h-3 w-3" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-card/95 backdrop-blur-xl border-border/40 min-w-[160px] shadow-xl">
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit?.(auctionPlayer!);
                      }}
                      className="flex items-center gap-2 text-xs font-semibold px-3 py-2 cursor-pointer"
                    >
                      <Edit className="h-3.5 w-3.5" />
                      Edit Details
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="border-border/30" />
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemove?.(auctionPlayer!.id);
                      }}
                      className="flex items-center gap-2 text-xs font-semibold px-3 py-2 text-destructive focus:text-destructive cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Remove Player
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : null}
            </div>

            {/* Portrait Frame (Full face & shoulder visibility) */}
            <div
              className="relative aspect-[3/4] mx-2.5 my-1.5 rounded-xl overflow-hidden bg-black/60 border border-white/10 shadow-inner group-hover:border-white/20 transition-colors"
              style={{ aspectRatio: '3 / 4' }}
            >
              {basePlayer.photo ? (
                <Image
                  src={basePlayer.photo}
                  alt={basePlayer.name}
                  fill
                  className="object-cover object-top transition-transform duration-500 group-hover:scale-105"
                  sizes="180px"
                  style={{
                    filter: isDrawn
                      ? 'grayscale(1) contrast(0.85) brightness(0.8)'
                      : isUnsold
                      ? 'contrast(0.9) brightness(0.85)'
                      : 'none',
                  }}
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-tr from-black via-zinc-900 to-[#04165D] text-cyan-400">
                  <span className="font-heading font-black text-2xl drop-shadow-md">
                    {basePlayer.name ? basePlayer.name.charAt(0).toUpperCase() : '?'}
                  </span>
                </div>
              )}

              {/* Bottom Vignette */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent pointer-events-none" />

              {/* Nationality Flag Pill */}
              {basePlayer.nationalityCode && !isDrawn && !isUnsold && (
                <div className="absolute bottom-1.5 left-1.5 z-10 px-1.5 py-0.5 rounded-md bg-black/70 backdrop-blur-md border border-white/15 text-[10px] font-mono text-foreground/90 flex items-center gap-1 shadow-sm">
                  <span>🏳️</span>
                  <span>{basePlayer.nationalityCode}</span>
                </div>
              )}

              {/* Status Stamp Overlays */}
              <AnimatePresence>
                {isDrawn && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-10"
                  >
                    <Badge className="px-3 py-1 text-xs font-black uppercase tracking-wider bg-destructive text-destructive-foreground border-destructive/40 shadow-lg">
                      DRAWN
                    </Badge>
                  </motion.div>
                )}

                {isUnsold && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-10"
                  >
                    <Badge className="px-3 py-1 text-xs font-black uppercase tracking-wider bg-amber-500 text-amber-950 border-amber-400 shadow-lg">
                      UNSOLD
                    </Badge>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Specular light sweep on hover */}
              {hovered && !isDrawn && (
                <div
                  className="absolute inset-0 pointer-events-none bg-gradient-to-r from-transparent via-white/10 to-transparent"
                  style={{
                    transform: `translateX(${hoverCoords.x * 40}%) rotate(${hoverCoords.x * 15}deg)`,
                    transition: 'transform 0.3s ease-out',
                  }}
                />
              )}
            </div>

            {/* Info Details Section */}
            <div className="p-3 pt-2 space-y-2">
              <div>
                <h3
                  className={cn(
                    'font-heading font-black text-sm sm:text-base truncate leading-tight tracking-tight',
                    isDrawn ? 'text-muted-foreground/70' : 'text-foreground group-hover:text-[var(--gold)] transition-colors'
                  )}
                  title={basePlayer.name}
                >
                  {basePlayer.name}
                </h3>
                <p className="text-[11px] font-medium text-muted-foreground truncate mt-0.5">
                  {basePlayer.team} • <span className="text-foreground/70">{basePlayer.league}</span>
                </p>
              </div>

              {/* Base Price Vault Tag */}
              {basePrice !== undefined && currency && (
                <div className="pt-2 border-t border-white/10 flex items-center justify-between">
                  <span className="text-[9.5px] font-mono font-bold uppercase tracking-widest text-[var(--gold)]">
                    BASE PRICE
                  </span>
                  <span className="font-heading font-black text-sm sm:text-base text-foreground tabular-nums">
                    {formatCurrency(basePrice, currency)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SEARCH VARIANT: FAST SELECTION ROW
  // ─────────────────────────────────────────────────────────────────────────
  if (isSearch) {
    return (
      <motion.div
        className={cn(
          'relative group cursor-pointer glass rounded-2xl overflow-hidden p-3 transition-all duration-300 border border-border/30 hover:border-[var(--gold)]/50 bg-card/70 hover:bg-card shadow-sm',
          className
        )}
        whileHover={{ scale: 1.01, y: -2, transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] } }}
        onClick={() => onAdd?.(basePlayer)}
      >
        <div className="flex items-center gap-3.5">
          <div className="relative flex-shrink-0 w-14 h-14 rounded-xl overflow-hidden bg-black/60 border border-white/10 flex items-center justify-center">
            {basePlayer.photo ? (
              <Image
                src={basePlayer.photo}
                alt={basePlayer.name}
                fill
                className="object-cover object-top"
                sizes="56px"
              />
            ) : (
              <span className="font-heading font-black text-lg text-cyan-400">
                {basePlayer.name ? basePlayer.name.charAt(0).toUpperCase() : '?'}
              </span>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="font-heading font-black text-sm text-foreground truncate group-hover:text-[var(--gold)] transition-colors">
              {basePlayer.name}
            </h3>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
              <span>🏳️ {basePlayer.nationality}</span>
              <span>•</span>
              <span className="font-mono font-bold text-foreground/80">{role}</span>
              <span>•</span>
              <span className="text-[11px]">{basePlayer.team}</span>
            </div>
          </div>

          <div className="flex-shrink-0 flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/25 transition-all duration-200 group-hover:bg-primary group-hover:text-primary-foreground group-hover:scale-105 shadow-sm">
            <span className="text-base font-bold">+</span>
          </div>
        </div>
      </motion.div>
    );
  }

  // Fallback variant
  return (
    <motion.div
      className={cn('relative glass rounded-2xl overflow-hidden border border-border/40', className)}
    >
      <div className="aspect-square relative overflow-hidden bg-black/50 flex items-center justify-center">
        {basePlayer.photo ? (
          <Image
            src={basePlayer.photo}
            alt={basePlayer.name}
            fill
            className="object-cover object-top"
            sizes="200px"
          />
        ) : (
          <span className="font-heading font-black text-3xl text-cyan-400">
            {basePlayer.name ? basePlayer.name.charAt(0).toUpperCase() : '?'}
          </span>
        )}
      </div>
      <div className="p-4 space-y-2">
        <h3 className="font-heading font-bold text-base text-foreground truncate">{basePlayer.name}</h3>
        <p className="text-xs text-muted-foreground">
          {basePlayer.nationality} • {role}
        </p>
      </div>
    </motion.div>
  );
}

interface PlayerCardProps {
  player: Player | AuctionPlayer;
  variant?: 'search' | 'pool' | 'draw' | 'reveal';
  onAdd?: (player: Player) => void;
  onRemove?: (id: string) => void;
  onEdit?: (player: AuctionPlayer) => void;
  selectable?: boolean;
  isSelected?: boolean;
  onToggleSelect?: () => void;
  className?: string;
}

export default PlayerCard;