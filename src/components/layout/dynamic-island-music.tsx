'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Volume2,
  VolumeX,
  X,
  ListMusic,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMusicStore } from '@/lib/music-store';

export function DynamicIslandMusic() {
  const {
    isPlaying,
    isIslandVisible,
    isPlaylistOpen,
    vinyls,
    activeVinylId,
    currentTracks,
    currentTrackIndex,
    currentTrackTitle,
    currentTrackAuthor,
    volume,
    isMuted,
    togglePlay,
    nextTrack,
    prevTrack,
    playTrackAtIndex,
    setVolume,
    toggleMute,
    hideIsland,
    keepIslandOpen,
    showIsland,
    togglePlaylist,
    closePlaylist,
  } = useMusicStore();

  const activeVinyl = vinyls.find((v) => v.id === activeVinylId) || vinyls[0];

  const handleMouseEnter = () => {
    keepIslandOpen();
  };

  const handleMouseLeave = () => {
    if (!isPlaylistOpen) {
      showIsland(5000);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    setVolume(val);
  };

  return (
    <div className="fixed top-5 right-4 sm:right-8 z-50 pointer-events-none flex flex-col items-end select-none">
      <AnimatePresence>
        {isIslandVisible && (
          <div
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            className="flex flex-col items-end relative w-auto min-w-[340px] sm:min-w-[420px] max-w-[calc(100vw-2rem)]"
          >
            {/* Main Dynamic Island Capsule - Super Sleek, Compact Pill */}
            <motion.div
              layout
              initial={{
                scale: 0.84,
                opacity: 0,
                y: -20,
                filter: 'blur(10px)',
              }}
              animate={{
                scale: 1,
                opacity: 1,
                y: 0,
                filter: 'blur(0px)',
              }}
              exit={{
                scale: 0.86,
                opacity: 0,
                y: -18,
                filter: 'blur(8px)',
                transition: { duration: 0.22, ease: [0.16, 1, 0.3, 1] },
              }}
              transition={{
                type: 'spring',
                duration: 0.35,
                bounce: 0.28,
              }}
              className={cn(
                'pointer-events-auto relative z-20 w-full flex items-center justify-between gap-3 sm:gap-4 px-4 py-2.5 sm:px-5 sm:py-3 rounded-full',
                'bg-black/50 backdrop-blur-2xl border border-white/15',
                'shadow-[0_25px_60px_-12px_rgba(0,0,0,0.85),0_0_25px_rgba(255,255,255,0.04),inset_0_1px_1px_rgba(255,255,255,0.18)]'
              )}
            >
              {/* Top Gloss Highlight Sheen */}
              <div className="absolute inset-x-8 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none" />

              {/* Left: Clickable Mini Vinyl Button + Live Active Song Title */}
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <button
                  type="button"
                  onClick={togglePlaylist}
                  className={cn(
                    'relative group/vinyl p-0.5 rounded-full transition-all flex-shrink-0 active:scale-95 focus-visible:outline-none',
                    isPlaylistOpen
                      ? 'ring-2 ring-white/80 ring-offset-2 ring-offset-black scale-105'
                      : 'hover:ring-2 hover:ring-white/40'
                  )}
                  title={`Click to view queue (${currentTracks.length} songs)`}
                  aria-label="Toggle song list"
                >
                  <div
                    className={cn(
                      'w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-gradient-to-tr from-black via-zinc-900 to-black border border-white/25 flex items-center justify-center flex-shrink-0 shadow-lg relative overflow-hidden',
                      isPlaying && 'animate-[spin_3s_linear_infinite]'
                    )}
                  >
                    {/* Vinyl Grooves */}
                    <div className="absolute inset-1 rounded-full border border-white/10 opacity-70" />
                    <div className="absolute inset-2 rounded-full border border-white/10 opacity-50" />
                    
                    {/* Center Category Themed Label */}
                    <div
                      className={cn(
                        'relative w-4 h-4 rounded-full bg-gradient-to-tr flex items-center justify-center shadow-inner',
                        activeVinyl.accent.labelGradient
                      )}
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-black border border-white/30" />
                    </div>
                  </div>
                </button>

                {/* Song Title & Artist Readout */}
                <div className="flex flex-col min-w-0 flex-1 pr-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="font-heading font-black text-xs sm:text-sm text-white truncate tracking-tight overflow-hidden text-ellipsis whitespace-nowrap block"
                      title={currentTrackTitle}
                    >
                      {currentTrackTitle || 'Auction Vibes'}
                    </span>
                    {isPlaying && (
                      <div className="flex items-end gap-[1.5px] h-3 flex-shrink-0">
                        <span className="w-[2px] bg-[var(--gold)] rounded-full animate-[bounce_0.8s_infinite_100ms] h-full" />
                        <span className="w-[2px] bg-[var(--gold)] rounded-full animate-[bounce_0.6s_infinite_200ms] h-2/3" />
                        <span className="w-[2px] bg-[var(--gold)] rounded-full animate-[bounce_0.9s_infinite_50ms] h-4/5" />
                      </div>
                    )}
                  </div>
                  <span className="text-[11px] font-mono text-white/60 truncate overflow-hidden text-ellipsis whitespace-nowrap block">
                    {currentTrackAuthor || activeVinyl.title}
                  </span>
                </div>
              </div>

              {/* Center: Playback Controls */}
              <div className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0">
                <button
                  type="button"
                  onClick={prevTrack}
                  className="h-8 w-8 rounded-full flex items-center justify-center text-white/75 hover:text-white hover:bg-white/10 transition-colors"
                  title="Previous Track"
                  aria-label="Previous Track"
                >
                  <SkipBack className="h-4 w-4" />
                </button>

                <button
                  type="button"
                  onClick={togglePlay}
                  className={cn(
                    'h-9 w-9 sm:h-10 sm:w-10 rounded-full flex items-center justify-center font-bold transition-all duration-200 shadow-lg',
                    isPlaying
                      ? 'bg-gradient-to-tr from-amber-500 via-[var(--gold)] to-amber-300 text-black shadow-gold scale-105 hover:scale-110'
                      : 'bg-white/15 text-white hover:bg-white/25 hover:text-[var(--gold)]'
                  )}
                  title={isPlaying ? 'Pause' : 'Play'}
                  aria-label={isPlaying ? 'Pause' : 'Play'}
                >
                  {isPlaying ? (
                    <Pause className="h-4 w-4 fill-current" />
                  ) : (
                    <Play className="h-4 w-4 fill-current ml-0.5" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={nextTrack}
                  className="h-8 w-8 rounded-full flex items-center justify-center text-white/75 hover:text-white hover:bg-white/10 transition-colors"
                  title="Next Track"
                  aria-label="Next Track"
                >
                  <SkipForward className="h-4 w-4" />
                </button>
              </div>

              {/* Right: Compact Volume & Close */}
              <div className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0">
                <button
                  type="button"
                  onClick={toggleMute}
                  className="text-white/75 hover:text-white transition-colors p-1.5 rounded-full hover:bg-white/10"
                  title={isMuted || volume === 0 ? 'Unmute' : 'Mute'}
                  aria-label={isMuted || volume === 0 ? 'Unmute' : 'Mute'}
                >
                  {isMuted || volume === 0 ? (
                    <VolumeX className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Volume2 className="h-4 w-4 text-[var(--gold)]" />
                  )}
                </button>

                <div className="w-12 sm:w-16 flex items-center">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={isMuted ? 0 : volume}
                    onChange={handleVolumeChange}
                    className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-[var(--gold)] hover:bg-white/30 transition-all"
                    title={`Volume: ${isMuted ? 0 : volume}%`}
                    aria-label="Volume Control"
                  />
                </div>

                <button
                  type="button"
                  onClick={hideIsland}
                  className="h-7 w-7 rounded-full flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-colors ml-0.5"
                  title="Close Dynamic Island"
                  aria-label="Close"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </motion.div>

            {/* Clean Pop-down Queue Drawer */}
            <AnimatePresence>
              {isPlaylistOpen && (
                <motion.div
                  initial={{
                    opacity: 0,
                    y: -14,
                    scale: 0.96,
                    filter: 'blur(8px)',
                  }}
                  animate={{
                    opacity: 1,
                    y: 0,
                    scale: 1,
                    filter: 'blur(0px)',
                  }}
                  exit={{
                    opacity: 0,
                    y: -12,
                    scale: 0.96,
                    filter: 'blur(6px)',
                    transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] },
                  }}
                  transition={{
                    type: 'spring',
                    duration: 0.35,
                    bounce: 0.25,
                  }}
                  className={cn(
                    'pointer-events-auto mt-2 w-full rounded-3xl p-3.5 z-10',
                    'bg-black/45 backdrop-blur-3xl border border-white/15',
                    'shadow-[0_25px_60px_-10px_rgba(0,0,0,0.85),0_0_20px_rgba(255,255,255,0.04),inset_0_1px_1px_rgba(255,255,255,0.15)]'
                  )}
                >
                  {/* Popdown Header */}
                  <div className="flex items-center justify-between px-3 py-2 border-b border-white/10 text-xs font-mono font-bold">
                    <span className="flex items-center gap-2 text-white">
                      <ListMusic className="h-4 w-4 text-[var(--gold)]" />
                      <span className="uppercase">{activeVinyl.title}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-white/90">
                        {currentTracks.length} SONGS
                      </span>
                    </span>

                    <button
                      type="button"
                      onClick={closePlaylist}
                      className="text-white/60 hover:text-white text-xs px-2.5 py-1 rounded-md hover:bg-white/10 transition-colors"
                    >
                      Done
                    </button>
                  </div>

                  {/* Scrollable Song List Queue */}
                  <div className="mt-2 max-h-72 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                    {currentTracks.map((track) => {
                      const isCurrent = currentTrackIndex === track.index;
                      return (
                        <button
                          key={track.id + '-' + track.index}
                          type="button"
                          onClick={() => playTrackAtIndex(track.index)}
                          className={cn(
                            'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-150',
                            isCurrent
                              ? 'bg-white/15 border border-white/25 text-white shadow-sm backdrop-blur-md'
                              : 'hover:bg-white/10 text-white/70 hover:text-white border border-transparent'
                          )}
                        >
                          {/* Track Number / Playing Indicator */}
                          <span
                            className={cn(
                              'text-xs font-mono font-bold w-6 text-center tabular-nums flex-shrink-0',
                              isCurrent ? 'text-white' : 'text-white/40'
                            )}
                          >
                            {isCurrent && isPlaying ? (
                              <span className="inline-block w-2 h-2 rounded-full bg-white animate-ping" />
                            ) : (
                              String(track.index + 1).padStart(2, '0')
                            )}
                          </span>

                          {/* Track Info */}
                          <div className="flex-1 min-w-0">
                            <p
                              className={cn(
                                'text-xs sm:text-sm truncate',
                                isCurrent ? 'text-white font-bold' : 'text-white/90 font-medium'
                              )}
                            >
                              {track.title}
                            </p>
                            <p className="text-[11px] text-white/50 truncate font-mono">
                              {track.author}
                            </p>
                          </div>

                          {/* Monochromatic Playing Badge */}
                          {isCurrent && (
                            <span className="text-[9.5px] font-mono font-black uppercase px-2 py-0.5 rounded-md bg-white text-black tracking-wider flex-shrink-0 shadow-sm">
                              PLAYING
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
