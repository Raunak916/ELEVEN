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
import { Player, PlayerRole, Currency, CURRENCY_SYMBOLS, PlayerPosition, PlayerCategory } from '@/lib/types';
import { getPlayerDataProvider } from '@/lib/player-provider';
import { formatCurrency, CATEGORY_COLORS, CATEGORY_LABELS, getRoleFromPosition } from '@/lib/utils';
import { CountryFlag } from '@/components/ui/country-flag';
import { cn } from '@/lib/utils';
import { useMysteryPotStore } from '@/lib/mystery-pot-store';
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

interface AddMysteryPlayerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  potId: string;
  potTitle: string;
}

type ViewState = 'search' | 'configure' | 'create';

export function AddMysteryPlayerModal({
  open,
  onOpenChange,
  potId,
  potTitle,
}: AddMysteryPlayerModalProps) {
  const { addPlayerToPot } = useMysteryPotStore();

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
  const [configuredRole, setConfiguredRole] = useState<PlayerRole>('Midfielder');
  const [configuredPrice, setConfiguredPrice] = useState('0');
  const [configuredCurrency, setConfiguredCurrency] = useState<Currency>('INR');

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (open) {
      setQuery('');
      setResults([]);
      setHasSearched(false);
      setView('search');
      setSelectedPlayer(null);
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
    }
  }, [open]);

  // Debounced search
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
      const searchResults = await provider.searchPlayers(searchQuery);
      setResults(searchResults);
    } catch (error) {
      console.error('Search error:', error);
      toast.error('Failed to search players');
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      performSearch(value);
    }, 300);
  };

  const handleSelectPlayer = (player: Player) => {
    setSelectedPlayer(player);
    setConfiguredRole(player.role);
    setConfiguredPrice('0');
    setConfiguredCurrency('INR');
    setView('configure');
  };

  const handleAddConfiguredPlayer = () => {
    if (!selectedPlayer) return;

    const basePrice = parseInt(configuredPrice, 10) || 0;
    addPlayerToPot(potId, selectedPlayer, configuredRole, basePrice, configuredCurrency);

    toast.success(`Added mystery player to ${potTitle} (Unrevealed)`);
    onOpenChange(false);
  };

  const handleCreateAndAddPlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.name.trim() || !createForm.nationality.trim()) {
      toast.error('Name and Nationality are required');
      return;
    }

    setIsCreating(true);
    try {
      let photoUrl = '/placeholder-player.png';
      if (createForm.photo) {
        const formData = new FormData();
        formData.append('file', createForm.photo);
        const res = await fetch('/api/players/custom', {
          method: 'POST',
          body: formData,
        });
        if (res.ok) {
          const data = await res.json();
          photoUrl = data.url || photoUrl;
        }
      }

      const customPlayer: Player = {
        id: `custom-${Date.now()}`,
        name: createForm.name.trim(),
        firstName: createForm.firstName.trim() || createForm.name.trim(),
        lastName: createForm.lastName.trim(),
        nationality: createForm.nationality.trim(),
        nationalityCode: createForm.nationalityCode.trim().toUpperCase() || 'XX',
        position: createForm.position,
        role: createForm.role,
        dateOfBirth: createForm.dateOfBirth || '2000-01-01',
        photo: photoUrl,
        team: createForm.team.trim() || 'Free Agent',
        league: createForm.league.trim() || 'Custom',
        category: createForm.category,
        source: 'custom',
      };

      const basePrice = parseInt(createForm.basePrice, 10) || 0;
      addPlayerToPot(potId, customPlayer, customPlayer.role, basePrice, createForm.currency);

      toast.success(`Added custom mystery player to ${potTitle} (Unrevealed)`);
      onOpenChange(false);
    } catch (err) {
      toast.error('Failed to create mystery player');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl bg-card border-border/40 p-0 overflow-hidden rounded-3xl shadow-2xl z-50">
        <DialogHeader className="p-6 pb-4 border-b border-border/40 bg-gradient-to-r from-blue-950/40 via-card to-cyan-950/20">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="font-heading font-black text-xl text-foreground flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-cyan-400" />
                <span>Add Mystery Player to {potTitle}</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Player will be added as a classified, unrevealed card in this pot.
              </DialogDescription>
            </div>

            {view !== 'search' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setView('search')}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Back to Search
              </Button>
            )}
          </div>
        </DialogHeader>

        {/* 1. Search View */}
        {view === 'search' && (
          <div className="p-6 flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={handleQueryChange}
                  placeholder="Search player by name (e.g. Messi, Haaland, Zidane)..."
                  className="pl-10 h-11 rounded-2xl bg-muted/30 border-border/40 focus:border-cyan-400"
                  autoFocus
                />
                {isLoading && (
                  <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-cyan-400" />
                )}
              </div>

              <Button
                variant="outline"
                onClick={() => setView('create')}
                className="h-11 rounded-2xl gap-1.5 px-4 font-mono font-bold text-xs"
              >
                <Plus className="h-4 w-4" />
                <span>Custom</span>
              </Button>
            </div>

            {/* Results list */}
            <div className="max-h-[380px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              {results.length > 0 ? (
                results.map((player) => (
                  <div
                    key={player.id}
                    onClick={() => handleSelectPlayer(player)}
                    className="flex items-center justify-between p-3 rounded-2xl bg-muted/20 hover:bg-muted/50 border border-border/30 hover:border-cyan-400/50 cursor-pointer transition-all group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative w-11 h-11 rounded-xl bg-black/40 overflow-hidden flex-shrink-0 border border-border/40">
                        {player.photo ? (
                          <Image src={player.photo} alt={player.name} fill className="object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center font-bold text-xs">
                            {player.name.charAt(0)}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-heading font-bold text-sm text-foreground truncate">
                            {player.name}
                          </p>
                          <CountryFlag code={player.nationalityCode} />
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {player.position} • {player.team} ({player.league})
                        </p>
                      </div>
                    </div>

                    <Button
                      size="sm"
                      className="rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <span>Select</span>
                    </Button>
                  </div>
                ))
              ) : hasSearched && !isLoading ? (
                <div className="py-12 text-center text-muted-foreground flex flex-col items-center justify-center gap-2">
                  <Search className="h-6 w-6 text-muted-foreground/40" />
                  <p className="text-xs font-mono">No players found matching "{query}"</p>
                  <Button
                    variant="link"
                    size="sm"
                    onClick={() => setView('create')}
                    className="text-cyan-400 text-xs"
                  >
                    Create as Custom Player instead
                  </Button>
                </div>
              ) : (
                <div className="py-10 text-center text-muted-foreground flex flex-col items-center justify-center gap-1">
                  <p className="text-xs font-mono">Type a player name to search across the database</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 2. Configure View */}
        {view === 'configure' && selectedPlayer && (
          <div className="p-6 flex flex-col gap-5">
            <div className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-muted/20 border border-border/40">
              <div className="relative w-14 h-14 rounded-xl bg-black/40 overflow-hidden flex-shrink-0 border border-border/40">
                {selectedPlayer.photo && (
                  <Image src={selectedPlayer.photo} alt={selectedPlayer.name} fill className="object-cover" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="font-heading font-black text-base text-foreground truncate">
                  {selectedPlayer.name}
                </h4>
                <p className="text-xs text-muted-foreground">
                  {selectedPlayer.position} • {selectedPlayer.nationality} • {selectedPlayer.team}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-mono text-muted-foreground block mb-1.5">Auction Role</Label>
                <Select value={configuredRole} onValueChange={(val) => setConfiguredRole(val as PlayerRole)}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Select Role" />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-mono text-muted-foreground block mb-1.5">Base Price</Label>
                <Input
                  type="number"
                  min="0"
                  step="50000"
                  value={configuredPrice}
                  onChange={(e) => setConfiguredPrice(e.target.value)}
                  className="rounded-xl font-mono"
                  placeholder="0"
                />
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-xs font-mono text-cyan-300 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-cyan-400 flex-shrink-0" />
              <span>This player will be added as an unrevealed mystery card into {potTitle}.</span>
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <Button variant="ghost" onClick={() => setView('search')} className="rounded-xl text-xs">
                Cancel
              </Button>
              <Button
                onClick={handleAddConfiguredPlayer}
                className="bg-cyan-500 hover:bg-cyan-400 text-black font-heading font-black text-xs uppercase tracking-wider rounded-xl px-6"
              >
                Add to {potTitle}
              </Button>
            </div>
          </div>
        )}

        {/* 3. Custom Player Create View */}
        {view === 'create' && (
          <form onSubmit={handleCreateAndAddPlayer} className="p-6 flex flex-col gap-4 max-h-[460px] overflow-y-auto">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label className="text-xs font-mono text-muted-foreground block mb-1">Player Full Name *</Label>
                <Input
                  required
                  placeholder="e.g. Cristiano Ronaldo"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  className="rounded-xl text-xs"
                />
              </div>

              <div>
                <Label className="text-xs font-mono text-muted-foreground block mb-1">Nationality *</Label>
                <Input
                  required
                  placeholder="e.g. Portugal"
                  value={createForm.nationality}
                  onChange={(e) => setCreateForm({ ...createForm, nationality: e.target.value })}
                  className="rounded-xl text-xs"
                />
              </div>

              <div>
                <Label className="text-xs font-mono text-muted-foreground block mb-1">Country Code (2 letters)</Label>
                <Input
                  maxLength={2}
                  placeholder="e.g. PT"
                  value={createForm.nationalityCode}
                  onChange={(e) => setCreateForm({ ...createForm, nationalityCode: e.target.value.toUpperCase() })}
                  className="rounded-xl text-xs uppercase font-mono"
                />
              </div>

              <div>
                <Label className="text-xs font-mono text-muted-foreground block mb-1">Role</Label>
                <Select value={createForm.role} onValueChange={(val) => setCreateForm({ ...createForm, role: val as PlayerRole })}>
                  <SelectTrigger className="rounded-xl text-xs">
                    <SelectValue placeholder="Role" />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTIONS.map((r) => (
                      <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-mono text-muted-foreground block mb-1">Base Price</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={createForm.basePrice}
                  onChange={(e) => setCreateForm({ ...createForm, basePrice: e.target.value })}
                  className="rounded-xl text-xs font-mono"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <Button type="button" variant="ghost" onClick={() => setView('search')} className="rounded-xl text-xs">
                Back
              </Button>
              <Button
                type="submit"
                disabled={isCreating}
                className="bg-cyan-500 hover:bg-cyan-400 text-black font-heading font-black text-xs uppercase tracking-wider rounded-xl px-6"
              >
                {isCreating ? 'Saving...' : `Add Mystery Player to ${potTitle}`}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
