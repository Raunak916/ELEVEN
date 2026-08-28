'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AppLayout } from '@/components/layout/app-layout';
import { CoverflowCarousel } from './coverflow-carousel';
import { CustomAuctionCard } from './cards-data';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Zap,
  Flame,
  Plus,
  Trash2,
  Sparkles,
  Eye,
  EyeOff,
  ListPlus,
  FileText,
  X,
  Layers,
  Pencil,
  Check,
} from 'lucide-react';
import { firePlayerRevealConfetti } from '@/lib/confetti';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const STORAGE_POWER_KEY = 'football-auction-power-cards-v2';
const STORAGE_SICK_KEY = 'football-auction-sick-cards-v2';

export function CardsScreen() {
  const [activeTab, setActiveTab] = useState<'power' | 'sick'>('power');

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
      <div className="space-y-6 max-w-[1600px] mx-auto pb-12">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-3 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-heading font-black tracking-tight flex items-center select-none">
              <span className="text-foreground">AUCTION</span>
              <span className="text-primary font-black ml-2.5">CARDS</span>
            </h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-primary/10 text-primary border border-primary/20">
              Auto-Saved Decks
            </span>
          </div>

          {/* Quick Deck Actions */}
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleHideAll}
              className="text-xs gap-1.5 h-8 bg-card/60 hover:bg-muted"
              title="Invert all cards to mystery number side"
            >
              <EyeOff className="w-3.5 h-3.5 text-muted-foreground" />
              Hide All
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleRevealAll}
              className="text-xs gap-1.5 h-8 bg-card/60 hover:bg-muted"
              title="Reveal all cards"
            >
              <Eye className="w-3.5 h-3.5 text-muted-foreground" />
              Reveal All
            </Button>
          </div>
        </div>

        {/* Tab Selection Bar: POWER CARDS vs SICK CARDS */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/30 pb-3">
          <div className="flex items-center gap-3 p-1 rounded-xl glass border border-sidebar-border">
            {/* Power Cards Tab */}
            <button
              type="button"
              onClick={() => setActiveTab('power')}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-heading font-bold uppercase tracking-wider transition-all duration-300',
                activeTab === 'power'
                  ? 'bg-primary text-primary-foreground shadow-gold'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
              )}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Power Cards</span>
              <span
                className={cn(
                  'px-1.5 py-0.2 rounded text-[10px] font-mono',
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
                'flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-heading font-bold uppercase tracking-wider transition-all duration-300',
                activeTab === 'sick'
                  ? 'bg-gradient-to-r from-rose-500 via-pink-500 to-purple-600 text-white shadow-[0_0_20px_rgba(244,63,94,0.4)]'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
              )}
            >
              <Flame className="w-3.5 h-3.5 text-rose-400" />
              <span>Sick Cards</span>
              <span
                className={cn(
                  'px-1.5 py-0.2 rounded text-[10px] font-mono',
                  activeTab === 'sick'
                    ? 'bg-black/30 text-white'
                    : 'bg-muted text-muted-foreground'
                )}
              >
                {sickCards.length}
              </span>
            </button>
          </div>

          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Click any card to flip & reveal perk
            </span>
          </div>
        </div>

        {/* 3D Coverflow Carousel Stage */}
        <div className="relative rounded-3xl glass p-2 sm:p-4 border border-sidebar-border overflow-hidden shadow-2xl">
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

        {/* Manage Cards Section */}
        <Card className="glass border-sidebar-border shadow-xl">
          <CardHeader className="py-4 px-6 border-b border-border/40 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="font-heading text-lg sm:text-xl font-bold text-foreground flex items-center gap-2">
                <Layers className="w-5 h-5 text-primary" />
                Manage {activeTab === 'power' ? 'Power Cards' : 'Sick Cards'} Deck
              </CardTitle>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                Add, edit, or customize cards in this deck. All edits are automatically saved on your device.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowBulkModal(!showBulkModal)}
                className="text-xs font-semibold gap-1.5 h-9"
              >
                <ListPlus className="w-4 h-4 text-primary" />
                Bulk Paste
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleClearAll}
                className="text-xs font-semibold gap-1.5 h-9 hover:text-destructive hover:border-destructive/40"
              >
                <Trash2 className="w-4 h-4" />
                Clear All
              </Button>
            </div>
          </CardHeader>

          <CardContent className="p-6 space-y-5">
            {/* Quick Add Single Card Form */}
            <form onSubmit={handleAddCard} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="w-full sm:w-28 shrink-0">
                <Input
                  type="number"
                  placeholder={`#${nextNum}`}
                  value={inputNumber}
                  onChange={(e) => setInputNumber(e.target.value)}
                  className="h-11 text-center font-mono font-bold bg-card/60 border-input text-base"
                />
              </div>

              <div className="flex-1">
                <Input
                  type="text"
                  placeholder={
                    activeTab === 'power'
                      ? 'e.g. +€15M Budget Bonus, Double Captain Points...'
                      : 'e.g. 60s Auction Freeze, Sudden Death 10s Countdown...'
                  }
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  className="h-11 bg-card/60 border-input text-sm sm:text-base text-foreground focus:border-primary"
                />
              </div>

              <Button
                type="submit"
                disabled={!inputText.trim()}
                className="h-11 px-6 font-heading font-bold text-sm bg-primary text-primary-foreground hover:bg-primary/90 shadow-gold shrink-0 gap-1.5"
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
                  className="p-4 rounded-2xl bg-card/70 border border-border space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <FileText className="w-4 h-4 text-primary" />
                      Bulk paste cards (one power/disadvantage per line)
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowBulkModal(false)}
                      className="text-muted-foreground hover:text-foreground p-1"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <textarea
                    rows={4}
                    value={bulkText}
                    onChange={(e) => setBulkText(e.target.value)}
                    placeholder={`+€10M Budget Bonus\nFree Defender Pick\nScout Next 3 Players`}
                    className="w-full text-sm font-mono bg-card border border-input rounded-xl p-3 text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                  />
                  <div className="flex justify-end gap-2.5">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowBulkModal(false)}
                      className="text-xs"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleBulkAdd}
                      disabled={!bulkText.trim()}
                      className="bg-primary text-primary-foreground text-xs font-semibold"
                    >
                      Add All Cards
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* List of current cards */}
            <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1 scrollbar-thin">
              {currentCards.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground text-sm">
                  No cards in this deck yet. Type an entry above or click &quot;Bulk Paste&quot; to add cards.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {currentCards.map((card) => (
                    <div
                      key={card.id}
                      className="flex items-center justify-between gap-3 p-3.5 rounded-xl bg-card/50 hover:bg-card/80 border border-border/50 transition-colors shadow-sm"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <span className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/25 text-primary font-mono text-sm font-bold flex items-center justify-center shrink-0 shadow-sm">
                          #{card.number}
                        </span>
                        <p className="text-sm sm:text-base font-medium text-foreground line-clamp-2 leading-snug" title={card.text}>
                          {card.text}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {/* Edit Button */}
                        <button
                          type="button"
                          onClick={() => handleStartEdit(card)}
                          className="p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/15 transition-colors"
                          title="Edit card"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>

                        {/* Flip / Reveal Toggle */}
                        <button
                          type="button"
                          onClick={() => handleToggleFlip(card.id)}
                          className={cn(
                            'p-2 rounded-lg text-xs transition-colors',
                            card.isFlipped ? 'text-emerald-400 bg-emerald-500/15 border border-emerald-500/30' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                          )}
                          title={card.isFlipped ? 'Revealed' : 'Hidden'}
                        >
                          {card.isFlipped ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                        </button>

                        {/* Delete Button */}
                        <button
                          type="button"
                          onClick={() => handleRemoveCard(card.id)}
                          className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/15 transition-colors"
                          title="Remove card"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Edit Card Modal */}
        <AnimatePresence>
          {editingCard && (
            <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setEditingCard(null)}
                className="fixed inset-0 bg-black/60 backdrop-blur-md"
              />

              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className="relative w-full max-w-md bg-popover text-popover-foreground border border-border rounded-3xl p-6 shadow-2xl z-10 space-y-4"
              >
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <h3 className="text-lg font-heading font-black text-foreground flex items-center gap-2">
                    <Pencil className="w-4 h-4 text-primary" />
                    Edit Card #{editingCard.number}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setEditingCard(null)}
                    className="p-1 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleSaveEdit} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Card Number
                    </label>
                    <Input
                      type="number"
                      value={editNumber}
                      onChange={(e) => setEditNumber(e.target.value)}
                      className="h-11 font-mono font-bold bg-card/70 text-foreground"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Card Perk / Disadvantage Text
                    </label>
                    <textarea
                      rows={3}
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      className="w-full text-sm bg-card/70 border border-input rounded-xl p-3 text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                      required
                    />
                  </div>

                  <div className="flex justify-end gap-2.5 pt-2 border-t border-border">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setEditingCard(null)}
                      className="text-xs h-10 px-4 rounded-xl"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      className="text-xs h-10 px-5 rounded-xl font-heading font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-gold"
                    >
                      <Check className="w-4 h-4 mr-1" />
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
