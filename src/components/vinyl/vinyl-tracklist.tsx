'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  Pause,
  Search,
  Music,
  Plus,
  ExternalLink,
  Copy,
  Check,
  Database,
  Sparkles,
  ArrowLeftRight,
  Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { VinylCategory } from '@/lib/music-playlists';
import { useMusicStore, PlaylistTrack } from '@/lib/music-store';
import { toast } from 'sonner';

interface VinylTracklistProps {
  activeVinyl: VinylCategory;
  currentTracks: PlaylistTrack[];
  className?: string;
}

export function parseSongAndArtist(rawInput: string): { title: string; artist: string } {
  const trimmed = rawInput.trim();
  if (!trimmed) {
    return { title: '', artist: '' };
  }

  // Pattern 1: "Song Title - Artist Name"
  if (trimmed.includes(' - ') || trimmed.includes(' – ') || trimmed.includes(' — ')) {
    const parts = trimmed.split(/ [-–—] /);
    if (parts.length >= 2) {
      return {
        title: parts[0].trim(),
        artist: parts.slice(1).join(' - ').trim(),
      };
    }
  }

  // Pattern 2: "Song Title by Artist Name"
  if (trimmed.toLowerCase().includes(' by ')) {
    const parts = trimmed.split(/ by /i);
    if (parts.length >= 2) {
      return {
        title: parts[0].trim(),
        artist: parts.slice(1).join(' by ').trim(),
      };
    }
  }

  // Fallback: Entire input is Song Title
  return {
    title: trimmed,
    artist: 'Original Soundtrack',
  };
}

export function VinylTracklist({
  activeVinyl,
  currentTracks,
  className,
}: VinylTracklistProps) {
  const {
    isPlaying,
    currentTrackIndex,
    playTrackAtIndex,
    togglePlay,
    addSongLocallyAndPersist,
    fetchVinylsFromDB,
  } = useMusicStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [showAddInfo, setShowAddInfo] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // Single unified song input field
  const [songInput, setSongInput] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [isSwapped, setIsSwapped] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredTracks = currentTracks.filter((track) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      track.title.toLowerCase().includes(q) ||
      track.author.toLowerCase().includes(q)
    );
  });

  // Real-time live parsed title & artist
  const parsed = useMemo(() => {
    const res = parseSongAndArtist(songInput);
    if (isSwapped && res.artist !== 'Original Soundtrack') {
      return { title: res.artist, artist: res.title };
    }
    return res;
  }, [songInput, isSwapped]);

  const exampleAddCode = `// SQLite Database table \`vinyl_songs\` structure:
{
  title: 'Feels Like Summer',
  artist: 'Childish Gambino',
  url: 'https://www.youtube.com/watch?v=F1B9Fk_SgI0',
}`;

  const copyCodeToClipboard = () => {
    navigator.clipboard.writeText(exampleAddCode);
    setCopiedCode(true);
    toast.success('Snippet copied to clipboard!');
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleAddSongSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!songInput.trim() || !newUrl.trim()) {
      toast.error('Please provide the song name and YouTube link');
      return;
    }

    const { title, artist } = parsed;

    setIsSubmitting(true);
    try {
      const success = await addSongLocallyAndPersist(activeVinyl.id, {
        title,
        artist,
        url: newUrl.trim(),
      });

      if (success) {
        toast.success(`Added "${title}" by ${artist}!`);
        setSongInput('');
        setNewUrl('');
        setIsSwapped(false);
        setShowAddInfo(false);
      } else {
        toast.error('Failed to add song to database');
      }
    } catch (err) {
      toast.error('Network error saving song');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSong = async (songTitle: string) => {
    try {
      const res = await fetch('/api/music', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vinylId: activeVinyl.id, title: songTitle }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Removed "${songTitle}"`);
        fetchVinylsFromDB();
      }
    } catch (e) {
      toast.error('Could not remove song');
    }
  };

  return (
    <div className={cn('w-full max-w-4xl mx-auto flex flex-col gap-4 select-none', className)}>
      {/* Header Row: Title, Search Bar & Add Track Button */}
      <div className="relative overflow-hidden flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 sm:p-5 rounded-3xl bg-black/40 backdrop-blur-3xl border border-white/15 shadow-[0_25px_60px_-10px_rgba(0,0,0,0.85),0_0_20px_rgba(255,255,255,0.03),inset_0_1px_1px_rgba(255,255,255,0.18)]">
        {/* Top Highlight Sheen */}
        <div className="absolute inset-x-8 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none" />

        {/* Left: Collection Details */}
        <div className="flex items-center gap-3.5 min-w-0">
          <div
            className={cn(
              'w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-md border border-white/25',
              activeVinyl.accent.labelGradient
            )}
          >
            <Music className="h-5 w-5 text-black" />
          </div>

          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-heading font-black text-base sm:text-lg text-white truncate">
                {activeVinyl.title}
              </h3>
              <span
                className={cn(
                  'px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider border shadow-sm',
                  activeVinyl.accent.pillBg,
                  activeVinyl.accent.pillText,
                  activeVinyl.accent.badgeBorder
                )}
              >
                {filteredTracks.length} of {currentTracks.length} Songs
              </span>
            </div>
            <p className="text-xs text-white/60 truncate">
              {activeVinyl.description}
            </p>
          </div>
        </div>

        {/* Right: Search & Add Track Modal Trigger */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          {/* Search Box */}
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/40" />
            <input
              type="text"
              placeholder="Search tracks or artists..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/5 border border-white/15 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder:text-white/40 focus:outline-none focus:border-white/40 focus:bg-white/10 transition-all"
            />
          </div>

          {/* Add Song Helper Button */}
          <button
            type="button"
            onClick={() => setShowAddInfo(!showAddInfo)}
            className={cn(
              'flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-mono font-bold transition-all border flex-shrink-0 shadow-sm',
              showAddInfo
                ? 'bg-white text-black border-white'
                : 'bg-white/10 text-white/80 hover:text-white hover:bg-white/15 border-white/15'
            )}
            title="Add songs to database"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Song</span>
          </button>
        </div>
      </div>

      {/* Add Song to Database Form & Info Dropdown */}
      <AnimatePresence>
        {showAddInfo && (
          <motion.div
            initial={{ opacity: 0, height: 0, y: -10 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0, y: -10 }}
            className="overflow-hidden"
          >
            <div className="p-5 rounded-3xl bg-black/50 backdrop-blur-3xl border border-white/15 shadow-[0_25px_60px_-10px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.18)] flex flex-col gap-4 relative">
              <div className="absolute inset-x-8 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none" />

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-mono font-bold text-[var(--gold)]">
                  <Database className="h-4 w-4" />
                  <span>ADD TRACK TO {activeVinyl.title.toUpperCase()}</span>
                </div>
                <button
                  type="button"
                  onClick={copyCodeToClipboard}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-[11px] font-mono text-white transition-colors"
                >
                  {copiedCode ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copiedCode ? 'Copied' : 'Copy Schema'}</span>
                </button>
              </div>

              {/* Single Unified Name Form */}
              <form onSubmit={handleAddSongSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="text-[11px] font-mono text-white/80 block mb-1">
                    Song Name * <span className="text-[10px] text-white/50">(e.g. Feels Like Summer - Childish Gambino)</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Enter: Song Title - Artist..."
                    value={songInput}
                    onChange={(e) => setSongInput(e.target.value)}
                    className="w-full bg-white/5 border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-white/40 focus:bg-white/10 transition-all"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-mono text-white/80 block mb-1">
                    YouTube Link or Video ID *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="https://www.youtube.com/watch?v=..."
                    value={newUrl}
                    onChange={(e) => setNewUrl(e.target.value)}
                    className="w-full bg-white/5 border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-white/40 focus:bg-white/10 transition-all"
                  />
                </div>

                {/* Real-time Live Preview Badge & Swap Button */}
                {songInput.trim().length > 0 && (
                  <div className="sm:col-span-2 flex items-center justify-between p-2.5 rounded-2xl bg-white/5 border border-white/10">
                    <div className="flex items-center gap-3 text-xs">
                      <Sparkles className="h-4 w-4 text-[var(--gold)] flex-shrink-0" />
                      <div className="flex items-center gap-2">
                        <span className="text-white/50 text-[11px] font-mono">Title:</span>
                        <span className="font-bold text-white text-xs">{parsed.title || '—'}</span>
                        <span className="text-white/30">•</span>
                        <span className="text-white/50 text-[11px] font-mono">Artist:</span>
                        <span className="text-white/80 font-mono text-xs">{parsed.artist || '—'}</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsSwapped(!isSwapped)}
                      className="flex items-center gap-1 text-[11px] font-mono text-white/70 hover:text-white px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                      title="Swap Title and Artist"
                    >
                      <ArrowLeftRight className="h-3 w-3" />
                      <span>Swap</span>
                    </button>
                  </div>
                )}

                <div className="sm:col-span-2 flex items-center justify-end pt-1">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-2.5 rounded-xl bg-white text-black font-mono font-bold text-xs hover:bg-white/90 transition-all disabled:opacity-50 shadow-md"
                  >
                    {isSubmitting ? 'Saving to Database...' : 'Save Track'}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tracklist Table / Card Queue with Dark Apple Glass */}
      <div className="relative rounded-3xl bg-black/40 backdrop-blur-3xl border border-white/15 overflow-hidden shadow-[0_25px_60px_-10px_rgba(0,0,0,0.85),0_0_20px_rgba(255,255,255,0.03),inset_0_1px_1px_rgba(255,255,255,0.18)]">
        <div className="absolute inset-x-8 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none" />

        {filteredTracks.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center gap-2 text-white/50">
            <Search className="h-8 w-8 text-white/30 mb-2" />
            <p className="text-sm font-medium text-white/70">No tracks match "{searchQuery}"</p>
            <p className="text-xs text-white/40">Try searching for another song title or artist name</p>
          </div>
        ) : (
          <div className="divide-y divide-white/10">
            {filteredTracks.map((track) => {
              const isCurrent = currentTrackIndex === track.index;
              const isCurrentPlaying = isCurrent && isPlaying;

              return (
                <div
                  key={track.id + '-' + track.index}
                  onClick={() => {
                    if (isCurrent) {
                      togglePlay();
                    } else {
                      playTrackAtIndex(track.index);
                    }
                  }}
                  className={cn(
                    'w-full flex items-center justify-between gap-3 px-4 py-3.5 sm:px-6 sm:py-4 cursor-pointer transition-all duration-150 group',
                    isCurrent
                      ? 'bg-white/15 text-white shadow-sm backdrop-blur-md'
                      : 'hover:bg-white/5 text-white/80 hover:text-white'
                  )}
                >
                  {/* Left: Index / Play Button + Song Info */}
                  <div className="flex items-center gap-4 min-w-0 flex-1">
                    {/* Index or Live Play Button */}
                    <div className="relative w-8 h-8 flex items-center justify-center flex-shrink-0">
                      <span
                        className={cn(
                          'text-xs font-mono font-bold tabular-nums transition-opacity',
                          isCurrent ? 'text-[var(--gold)]' : 'text-white/40 group-hover:opacity-0',
                          isCurrentPlaying && 'hidden'
                        )}
                      >
                        {String(track.index + 1).padStart(2, '0')}
                      </span>

                      {/* Equalizer when playing */}
                      {isCurrentPlaying && (
                        <div className="flex items-end gap-[2px] h-3.5">
                          <span className="w-1 bg-[var(--gold)] rounded-full animate-[bounce_0.8s_infinite_100ms] h-full" />
                          <span className="w-1 bg-[var(--gold)] rounded-full animate-[bounce_0.6s_infinite_200ms] h-2/3" />
                          <span className="w-1 bg-[var(--gold)] rounded-full animate-[bounce_0.9s_infinite_50ms] h-4/5" />
                        </div>
                      )}

                      {/* Hover Play / Pause Button */}
                      <button
                        type="button"
                        className={cn(
                          'absolute inset-0 m-auto w-7 h-7 rounded-full flex items-center justify-center transition-all shadow-md',
                          isCurrent
                            ? 'opacity-100 bg-white text-black'
                            : 'opacity-0 group-hover:opacity-100 bg-white/20 text-white hover:bg-white hover:text-black'
                        )}
                      >
                        {isCurrentPlaying ? (
                          <Pause className="h-3.5 w-3.5 fill-current" />
                        ) : (
                          <Play className="h-3.5 w-3.5 fill-current ml-0.5" />
                        )}
                      </button>
                    </div>

                    {/* Track Title (Bigger Top) & Artist (Smaller Bottom) */}
                    <div className="flex flex-col min-w-0 flex-1">
                      <p
                        className={cn(
                          'text-xs sm:text-sm truncate font-bold',
                          isCurrent ? 'text-white' : 'text-white/90 group-hover:text-white'
                        )}
                      >
                        {track.title}
                      </p>
                      <p className="text-[11px] text-white/55 truncate font-mono">
                        {track.author}
                      </p>
                    </div>
                  </div>

                  {/* Right: Playing Badge & External Link & Delete */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {isCurrent && (
                      <span className="text-[9.5px] font-mono font-black uppercase px-2.5 py-1 rounded-lg bg-white text-black tracking-wider shadow-sm flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                        {isPlaying ? 'PLAYING' : 'PAUSED'}
                      </span>
                    )}

                    {track.rawUrl && (
                      <a
                        href={track.rawUrl}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-white/30 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/10"
                        title="Open on YouTube"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}

                    {/* Delete button for custom added tracks */}
                    {track.index >= 43 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteSong(track.title);
                        }}
                        className="text-white/20 hover:text-red-400 transition-colors p-1.5 rounded-lg hover:bg-white/10"
                        title={`Delete ${track.title}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
