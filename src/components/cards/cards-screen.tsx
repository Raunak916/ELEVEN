'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AppLayout } from '@/components/layout/app-layout';
import { CoverflowCarousel } from './coverflow-carousel';
import { CustomAuctionCard } from './cards-data';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import {
  Zap,
  Flame,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  ListPlus,
  FileText,
  X,
  Layers,
  Pencil,
  Check,
  UserPlus,
  Shield,
  Tag,
  Users,
  CheckCircle2,
} from 'lucide-react';
import { firePlayerRevealConfetti } from '@/lib/confetti';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useAuctionStore } from '@/lib/auction-store';

const STORAGE_POWER_KEY = 'football-auction-power-cards-v2';
const STORAGE_SICK_KEY = 'football-auction-sick-cards-v2';

export function CardsScreen() {
  const [activeTab, setActiveTab] = useState<'power' | 'sick'>('power');

  // Teams from auction store
  const teams = useAuctionStore((state) => state.teams);

  // Card states for Power Cards and Sick Cards with persistence
  const [powerCards, setPowerCards] = useState<CustomAuctionCard[]>([]);
  const [sickCards, setSickCards] = useState<CustomAuctionCard[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);

  // Form input state
  const [inputText, setInputText] = useState('');
  const [inputNumber, setInputNumber] = useState<string>('');
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkText, setBulkText] = useState('');

  // Edit card state
  const [editingCard, setEditingCard] = useState<CustomAuctionCard | null>(null);
  const [editText, setEditText] = useState('');
  const [editNumber, setEditNumber] = useState<string>('');

  // Assign card state
  const [assigningCard, setAssigningCard] = useState<CustomAuctionCard | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [customTeamName, setCustomTeamName] = useState<string>('');

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const savedPower = localStorage.getItem(STORAGE_POWER_KEY);
      if (savedPower) {
        const parsed = JSON.parse(savedPower);
        if (Array.isArray(parsed)) {
          setPowerCards(parsed);
        }
      }
      const savedSick = localStorage.getItem(STORAGE_SICK_KEY);
      if (savedSick) {
        const parsed = JSON.parse(savedSick);
        if (Array.isArray(parsed)) {
          setSickCards(parsed);
        }
      }
    } catch (err) {
      console.warn('Failed to load cards from localStorage:', err);
    } finally {
      setIsHydrated(true);
    }
  }, []);

  // Save to localStorage when powerCards change
  useEffect(() => {
    if (isHydrated) {
      try {
        localStorage.setItem(STORAGE_POWER_KEY, JSON.stringify(powerCards));
      } catch (err) {
        console.warn('Failed to save power cards to localStorage:', err);
      }
    }
  }, [powerCards, isHydrated]);

  // Save to localStorage when sickCards change
  useEffect(() => {
    if (isHydrated) {
      try {
        localStorage.setItem(STORAGE_SICK_KEY, JSON.stringify(sickCards));
      } catch (err) {
        console.warn('Failed to save sick cards to localStorage:', err);
      }
    }
  }, [sickCards, isHydrated]);

  // Broadcast cards to active room whenever powerCards or sickCards change
  useEffect(() => {
    if (!isHydrated) return;
    try {
      const roomState = JSON.parse(localStorage.getItem('football-auction-room-v1') || '{}');
      const code = roomState?.state?.hostedRoom?.code || roomState?.state?.createdCode;
      if (!code) return;

      fetch('/api/rooms/cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          powerCards,
          sickCards,
        }),
      }).catch(() => {});
    } catch {}
  }, [powerCards, sickCards, isHydrated]);

  const currentCards = activeTab === 'power' ? powerCards : sickCards;
  const setCards = activeTab === 'power' ? setPowerCards : setSickCards;

  // Next suggested number
  const nextNum = currentCards.length > 0 ? Math.max(...currentCards.map((c) => c.number)) + 1 : 1;

  // Toggle individual card flip
  const handleToggleFlip = useCallback(
    (cardId: string) => {
      setCards((prev) =>
        prev.map((c) => {
          if (c.id === cardId) {
            const nextFlip = !c.isFlipped;
            if (nextFlip) {
              firePlayerRevealConfetti();
            }
            return { ...c, isFlipped: nextFlip };
          }
          return c;
        })
      );
    },
    [setCards]
  );

  // Add a new card
  const handleAddCard = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed) return;

    const num = inputNumber.trim() ? parseInt(inputNumber.trim(), 10) : nextNum;

    const newCard: CustomAuctionCard = {
      id: `card-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      number: isNaN(num) ? nextNum : num,
      text: trimmed,
      category: activeTab,
      isFlipped: false,
      assignedTeamId: null,
      assignedTeamName: null,
    };

    setCards((prev) => [...prev, newCard]);
    setInputText('');
    setInputNumber('');
    toast.success(`Card #${newCard.number} added`);
  };

  // Bulk add multiple cards (one per line)
  const handleBulkAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const lines = bulkText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length > 0) {
      let startNumber = nextNum;
      const newBatch: CustomAuctionCard[] = lines.map((line) => {
        const card: CustomAuctionCard = {
          id: `card-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          number: startNumber++,
          text: line,
          category: activeTab,
          isFlipped: false,
          assignedTeamId: null,
          assignedTeamName: null,
        };
        return card;
      });

      setCards((prev) => [...prev, ...newBatch]);
      setBulkText('');
      setShowBulkModal(false);
      toast.success(`Added ${newBatch.length} cards to the deck`);
    }
  };

  // Edit card
  const handleStartEdit = (card: CustomAuctionCard) => {
    setEditingCard(card);
    setEditText(card.text);
    setEditNumber(String(card.number));
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCard) return;
    const trimmed = editText.trim();
    if (!trimmed) return;

    const num = editNumber.trim() ? parseInt(editNumber.trim(), 10) : editingCard.number;
    const updatedNum = isNaN(num) ? editingCard.number : num;

    setCards((prev) =>
      prev.map((c) =>
        c.id === editingCard.id
          ? { ...c, text: trimmed, number: updatedNum }
          : c
      )
    );

    toast.success(`Card #${updatedNum} updated & saved`);
    setEditingCard(null);
  };

  // Assign card
  const handleStartAssign = (card: CustomAuctionCard) => {
    setAssigningCard(card);
    setSelectedTeamId(card.assignedTeamId || '');
    setCustomTeamName(card.assignedTeamName || '');
  };

  const handleSaveAssignment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assigningCard) return;

    let targetTeamName: string | null = null;
    let targetTeamId: string | null = null;

    if (selectedTeamId === '__UNASSIGN__') {
      targetTeamId = null;
      targetTeamName = null;
    } else if (selectedTeamId === '__CUSTOM__') {
      const trimmed = customTeamName.trim();
      targetTeamId = trimmed ? `custom-${Date.now()}` : null;
      targetTeamName = trimmed || null;
    } else if (selectedTeamId) {
      const found = teams.find((t) => t.id === selectedTeamId);
      if (found) {
        targetTeamId = found.id;
        targetTeamName = found.name;
      }
    }

    setCards((prev) =>
      prev.map((c) =>
        c.id === assigningCard.id
          ? { ...c, assignedTeamId: targetTeamId, assignedTeamName: targetTeamName }
          : c
      )
    );

    if (targetTeamName) {
      toast.success(`Card #${assigningCard.number} assigned to ${targetTeamName}`);
    } else {
      toast.info(`Card #${assigningCard.number} is now unassigned`);
    }

    setAssigningCard(null);
  };

  // Remove individual card
  const handleRemoveCard = (cardId: string) => {
    setCards((prev) => prev.filter((c) => c.id !== cardId));
    toast.info('Card removed from deck');
  };

  // Flip All / Reveal All
  const handleRevealAll = () => {
    setCards((prev) => prev.map((c) => ({ ...c, isFlipped: true })));
    firePlayerRevealConfetti();
    toast.success('Revealed all cards');
  };

  // Hide All / Invert All to mystery numbers
  const handleHideAll = () => {
    setCards((prev) => prev.map((c) => ({ ...c, isFlipped: false })));
    toast.info('Hidden all cards');
  };

  // Clear All Cards
  const handleClearAll = () => {
    setCards([]);
    toast.info('Deck cleared');
  };

  return (
    <AppLayout>
      <div className="space-y-8 max-w-[1600px] mx-auto pb-16">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl sm:text-4xl font-heading font-black tracking-tight flex items-center select-none">
              <span className="text-foreground">AUCTION</span>
              <span className="text-primary font-black ml-3">CARDS</span>
            </h1>
            <span className="px-3 py-1 rounded-md text-xs font-bold tracking-wider uppercase bg-primary/10 text-primary border border-primary/20">
              Auto-Saved Decks
            </span>
          </div>

          {/* Quick Deck Actions */}
          <div className="flex items-center gap-2.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleHideAll}
              className="text-xs sm:text-sm font-semibold gap-2 h-9 px-4 bg-card/60 hover:bg-muted"
              title="Invert all cards to mystery number side"
            >
              <EyeOff className="w-4 h-4 text-muted-foreground" />
              Hide All
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleRevealAll}
              className="text-xs sm:text-sm font-semibold gap-2 h-9 px-4 bg-card/60 hover:bg-muted"
              title="Reveal all cards"
            >
              <Eye className="w-4 h-4 text-muted-foreground" />
              Reveal All
            </Button>
          </div>
        </div>

        {/* Tab Selection Bar: POWER CARDS vs SICK CARDS */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/30 pb-4">
          <div className="flex items-center gap-3 p-1.5 rounded-2xl glass border border-sidebar-border">
            {/* Power Cards Tab */}
            <button
              type="button"
              onClick={() => setActiveTab('power')}
              className={cn(
                'flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-sm font-heading font-black uppercase tracking-wider transition-all duration-300',
                activeTab === 'power'
                  ? 'bg-primary text-primary-foreground shadow-gold'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
              )}
            >
              <Zap className="w-4 h-4" />
              <span>Power Cards</span>
              <span
                className={cn(
                  'px-2 py-0.5 rounded-md text-xs font-mono font-bold',
                  activeTab === 'power'
                    ? 'bg-black/30 text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                )}
              >
                {powerCards.length}
              </span>
            </button>

            {/* Sick Cards Tab */}
            <button
              type="button"
              onClick={() => setActiveTab('sick')}
              className={cn(
                'flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-sm font-heading font-black uppercase tracking-wider transition-all duration-300',
                activeTab === 'sick'
                  ? 'bg-gradient-to-r from-rose-500 via-pink-500 to-purple-600 text-white shadow-[0_0_20px_rgba(244,63,94,0.4)]'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
              )}
            >
              <Flame className="w-4 h-4 text-rose-300" />
              <span>Sick Cards</span>
              <span
                className={cn(
                  'px-2 py-0.5 rounded-md text-xs font-mono font-bold',
                  activeTab === 'sick'
                    ? 'bg-black/30 text-white'
                    : 'bg-muted text-muted-foreground'
                )}
              >
                {sickCards.length}
              </span>
            </button>
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Click any card to flip & reveal perk</span>
          </div>
        </div>

        {/* 3D Coverflow Carousel Stage */}
        <div className="relative rounded-3xl glass p-3 sm:p-6 border border-sidebar-border overflow-hidden shadow-2xl">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            >
              <CoverflowCarousel
                cards={currentCards}
                onToggleFlip={handleToggleFlip}
              />
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Manage Cards Section - Full-Width Row Architecture */}
        <Card className="glass border-sidebar-border shadow-2xl">
          <CardHeader className="py-5 px-6 sm:px-8 border-b border-border/40 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="font-heading text-xl sm:text-2xl font-black text-foreground flex items-center gap-2.5">
                <Layers className="w-6 h-6 text-primary" />
                Manage {activeTab === 'power' ? 'Power Cards' : 'Sick Cards'} Deck
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Add, edit, assign to clubs, or customize cards in this deck. All updates save automatically.
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowBulkModal(!showBulkModal)}
                className="text-xs sm:text-sm font-bold gap-2 h-10 px-4"
              >
                <ListPlus className="w-4 h-4 text-primary" />
                Bulk Paste
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleClearAll}
                className="text-xs sm:text-sm font-bold gap-2 h-10 px-4 hover:text-destructive hover:border-destructive/40"
              >
                <Trash2 className="w-4 h-4" />
                Clear All
              </Button>
            </div>
          </CardHeader>

          <CardContent className="p-6 sm:p-8 space-y-6">
            {/* Quick Add Single Card Form */}
            <form onSubmit={handleAddCard} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="w-full sm:w-32 shrink-0">
                <Input
                  type="number"
                  placeholder={`#${nextNum}`}
                  value={inputNumber}
                  onChange={(e) => setInputNumber(e.target.value)}
                  className="h-12 text-center font-mono font-black bg-card/60 border-input text-base sm:text-lg"
                />
              </div>

              <div className="flex-1">
                <Input
                  type="text"
                  placeholder={
                    activeTab === 'power'
                      ? 'e.g. +€15M Budget Bonus, Double Captain Points, Free Defender...'
                      : 'e.g. 60s Auction Freeze, Sudden Death 10s Countdown, -€10M Fine...'
                  }
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  className="h-12 bg-card/60 border-input text-base text-foreground focus:border-primary px-4"
                />
              </div>

              <Button
                type="submit"
                disabled={!inputText.trim()}
                className="h-12 px-7 font-heading font-black text-sm bg-primary text-primary-foreground hover:bg-primary/90 shadow-gold shrink-0 gap-2 uppercase tracking-wider"
              >
                <Plus className="w-4 h-4" />
                Add Card
              </Button>
            </form>

            {/* Bulk Paste Sub-Panel */}
            <AnimatePresence>
              {showBulkModal && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="p-5 rounded-2xl bg-card/80 border border-border space-y-3 shadow-lg"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-base font-bold text-foreground flex items-center gap-2">
                      <FileText className="w-4.5 h-4.5 text-primary" />
                      Bulk paste cards (one power/disadvantage per line)
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowBulkModal(false)}
                      className="text-muted-foreground hover:text-foreground p-1 rounded-lg"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <textarea
                    rows={4}
                    value={bulkText}
                    onChange={(e) => setBulkText(e.target.value)}
                    placeholder={`+€10M Budget Bonus\nFree Defender Pick\nScout Next 3 Players`}
                    className="w-full text-base font-mono bg-card border border-input rounded-xl p-4 text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                  />
                  <div className="flex justify-end gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowBulkModal(false)}
                      className="text-sm font-semibold px-4 h-9"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleBulkAdd}
                      disabled={!bulkText.trim()}
                      className="bg-primary text-primary-foreground text-sm font-bold px-5 h-9"
                    >
                      Add All Cards
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* List of Current Cards - Full-Width Row Architecture */}
            <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1.5 scrollbar-thin">
              {currentCards.length === 0 ? (
                <div className="text-center py-14 text-muted-foreground text-base">
                  No cards in this deck yet. Type an entry above or click &quot;Bulk Paste&quot; to add cards.
                </div>
              ) : (
                <div className="flex flex-col space-y-3">
                  {currentCards.map((card) => (
                    <div
                      key={card.id}
                      className={cn(
                        'flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 sm:p-5 rounded-2xl border transition-all duration-200 shadow-sm hover:shadow-md',
                        card.isFlipped
                          ? 'bg-card/80 border-border/80 hover:border-primary/50'
                          : 'bg-card/40 border-border/40 hover:border-border/70'
                      )}
                    >
                      {/* Left: Number + Text + Assignment Indicator */}
                      <div className="flex items-start sm:items-center gap-4 min-w-0 flex-1">
                        <span
                          className={cn(
                            'w-12 h-12 rounded-2xl font-mono text-lg font-black flex items-center justify-center shrink-0 shadow-inner',
                            activeTab === 'power'
                              ? 'bg-[var(--gold)]/15 border border-[var(--gold)]/30 text-[var(--gold)]'
                              : 'bg-rose-500/15 border border-rose-500/30 text-rose-400'
                          )}
                        >
                          #{card.number}
                        </span>

                        <div className="min-w-0 flex-1 space-y-1.5">
                          <p
                            className="text-base sm:text-lg font-bold text-foreground leading-snug tracking-tight"
                            title={card.text}
                          >
                            {card.text}
                          </p>

                          <div className="flex items-center gap-2.5 flex-wrap">
                            {/* Assigned Team badge */}
                            {card.assignedTeamName ? (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs sm:text-sm font-semibold">
                                <Shield className="w-3.5 h-3.5 text-emerald-400" />
                                <span>
                                  Assigned to:{' '}
                                  <strong className="font-black text-emerald-300">
                                    {card.assignedTeamName}
                                  </strong>
                                </span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-muted/40 text-muted-foreground text-xs font-medium">
                                <Tag className="w-3 h-3 opacity-60" />
                                <span>Unassigned</span>
                              </span>
                            )}

                            {/* Status */}
                            {card.isFlipped ? (
                              <span className="inline-flex items-center gap-1 text-xs font-mono text-emerald-400 font-bold">
                                <Check className="w-3.5 h-3.5" /> Revealed
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-xs font-mono text-muted-foreground">
                                <EyeOff className="w-3.5 h-3.5" /> Hidden
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Actions Row */}
                      <div className="flex items-center justify-end gap-2 shrink-0 border-t md:border-t-0 pt-3 md:pt-0 border-border/30">
                        {/* Assign Button */}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleStartAssign(card)}
                          className={cn(
                            'h-10 px-4 text-xs sm:text-sm font-heading font-bold uppercase tracking-wider gap-2 rounded-xl transition-all shadow-sm',
                            card.assignedTeamName
                              ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/25'
                              : 'bg-card/80 hover:bg-primary/15 text-muted-foreground hover:text-primary border-border'
                          )}
                          title="Assign this card to a team"
                        >
                          <UserPlus className="w-4 h-4" />
                          <span>{card.assignedTeamName ? 'Reassign' : 'Assign'}</span>
                        </Button>

                        {/* Edit Button */}
                        <button
                          type="button"
                          onClick={() => handleStartEdit(card)}
                          className="h-10 w-10 rounded-xl flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/15 border border-transparent hover:border-primary/20 transition-colors"
                          title="Edit card text or number"
                        >
                          <Pencil className="w-4.5 h-4.5" />
                        </button>

                        {/* Flip / Reveal Toggle */}
                        <button
                          type="button"
                          onClick={() => handleToggleFlip(card.id)}
                          className={cn(
                            'h-10 w-10 rounded-xl flex items-center justify-center transition-colors border',
                            card.isFlipped
                              ? 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30'
                              : 'text-muted-foreground hover:text-foreground hover:bg-muted border-transparent'
                          )}
                          title={card.isFlipped ? 'Revealed (Click to hide)' : 'Hidden (Click to reveal)'}
                        >
                          {card.isFlipped ? <Eye className="w-4.5 h-4.5" /> : <EyeOff className="w-4.5 h-4.5" />}
                        </button>

                        {/* Delete Button */}
                        <button
                          type="button"
                          onClick={() => handleRemoveCard(card.id)}
                          className="h-10 w-10 rounded-xl flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/15 border border-transparent hover:border-destructive/20 transition-colors"
                          title="Remove card"
                        >
                          <Trash2 className="w-4.5 h-4.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Assign Card Modal */}
        <AnimatePresence>
          {assigningCard && (
            <div className="fixed inset-0 z-[160] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setAssigningCard(null)}
                className="fixed inset-0 bg-black/70 backdrop-blur-md"
              />

              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className="relative w-full max-w-lg bg-popover text-popover-foreground border border-border rounded-3xl p-6 sm:p-7 shadow-2xl z-10 space-y-5"
              >
                <div className="flex items-center justify-between border-b border-border pb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                      <UserPlus className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-xl font-heading font-black text-foreground">
                        Assign Card #{assigningCard.number}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        Select which club holds this {assigningCard.category === 'power' ? 'Power Card' : 'Sick Card'}.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAssigningCard(null)}
                    className="p-2 rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Card Preview */}
                <div className="p-4 rounded-2xl bg-card/70 border border-border space-y-1">
                  <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-muted-foreground">
                    Card Perk / Text
                  </span>
                  <p className="text-base font-bold text-foreground">
                    {assigningCard.text}
                  </p>
                </div>

                <form onSubmit={handleSaveAssignment} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
                      Choose Club / Team
                    </label>

                    <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1 scrollbar-thin">
                      {/* Option: Unassigned */}
                      <label
                        className={cn(
                          'flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition-all',
                          selectedTeamId === '__UNASSIGN__' || (!selectedTeamId && !assigningCard.assignedTeamName)
                            ? 'bg-muted/60 border-primary/50 text-foreground ring-1 ring-primary/40'
                            : 'bg-card/40 border-border/40 text-muted-foreground hover:bg-card/80'
                        )}
                        onClick={() => setSelectedTeamId('__UNASSIGN__')}
                      >
                        <div className="flex items-center gap-3">
                          <Tag className="w-4 h-4 opacity-70" />
                          <span className="text-sm font-semibold">Unassigned / No Team</span>
                        </div>
                        {(selectedTeamId === '__UNASSIGN__' || (!selectedTeamId && !assigningCard.assignedTeamName)) && (
                          <CheckCircle2 className="w-4.5 h-4.5 text-primary" />
                        )}
                      </label>

                      {/* Registered Teams from store */}
                      {teams.map((team) => (
                        <label
                          key={team.id}
                          className={cn(
                            'flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition-all',
                            selectedTeamId === team.id || (!selectedTeamId && assigningCard.assignedTeamId === team.id)
                              ? 'bg-primary/10 border-primary/50 text-foreground ring-1 ring-primary/40'
                              : 'bg-card/40 border-border/40 text-foreground hover:bg-card/80'
                          )}
                          onClick={() => setSelectedTeamId(team.id)}
                        >
                          <div className="flex items-center gap-3">
                            <Shield className="w-4 h-4 text-primary" />
                            <div>
                              <p className="text-sm font-bold text-foreground">{team.name}</p>
                              <p className="text-xs text-muted-foreground">Manager: {team.owner || 'N/A'}</p>
                            </div>
                          </div>
                          {(selectedTeamId === team.id || (!selectedTeamId && assigningCard.assignedTeamId === team.id)) && (
                            <CheckCircle2 className="w-4.5 h-4.5 text-primary" />
                          )}
                        </label>
                      ))}

                      {/* Custom Team option */}
                      <label
                        className={cn(
                          'flex flex-col gap-2 p-3.5 rounded-xl border cursor-pointer transition-all',
                          selectedTeamId === '__CUSTOM__'
                            ? 'bg-primary/10 border-primary/50 text-foreground ring-1 ring-primary/40'
                            : 'bg-card/40 border-border/40 text-muted-foreground hover:bg-card/80'
                        )}
                        onClick={() => setSelectedTeamId('__CUSTOM__')}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Users className="w-4 h-4 opacity-70" />
                            <span className="text-sm font-semibold text-foreground">Custom Team Name</span>
                          </div>
                          {selectedTeamId === '__CUSTOM__' && (
                            <CheckCircle2 className="w-4.5 h-4.5 text-primary" />
                          )}
                        </div>

                        {selectedTeamId === '__CUSTOM__' && (
                          <Input
                            type="text"
                            placeholder="Enter custom club/team name..."
                            value={customTeamName}
                            onChange={(e) => setCustomTeamName(e.target.value)}
                            className="h-10 bg-card border-input text-sm text-foreground mt-1"
                            autoFocus
                          />
                        )}
                      </label>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-3 border-t border-border">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setAssigningCard(null)}
                      className="text-sm h-11 px-5 rounded-xl font-semibold"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      className="text-sm h-11 px-6 rounded-xl font-heading font-black bg-primary text-primary-foreground hover:bg-primary/90 shadow-gold uppercase tracking-wider"
                    >
                      Confirm Assignment
                    </Button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Edit Card Modal */}
        <AnimatePresence>
          {editingCard && (
            <div className="fixed inset-0 z-[160] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setEditingCard(null)}
                className="fixed inset-0 bg-black/70 backdrop-blur-md"
              />

              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className="relative w-full max-w-md bg-popover text-popover-foreground border border-border rounded-3xl p-6 sm:p-7 shadow-2xl z-10 space-y-4"
              >
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <h3 className="text-xl font-heading font-black text-foreground flex items-center gap-2">
                    <Pencil className="w-4.5 h-4.5 text-primary" />
                    Edit Card #{editingCard.number}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setEditingCard(null)}
                    className="p-1.5 rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleSaveEdit} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      Card Number
                    </label>
                    <Input
                      type="number"
                      value={editNumber}
                      onChange={(e) => setEditNumber(e.target.value)}
                      className="h-12 font-mono font-black bg-card/70 text-foreground text-base"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      Card Perk / Disadvantage Text
                    </label>
                    <textarea
                      rows={3}
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      className="w-full text-base bg-card/70 border border-input rounded-xl p-3.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                      required
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-3 border-t border-border">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setEditingCard(null)}
                      className="text-sm h-11 px-5 rounded-xl font-semibold"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      className="text-sm h-11 px-6 rounded-xl font-heading font-black bg-primary text-primary-foreground hover:bg-primary/90 shadow-gold uppercase tracking-wider"
                    >
                      <Check className="w-4 h-4 mr-1.5" />
                      Save Card
                    </Button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </AppLayout>
  );
}
