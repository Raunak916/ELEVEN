'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AppLayout } from '@/components/layout/app-layout';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import {
  Search,
  X,
  Pencil,
  Upload,
  Ban,
  Filter,
  Sparkles,
  SlidersHorizontal,
  Layers,
  ArrowUpDown,
  Plus,
  Trash2,
  CheckSquare,
} from 'lucide-react';
import { PlayerCard } from '@/components/ui/player-card';
import { Label } from '@/components/ui/label';
import { useAuctionStore } from '@/lib/auction-store';
import { useHydrated } from '@/lib/use-hydrated';
import { cn, formatCurrency } from '@/lib/utils';
import {
  PlayerRole,
  AuctionPlayer,
  CURRENCY_SYMBOLS,
  Currency,
} from '@/lib/types';
import { AddPlayerModal } from '@/components/auction/add-player-modal';
import { BulkImportModal } from '@/components/auction/bulk-import-modal';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import Image from 'next/image';
import { UnsoldPlayersModal } from '@/components/auction/unsold-players-modal';
import { MysteryPotScreen } from '@/components/mystery-pot/mystery-pot-screen';

const ROLE_FILTERS: { value: 'all' | PlayerRole; label: string; icon: string }[] = [
  { value: 'all', label: 'ALL', icon: '' },
  { value: 'Goalkeeper', label: 'GK', icon: '🥅' },
  { value: 'Defender', label: 'DEF', icon: '🛡️' },
  { value: 'Midfielder', label: 'MID', icon: '⚽' },
  { value: 'Forward', label: 'ATT', icon: '⚡' },
];

const SORT_OPTIONS = [
  { value: 'name', label: 'Name (A-Z)' },
  { value: 'name-desc', label: 'Name (Z-A)' },
  { value: 'price', label: 'Base Price (Low to High)' },
  { value: 'price-desc', label: 'Base Price (High to Low)' },
  { value: 'category', label: 'Tier Category' },
  { value: 'position', label: 'Position Role' },
  { value: 'recent', label: 'Recently Added' },
];

import { useSearchParams } from 'next/navigation';

function PoolPageContent() {
  const searchParams = useSearchParams();
  const [poolTab, setPoolTab] = useState<'roster' | 'mystery-pot'>('roster');

  useEffect(() => {
    const urlTab = searchParams.get('tab');
    if (urlTab === 'mystery-pot' || urlTab === 'roster') {
      setPoolTab(urlTab);
    } else if (typeof window !== 'undefined') {
      const savedTab = localStorage.getItem('auction-active-pool-tab');
      if (savedTab === 'mystery-pot' || savedTab === 'roster') {
        setPoolTab(savedTab);
      }
    }
  }, [searchParams]);

  const handleTabChange = (tab: 'roster' | 'mystery-pot') => {
    setPoolTab(tab);
    if (typeof window !== 'undefined') {
      localStorage.setItem('auction-active-pool-tab', tab);
      const newUrl = new URL(window.location.href);
      if (tab === 'mystery-pot') {
        newUrl.searchParams.set('tab', 'mystery-pot');
      } else {
        newUrl.searchParams.delete('tab');
      }
      window.history.replaceState(null, '', newUrl.toString());
    }
  };

  const {
    auctionPlayers,
    getAvailablePlayers,
    getDrawnPlayers,
    getUnsoldPlayers,
    getUnsoldCount,
    removePlayer,
    removeMultiplePlayers,
    updatePlayer,
  } = useAuctionStore();

  const hydrated = useHydrated();
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | PlayerRole>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'available' | 'unsold' | 'drawn'>('all');
  const [sortBy, setSortBy] = useState<string>('name');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBulkImportModal, setShowBulkImportModal] = useState(false);
  const [showUnsoldModal, setShowUnsoldModal] = useState(false);

  // Multi-select / Batch Remove state
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);

  const unsoldCount = hydrated ? getUnsoldCount() : 0;
  const availableCount = hydrated ? getAvailablePlayers().length : 0;
  const drawnCount = hydrated ? getDrawnPlayers().length : 0;
  const totalCount = hydrated ? auctionPlayers.length : 0;

  const allPlayers = useMemo(() => {
    let players = [...auctionPlayers];

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      players = players.filter(
        (ap) =>
          ap.player.name.toLowerCase().includes(query) ||
          ap.player.nationality.toLowerCase().includes(query) ||
          ap.player.team.toLowerCase().includes(query) ||
          ap.player.category.toLowerCase().includes(query) ||
          ap.role.toLowerCase().includes(query)
      );
    }

    // Filter by role
    if (roleFilter !== 'all') {
      players = players.filter((ap) => ap.role === roleFilter);
    }

    // Filter by status
    if (statusFilter === 'available') {
      players = players.filter((ap) => ap.status === 'AVAILABLE');
    } else if (statusFilter === 'unsold') {
      players = players.filter((ap) => ap.status === 'UNSOLD');
    } else if (statusFilter === 'drawn') {
      players = players.filter((ap) => ap.status === 'DRAWN');
    }

    // Sort
    players.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.player.name.localeCompare(b.player.name);
        case 'name-desc':
          return b.player.name.localeCompare(a.player.name);
        case 'price':
          return a.basePrice - b.basePrice;
        case 'price-desc':
          return b.basePrice - a.basePrice;
        case 'category': {
          const catOrder = { LEGEND: 0, ICON: 1, HERO: 2, CURRENT: 3, RETIRED: 4 };
          return (
            (catOrder[a.player.category as keyof typeof catOrder] ?? 5) -
            (catOrder[b.player.category as keyof typeof catOrder] ?? 5)
          );
        }
        case 'position':
          return a.role.localeCompare(b.role);
        case 'recent':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        default:
          return 0;
      }
    });

    return players;
  }, [auctionPlayers, searchQuery, roleFilter, sortBy, statusFilter]);

  const handleRemove = (id: string) => {
    if (confirm('Remove this player from the auction pool?')) {
      removePlayer(id);
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedPlayerIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedPlayerIds.length === allPlayers.length) {
      setSelectedPlayerIds([]);
    } else {
      setSelectedPlayerIds(allPlayers.map((p) => p.id));
    }
  };

  const handleConfirmBatchDelete = () => {
    if (selectedPlayerIds.length === 0) return;
    const count = selectedPlayerIds.length;
    removeMultiplePlayers(selectedPlayerIds);
    toast.success(`Removed ${count} player${count !== 1 ? 's' : ''} from auction pool`);
    setSelectedPlayerIds([]);
    setIsSelectionMode(false);
    setIsConfirmDeleteOpen(false);
  };

  // Edit player state
  const [editingPlayer, setEditingPlayer] = useState<AuctionPlayer | null>(null);
  const [editRole, setEditRole] = useState<PlayerRole>('Midfielder');
  const [editPrice, setEditPrice] = useState<string>('0');
  const [editCurrency, setEditCurrency] = useState<Currency>('INR');

  const handleEdit = (ap: AuctionPlayer) => {
    setEditingPlayer(ap);
    setEditRole(ap.role);
    setEditPrice(ap.basePrice.toString());
    setEditCurrency(ap.currency);
  };

  const handleSaveEdit = () => {
    if (editingPlayer) {
      const parsedPrice = parseInt(editPrice, 10);
      const finalPrice = isNaN(parsedPrice) || parsedPrice < 0 ? 0 : parsedPrice;
      updatePlayer(editingPlayer.id, {
        role: editRole,
        basePrice: finalPrice,
        currency: editCurrency,
      });
      toast.success('Player updated');
      setEditingPlayer(null);
    }
  };

  return (
    <>
      {/* Full Viewport Background - GPU Accelerated */}
      <div
        className="fixed inset-0 -z-40 pointer-events-none opacity-40 will-change-transform contain-paint"
        aria-hidden="true"
        style={{
          backgroundImage: 'url(/backgrounds/for-pool/pool-page-bg.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          backgroundAttachment: 'fixed',
        }}
      />
      {/* Subtle depth gradient overlay */}
      <div
        className="fixed inset-0 -z-30 pointer-events-none bg-gradient-to-b from-black/60 via-black/40 to-black/70"
        aria-hidden="true"
      />

      <AppLayout>
        <div className="space-y-6 relative z-10">
          {/* Header with Metric Badges & Action CTAs */}
          <PageHeader
            lines={['PLAYER', 'POOL']}
            description="Manage and curate your roster of collectible football cards"
            action={
              <div className="flex items-center gap-2.5 flex-wrap">
                {/* Multi-Select / Remove Multiple Toggle */}
                {allPlayers.length > 0 && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsSelectionMode((prev) => {
                        if (prev) setSelectedPlayerIds([]);
                        return !prev;
                      });
                    }}
                    className={cn(
                      'gap-2 px-4 py-2.5 font-heading font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-sm',
                      isSelectionMode
                        ? 'border-destructive/60 bg-destructive/15 text-destructive hover:bg-destructive/25 shadow-[0_0_15px_rgba(239,68,68,0.2)]'
                        : 'border-white/10 bg-white/5 hover:bg-white/10 text-foreground'
                    )}
                    size="lg"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                    <span>{isSelectionMode ? 'Exit Selection' : 'Select Multiple'}</span>
                    {isSelectionMode && selectedPlayerIds.length > 0 && (
                      <Badge className="ml-1 px-1.5 py-0 text-[10px] font-mono font-black bg-destructive text-white">
                        {selectedPlayerIds.length}
                      </Badge>
                    )}
                  </Button>
                )}

                {/* Unsold Drawer Trigger */}
                <Button
                  variant="outline"
                  onClick={() => setShowUnsoldModal(true)}
                  className={cn(
                    'gap-2 px-4 py-2.5 border-amber-500/40 text-amber-400 hover:bg-amber-500/10 hover:border-amber-500 transition-all font-heading font-bold text-xs uppercase tracking-wider shadow-sm rounded-xl',
                    unsoldCount > 0 &&
                      'border-amber-500/60 bg-amber-500/10 shadow-[0_0_15px_rgba(245,158,11,0.15)]'
                  )}
                  size="lg"
                >
                  <Ban className="h-4 w-4" aria-hidden="true" />
                  <span>Unsold Roster</span>
                  {unsoldCount > 0 && (
                    <Badge className="ml-0.5 px-1.5 py-0 text-[10px] font-mono font-black bg-amber-500 text-amber-950">
                      {unsoldCount}
                    </Badge>
                  )}
                </Button>

                {/* Bulk Import */}
                <Button
                  variant="outline"
                  onClick={() => setShowBulkImportModal(true)}
                  className="gap-2 px-4 py-2.5 border-[var(--gold)]/30 text-[var(--gold)] hover:bg-[var(--gold)]/10 font-heading font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-sm"
                  size="lg"
                >
                  <Upload className="h-4 w-4" aria-hidden="true" />
                  <span>Bulk Import</span>
                </Button>

                {/* Add Single Player */}
                <Button
                  onClick={() => setShowAddModal(true)}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2 px-5 py-2.5 font-heading font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg transition-transform hover:scale-105"
                  size="lg"
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  <span>Add Player</span>
                </Button>
              </div>
            }
          />

          {/* Primary View Switcher: Roster Grid vs Mystery Pots */}
          <div className="flex items-center justify-between gap-3 border-b border-border/40 pb-4">
            <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-black/40 border border-white/10 backdrop-blur-2xl">
              <button
                type="button"
                onClick={() => handleTabChange('roster')}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-heading font-black uppercase tracking-wider transition-all duration-150',
                  poolTab === 'roster'
                    ? 'bg-white text-black shadow-md'
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                )}
              >
                <Layers className="h-4 w-4" />
                <span>Roster Pool ({allPlayers.length})</span>
              </button>

              <button
                type="button"
                onClick={() => handleTabChange('mystery-pot')}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-heading font-black uppercase tracking-wider transition-all duration-150',
                  poolTab === 'mystery-pot'
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-black shadow-[0_0_20px_rgba(56,189,248,0.4)]'
                    : 'text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10'
                )}
              >
                <Sparkles className="h-4 w-4" />
                <span>Mystery Pots</span>
              </button>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {poolTab === 'mystery-pot' ? (
              <motion.div
                key="mystery-pot"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              >
                <MysteryPotScreen />
              </motion.div>
            ) : (
              <motion.div
                key="roster-pool"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                className="space-y-6"
              >
                {/* Quick Metrics Bar */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-2xl glass border-border/30 flex items-center justify-between">
              <div>
                <span className="block text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground">
                  Total Pool
                </span>
                <span className="text-lg sm:text-xl font-heading font-black text-foreground tabular-nums">
                  {totalCount}
                </span>
              </div>
              <div className="h-9 w-9 rounded-xl bg-muted/40 flex items-center justify-center text-muted-foreground font-mono text-xs">
                Σ
              </div>
            </div>

            <div className="p-3.5 rounded-2xl glass border-border/30 flex items-center justify-between">
              <div>
                <span className="block text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-400">
                  Available
                </span>
                <span className="text-lg sm:text-xl font-heading font-black text-emerald-400 tabular-nums">
                  {availableCount}
                </span>
              </div>
              <div className="h-9 w-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-mono text-xs">
                ⚡
              </div>
            </div>

            <div className="p-3.5 rounded-2xl glass border-border/30 flex items-center justify-between">
              <div>
                <span className="block text-[10px] font-mono font-bold uppercase tracking-wider text-amber-400">
                  Unsold
                </span>
                <span className="text-lg sm:text-xl font-heading font-black text-amber-400 tabular-nums">
                  {unsoldCount}
                </span>
              </div>
              <div className="h-9 w-9 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center font-mono text-xs">
                🚫
              </div>
            </div>

            <div className="p-3.5 rounded-2xl glass border-border/30 flex items-center justify-between">
              <div>
                <span className="block text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground">
                  Drawn / Sold
                </span>
                <span className="text-lg sm:text-xl font-heading font-black text-muted-foreground tabular-nums">
                  {drawnCount}
                </span>
              </div>
              <div className="h-9 w-9 rounded-xl bg-muted/40 flex items-center justify-center text-muted-foreground font-mono text-xs">
                🏆
              </div>
            </div>
          </div>

          {/* Search & Filter Toolbar */}
          <Card className="glass border-border/40 shadow-xl overflow-hidden">
            <CardContent className="p-4 sm:p-5 space-y-4">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                {/* Search Field */}
                <div className="relative flex-1 max-w-md">
                  <Search
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by player, club, nationality, tier..."
                    className="pl-10 pr-9 h-11 bg-black/40 border-white/10 text-sm rounded-xl focus:border-[var(--gold)]/60"
                    aria-label="Search players in pool"
                  />
                  {searchQuery && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground hover:text-foreground"
                      aria-label="Clear search query"
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>

                {/* Role Position Pills */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-muted-foreground hidden sm:block mr-1">
                    Position:
                  </span>
                  <div
                    className="flex gap-1 bg-black/40 rounded-xl p-1 border border-white/10"
                    role="group"
                    aria-label="Filter by position"
                  >
                    {ROLE_FILTERS.map((filter) => (
                      <button
                        key={filter.value}
                        type="button"
                        onClick={() => setRoleFilter(filter.value)}
                        className={cn(
                          'px-3 py-1.5 rounded-lg text-xs font-mono font-bold uppercase tracking-wider transition-all duration-200 flex items-center gap-1.5',
                          roleFilter === filter.value
                            ? 'bg-[var(--gold)] text-black shadow-gold'
                            : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                        )}
                        aria-pressed={roleFilter === filter.value}
                      >
                        {filter.icon && <span aria-hidden="true">{filter.icon}</span>}
                        <span>{filter.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Status & Sort Controls */}
                <div className="flex items-center gap-3 flex-wrap lg:ml-auto">
                  {/* Status Pills */}
                  <div
                    className="flex items-center gap-1 bg-black/40 rounded-xl p-1 border border-white/10"
                    role="group"
                    aria-label="Filter by status"
                  >
                    {[
                      { value: 'all', label: 'ALL' },
                      { value: 'available', label: 'AVAILABLE' },
                      {
                        value: 'unsold',
                        label: `UNSOLD${unsoldCount > 0 ? ` (${unsoldCount})` : ''}`,
                      },
                      { value: 'drawn', label: 'DRAWN' },
                    ].map((s) => (
                      <button
                        key={s.value}
                        type="button"
                        onClick={() => setStatusFilter(s.value as any)}
                        className={cn(
                          'px-2.5 py-1.5 rounded-lg text-[11px] font-mono font-bold tracking-wider uppercase transition-all duration-200',
                          statusFilter === s.value
                            ? s.value === 'unsold'
                              ? 'bg-amber-500 text-amber-950 font-black shadow-sm'
                              : 'bg-primary text-primary-foreground font-black shadow-sm'
                            : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                        )}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>

                  {/* Sort Dropdown */}
                  <div className="flex items-center gap-2">
                    <Select value={sortBy} onValueChange={(v) => v && setSortBy(v)}>
                      <SelectTrigger
                        id="sort"
                        className="h-11 w-[190px] bg-black/40 border-white/10 text-xs font-mono font-bold rounded-xl"
                      >
                        <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground mr-1" />
                        <SelectValue placeholder="Sort roster by..." />
                      </SelectTrigger>
                      <SelectContent className="bg-popover/95 backdrop-blur-xl border-border">
                        {SORT_OPTIONS.map((opt) => (
                          <SelectItem
                            key={opt.value}
                            value={opt.value}
                            className="text-xs font-medium cursor-pointer"
                          >
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Main Player Grid Showcase */}
          {allPlayers.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col items-center justify-center py-20 px-6 text-center"
            >
              <Card className="glass max-w-md w-full border-border/40 shadow-2xl">
                <CardContent className="py-14 px-8 text-center">
                  <div className="h-16 w-16 rounded-2xl bg-muted/30 border border-border/40 flex items-center justify-center mx-auto mb-4 text-muted-foreground">
                    <Search className="h-7 w-7" aria-hidden="true" />
                  </div>
                  <h3 className="font-heading text-xl font-bold text-foreground mb-1.5">
                    {searchQuery || roleFilter !== 'all' || statusFilter !== 'all'
                      ? 'No matching players found'
                      : 'No players in your auction pool yet'}
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground mb-6 leading-relaxed">
                    {searchQuery || roleFilter !== 'all' || statusFilter !== 'all'
                      ? 'Try clearing the search query or adjusting your filters.'
                      : 'Add players from the football database to start building your auction pool.'}
                  </p>

                  {searchQuery || roleFilter !== 'all' || statusFilter !== 'all' ? (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSearchQuery('');
                        setRoleFilter('all');
                        setStatusFilter('all');
                      }}
                      className="border-border/40 font-heading font-bold text-xs uppercase tracking-wider rounded-xl"
                    >
                      Reset All Filters
                    </Button>
                  ) : (
                    <Button
                      onClick={() => setShowAddModal(true)}
                      className="bg-[var(--gold)] hover:bg-[var(--gold)]/90 text-black shadow-gold font-heading font-bold text-xs uppercase tracking-wider rounded-xl gap-2 w-full"
                      size="lg"
                    >
                      <Plus className="h-4 w-4" aria-hidden="true" />
                      Add First Player
                    </Button>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            <div className="space-y-3">
              {/* Active Results Summary */}
              <div className="flex items-center justify-between text-xs font-mono font-semibold text-muted-foreground px-1">
                <span>
                  SHOWING {allPlayers.length} OF {totalCount} CARDS
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-emerald-400 font-bold">
                    {availableCount} ACTIVE
                  </span>
                  <span>•</span>
                  <span className="text-amber-400 font-bold">
                    {unsoldCount} UNSOLD
                  </span>
                </div>
              </div>

              {/* Roster Grid */}
              <motion.div
                initial="hidden"
                animate="visible"
                variants={{
                  hidden: { opacity: 0 },
                  visible: {
                    opacity: 1,
                    transition: { staggerChildren: 0.02 },
                  },
                }}
                className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3.5 sm:gap-4.5"
              >
                <AnimatePresence mode="popLayout">
                  {allPlayers.map((ap) => (
                    <motion.div
                      key={ap.id}
                      initial={{ opacity: 0, y: 16, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -16, scale: 0.95 }}
                      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                      layout
                    >
                      <PlayerCard
                        player={ap}
                        variant="pool"
                        onRemove={handleRemove}
                        onEdit={handleEdit}
                        selectable={isSelectionMode}
                        isSelected={selectedPlayerIds.includes(ap.id)}
                        onToggleSelect={() => handleToggleSelect(ap.id)}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </motion.div>
            </div>
          )}

          {/* Add Player & Bulk Import Modals - Available for both Tabs */}
          <AddPlayerModal open={showAddModal} onOpenChange={setShowAddModal} />
          <BulkImportModal open={showBulkImportModal} onOpenChange={setShowBulkImportModal} />

          {/* Edit Player Dialog */}
          {editingPlayer && (
            <Dialog
              open={!!editingPlayer}
              onOpenChange={(open) => {
                if (!open) setEditingPlayer(null);
              }}
            >
              <DialogContent className="max-w-md bg-card/95 backdrop-blur-2xl border-border/40 shadow-2xl p-0 overflow-hidden rounded-3xl">
                <DialogHeader className="p-6 pb-4 border-b border-white/10">
                  <DialogTitle className="flex items-center gap-2 font-heading font-black text-xl text-foreground">
                    <Pencil className="h-5 w-5 text-[var(--gold)]" />
                    Edit Player Details
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground">
                    Update role and base reserve price for auction
                  </DialogDescription>
                </DialogHeader>

                {/* Player Profile Preview */}
                <div className="px-6 py-4 flex items-center gap-4 border-b border-white/10 bg-black/30">
                  <div className="relative w-16 h-16 rounded-2xl overflow-hidden bg-black/60 border border-white/15 flex-shrink-0 shadow-md flex items-center justify-center">
                    {editingPlayer.player.photo ? (
                      <Image
                        src={editingPlayer.player.photo}
                        alt={editingPlayer.player.name}
                        fill
                        className="object-cover object-top"
                        sizes="64px"
                      />
                    ) : (
                      <span className="font-heading font-black text-xl text-cyan-400">
                        {editingPlayer.player.name ? editingPlayer.player.name.charAt(0).toUpperCase() : '?'}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-heading font-black text-base sm:text-lg text-foreground truncate">
                      {editingPlayer.player.name}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                      <span>🏳️ {editingPlayer.player.nationality}</span>
                      <span>•</span>
                      <span className="font-mono font-bold text-[var(--gold)]">
                        {editingPlayer.player.category}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Form Controls */}
                <div className="p-6 space-y-4">
                  {/* Role Selector */}
                  <div className="space-y-2">
                    <Label className="text-xs font-mono font-bold text-foreground uppercase tracking-wider">
                      Position Role
                    </Label>
                    <Select
                      value={editRole}
                      onValueChange={(value) => setEditRole(value as PlayerRole)}
                    >
                      <SelectTrigger className="bg-black/40 border-white/10 text-sm rounded-xl">
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover/95 backdrop-blur-xl border-border">
                        {['Goalkeeper', 'Defender', 'Midfielder', 'Forward'].map((r) => (
                          <SelectItem key={r} value={r} className="text-sm font-medium">
                            {r}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Base Price Input */}
                  <div className="space-y-2">
                    <Label className="text-xs font-mono font-bold text-foreground uppercase tracking-wider">
                      Base Reserve Price
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground font-mono font-bold text-sm">
                        {CURRENCY_SYMBOLS[editCurrency]}
                      </span>
                      <Input
                        type="number"
                        value={editPrice}
                        onChange={(e) => setEditPrice(e.target.value)}
                        className="pl-9 bg-black/40 border-white/10 font-heading font-black text-lg rounded-xl"
                        min="0"
                      />
                    </div>
                  </div>

                  {/* Currency Selector */}
                  <div className="space-y-2">
                    <Label className="text-xs font-mono font-bold text-foreground uppercase tracking-wider">
                      Currency
                    </Label>
                    <Select
                      value={editCurrency}
                      onValueChange={(value) => setEditCurrency(value as Currency)}
                    >
                      <SelectTrigger className="bg-black/40 border-white/10 text-sm rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-popover/95 backdrop-blur-xl border-border">
                        {['INR', 'USD', 'EUR', 'GBP'].map((c) => (
                          <SelectItem key={c} value={c as Currency} className="text-sm font-medium">
                            {CURRENCY_SYMBOLS[c as Currency]} {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="p-5 border-t border-white/10 flex justify-end gap-2.5 bg-black/20">
                  <Button
                    variant="ghost"
                    onClick={() => setEditingPlayer(null)}
                    className="font-heading font-bold text-xs uppercase tracking-wider rounded-xl"
                  >
                    Cancel
                  </Button>
                  <Button
                    className="bg-[var(--gold)] hover:bg-[var(--gold)]/90 text-black shadow-gold font-heading font-bold text-xs uppercase tracking-wider rounded-xl px-6"
                    onClick={handleSaveEdit}
                  >
                    Save Changes
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}

          {/* Unsold Players Modal */}
          <UnsoldPlayersModal open={showUnsoldModal} onOpenChange={setShowUnsoldModal} />

          {/* Floating Batch Selection Toolbar */}
          <AnimatePresence>
            {isSelectionMode && (
              <motion.div
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 50 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[94vw] max-w-xl p-3 sm:p-4 rounded-3xl bg-[#080c14]/90 backdrop-blur-2xl border border-white/20 shadow-2xl flex flex-wrap items-center justify-between gap-3"
              >
                <div className="flex items-center gap-2.5">
                  <Badge className="bg-destructive text-white font-mono font-bold text-xs px-2.5 py-1">
                    {selectedPlayerIds.length} Selected
                  </Badge>
                  <span className="text-xs text-muted-foreground hidden sm:inline">
                    of {allPlayers.length} filtered cards
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleSelectAll}
                    className="h-9 px-3 text-xs font-mono font-bold rounded-xl border-white/15 hover:bg-white/10"
                  >
                    {selectedPlayerIds.length === allPlayers.length && allPlayers.length > 0
                      ? 'Deselect All'
                      : 'Select All'}
                  </Button>

                  <Button
                    size="sm"
                    disabled={selectedPlayerIds.length === 0}
                    onClick={() => setIsConfirmDeleteOpen(true)}
                    className="h-9 px-4 text-xs font-heading font-black uppercase tracking-wider rounded-xl bg-destructive hover:bg-destructive/90 text-destructive-foreground shadow-lg gap-1.5"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Remove ({selectedPlayerIds.length})</span>
                  </Button>

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setIsSelectionMode(false);
                      setSelectedPlayerIds([]);
                    }}
                    className="h-9 px-2.5 text-xs text-muted-foreground hover:text-foreground rounded-xl"
                  >
                    Cancel
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Batch Delete Confirmation Dialog */}
          {isConfirmDeleteOpen && (
            <Dialog open={isConfirmDeleteOpen} onOpenChange={setIsConfirmDeleteOpen}>
              <DialogContent className="max-w-md bg-[#0a0e14]/98 backdrop-blur-2xl border border-destructive/30 shadow-2xl p-0 overflow-hidden rounded-3xl z-50">
                <DialogHeader className="p-6 pb-4 border-b border-white/10 bg-destructive/10">
                  <DialogTitle className="flex items-center gap-2.5 font-heading font-black text-xl text-destructive">
                    <Trash2 className="h-5 w-5" />
                    Remove Multiple Players
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground mt-1">
                    Are you sure you want to permanently remove <strong className="text-foreground">{selectedPlayerIds.length} players</strong> from the auction pool? This action cannot be undone.
                  </DialogDescription>
                </DialogHeader>

                <div className="p-5 border-t border-white/10 flex justify-end gap-2.5 bg-black/20">
                  <Button
                    variant="ghost"
                    onClick={() => setIsConfirmDeleteOpen(false)}
                    className="font-heading font-bold text-xs uppercase tracking-wider rounded-xl"
                  >
                    Cancel
                  </Button>
                  <Button
                    className="bg-destructive hover:bg-destructive/90 text-destructive-foreground font-heading font-black text-xs uppercase tracking-wider rounded-xl px-6"
                    onClick={handleConfirmBatchDelete}
                  >
                    Yes, Remove {selectedPlayerIds.length} Players
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </AppLayout>
    </>
  );
}

export default function PoolPage() {
  return (
    <React.Suspense fallback={<div className="min-h-screen bg-background" />}>
      <PoolPageContent />
    </React.Suspense>
  );
}