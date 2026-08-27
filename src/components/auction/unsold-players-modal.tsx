'use client';

import React, { useState, useMemo } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CountryFlag } from '@/components/ui/country-flag';
import { useAuctionStore } from '@/lib/auction-store';
import {
  AuctionPlayer,
  PlayerRole,
  Currency,
  CURRENCY_SYMBOLS,
  CATEGORY_COLORS,
  CATEGORY_LABELS,
} from '@/lib/types';
import { formatCurrency, ROLE_COLORS } from '@/lib/utils';
import {
  Ban,
  Search,
  RotateCcw,
  Trash2,
  X,
  Sparkles,
  Plus,
  UserCheck,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface UnsoldPlayersModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface PopUnsoldConfig {
  auctionPlayer: AuctionPlayer;
  role: PlayerRole;
  basePrice: string;
  currency: Currency;
}

const ROLE_OPTIONS: { value: PlayerRole; label: string }[] = [
  { value: 'Goalkeeper', label: 'Goalkeeper' },
  { value: 'Defender', label: 'Defender' },
  { value: 'Midfielder', label: 'Midfielder' },
  { value: 'Forward', label: 'Forward' },
];

const CURRENCY_OPTIONS: { value: Currency; label: string }[] = [
  { value: 'INR', label: 'INR (₹)' },
  { value: 'USD', label: 'USD ($)' },
  { value: 'EUR', label: 'EUR (€)' },
  { value: 'GBP', label: 'GBP (£)' },
];

export function UnsoldPlayersModal({ open, onOpenChange }: UnsoldPlayersModalProps) {
  const {
    auctionPlayers,
    reAddUnsoldToPool,
    reAddAllUnsoldToPool,
    removePlayer,
    updatePlayer,
    settings,
  } = useAuctionStore();

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | PlayerRole>('all');

  // Pop Player Configuration Modal State
  const [popConfig, setPopConfig] = useState<PopUnsoldConfig | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const unsoldPlayers = useMemo(() => {
    return auctionPlayers.filter((p) => p.status === 'UNSOLD');
  }, [auctionPlayers]);

  const filteredUnsold = useMemo(() => {
    let list = [...unsoldPlayers];
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      list = list.filter(
        (p) =>
          p.player.name.toLowerCase().includes(q) ||
          p.player.team.toLowerCase().includes(q) ||
          p.player.nationality.toLowerCase().includes(q) ||
          p.role.toLowerCase().includes(q)
      );
    }
    if (roleFilter !== 'all') {
      list = list.filter((p) => p.role === roleFilter);
    }
    return list;
  }, [unsoldPlayers, search, roleFilter]);

  const handleOpenPopConfig = (ap: AuctionPlayer) => {
    setPopConfig({
      auctionPlayer: ap,
      role: ap.role,
      basePrice: ap.basePrice.toString(),
      currency: ap.currency || settings.currency,
    });
  };

  const handleConfirmAddBack = () => {
    if (!popConfig) return;

    setIsProcessing(true);
    try {
      const parsedPrice = parseInt(popConfig.basePrice, 10);
      const finalPrice = isNaN(parsedPrice) || parsedPrice < 0 ? 0 : parsedPrice;

      // Update role, basePrice, and currency if modified
      updatePlayer(popConfig.auctionPlayer.id, {
        role: popConfig.role,
        basePrice: finalPrice,
        currency: popConfig.currency,
      });

      // Return player to active available pool
      reAddUnsoldToPool(popConfig.auctionPlayer.id);

      toast.success(`${popConfig.auctionPlayer.player.name} returned to available pool`, {
        description: `${popConfig.role} · ${formatCurrency(finalPrice, popConfig.currency)}`,
      });

      setPopConfig(null);
    } catch (error) {
      console.error('Failed to return unsold player:', error);
      toast.error('Failed to add player back to pool');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReAddAll = () => {
    if (unsoldPlayers.length === 0) return;
    reAddAllUnsoldToPool();
    toast.success(`All ${unsoldPlayers.length} unsold players returned to available pool`);
    onOpenChange(false);
  };

  const handleRemoveSingle = (player: AuctionPlayer) => {
    if (confirm(`Permanently remove ${player.player.name} from auction?`)) {
      removePlayer(player.id);
      toast.success(`${player.player.name} removed`);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[88vh] flex flex-col p-0 gap-0 overflow-hidden bg-[#0a0e14]/98 backdrop-blur-2xl border-white/10 shadow-2xl rounded-3xl">
          {/* Header */}
          <DialogHeader className="p-6 pb-4 border-b border-white/10 bg-black/40">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                <div className="p-3 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.15)]">
                  <Ban className="h-5 w-5" />
                </div>
                <div>
                  <DialogTitle className="font-heading font-black text-xl sm:text-2xl text-foreground flex items-center gap-2.5">
                    <span>UNSOLD ROSTER</span>
                    <Badge className="border-amber-500/40 bg-amber-500 text-amber-950 font-mono font-black text-xs px-2.5 py-0.5">
                      {unsoldPlayers.length}
                    </Badge>
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                    Players marked as unsold during live auction. Configure and add them back to the active pool.
                  </DialogDescription>
                </div>
              </div>

              {unsoldPlayers.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReAddAll}
                  className="hidden sm:inline-flex items-center gap-2 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/15 hover:border-emerald-500 font-heading font-bold text-xs uppercase tracking-wider rounded-xl transition-all"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Return All to Pool
                </Button>
              )}
            </div>

            {/* Search & Filter Bar */}
            {unsoldPlayers.length > 0 && (
              <div className="flex flex-col sm:flex-row items-center gap-3 mt-4 pt-2">
                <div className="relative flex-1 w-full">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search unsold players by name, club, role..."
                    className="pl-9 h-10 text-xs bg-black/40 border-white/10 rounded-xl"
                  />
                  {search && (
                    <button
                      onClick={() => setSearch('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                {/* Role filter buttons */}
                <div className="flex items-center gap-1 bg-black/40 rounded-xl p-1 border border-white/10 self-stretch sm:self-auto overflow-x-auto">
                  {(['all', 'Goalkeeper', 'Defender', 'Midfielder', 'Forward'] as const).map((r) => (
                    <button
                      key={r}
                      onClick={() => setRoleFilter(r)}
                      className={`px-3 py-1 rounded-lg text-xs font-mono font-bold uppercase tracking-wider transition-all ${
                        roleFilter === r
                          ? 'bg-amber-500 text-amber-950 shadow-sm font-black'
                          : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                      }`}
                    >
                      {r === 'all' ? 'All' : r === 'Goalkeeper' ? 'GK' : r === 'Defender' ? 'DEF' : r === 'Midfielder' ? 'MID' : 'ATT'}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </DialogHeader>

          {/* Row-based Unsold Content Area - Same like Player Search */}
          <div className="flex-1 overflow-hidden p-0">
            {unsoldPlayers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center px-6">
                <div className="h-16 w-16 rounded-2xl bg-muted/20 border border-white/10 flex items-center justify-center text-muted-foreground mb-4">
                  <UserCheck className="h-8 w-8 text-emerald-400" />
                </div>
                <h3 className="font-heading font-black text-lg text-foreground mb-1">No Unsold Players</h3>
                <p className="text-xs text-muted-foreground max-w-sm">
                  When you draw a player during the live auction and mark them <strong className="text-amber-400">UNSOLD</strong>, they will appear here ready to be re-auctioned.
                </p>
              </div>
            ) : filteredUnsold.length === 0 ? (
              <div className="py-14 text-center text-muted-foreground text-xs font-mono">
                NO UNSOLD PLAYERS MATCH YOUR SEARCH FILTER
              </div>
            ) : (
              <ScrollArea className="h-[56vh] p-5 sm:p-6">
                <div className="space-y-3">
                  <AnimatePresence mode="popLayout">
                    {filteredUnsold.map((ap) => {
                      const roleColor = ROLE_COLORS[ap.role] || '#ffd54c';
                      const basePlayer = ap.player;

                      return (
                        <motion.div
                          key={ap.id}
                          layout
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -8 }}
                          transition={{ duration: 0.2 }}
                          className={cn(
                            'group relative flex items-center gap-3.5 sm:gap-4 p-3.5 sm:p-4 rounded-2xl border transition-all duration-200 backdrop-blur-md shadow-sm',
                            'border-white/10 bg-black/40 hover:border-amber-500/40 hover:bg-black/60'
                          )}
                        >
                          {/* Face Avatar */}
                          <div className="relative flex-shrink-0 w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden bg-black/60 border border-white/10 shadow-inner flex items-center justify-center">
                            {basePlayer.photo ? (
                              <Image
                                src={basePlayer.photo}
                                alt={basePlayer.name}
                                fill
                                className="object-cover object-top grayscale group-hover:grayscale-0 transition-all duration-300"
                                sizes="64px"
                              />
                            ) : (
                              <span className="font-heading font-black text-lg text-amber-400">
                                {basePlayer.name ? basePlayer.name.charAt(0).toUpperCase() : '?'}
                              </span>
                            )}
                            {basePlayer.nationalityCode && (
                              <div className="absolute bottom-1 left-1 px-1 py-0.2 rounded bg-black/70 text-[9px] z-10">
                                🏳️
                              </div>
                            )}
                          </div>

                          {/* Info Column */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-heading font-black text-base sm:text-lg text-foreground truncate group-hover:text-amber-400 transition-colors">
                                {basePlayer.name}
                              </h3>

                              <Badge
                                className="text-[9.5px] font-heading font-black px-1.5 py-0 border"
                                style={{
                                  backgroundColor: `${CATEGORY_COLORS[basePlayer.category]}18`,
                                  color: CATEGORY_COLORS[basePlayer.category],
                                  borderColor: `${CATEGORY_COLORS[basePlayer.category]}35`,
                                }}
                              >
                                {CATEGORY_LABELS[basePlayer.category]}
                              </Badge>

                              <span
                                className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider border"
                                style={{
                                  backgroundColor: `${roleColor}15`,
                                  color: roleColor,
                                  borderColor: `${roleColor}30`,
                                }}
                              >
                                {ap.role}
                              </span>

                              <Badge className="text-[9px] font-mono font-bold px-1.5 py-0 border-amber-500/40 text-amber-300 bg-amber-500/15">
                                UNSOLD
                              </Badge>
                            </div>

                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1 flex-wrap">
                              <span>🏳️ {basePlayer.nationality}</span>
                              <span>•</span>
                              <span className="text-foreground/80 font-medium">{basePlayer.team}</span>
                              <span>•</span>
                              <span className="font-mono font-bold text-[var(--gold)]">
                                Base: {formatCurrency(ap.basePrice, ap.currency || settings.currency)}
                              </span>
                            </div>
                          </div>

                          {/* Right Actions: Add Pop Trigger + Delete Button */}
                          <div className="flex-shrink-0 flex items-center gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleOpenPopConfig(ap)}
                              className="h-9 px-4 rounded-xl bg-[var(--gold)] hover:bg-[var(--gold)]/90 text-black shadow-gold font-heading font-black text-xs uppercase tracking-wider gap-1.5 transition-transform hover:scale-105"
                            >
                              <Plus className="h-4 w-4" />
                              <span>ADD</span>
                            </Button>

                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleRemoveSingle(ap)}
                              className="h-9 w-9 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                              title="Delete from Auction"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              </ScrollArea>
            )}
          </div>

          {/* Footer */}
          {unsoldPlayers.length > 0 && (
            <div className="p-4 border-t border-white/10 bg-black/40 flex items-center justify-between">
              <p className="text-xs font-mono text-muted-foreground">
                SHOWING {filteredUnsold.length} OF {unsoldPlayers.length} UNSOLD CARDS
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReAddAll}
                  className="sm:hidden border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10 text-xs font-bold rounded-xl"
                >
                  Return All
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onOpenChange(false)}
                  className="text-xs font-heading font-bold uppercase rounded-xl"
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* POP CONFIGURATION DIALOG TO RETURN UNSOLD PLAYER BACK TO POOL */}
      {popConfig && (
        <Dialog
          open={!!popConfig}
          onOpenChange={(openState) => {
            if (!openState) setPopConfig(null);
          }}
        >
          <DialogContent className="max-w-md bg-[#0a0e14]/98 backdrop-blur-2xl border border-white/15 shadow-2xl p-0 overflow-hidden rounded-3xl z-50">
            <DialogHeader className="p-6 pb-4 border-b border-white/10 bg-black/40">
              <DialogTitle className="flex items-center gap-2 font-heading font-black text-xl text-foreground">
                <Sparkles className="h-5 w-5 text-[var(--gold)]" />
                Return Player to Pool
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Adjust position role or base reserve price before re-entering the player into the active pool
              </DialogDescription>
            </DialogHeader>

            {/* Profile Preview Card */}
            <div className="px-6 py-4 flex items-center gap-4 border-b border-white/10 bg-black/30">
              <div className="relative w-16 h-16 rounded-2xl overflow-hidden bg-black/60 border border-white/15 flex-shrink-0 shadow-md flex items-center justify-center">
                {popConfig.auctionPlayer.player.photo ? (
                  <Image
                    src={popConfig.auctionPlayer.player.photo}
                    alt={popConfig.auctionPlayer.player.name}
                    fill
                    className="object-cover object-top"
                    sizes="64px"
                  />
                ) : (
                  <span className="font-heading font-black text-xl text-amber-400">
                    {popConfig.auctionPlayer.player.name ? popConfig.auctionPlayer.player.name.charAt(0).toUpperCase() : '?'}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-heading font-black text-base sm:text-lg text-foreground truncate">
                  {popConfig.auctionPlayer.player.name}
                </h3>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5 flex-wrap">
                  <span>🏳️ {popConfig.auctionPlayer.player.nationality}</span>
                  <span>•</span>
                  <span>{popConfig.auctionPlayer.player.team}</span>
                  <span>•</span>
                  <span className="font-mono font-bold text-[var(--gold)]">
                    {popConfig.auctionPlayer.player.category}
                  </span>
                </div>
              </div>
            </div>

            {/* Form Controls */}
            <div className="p-6 space-y-4">
              {/* Role */}
              <div className="space-y-1.5">
                <Label className="text-xs font-mono font-bold text-foreground uppercase tracking-wider">
                  Position Role
                </Label>
                <Select
                  value={popConfig.role}
                  onValueChange={(val) =>
                    setPopConfig((prev) => (prev ? { ...prev, role: val as PlayerRole } : null))
                  }
                >
                  <SelectTrigger className="bg-black/40 border-white/10 text-sm rounded-xl">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover/95 backdrop-blur-xl border-border">
                    {ROLE_OPTIONS.map((r) => (
                      <SelectItem key={r.value} value={r.value} className="text-sm font-medium">
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Base Reserve Price */}
              <div className="space-y-1.5">
                <Label className="text-xs font-mono font-bold text-foreground uppercase tracking-wider">
                  Base Reserve Price
                </Label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground font-mono font-bold text-sm">
                    {CURRENCY_SYMBOLS[popConfig.currency]}
                  </span>
                  <Input
                    type="number"
                    value={popConfig.basePrice}
                    onChange={(e) =>
                      setPopConfig((prev) =>
                        prev ? { ...prev, basePrice: e.target.value } : null
                      )
                    }
                    className="pl-9 bg-black/40 border-white/10 font-heading font-black text-lg rounded-xl"
                    min="0"
                  />
                </div>
              </div>

              {/* Currency */}
              <div className="space-y-1.5">
                <Label className="text-xs font-mono font-bold text-foreground uppercase tracking-wider">
                  Currency
                </Label>
                <Select
                  value={popConfig.currency}
                  onValueChange={(val) =>
                    setPopConfig((prev) => (prev ? { ...prev, currency: val as Currency } : null))
                  }
                >
                  <SelectTrigger className="bg-black/40 border-white/10 text-sm rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover/95 backdrop-blur-xl border-border">
                    {CURRENCY_OPTIONS.map((c) => (
                      <SelectItem key={c.value} value={c.value} className="text-sm font-medium">
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Modal Actions Footer */}
            <div className="p-5 border-t border-white/10 flex justify-end gap-2.5 bg-black/20">
              <Button
                variant="ghost"
                onClick={() => setPopConfig(null)}
                className="font-heading font-bold text-xs uppercase tracking-wider rounded-xl"
              >
                Cancel
              </Button>
              <Button
                disabled={isProcessing}
                className="bg-[var(--gold)] hover:bg-[var(--gold)]/90 text-black shadow-gold font-heading font-black text-xs uppercase tracking-wider rounded-xl px-6 gap-1.5"
                onClick={handleConfirmAddBack}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Returning...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Add Back to Pool
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
