'use client';

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Plus,
  Trash2,
  Shuffle,
  RotateCcw,
  Sparkles,
  AlertCircle,
  FileText,
  ListPlus,
  X,
  Dices,
} from 'lucide-react';
import { getSegmentColor } from './spinning-wheel';
import { cn } from '@/lib/utils';

interface WheelEntryPanelProps {
  entries: string[];
  initialEntries: string[];
  isSpinning: boolean;
  onAddEntry: (item: string) => void;
  onAddBulkEntries: (items: string[]) => void;
  onRemoveEntry: (index: number) => void;
  onShuffle: () => void;
  onReset: () => void;
  onNewWheel: () => void;
  onClear: () => void;
}

export function WheelEntryPanel({
  entries,
  initialEntries,
  isSpinning,
  onAddEntry,
  onAddBulkEntries,
  onRemoveEntry,
  onShuffle,
  onReset,
  onNewWheel,
  onClear,
}: WheelEntryPanelProps) {
  const [inputValue, setInputValue] = useState('');
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkText, setBulkText] = useState('');

  const handleAdd = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = inputValue.trim();
    if (!trimmed || isSpinning) return;
    onAddEntry(trimmed);
    setInputValue('');
  };

  const handleBulkSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const lines = bulkText
      .split(/\r?\n|,/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    if (lines.length > 0) {
      onAddBulkEntries(lines);
      setBulkText('');
      setShowBulkModal(false);
    }
  };

  const loadPreset = (presetName: string) => {
    if (isSpinning) return;
    let items: string[] = [];
    if (presetName === 'auction') {
      items = [
        '🌟 Super Wildcard',
        '💰 +€15M Budget Bonus',
        '🛡️ Free Defender Draft',
        '⚡ Double Bid Multiplier',
        '🔄 Instant Player Swap',
        '🎯 Scout Priority Pick',
        '🚫 Bid Block Penalty',
        '🔥 Golden Goal Bonus',
      ];
    } else if (presetName === 'numbers') {
      items = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];
    } else if (presetName === 'decisions') {
      items = ['Yes', 'No', 'Spin Again', 'Bonus Round', 'Pass', 'Double'];
    }
    if (items.length > 0) {
      onAddBulkEntries(items);
    }
  };

  return (
    <div className="space-y-4 w-full">
      <Card className="glass border-sidebar-border shadow-xl">
        <CardHeader className="pb-3 border-b border-border/40">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                <Dices className="w-4 h-4" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold">Wheel Entries</CardTitle>
                <p className="text-xs text-muted-foreground">Manage segments on this wheel</p>
              </div>
            </div>
            <Badge
              variant="outline"
              className={cn(
                'text-xs font-mono px-2.5 py-0.5',
                entries.length >= 2
                  ? 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10'
                  : 'border-amber-500/40 text-amber-400 bg-amber-500/10'
              )}
            >
              {entries.length} {entries.length === 1 ? 'item' : 'items'}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="pt-4 space-y-4">
          {/* Quick Item Input Form */}
          <form onSubmit={handleAdd} className="flex items-center gap-2">
            <Input
              type="text"
              placeholder="Enter item name..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              disabled={isSpinning}
              className="bg-card/60 border-input text-sm h-9 flex-1"
            />
            <Button
              type="submit"
              size="sm"
              disabled={!inputValue.trim() || isSpinning}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium h-9 px-3 gap-1.5 shrink-0"
            >
              <Plus className="w-4 h-4" />
              Add
            </Button>
          </form>

          {/* Bulk add and preset shortcuts */}
          <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground/60 font-semibold">Presets:</span>
              <button
                type="button"
                onClick={() => loadPreset('auction')}
                disabled={isSpinning}
                className="text-xs px-2 py-0.5 rounded bg-muted/60 hover:bg-muted text-foreground transition-colors disabled:opacity-50"
              >
                Auction Perks
              </button>
              <button
                type="button"
                onClick={() => loadPreset('numbers')}
                disabled={isSpinning}
                className="text-xs px-2 py-0.5 rounded bg-muted/60 hover:bg-muted text-foreground transition-colors disabled:opacity-50"
              >
                1-10
              </button>
            </div>

            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="xs"
                onClick={() => setShowBulkModal(!showBulkModal)}
                disabled={isSpinning}
                className="text-xs text-primary hover:text-primary/90 gap-1 h-6 px-2"
              >
                <ListPlus className="w-3.5 h-3.5" />
                Bulk Paste
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="xs"
                onClick={onClear}
                disabled={entries.length === 0 || isSpinning}
                className="text-xs text-destructive hover:text-destructive hover:bg-destructive/10 gap-1 h-6 px-2"
                title="Delete all entries"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete All
              </Button>
            </div>
          </div>

          {/* Bulk Paste Dropdown / Form */}
          <AnimatePresence>
            {showBulkModal && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden border border-border/60 bg-muted/20 p-3 rounded-lg space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-foreground flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-primary" />
                    Paste items (one per line or comma-separated)
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowBulkModal(false)}
                    className="text-muted-foreground hover:text-foreground p-0.5"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <textarea
                  rows={4}
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                  placeholder="Super Wildcard&#10;+10M Budget&#10;Player Swap"
                  className="w-full text-xs font-mono bg-card border border-input rounded p-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                />
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="xs"
                    onClick={() => setShowBulkModal(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    size="xs"
                    onClick={handleBulkSubmit}
                    disabled={!bulkText.trim()}
                    className="bg-primary text-primary-foreground"
                  >
                    Add All
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Validation Notice when < 2 items */}
          {entries.length < 2 && (
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Add at least 2 entries to spin the wheel.</span>
            </div>
          )}

          {/* Entry List Scroll Area */}
          <div className="space-y-1.5 max-h-[280px] sm:max-h-[320px] overflow-y-auto pr-1 select-none scrollbar-thin">
            {entries.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground/60 text-xs flex flex-col items-center justify-center">
                <Sparkles className="w-6 h-6 mb-2 opacity-40" />
                <span>No entries yet.</span>
                <span className="mt-0.5">Type an item name above or choose a preset.</span>
              </div>
            ) : (
              <AnimatePresence mode="popLayout">
                {entries.map((entry, index) => {
                  const color = getSegmentColor(index, entries.length);
                  return (
                    <motion.div
                      key={`${entry}-${index}`}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ duration: 0.2 }}
                      className="group flex items-center justify-between gap-2 p-2 rounded-lg bg-card/40 hover:bg-card-glass-hover border border-border/40 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        {/* Segment Color Pill */}
                        <div
                          className="w-3.5 h-3.5 rounded-full shrink-0 border border-white/20 shadow-sm"
                          style={{ backgroundColor: color.bg }}
                        />
                        <span className="text-xs font-mono text-muted-foreground w-4 text-right shrink-0">
                          {index + 1}
                        </span>
                        <span className="text-sm font-medium text-foreground truncate" title={entry}>
                          {entry}
                        </span>
                      </div>

                      {/* Remove item button */}
                      <button
                        type="button"
                        onClick={() => onRemoveEntry(index)}
                        disabled={isSpinning}
                        aria-label={`Remove ${entry}`}
                        className="p-1 rounded text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-30 opacity-70 group-hover:opacity-100"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            )}
          </div>

          {/* Quick Actions Bar: Shuffle, Reset, New Wheel */}
          <div className="pt-2 border-t border-border/40 grid grid-cols-3 gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onShuffle}
              disabled={entries.length < 2 || isSpinning}
              className="text-xs gap-1.5 h-8 font-normal"
              title="Randomize entry order"
            >
              <Shuffle className="w-3.5 h-3.5 text-muted-foreground" />
              Shuffle
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onReset}
              disabled={isSpinning}
              className="text-xs gap-1.5 h-8 font-normal"
              title="Restore to initial entries and clear winner"
            >
              <RotateCcw className="w-3.5 h-3.5 text-muted-foreground" />
              Reset
            </Button>

            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={onNewWheel}
              disabled={isSpinning}
              className="text-xs gap-1.5 h-8 font-normal bg-destructive/10 hover:bg-destructive/20 text-destructive"
              title="Clear entries and start fresh"
            >
              <Sparkles className="w-3.5 h-3.5" />
              New Wheel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
