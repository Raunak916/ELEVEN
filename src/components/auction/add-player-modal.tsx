'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Loader2, Plus, Check, Sparkles, UserPlus, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Player, PlayerRole, Currency, CURRENCY_SYMBOLS, PlayerPosition, PlayerCategory, CURRENCY_LOCALES } from '@/lib/types';
import { getPlayerDataProvider } from '@/lib/player-provider';
import { formatCurrency, CATEGORY_COLORS, CATEGORY_LABELS, getRoleFromPosition } from '@/lib/utils';
import { CountryFlag } from '@/components/ui/country-flag';
import { cn } from '@/lib/utils';
import { useAuctionStore } from '@/lib/auction-store';
import { toast } from 'sonner';
import Image from 'next/image';

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

interface AddPlayerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type ViewState = 'search' | 'configure' | 'create';

export function AddPlayerModal({ open, onOpenChange }: AddPlayerModalProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Player[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [view, setView] = useState<ViewState>('search');
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);

  // Custom player creation state
  const [createForm, setCreateForm] = useState({
    name: '',
    firstName: '',
    lastName: '',
    nationality: '',
    nationalityCode: '',
    position: 'CM' as PlayerPosition,
    role: 'Midfielder' as PlayerRole,
    dateOfBirth: '',
    team: '',
    league: '',
    category: 'CURRENT' as PlayerCategory,
    basePrice: '',
    currency: 'INR' as Currency,
    photo: null as File | null,
    photoPreview: null as string | null,
  });
  const [isCreating, setIsCreating] = useState(false);

  // Configuration state
  const [configRole, setConfigRole] = useState<PlayerRole>('Midfielder');
  const [configPrice, setConfigPrice] = useState('2000000');
  const [configCurrency, setConfigCurrency] = useState<Currency>('INR');
  const [addedPlayers, setAddedPlayers] = useState<Set<string>>(new Set());
  const [isAdding, setIsAdding] = useState(false);

  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { addPlayer } = useAuctionStore();

  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      setIsLoading(false);
      setHasSearched(false);
      return;
    }

    setIsLoading(true);
    setHasSearched(true);

    try {
      const provider = getPlayerDataProvider();
      const players = await provider.searchPlayers(searchQuery);
      setResults(players);
    } catch (error) {
      console.error('Search failed:', error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleQueryChange = useCallback((value: string) => {
    setQuery(value);

    // Debounce search by 300ms
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }

    if (!value.trim()) {
      setResults([]);
      setHasSearched(false);
      setIsLoading(false);
      return;
    }

    searchTimeout.current = setTimeout(() => {
      performSearch(value);
    }, 300);
  }, [performSearch]);

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      const resetTimer = setTimeout(() => {
        setQuery('');
        setResults([]);
        setIsLoading(false);
        setHasSearched(false);
        setView('search');
        setSelectedPlayer(null);
        setConfigRole('Midfielder');
        setConfigPrice('2000000');
        setConfigCurrency('INR');
        setAddedPlayers(new Set());
      }, 0);
      return () => clearTimeout(resetTimer);
    }
  }, [open]);

  const handleAddClick = (player: Player) => {
    setSelectedPlayer(player);
    // Pre-fill role based on player's position
    setConfigRole(getRoleFromPosition(player.position));
    setView('configure');
  };

  const handleConfirmAdd = async () => {
    if (!selectedPlayer) return;

    setIsAdding(true);
    try {
      await addPlayer(
        selectedPlayer,
        configRole,
        parseInt(configPrice) || 0,
        configCurrency
      );

      const newAdded = new Set(addedPlayers);
      newAdded.add(selectedPlayer.id);
      setAddedPlayers(newAdded);

      toast.success(`${selectedPlayer.name} added to auction`, {
        description: `${configRole} · ${formatCurrency(parseInt(configPrice) || 0, configCurrency)}`,
      });

      // Return to search
      setView('search');
      setSelectedPlayer(null);
    } catch {
      toast.error('Failed to add player');
    } finally {
      setIsAdding(false);
    }
  };

  // Custom player creation handlers
  const handleCreateFormChange = useCallback((field: string, value: string | File | null) => {
    setCreateForm(prev => ({
      ...prev,
      [field]: value,
    }));

    // Auto-generate photo preview for file upload
    if (field === 'photo' && value instanceof File) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setCreateForm(prev => ({ ...prev, photoPreview: e.target?.result as string }));
      };
      reader.readAsDataURL(value);
    }

    // Auto-update role based on position
    if (field === 'position') {
      setCreateForm(prev => ({ ...prev, role: getRoleFromPosition(value as PlayerPosition) }));
    }
  }, []);

  const handleCreatePlayer = async () => {
    // Validate required fields
    if (!createForm.name.trim() || !createForm.team.trim()) {
      toast.error('Player name and club are required');
      return;
    }

    // Parse numeric value from formatted string
    const basePriceValue = parseInt(createForm.basePrice.replace(/[,\.]/g, '')) || 0;
    if (!basePriceValue) {
      toast.error('Base price is required');
      return;
    }

    setIsCreating(true);
    try {
      const formData = new FormData();
      formData.append('name', createForm.name.trim());
      if (createForm.firstName.trim()) formData.append('firstName', createForm.firstName.trim());
      if (createForm.lastName.trim()) formData.append('lastName', createForm.lastName.trim());
      if (createForm.nationality.trim()) formData.append('nationality', createForm.nationality.trim());
      if (createForm.nationalityCode.trim()) formData.append('nationalityCode', createForm.nationalityCode.trim().toUpperCase());
      formData.append('position', createForm.position);
      formData.append('role', createForm.role);
      if (createForm.dateOfBirth) formData.append('dateOfBirth', createForm.dateOfBirth);
      formData.append('team', createForm.team.trim());
      if (createForm.league.trim()) formData.append('league', createForm.league.trim());
      formData.append('category', createForm.category);
      formData.append('basePrice', basePriceValue.toString());
      formData.append('currency', createForm.currency);
      if (createForm.photo) formData.append('photo', createForm.photo);

      const response = await fetch('/api/players/custom', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 409 && data.duplicate) {
          toast.error('Similar custom player already exists');
          return;
        }
        throw new Error(data.error || 'Failed to create custom player');
      }

      // Add the created player to the auction
      const newPlayer = data.player;
      await addPlayer(
        newPlayer,
        createForm.role as PlayerRole,
        parseInt(createForm.basePrice) || 0,
        createForm.currency
      );

      const newAdded = new Set(addedPlayers);
      newAdded.add(newPlayer.id);
      setAddedPlayers(newAdded);

      toast.success(`${newPlayer.name} created and added to auction`, {
        description: `${createForm.role} · ${formatCurrency(basePriceValue, createForm.currency)}`,
      });

      // Reset form and return to search
      setCreateForm({
        name: '',
        firstName: '',
        lastName: '',
        nationality: '',
        nationalityCode: '',
        position: 'CM',
        role: 'Midfielder',
        dateOfBirth: '',
        team: '',
        league: '',
        category: 'CURRENT',
        basePrice: '',
        currency: 'INR',
        photo: null,
        photoPreview: null,
      });
      setView('search');
    } catch {
      toast.error('Failed to create custom player');
    } finally {
      setIsCreating(false);
    }
  };

  const handleBackToSearch = () => {
    setView('search');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          'max-w-4xl w-[94vw] max-h-[90vh] p-0 gap-0 overflow-hidden rounded-3xl',
          'bg-popover/98 text-popover-foreground backdrop-blur-3xl border border-border shadow-2xl'
        )}
      >
        {view === 'search' ? (
          <div className="flex flex-col h-full max-h-[90vh]">
            {/* Header */}
            <DialogHeader className="p-6 pb-4 border-b border-border">
              <div className="flex items-start justify-between">
                <div>
                  <DialogTitle className="text-2xl font-heading font-bold text-foreground flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-[var(--gold)]" />
                    ADD PLAYER TO AUCTION
                  </DialogTitle>
                  <DialogDescription className="text-muted-foreground mt-1">
                    Search, select and configure a football player
                  </DialogDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setView('create')}
                    className="gap-2 text-sm font-medium px-4 py-2 border-[var(--gold)]/30 text-[var(--gold)] hover:bg-[var(--gold)]/10 transition-all"
                  >
                    <UserPlus className="h-4 w-4" />
                    Create Custom Player
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onOpenChange(false)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            </DialogHeader>

            {/* Search Input */}
            <div className="px-6 py-4">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  autoFocus
                  value={query}
                  onChange={(e) => handleQueryChange(e.target.value)}
                  placeholder="Search players..."
                  className={cn(
                    'pl-12 pr-4 py-6 text-base',
                    'bg-card border-input rounded-xl',
                    'focus:border-[var(--gold)]/50 focus:ring-1 focus:ring-[var(--gold)]/30',
                    'placeholder:text-muted-foreground/60'
                  )}
                />
                {isLoading && (
                  <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground animate-spin" />
                )}
              </div>
            </div>

            {/* Results */}
            <div className="flex-1 overflow-y-auto px-6 pb-6">
              {hasSearched && !isLoading && results.length === 0 && (
                <div className="text-center py-16">
                  <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                    <Search className="h-8 w-8 text-muted-foreground/50" />
                  </div>
                  <p className="text-lg font-semibold text-foreground mb-1">No players found</p>
                  <p className="text-sm text-muted-foreground">
                    We couldn&apos;t find a player matching &quot;{query}&quot;.
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Try another spelling or search term.
                  </p>
                </div>
              )}

              {results.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground mb-3">
                    {results.length} RESULT{results.length !== 1 ? 'S' : ''}
                  </p>
                  <AnimatePresence mode="popLayout">
                    {results.map((player, index) => {
                      const isAdded = addedPlayers.has(player.id);
                      return (
                        <motion.div
                          key={player.id}
                          layout
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -8 }}
                          transition={{ duration: 0.2, delay: Math.min(index * 0.03, 0.3) }}
                          className={cn(
                            'group relative flex items-center gap-4 p-3 rounded-xl',
                            'bg-card/70 border border-border',
                            'transition-all duration-200',
                            'hover:bg-muted hover:border-[var(--gold)]/30',
                            isAdded && 'opacity-60'
                          )}
                          style={{ minWidth: 0 }}
                        >
                          {/* Player Face */}
                          <div className="relative flex-shrink-0">
                            <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-muted border border-border">
                              <Image
                                src={player.photo}
                                alt={player.name}
                                fill
                                unoptimized={true}
                                className="object-cover object-top"
                                sizes="64px"
                              />
                            </div>
                          </div>

                          {/* Player Info */}
                          <div className="flex-1 min-w-0">
                            <h3 className="font-heading font-bold text-lg text-foreground truncate">
                              {player.name}
                            </h3>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-0.5 flex-wrap">
                              <CountryFlag
                                code={player.nationalityCode}
                                className="h-4 w-5 rounded-sm"
                              />
                              <span>{player.nationality}</span>
                              <span className="text-muted-foreground/40">·</span>
                              <span>{player.team}</span>
                              <span className="text-muted-foreground/40">·</span>
                              <span>{player.role}</span>
                              {player.category === 'RETIRED' && (
                                <>
                                  <span className="text-muted-foreground/40">·</span>
                                  <span className="text-muted-foreground/80">Retired</span>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Add Button */}
                          <div className="flex-shrink-0">
                            {isAdded ? (
                              <Button
                                disabled
                                size="sm"
                                className={cn(
                                  'gap-1.5 rounded-lg',
                                  'bg-[var(--emerald)]/20 text-[var(--emerald)]'
                                )}
                              >
                                <Check className="h-4 w-4" />
                                ADDED
                              </Button>
                            ) : (
                              <Button
                                onClick={() => handleAddClick(player)}
                                size="sm"
                                className={cn(
                                  'gap-1.5 rounded-lg font-semibold',
                                  'bg-[var(--gold)] hover:bg-[var(--gold)]/90 text-primary-foreground',
                                  'shadow-gold hover:shadow-gold-lg',
                                  'transition-all duration-200 hover:scale-105'
                                )}
                              >
                                <Plus className="h-4 w-4" />
                                ADD TO AUCTION
                              </Button>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              )}

              {!hasSearched && !isLoading && (
                <div className="text-center py-16">
                  <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                    <Sparkles className="h-8 w-8 text-[var(--gold)]/50" />
                  </div>
                  <p className="text-lg font-semibold text-foreground mb-1">Search the world&apos;s players</p>
                  <p className="text-sm text-muted-foreground">
                    Search by name to find players across football history
                  </p>
                </div>
              )}

              {/* Loading Skeletons */}
              {isLoading && (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center gap-4 p-3 rounded-xl bg-card border border-border animate-pulse">
                      <div className="w-16 h-16 rounded-lg bg-muted" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-muted rounded w-1/3" />
                        <div className="h-3 bg-muted rounded w-1/4" />
                      </div>
                      <div className="w-28 h-9 bg-muted rounded-lg" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : view === 'configure' ? (
          /* Configuration Step */
          <div className="flex flex-col h-full max-h-[90vh]">
            {/* Header */}
            <DialogHeader className="p-6 pb-4 border-b border-border">
              <div className="flex items-start justify-between">
                <DialogTitle className="text-xl font-heading font-bold text-foreground">
                  Configure Player
                </DialogTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setView('search')}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </DialogHeader>

            {/* Player Identity */}
            {selectedPlayer && (
              <div className="px-6 py-4 flex items-center gap-4 border-b border-border bg-muted/30">
                <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-muted border border-border flex-shrink-0">
                  <Image
                    src={selectedPlayer.photo}
                    alt={selectedPlayer.name}
                    fill
                    unoptimized={true}
                    className="object-cover object-top"
                    sizes="80px"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-heading font-bold text-xl text-foreground truncate">
                    {selectedPlayer.name}
                  </h3>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                    <CountryFlag
                      code={selectedPlayer.nationalityCode}
                      className="h-4 w-5 rounded-sm"
                    />
                    <span>{selectedPlayer.nationality}</span>
                    <span className="text-muted-foreground/40">·</span>
                    <span>{selectedPlayer.role}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Configuration Form */}
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-foreground uppercase tracking-wide">
                  Auction Role
                </Label>
                <Select value={configRole} onValueChange={(v) => setConfigRole(v as PlayerRole)}>
                  <SelectTrigger className="bg-card border-input focus:border-[var(--gold)]/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    {ROLE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold text-foreground uppercase tracking-wide">
                  Base Price
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">
                    {CURRENCY_SYMBOLS[configCurrency]}
                  </span>
                  <Input
                    type="number"
                    value={configPrice}
                    onChange={(e) => setConfigPrice(e.target.value)}
                    className="pl-8 bg-card border-input focus:border-[var(--gold)]/50"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold text-foreground uppercase tracking-wide">
                  Currency
                </Label>
                <Select value={configCurrency} onValueChange={(v) => setConfigCurrency(v as Currency)}>
                  <SelectTrigger className="bg-card border-input focus:border-[var(--gold)]/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    {CURRENCY_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-border flex items-center justify-end gap-3">
              <Button
                variant="ghost"
                onClick={() => setView('search')}
                className="text-muted-foreground hover:text-foreground"
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmAdd}
                disabled={isAdding}
                className={cn(
                  'gap-2 rounded-lg font-semibold px-6',
                  'bg-[var(--gold)] hover:bg-[var(--gold)]/90 text-primary-foreground',
                  'shadow-gold hover:shadow-gold-lg',
                  'transition-all duration-200 hover:scale-105'
                )}
              >
                {isAdding ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                ADD PLAYER
              </Button>
            </div>
          </div>
        ) : (
          /* Create Custom Player Step */
          <div className="flex flex-col h-full max-h-[90vh]">
            {/* Header */}
            <DialogHeader className="p-6 pb-4 border-b border-border">
              <div className="flex items-start justify-between">
                <DialogTitle className="text-xl font-heading font-bold text-foreground">
                  Create Custom Player
                </DialogTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleBackToSearch}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </DialogHeader>

            {/* Creation Form */}
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
              {/* Photo Upload */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-foreground uppercase tracking-wide">
                  Player Photo
                </Label>
                <div className="relative">
                  <div className="flex items-center justify-center">
                    <div className="relative w-32 h-32 rounded-xl overflow-hidden bg-muted border border-border">
                      {createForm.photoPreview ? (
                        <img
                          src={createForm.photoPreview}
                          alt="Preview"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground/50">
                          <ImageIcon className="h-8 w-8 mb-2" />
                          <span className="text-xs">No photo</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <input
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    onChange={(e) => e.target.files?.[0] && handleCreateFormChange('photo', e.target.files[0])}
                    className="hidden"
                    id="photo-upload"
                  />
                  <div className="flex items-center justify-center gap-3 mt-3">
                    <Button
                      variant="outline"
                      onClick={() => document.getElementById('photo-upload')?.click()}
                      className="gap-2"
                    >
                      <ImageIcon className="h-4 w-4" />
                      Upload Photo
                    </Button>
                    {createForm.photoPreview && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCreateFormChange('photo', null)}
                        className="text-destructive hover:text-destructive"
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground/60 text-center mt-1">
                    JPG, PNG, or WEBP · Max 5MB
                  </p>
                </div>
              </div>

              {/* Name Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-foreground uppercase tracking-wide">
                    Full Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    value={createForm.name}
                    onChange={(e) => handleCreateFormChange('name', e.target.value)}
                    placeholder="e.g., Lionel Messi"
                    className="bg-card border-input focus:border-[var(--gold)]/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-foreground uppercase tracking-wide">
                    First Name
                  </Label>
                  <Input
                    value={createForm.firstName}
                    onChange={(e) => handleCreateFormChange('firstName', e.target.value)}
                    placeholder="e.g., Lionel"
                    className="bg-card border-input focus:border-[var(--gold)]/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-foreground uppercase tracking-wide">
                    Last Name
                  </Label>
                  <Input
                    value={createForm.lastName}
                    onChange={(e) => handleCreateFormChange('lastName', e.target.value)}
                    placeholder="e.g., Messi"
                    className="bg-card border-input focus:border-[var(--gold)]/50"
                  />
                </div>
              </div>

              {/* Nationality */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-foreground uppercase tracking-wide">
                  Nationality
                </Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    value={createForm.nationality}
                    onChange={(e) => handleCreateFormChange('nationality', e.target.value)}
                    placeholder="e.g., Argentina"
                    className="bg-card border-input focus:border-[var(--gold)]/50"
                  />
                  <Input
                    value={createForm.nationalityCode}
                    onChange={(e) => handleCreateFormChange('nationalityCode', e.target.value.toUpperCase())}
                    placeholder="ISO Code (e.g., ARG)"
                    maxLength={2}
                    className="bg-card border-input focus:border-[var(--gold)]/50 text-uppercase"
                  />
                </div>
              </div>

              {/* Position & Role */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-foreground uppercase tracking-wide">
                    Position <span className="text-destructive">*</span>
                  </Label>
                  <Select value={createForm.position} onValueChange={(v) => handleCreateFormChange('position', v as PlayerPosition)}>
                    <SelectTrigger className="bg-card border-input focus:border-[var(--gold)]/50">
                      <SelectValue placeholder="Select position" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border">
                      <SelectItem value="GK">GK - Goalkeeper</SelectItem>
                      <SelectItem value="CB">CB - Centre Back</SelectItem>
                      <SelectItem value="LB">LB - Left Back</SelectItem>
                      <SelectItem value="RB">RB - Right Back</SelectItem>
                      <SelectItem value="CDM">CDM - Defensive Midfielder</SelectItem>
                      <SelectItem value="CM">CM - Central Midfielder</SelectItem>
                      <SelectItem value="CAM">CAM - Attacking Midfielder</SelectItem>
                      <SelectItem value="LM">LM - Left Midfielder</SelectItem>
                      <SelectItem value="RM">RM - Right Midfielder</SelectItem>
                      <SelectItem value="LW">LW - Left Winger</SelectItem>
                      <SelectItem value="RW">RW - Right Winger</SelectItem>
                      <SelectItem value="ST">ST - Striker</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-foreground uppercase tracking-wide">
                    Auction Role <span className="text-destructive">*</span>
                  </Label>
                  <Select value={createForm.role} onValueChange={(v) => handleCreateFormChange('role', v as PlayerRole)}>
                    <SelectTrigger className="bg-card border-input focus:border-[var(--gold)]/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border">
                      {ROLE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Date of Birth */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-foreground uppercase tracking-wide">
                  Date of Birth
                </Label>
                <Input
                  type="date"
                  value={createForm.dateOfBirth}
                  onChange={(e) => handleCreateFormChange('dateOfBirth', e.target.value)}
                  className="bg-card border-input focus:border-[var(--gold)]/50"
                  max={new Date().toISOString().split('T')[0]}
                />
              </div>

              {/* Team & League */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-foreground uppercase tracking-wide">
                    Club <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    value={createForm.team}
                    onChange={(e) => handleCreateFormChange('team', e.target.value)}
                    placeholder="e.g., Paris Saint-Germain"
                    className="bg-card border-input focus:border-[var(--gold)]/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-foreground uppercase tracking-wide">
                    League
                  </Label>
                  <Input
                    value={createForm.league}
                    onChange={(e) => handleCreateFormChange('league', e.target.value)}
                    placeholder="e.g., Ligue 1"
                    className="bg-card border-input focus:border-[var(--gold)]/50"
                  />
                </div>
              </div>

              {/* Category */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-foreground uppercase tracking-wide">
                  Category
                </Label>
                <Select value={createForm.category} onValueChange={(v) => handleCreateFormChange('category', v as PlayerCategory)}>
                  <SelectTrigger className="bg-card border-input focus:border-[var(--gold)]/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key as PlayerCategory} className="flex items-center gap-2">
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: CATEGORY_COLORS[key as PlayerCategory] }}
                        />
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Base Price & Currency */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-foreground uppercase tracking-wide">
                    Base Price <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">
                      {CURRENCY_SYMBOLS[createForm.currency]}
                    </span>
                    <Input
                      type="text"
                      value={createForm.basePrice ? parseInt(createForm.basePrice).toLocaleString(CURRENCY_LOCALES[createForm.currency]) : ''}
                      onChange={(e) => {
                        const numericValue = parseInt(e.target.value.replace(/[,\.]/g, '')) || 0;
                        handleCreateFormChange('basePrice', numericValue.toString());
                      }}
                      onBlur={(e) => {
                        const numericValue = parseInt(e.target.value.replace(/[,\.]/g, '')) || 0;
                        handleCreateFormChange('basePrice', numericValue.toString());
                        const locale = CURRENCY_LOCALES[createForm.currency];
                        e.target.value = numericValue.toLocaleString(locale);
                      }}
                      onFocus={(e) => {
                        e.target.value = e.target.value.replace(/[,\.]/g, '');
                      }}
                      placeholder="e.g., 1,50,00,000"
                      className="pl-8 bg-card border-input focus:border-[var(--gold)]/50 text-right font-mono tabular-nums"
                      inputMode="numeric"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-foreground uppercase tracking-wide">
                    Currency
                  </Label>
                  <Select value={createForm.currency} onValueChange={(v) => handleCreateFormChange('currency', v as Currency)}>
                    <SelectTrigger className="bg-card border-input focus:border-[var(--gold)]/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border">
                      {CURRENCY_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-border flex items-center justify-end gap-3">
              <Button
                variant="ghost"
                onClick={handleBackToSearch}
                className="text-muted-foreground hover:text-foreground"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreatePlayer}
                disabled={isCreating}
                className={cn(
                  'gap-2 rounded-lg font-semibold px-6',
                  'bg-[var(--gold)] hover:bg-[var(--gold)]/90 text-primary-foreground',
                  'shadow-gold hover:shadow-gold-lg',
                  'transition-all duration-200 hover:scale-105'
                )}
              >
                {isCreating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <UserPlus className="h-4 w-4" />
                )}
                CREATE PLAYER
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}