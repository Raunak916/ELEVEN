'use client';

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AppLayout } from '@/components/layout/app-layout';
import { PageHeader } from '@/components/layout/page-header';
import { SpinningWheel } from './spinning-wheel';
import { WheelEntryPanel } from './wheel-entry-panel';
import { WinnerBanner } from './winner-banner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Plus,
  Disc3,
  Dices,
  Trash2,
  Sparkles,
  Shuffle,
  RotateCcw,
  Layers,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface WheelState {
  id: string;
  name: string;
  entries: string[];
  initialEntries: string[];
  winner: string | null;
  isSpinning: boolean;
  rotation: number;
}

const STORAGE_WHEELS_KEY = 'auction_custom_wheels_v1';
const STORAGE_ACTIVE_WHEEL_KEY = 'auction_active_wheel_id_v1';

function createDefaultWheel(index: number = 1): WheelState {
  return {
    id: `wheel-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: `Wheel ${index}`,
    entries: [],
    initialEntries: [],
    winner: null,
    isSpinning: false,
    rotation: 0,
  };
}

export function WheelScreen() {
  const [wheels, setWheels] = useState<WheelState[]>([createDefaultWheel(1)]);
  const [activeWheelId, setActiveWheelId] = useState<string>(() => wheels[0].id);
  const [isHydrated, setIsHydrated] = useState(false);

  // Load from localStorage on mount
  React.useEffect(() => {
    try {
      const savedWheels = localStorage.getItem(STORAGE_WHEELS_KEY);
      if (savedWheels) {
        const parsed = JSON.parse(savedWheels);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Reset spinning state when loaded from storage
          const sanitizedWheels = parsed.map((w: WheelState) => ({
            ...w,
            isSpinning: false,
          }));
          setWheels(sanitizedWheels);

          const savedActiveId = localStorage.getItem(STORAGE_ACTIVE_WHEEL_KEY);
          if (savedActiveId && sanitizedWheels.some((w: WheelState) => w.id === savedActiveId)) {
            setActiveWheelId(savedActiveId);
          } else {
            setActiveWheelId(sanitizedWheels[0].id);
          }
        }
      }
    } catch (err) {
      console.warn('Failed to load wheel data from localStorage:', err);
    } finally {
      setIsHydrated(true);
    }
  }, []);

  // Save to localStorage when wheels or activeWheelId changes
  React.useEffect(() => {
    if (isHydrated) {
      try {
        const wheelsToSave = wheels.map((w) => ({
          ...w,
          isSpinning: false,
        }));
        localStorage.setItem(STORAGE_WHEELS_KEY, JSON.stringify(wheelsToSave));
        if (activeWheelId) {
          localStorage.setItem(STORAGE_ACTIVE_WHEEL_KEY, activeWheelId);
        }
      } catch (err) {
        console.warn('Failed to save wheel data to localStorage:', err);
      }
    }
  }, [wheels, activeWheelId, isHydrated]);

  // Active wheel helper
  const activeWheel = wheels.find((w) => w.id === activeWheelId) || wheels[0];

  const updateActiveWheel = useCallback((updater: (prev: WheelState) => WheelState) => {
    setWheels((prevWheels) =>
      prevWheels.map((w) => (w.id === activeWheelId ? updater(w) : w))
    );
  }, [activeWheelId]);

  // Actions
  const handleAddWheel = useCallback(() => {
    const nextNum = wheels.length + 1;
    const newWheel = createDefaultWheel(nextNum);
    setWheels((prev) => [...prev, newWheel]);
    setActiveWheelId(newWheel.id);
  }, [wheels.length]);

  const handleDeleteWheel = useCallback((idToDelete: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (wheels.length <= 1) return; // Keep at least one wheel
    setWheels((prev) => {
      const filtered = prev.filter((w) => w.id !== idToDelete);
      if (activeWheelId === idToDelete && filtered.length > 0) {
        setActiveWheelId(filtered[0].id);
      }
      return filtered;
    });
  }, [wheels.length, activeWheelId]);

  const handleAddEntry = useCallback((item: string) => {
    updateActiveWheel((prev) => {
      const newEntries = [...prev.entries, item];
      // If initial was empty, update initial too
      const newInitial = prev.initialEntries.length === 0 ? newEntries : prev.initialEntries;
      return {
        ...prev,
        entries: newEntries,
        initialEntries: newInitial,
      };
    });
  }, [updateActiveWheel]);

  const handleAddBulkEntries = useCallback((items: string[]) => {
    updateActiveWheel((prev) => {
      const newEntries = [...prev.entries, ...items];
      const newInitial = prev.initialEntries.length === 0 ? newEntries : prev.initialEntries;
      return {
        ...prev,
        entries: newEntries,
        initialEntries: newInitial,
      };
    });
  }, [updateActiveWheel]);

  const handleRemoveEntry = useCallback((index: number) => {
    updateActiveWheel((prev) => {
      const newEntries = prev.entries.filter((_, i) => i !== index);
      return {
        ...prev,
        entries: newEntries,
      };
    });
  }, [updateActiveWheel]);

  const handleShuffle = useCallback(() => {
    updateActiveWheel((prev) => {
      if (prev.entries.length < 2 || prev.isSpinning) return prev;
      const shuffled = [...prev.entries].sort(() => Math.random() - 0.5);
      return {
        ...prev,
        entries: shuffled,
      };
    });
  }, [updateActiveWheel]);

  const handleReset = useCallback(() => {
    updateActiveWheel((prev) => ({
      ...prev,
      entries: [...prev.initialEntries],
      winner: null,
      rotation: 0,
      isSpinning: false,
    }));
  }, [updateActiveWheel]);

  const handleNewWheel = useCallback(() => {
    updateActiveWheel((prev) => ({
      ...prev,
      entries: [],
      initialEntries: [],
      winner: null,
      rotation: 0,
      isSpinning: false,
    }));
  }, [updateActiveWheel]);

  const handleClear = useCallback(() => {
    updateActiveWheel((prev) => ({
      ...prev,
      entries: [],
      winner: null,
    }));
  }, [updateActiveWheel]);

  const handleSpinStart = useCallback(() => {
    updateActiveWheel((prev) => ({
      ...prev,
      isSpinning: true,
      winner: null,
    }));
  }, [updateActiveWheel]);

  const handleRotationChange = useCallback((newRot: number) => {
    updateActiveWheel((prev) => ({
      ...prev,
      rotation: newRot,
    }));
  }, [updateActiveWheel]);

  const handleSpinComplete = useCallback((winner: string, _winningIndex: number) => {
    updateActiveWheel((prev) => ({
      ...prev,
      isSpinning: false,
      winner,
    }));
  }, [updateActiveWheel]);

  const handleDismissWinner = useCallback(() => {
    updateActiveWheel((prev) => ({
      ...prev,
      winner: null,
    }));
  }, [updateActiveWheel]);

  const handleRemoveWinner = useCallback(() => {
    updateActiveWheel((prev) => {
      if (!prev.winner) return prev;
      const winnerItem = prev.winner;
      const idx = prev.entries.indexOf(winnerItem);
      const newEntries = idx >= 0 ? prev.entries.filter((_, i) => i !== idx) : prev.entries;
      return {
        ...prev,
        entries: newEntries,
        winner: null,
      };
    });
  }, [updateActiveWheel]);

  return (
    <AppLayout>
      <div className="space-y-4 max-w-[1600px] mx-auto">
        {/* Compact Horizontal Header (WHEEL to the right of AUCTION) */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-heading font-black tracking-tight flex items-center select-none">
              <span className="text-foreground">AUCTION</span>
              <span className="text-primary font-black ml-2.5">WHEEL</span>
            </h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-primary/10 text-primary border border-primary/20">
              Interactive
            </span>
          </div>

          {/* Top Quick Actions Bar */}
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleShuffle}
              disabled={activeWheel.entries.length < 2 || activeWheel.isSpinning}
              className="text-xs gap-1.5 h-8 bg-card/60 hover:bg-muted"
            >
              <Shuffle className="w-3.5 h-3.5 text-muted-foreground" />
              Shuffle
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleReset}
              disabled={activeWheel.isSpinning}
              className="text-xs gap-1.5 h-8 bg-card/60 hover:bg-muted"
            >
              <RotateCcw className="w-3.5 h-3.5 text-muted-foreground" />
              Reset
            </Button>

            <Button
              type="button"
              onClick={handleAddWheel}
              className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs gap-1.5 h-8 px-3 font-medium shadow-gold"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Wheel
            </Button>
          </div>
        </div>

        {/* Multi-wheel Tabs Bar */}
        <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 scrollbar-none border-b border-border/30">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60 flex items-center gap-1 mr-1">
              <Layers className="w-3.5 h-3.5 text-primary" /> Wheels:
            </span>
            {wheels.map((wheel) => {
              const isActive = wheel.id === activeWheelId;
              return (
                <button
                  key={wheel.id}
                  type="button"
                  onClick={() => setActiveWheelId(wheel.id)}
                  className={cn(
                    'group relative flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 border',
                    isActive
                      ? 'bg-primary/10 border-primary/40 text-primary shadow-sm'
                      : 'bg-card/40 border-border/40 text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <Disc3 className={cn('w-3.5 h-3.5', isActive && wheel.isSpinning ? 'animate-spin text-primary' : '')} />
                  <span>{wheel.name}</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-muted/60 text-muted-foreground">
                    {wheel.entries.length}
                  </span>

                  {wheels.length > 1 && (
                    <span
                      onClick={(e) => handleDeleteWheel(wheel.id, e)}
                      className="opacity-0 group-hover:opacity-100 hover:text-destructive p-0.5 rounded transition-opacity"
                      title="Delete wheel"
                    >
                      <Trash2 className="w-3 h-3" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <Button
            type="button"
            variant="ghost"
            size="xs"
            onClick={handleAddWheel}
            className="text-xs text-primary hover:bg-primary/10 gap-1 h-7 px-2 shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Wheel
          </Button>
        </div>

        {/* Winner Celebration Banner */}
        <AnimatePresence>
          {activeWheel.winner && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <WinnerBanner
                winner={activeWheel.winner}
                onDismiss={handleDismissWinner}
                onSpinAgain={() => {
                  handleDismissWinner();
                }}
                onRemoveWinner={handleRemoveWinner}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Workspace Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Wheel Display Area (Left / Dominant) */}
          <div className="lg:col-span-7 xl:col-span-8 flex flex-col items-center justify-center p-3 sm:p-5 rounded-2xl glass border border-sidebar-border relative">
            {/* Ambient Background Gradient */}
            <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-primary/5 rounded-2xl pointer-events-none" />

            <SpinningWheel
              entries={activeWheel.entries}
              isSpinning={activeWheel.isSpinning}
              onSpinStart={handleSpinStart}
              onSpinComplete={handleSpinComplete}
              currentRotation={activeWheel.rotation}
              onRotationChange={handleRotationChange}
            />

            {/* Quick Status Subtitle */}
            <div className="mt-2 text-center z-10">
              {activeWheel.isSpinning ? (
                <p className="text-xs font-semibold text-primary animate-pulse tracking-wider uppercase">
                  ⚡ Spinning the wheel...
                </p>
              ) : activeWheel.entries.length < 2 ? (
                <p className="text-xs text-amber-400/80">
                  Add 2 or more entries in the panel to enable the wheel
                </p>
              ) : (
                <p className="text-xs text-muted-foreground flex items-center justify-center gap-1.5">
                  <span>Click</span>
                  <span className="font-bold text-foreground">SPIN</span>
                  <span>or click anywhere on the wheel</span>
                </p>
              )}
            </div>
          </div>

          {/* Right-Side Control & Entry Panel */}
          <div className="lg:col-span-5 xl:col-span-4 space-y-4">
            <WheelEntryPanel
              entries={activeWheel.entries}
              initialEntries={activeWheel.initialEntries}
              isSpinning={activeWheel.isSpinning}
              onAddEntry={handleAddEntry}
              onAddBulkEntries={handleAddBulkEntries}
              onRemoveEntry={handleRemoveEntry}
              onShuffle={handleShuffle}
              onReset={handleReset}
              onNewWheel={handleNewWheel}
              onClear={handleClear}
            />
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
