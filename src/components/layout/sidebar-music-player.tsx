'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useMusicStore } from '@/lib/music-store';

export function SidebarMusicPlayer() {
  const {
    isPlaying,
    isReady,
    showIsland,
    togglePlay,
    vinyls,
    activeVinylId,
  } = useMusicStore();

  const activeVinyl = vinyls.find((v) => v.id === activeVinylId) || vinyls[0];

  const handleVinylClick = () => {
    // Toggle play/pause
    if (isReady) {
      togglePlay();
    }
    // Reveal the Dynamic Island
    showIsland(5000);
  };

  return (
    <div className="border-t border-sidebar-border p-3 flex flex-col items-center justify-center relative select-none">
      {/* Rotating Vinyl Trigger Button - Toggles playback and island without redirecting */}
      <motion.button
        type="button"
        onClick={handleVinylClick}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.94 }}
        className="relative group flex flex-col items-center justify-center p-2 rounded-2xl transition-all cursor-pointer focus-visible:outline-none"
        title={isPlaying ? 'Click to pause music' : `Click to play (${activeVinyl.title})`}
        aria-label="Toggle Music Playback"
      >
        {/* Vinyl Disc Body */}
        <div
          className={cn(
            'relative w-14 h-14 rounded-full bg-gradient-to-tr from-[#050505] via-[#151515] to-[#0a0a0a] border border-white/20 shadow-lg flex items-center justify-center overflow-hidden transition-all',
            isPlaying && 'animate-[spin_4s_linear_infinite]'
          )}
        >
          {/* Vinyl Grooves Texture */}
          <div className="absolute inset-1 rounded-full border border-white/10 opacity-70" />
          <div className="absolute inset-2.5 rounded-full border border-white/10 opacity-50" />
          <div className="absolute inset-4 rounded-full border border-white/10 opacity-40" />

          {/* Center Category Album Label */}
          <div
            className={cn(
              'relative w-6 h-6 rounded-full bg-gradient-to-tr flex items-center justify-center shadow-inner',
              activeVinyl.accent.labelGradient
            )}
          >
            {/* Spindle Center Hole */}
            <div className="w-1.5 h-1.5 rounded-full bg-black border border-white/30" />
          </div>

          {/* Vinyl Light Glare Sweep */}
          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent pointer-events-none -skew-y-12" />
        </div>

        {/* Status Micro Badge */}
        <div className="mt-2 flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 max-w-[100px]">
          <span
            className={cn(
              'w-1.5 h-1.5 rounded-full flex-shrink-0',
              isPlaying ? 'bg-[var(--gold)] animate-ping' : 'bg-muted-foreground/50'
            )}
          />
          <span className="text-[9.5px] font-mono font-bold tracking-widest text-muted-foreground group-hover:text-foreground uppercase truncate">
            {isPlaying ? 'PLAYING' : activeVinyl.category.split(' ')[0]}
          </span>
        </div>
      </motion.button>
    </div>
  );
}
