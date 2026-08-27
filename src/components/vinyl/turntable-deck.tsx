'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Volume2,
  VolumeX,
  Disc3,
  Radio,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { VinylCategory } from '@/lib/music-playlists';
import { useMusicStore, formatTime } from '@/lib/music-store';

interface TurntableDeckProps {
  activeVinyl: VinylCategory;
  className?: string;
}

export function TurntableDeck({ activeVinyl, className }: TurntableDeckProps) {
  const {
    isPlaying,
    currentTrackTitle,
    currentTrackAuthor,
    currentTime,
    duration,
    volume,
    isMuted,
    togglePlay,
    nextTrack,
    prevTrack,
    seekTo,
    setIsSeeking,
    setVolume,
    toggleMute,
  } = useMusicStore();

  const [seekVal, setSeekVal] = useState<number | null>(null);

  const activeTime = seekVal !== null ? seekVal : currentTime;
  const progressPercent = duration > 0 ? (activeTime / duration) * 100 : 0;

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setSeekVal(val);
    setIsSeeking(true);
  };

  const handleSeekCommit = (e: React.ChangeEvent<HTMLInputElement> | React.MouseEvent | React.TouchEvent) => {
    const target = e.target as HTMLInputElement;
    const val = parseFloat(target.value);
    seekTo(val);
    setSeekVal(null);
    setIsSeeking(false);
  };

  return (
    <div className={cn('relative w-full max-w-4xl mx-auto flex flex-col items-center select-none', className)}>
      {/* Ambient Radial Lighting Glow Behind Turntable */}
      <div
        className="absolute -inset-6 sm:-inset-10 rounded-[36px] opacity-35 blur-3xl transition-all duration-700 pointer-events-none"
        style={{
          background: `radial-gradient(circle, ${activeVinyl.accent.glow} 0%, rgba(234, 179, 8, 0.08) 45%, transparent 70%)`,
        }}
      />

      {/* Main Turntable Stage Container with Apple-grade Translucent Glass */}
      <div className="relative w-full aspect-[16/9] max-w-3xl rounded-[32px] overflow-hidden border border-white/15 bg-black/40 backdrop-blur-3xl shadow-[0_30px_90px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.18)] flex items-center justify-center group">
        {/* Top Gloss Sheen Edge */}
        <div className="absolute inset-x-12 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none z-20" />

        {/* Base Turntable Background Image */}
        <Image
          src="/vinyl-player.png"
          alt="Turntable Vinyl Player"
          fill
          priority
          sizes="(max-width: 768px) 100vw, 800px"
          className="object-contain pointer-events-none drop-shadow-2xl scale-[1.02]"
        />

        {/* 1. Real-time Spinning Vinyl Record Mounted on the Platter */}
        {/* Platter center is at 48.75% X, 50% Y in the reference image */}
        <div
          className="absolute z-10 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-auto cursor-pointer"
          style={{
            left: '48.75%',
            top: '50%',
            width: '38%',
            height: '67.5%',
          }}
          onClick={togglePlay}
          title={isPlaying ? 'Click to pause turntable' : 'Click to start spinning record'}
        >
          {/* Vinyl Disc Body with realistic grooves and continuous smooth spinning */}
          <div
            className={cn(
              'relative w-full h-full rounded-full',
              'bg-gradient-to-tr from-[#050505] via-[#121212] to-[#080808]',
              'border-[3px] border-white/20',
              'shadow-[0_15px_35px_rgba(0,0,0,0.85),inset_0_0_20px_rgba(0,0,0,0.9)]',
              'flex items-center justify-center overflow-hidden',
              isPlaying && 'animate-[spin_4s_linear_infinite]'
            )}
          >
            {/* Concentric Audio Grooves */}
            <div className="absolute inset-2 rounded-full border border-white/[0.08]" />
            <div className="absolute inset-4 rounded-full border border-white/[0.07]" />
            <div className="absolute inset-6 rounded-full border border-white/[0.08]" />
            <div className="absolute inset-8 rounded-full border border-white/[0.07]" />
            <div className="absolute inset-10 rounded-full border border-white/[0.09]" />
            <div className="absolute inset-12 rounded-full border border-white/[0.06]" />
            <div className="absolute inset-14 rounded-full border border-white/[0.08]" />
            <div className="absolute inset-16 rounded-full border border-white/[0.06]" />

            {/* Center Album Category Label */}
            <div
              className={cn(
                'relative w-[38%] h-[38%] rounded-full shadow-inner border border-white/30',
                'flex flex-col items-center justify-center text-center p-1.5',
                activeVinyl.accent.labelGradient
              )}
            >
              {/* Spindle center hole */}
              <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-zinc-950 border-2 border-white/40 shadow-inner flex items-center justify-center">
                <div className="w-1 h-1 rounded-full bg-zinc-400" />
              </div>

              {/* Category mini wordmark in clean crisp white */}
              <span className="text-[8px] sm:text-[9.5px] font-mono font-black text-white uppercase tracking-wider truncate max-w-[85%] mt-0.5 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                {activeVinyl.category.split(' ')[0]}
              </span>
              <span className="text-[6.5px] sm:text-[7.5px] font-mono font-bold text-white/90 uppercase tracking-widest truncate max-w-[85%] drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]">
                33 RPM
              </span>
            </div>

            {/* Realistic Light Glare Reflection Sheen */}
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/15 to-transparent pointer-events-none -skew-y-12" />
            <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/10 to-transparent pointer-events-none skew-x-12" />
          </div>
        </div>

        {/* 2. Interactive Animated Tonearm Overlay */}
        {/* Pivot is at 67.5% X, 31% Y */}
        <motion.div
          initial={false}
          animate={{
            rotate: isPlaying ? 19 : 0,
          }}
          transition={{
            type: 'spring',
            stiffness: 70,
            damping: 14,
            mass: 0.8,
          }}
          style={{
            left: '67.5%',
            top: '31%',
            transformOrigin: 'top center',
            width: '24px',
            height: '46%',
          }}
          className="absolute z-20 pointer-events-none"
        >
          {/* Subtle drop shadow of the tonearm moving across the vinyl */}
          <div className="w-1.5 h-full mx-auto bg-transparent relative">
            {/* Tone arm head cartridge light / indicator */}
            {isPlaying && (
              <div className="absolute bottom-0 -left-1 w-3.5 h-3.5 rounded-full bg-amber-400/30 blur-sm animate-pulse" />
            )}
          </div>
        </motion.div>

        {/* 3. Interactive Power Switch Hitbox */}
        {/* Switch is located at 33.3% X, 75.2% Y */}
        <button
          type="button"
          onClick={togglePlay}
          style={{
            left: '33.3%',
            top: '75.2%',
            transform: 'translate(-50%, -50%)',
            width: '7.5%',
            height: '8%',
          }}
          className="absolute z-20 rounded-md cursor-pointer group/switch focus-visible:outline-none transition-all hover:ring-2 hover:ring-[var(--gold)]/60"
          title={isPlaying ? 'Switch Turntable OFF' : 'Switch Turntable ON'}
          aria-label="Power Switch"
        >
          {/* LED Glow Indicator over switch */}
          <div
            className={cn(
              'absolute -top-1 -right-1 w-2 h-2 rounded-full transition-all',
              isPlaying
                ? 'bg-emerald-400 shadow-[0_0_8px_#34d399] animate-pulse'
                : 'bg-red-500/60 shadow-[0_0_4px_rgba(239,68,68,0.4)]'
            )}
          />
        </button>

        {/* Live Audio Waves / Status Indicator (Top Right Corner Overlay) */}
        <div className="absolute top-4 right-4 z-20 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-2xl border border-white/15 shadow-[0_10px_30px_rgba(0,0,0,0.6),inset_0_1px_1px_rgba(255,255,255,0.15)]">
          <span
            className={cn(
              'w-2 h-2 rounded-full',
              isPlaying ? 'bg-emerald-400 animate-ping' : 'bg-white/40'
            )}
          />
          <span className="text-[11px] font-mono font-bold tracking-wider text-white uppercase">
            {isPlaying ? 'SPINNING • 33 RPM' : 'DECK IDLE'}
          </span>
          {isPlaying && (
            <div className="flex items-end gap-0.5 h-3 ml-1">
              <span className="w-0.5 bg-[var(--gold)] rounded-full animate-[bounce_0.8s_infinite_50ms] h-full" />
              <span className="w-0.5 bg-[var(--gold)] rounded-full animate-[bounce_0.6s_infinite_150ms] h-2/3" />
              <span className="w-0.5 bg-[var(--gold)] rounded-full animate-[bounce_0.9s_infinite_100ms] h-4/5" />
            </div>
          )}
        </div>

        {/* Currently Playing Track Glass Tag (Bottom Right Corner) */}
        <div className="absolute bottom-4 right-4 z-20 max-w-[260px] sm:max-w-[320px] px-4 py-2.5 rounded-2xl bg-black/50 backdrop-blur-2xl border border-white/15 shadow-[0_20px_40px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.15)] flex items-center gap-3">
          <div
            className={cn(
              'w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 shadow-md',
              activeVinyl.accent.labelGradient
            )}
          >
            <Disc3 className={cn('h-5 w-5 text-black', isPlaying && 'animate-spin')} />
          </div>
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-xs font-heading font-bold text-white truncate">
              {currentTrackTitle || activeVinyl.title}
            </span>
            <span className="text-[10.5px] font-mono text-white/60 truncate">
              {currentTrackAuthor || activeVinyl.category}
            </span>
          </div>
        </div>
      </div>

      {/* Floating Tactical Audio Control Bar with Dynamic Island Glass */}
      <div className="w-full mt-4 p-4 sm:p-5 rounded-3xl bg-black/40 backdrop-blur-3xl border border-white/15 shadow-[0_25px_60px_-12px_rgba(0,0,0,0.85),0_0_20px_rgba(255,255,255,0.03),inset_0_1px_1px_rgba(255,255,255,0.18)] flex flex-col gap-3 relative overflow-hidden">
        {/* Top Highlight Sheen */}
        <div className="absolute inset-x-8 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none" />

        {/* Progress / Seek Bar */}
        <div className="w-full flex items-center gap-3 px-1">
          <span className="text-[11px] font-mono text-white/70 tabular-nums w-10 text-left">
            {formatTime(activeTime)}
          </span>

          <div className="relative flex-1 flex items-center group/seek">
            <input
              type="range"
              min="0"
              max={duration || 100}
              step="0.5"
              value={activeTime}
              onChange={handleSeekChange}
              onMouseUp={handleSeekCommit}
              onTouchEnd={handleSeekCommit}
              className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-[var(--gold)] group-hover/seek:h-2 transition-all"
              title={`Seek: ${formatTime(activeTime)} / ${formatTime(duration)}`}
              aria-label="Track progress seek bar"
            />
          </div>

          <span className="text-[11px] font-mono text-white/70 tabular-nums w-10 text-right">
            {formatTime(duration)}
          </span>
        </div>

        {/* Controls Row */}
        <div className="flex items-center justify-between gap-4">
          {/* Left: Active Vinyl Badge */}
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'px-3 py-1 rounded-full text-xs font-mono font-bold uppercase tracking-wider border flex items-center gap-1.5 shadow-sm',
                activeVinyl.accent.pillBg,
                activeVinyl.accent.pillText,
                activeVinyl.accent.badgeBorder
              )}
            >
              <Radio className="h-3.5 w-3.5" />
              {activeVinyl.category}
            </span>
            <span className="text-xs font-mono text-white/50 hidden sm:inline-block">
              {activeVinyl.songs.length} Tracks
            </span>
          </div>

          {/* Center: Main Playback Controls */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={prevTrack}
              className="h-9 w-9 rounded-full flex items-center justify-center text-white/80 hover:text-white hover:bg-white/10 transition-colors"
              title="Previous Track"
            >
              <SkipBack className="h-4.5 w-4.5" />
            </button>

            <button
              type="button"
              onClick={togglePlay}
              className={cn(
                'h-11 w-11 rounded-full flex items-center justify-center font-bold transition-all duration-200 shadow-xl',
                isPlaying
                  ? 'bg-gradient-to-tr from-amber-500 via-[var(--gold)] to-amber-300 text-black shadow-gold scale-105 hover:scale-110'
                  : 'bg-white/15 text-white hover:bg-white/25 hover:text-[var(--gold)] hover:scale-105'
              )}
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <Pause className="h-5 w-5 fill-current" />
              ) : (
                <Play className="h-5 w-5 fill-current ml-0.5" />
              )}
            </button>

            <button
              type="button"
              onClick={nextTrack}
              className="h-9 w-9 rounded-full flex items-center justify-center text-white/80 hover:text-white hover:bg-white/10 transition-colors"
              title="Next Track"
            >
              <SkipForward className="h-4.5 w-4.5" />
            </button>
          </div>

          {/* Right: Volume & Mute */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleMute}
              className="text-white/80 hover:text-white transition-colors p-1.5 rounded-full hover:bg-white/10"
              title={isMuted || volume === 0 ? 'Unmute' : 'Mute'}
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="h-4.5 w-4.5 text-red-400" />
              ) : (
                <Volume2 className="h-4.5 w-4.5 text-[var(--gold)]" />
              )}
            </button>

            <div className="w-16 sm:w-24">
              <input
                type="range"
                min="0"
                max="100"
                value={isMuted ? 0 : volume}
                onChange={(e) => setVolume(parseInt(e.target.value, 10))}
                className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-[var(--gold)] hover:bg-white/30 transition-all"
                title={`Volume: ${isMuted ? 0 : volume}%`}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
