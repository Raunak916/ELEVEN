'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { AppLayout } from '@/components/layout/app-layout';
import { TurntableDeck } from './turntable-deck';
import { Vinyl3DCarousel } from './vinyl-3d-carousel';
import { VinylTracklist } from './vinyl-tracklist';
import { useMusicStore } from '@/lib/music-store';
import { Disc3, Layers, SlidersHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';

export function VinylScreen() {
  const {
    vinyls,
    activeVinylId,
    currentTracks,
    selectVinyl,
    isPlaying,
    fetchVinylsFromDB,
  } = useMusicStore();

  React.useEffect(() => {
    fetchVinylsFromDB();
  }, [fetchVinylsFromDB]);

  const [viewMode, setViewMode] = useState<'turntable' | 'carousel' | 'split'>('turntable');

  const activeVinyl = vinyls.find((v) => v.id === activeVinylId) || vinyls[0];
  const totalSongs = vinyls.reduce((acc, v) => acc + v.songs.length, 0);

  return (
    <AppLayout>
      <div className="min-h-[calc(100vh-5rem)] pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto flex flex-col gap-6 select-none">
        {/* Top Header & View Mode Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 border-b border-border/40 pb-5">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2.5">
              <span className="text-xs font-mono font-bold text-[var(--gold)] tracking-widest uppercase">
                SOUNDTRACK & VINYL DECK
              </span>
              <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-white/10 text-white/90 border border-white/15 backdrop-blur-md">
                {vinyls.length} VINYLS • {totalSongs} SONGS
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-heading font-black tracking-tight text-foreground flex items-center gap-3">
              <span>Vibe</span>
              {isPlaying && (
                <span className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full shadow-sm">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  LIVE AUDIO
                </span>
              )}
            </h1>
            <p className="text-sm text-muted-foreground max-w-xl">
              Swipe left or right in 3D to switch vinyl collections. The centered active vinyl drops onto the deck and plays immediately.
            </p>
          </div>

          {/* View Mode Toggle Switcher with High-Polish Glass */}
          <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-black/40 border border-white/15 backdrop-blur-3xl shadow-[0_15px_35px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.15)] self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setViewMode('turntable')}
              className={cn(
                'flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-mono font-bold transition-all',
                viewMode === 'turntable'
                  ? 'bg-white text-black shadow-md'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              )}
            >
              <Disc3 className="h-4 w-4" />
              <span>Turntable</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('carousel')}
              className={cn(
                'flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-mono font-bold transition-all',
                viewMode === 'carousel'
                  ? 'bg-white text-black shadow-md'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              )}
            >
              <Layers className="h-4 w-4" />
              <span>3D Carousel</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('split')}
              className={cn(
                'flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-mono font-bold transition-all',
                viewMode === 'split'
                  ? 'bg-white text-black shadow-md'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              )}
            >
              <SlidersHorizontal className="h-4 w-4" />
              <span className="hidden sm:inline">Split Deck</span>
              <span className="sm:hidden">Split</span>
            </button>
          </div>
        </div>

        {/* Main Display Stage Based on Selected View Mode */}
        <div className="flex flex-col gap-8">
          {viewMode === 'turntable' && (
            <motion.div
              key="turntable-view"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col gap-6"
            >
              {/* Turntable Deck Display */}
              <TurntableDeck activeVinyl={activeVinyl} />

              {/* 3D Mini Carousel Swiper Directly Below Turntable (drag/swipe only) */}
              <div className="w-full max-w-4xl mx-auto pt-2">
                <div className="text-center mb-1">
                  <span className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground">
                    Swipe left / right to change vinyl collection
                  </span>
                </div>
                <Vinyl3DCarousel
                  vinyls={vinyls}
                  activeVinylId={activeVinylId}
                  onSelectVinyl={(id) => selectVinyl(id)}
                />
              </div>
            </motion.div>
          )}

          {viewMode === 'carousel' && (
            <motion.div
              key="carousel-view"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col gap-6"
            >
              {/* Full 3D Coverflow Carousel */}
              <Vinyl3DCarousel
                vinyls={vinyls}
                activeVinylId={activeVinylId}
                onSelectVinyl={(id) => selectVinyl(id)}
              />
            </motion.div>
          )}

          {viewMode === 'split' && (
            <motion.div
              key="split-view"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center"
            >
              {/* Left Column: Turntable Deck */}
              <div className="w-full">
                <TurntableDeck activeVinyl={activeVinyl} />
              </div>

              {/* Right Column: 3D Carousel */}
              <div className="w-full">
                <Vinyl3DCarousel
                  vinyls={vinyls}
                  activeVinylId={activeVinylId}
                  onSelectVinyl={(id) => selectVinyl(id)}
                />
              </div>
            </motion.div>
          )}

          {/* Active Vinyl Tracklist Queue */}
          <div className="pt-4 border-t border-border/40">
            <VinylTracklist
              activeVinyl={activeVinyl}
              currentTracks={currentTracks}
            />
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
