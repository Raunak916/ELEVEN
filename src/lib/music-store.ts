import { create } from 'zustand';
import { VINYL_CATEGORIES, VinylCategory, VinylSong, extractYouTubeId } from './music-playlists';

export interface PlaylistTrack {
  index: number;
  id: string;
  title: string;
  author: string;
  rawUrl: string;
}

export function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function mapSongsToTracks(songs: VinylSong[]): PlaylistTrack[] {
  return (songs || []).map((song, index) => ({
    index,
    id: extractYouTubeId(song.url),
    title: song.title,
    author: song.artist,
    rawUrl: song.url,
  }));
}

// Export default tracks for backwards compatibility
export const PLAYLIST_TRACKS: PlaylistTrack[] = mapSongsToTracks(VINYL_CATEGORIES[0].songs);

interface MusicStoreState {
  isPlaying: boolean;
  isReady: boolean;
  volume: number;
  isMuted: boolean;
  prevVolume: number;
  isIslandVisible: boolean;
  isPlaylistOpen: boolean;

  // Multi-Vinyl Infrastructure
  vinyls: VinylCategory[];
  activeVinylId: string;
  currentTracks: PlaylistTrack[];

  currentTrackIndex: number;
  currentTrackTitle: string;
  currentTrackAuthor: string;
  currentTime: number;
  duration: number;
  isSeeking: boolean;
  timerRef: NodeJS.Timeout | null;
  playerInstance: any | null;

  setIsPlaying: (isPlaying: boolean) => void;
  setIsReady: (isReady: boolean) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  togglePlay: () => void;
  play: () => void;
  pause: () => void;
  nextTrack: () => void;
  prevTrack: () => void;
  selectVinyl: (vinylId: string, autoPlay?: boolean) => void;
  playTrackInVinyl: (vinylId: string, trackIndex: number) => void;
  playTrackAtIndex: (index: number) => void;
  seekTo: (seconds: number) => void;
  setTimeData: (currentTime: number, duration: number) => void;
  setIsSeeking: (isSeeking: boolean) => void;
  showIsland: (durationMs?: number) => void;
  hideIsland: () => void;
  keepIslandOpen: () => void;
  togglePlaylist: () => void;
  closePlaylist: () => void;
  syncCurrentTrackFromPlayer: () => void;
  registerPlayer: (player: any) => void;

  // Database Sync Methods
  setVinyls: (vinyls: VinylCategory[]) => void;
  fetchVinylsFromDB: () => Promise<void>;
  addSongLocallyAndPersist: (vinylId: string, song: VinylSong) => Promise<boolean>;
}

const initialVinyl = VINYL_CATEGORIES[0];
const initialTracks = mapSongsToTracks(initialVinyl.songs);

export const useMusicStore = create<MusicStoreState>((set, get) => ({
  isPlaying: false,
  isReady: false,
  volume: 50,
  isMuted: false,
  prevVolume: 50,
  isIslandVisible: false,
  isPlaylistOpen: false,

  vinyls: VINYL_CATEGORIES,
  activeVinylId: initialVinyl.id,
  currentTracks: initialTracks,

  currentTrackIndex: 0,
  currentTrackTitle: initialTracks[0]?.title || 'Auction Vibes',
  currentTrackAuthor: initialTracks[0]?.author || 'FIFA Anthem',
  currentTime: 0,
  duration: 0,
  isSeeking: false,
  timerRef: null,
  playerInstance: null,

  setIsPlaying: (isPlaying) => set({ isPlaying }),
  setIsReady: (isReady) => set({ isReady }),

  setVolume: (volume) => {
    const { playerInstance } = get();
    set({ volume, isMuted: volume === 0 });
    if (playerInstance) {
      try {
        if (typeof playerInstance.setVolume === 'function') {
          playerInstance.setVolume(volume);
        }
        if (typeof playerInstance.isMuted === 'function' && playerInstance.isMuted() && volume > 0) {
          playerInstance.unMute();
        }
      } catch (e) {}
    }
  },

  toggleMute: () => {
    const { isMuted, volume, prevVolume, playerInstance } = get();
    if (isMuted) {
      const restore = prevVolume > 0 ? prevVolume : 50;
      set({ isMuted: false, volume: restore });
      if (playerInstance) {
        try {
          if (typeof playerInstance.unMute === 'function') playerInstance.unMute();
          if (typeof playerInstance.setVolume === 'function') playerInstance.setVolume(restore);
        } catch (e) {}
      }
    } else {
      set({ isMuted: true, prevVolume: volume, volume: 0 });
      if (playerInstance) {
        try {
          if (typeof playerInstance.mute === 'function') playerInstance.mute();
        } catch (e) {}
      }
    }
  },

  play: () => {
    const { playerInstance, showIsland } = get();
    set({ isPlaying: true });
    if (playerInstance) {
      try {
        if (typeof playerInstance.playVideo === 'function') {
          playerInstance.playVideo();
        }
      } catch (err) {
        console.warn('Error in playVideo:', err);
      }
    }
    showIsland(5000);
  },

  pause: () => {
    const { playerInstance, showIsland } = get();
    set({ isPlaying: false });
    if (playerInstance) {
      try {
        if (typeof playerInstance.pauseVideo === 'function') {
          playerInstance.pauseVideo();
        }
      } catch (err) {
        console.warn('Error in pauseVideo:', err);
      }
    }
    showIsland(5000);
  },

  togglePlay: () => {
    const { isPlaying, play, pause } = get();
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  },

  nextTrack: () => {
    const { currentTracks, currentTrackIndex, playTrackAtIndex, showIsland } = get();
    if (currentTracks.length === 0) return;
    const nextIdx = (currentTrackIndex + 1) % currentTracks.length;
    playTrackAtIndex(nextIdx);
    showIsland(5000);
  },

  prevTrack: () => {
    const { currentTracks, currentTrackIndex, playTrackAtIndex, showIsland } = get();
    if (currentTracks.length === 0) return;
    const prevIdx = (currentTrackIndex - 1 + currentTracks.length) % currentTracks.length;
    playTrackAtIndex(prevIdx);
    showIsland(5000);
  },

  selectVinyl: (vinylId, autoPlay = false) => {
    const { vinyls, activeVinylId } = get();
    if (vinylId === activeVinylId && !autoPlay) return;
    const targetVinyl = vinyls.find((v) => v.id === vinylId) || vinyls[0];
    const newTracks = mapSongsToTracks(targetVinyl ? targetVinyl.songs : []);

    set({
      activeVinylId: targetVinyl.id,
      currentTracks: newTracks,
    });

    if (autoPlay || get().isPlaying) {
      get().playTrackAtIndex(0);
    } else if (newTracks.length > 0) {
      const t = newTracks[0];
      set({
        currentTrackIndex: 0,
        currentTrackTitle: t.title,
        currentTrackAuthor: t.author,
        currentTime: 0,
      });
      const { playerInstance } = get();
      if (playerInstance && typeof playerInstance.cueVideoById === 'function') {
        playerInstance.cueVideoById(t.id);
      }
    }
  },

  playTrackInVinyl: (vinylId, trackIndex) => {
    const { vinyls } = get();
    const targetVinyl = vinyls.find((v) => v.id === vinylId) || get().vinyls[0];
    const newTracks = mapSongsToTracks(targetVinyl ? targetVinyl.songs : []);

    set({
      activeVinylId: targetVinyl.id,
      currentTracks: newTracks,
    });

    get().playTrackAtIndex(trackIndex);
  },

  playTrackAtIndex: (index: number) => {
    const { currentTracks, showIsland } = get();
    if (currentTracks.length === 0) return;

    const total = currentTracks.length;
    const safeIndex = ((index % total) + total) % total;
    const track = currentTracks[safeIndex];
    const { playerInstance } = get();

    set({
      currentTrackIndex: safeIndex,
      currentTrackTitle: track.title,
      currentTrackAuthor: track.author,
      currentTime: 0,
      isPlaying: true,
    });

    if (playerInstance) {
      try {
        if (typeof playerInstance.loadVideoById === 'function') {
          playerInstance.loadVideoById({
            videoId: track.id,
            startSeconds: 0,
          });
        }
      } catch (err) {
        console.warn('Error playing video by ID:', err);
      }
    }

    showIsland(5000);
  },

  seekTo: (seconds: number) => {
    const { playerInstance } = get();
    set({ currentTime: seconds, isSeeking: false });
    if (playerInstance) {
      try {
        if (typeof playerInstance.seekTo === 'function') {
          playerInstance.seekTo(seconds, true);
        }
      } catch (err) {
        console.warn('Error seeking:', err);
      }
    }
  },

  setTimeData: (currentTime: number, duration: number) => {
    const { isSeeking } = get();
    if (!isSeeking) {
      set({ currentTime, duration: duration > 0 ? duration : get().duration });
    }
  },

  setIsSeeking: (isSeeking: boolean) => set({ isSeeking }),

  syncCurrentTrackFromPlayer: () => {
    const { playerInstance, currentTracks } = get();
    if (!playerInstance) return;

    try {
      if (typeof playerInstance.getVideoData === 'function') {
        const data = playerInstance.getVideoData();
        if (data && data.video_id) {
          const matchedIdx = currentTracks.findIndex((t) => t.id === data.video_id);
          if (matchedIdx >= 0) {
            const track = currentTracks[matchedIdx];
            set({
              currentTrackIndex: matchedIdx,
              currentTrackTitle: track.title,
              currentTrackAuthor: track.author,
            });
          }
        }
      }
    } catch (e) {}
  },

  showIsland: (durationMs = 5000) => {
    const { timerRef, isPlaylistOpen } = get();
    if (timerRef) clearTimeout(timerRef);

    set({ isIslandVisible: true });

    if (isPlaylistOpen) return;

    if (durationMs > 0) {
      const newTimer = setTimeout(() => {
        if (!get().isPlaylistOpen) {
          set({ isIslandVisible: false, timerRef: null });
        }
      }, durationMs);
      set({ timerRef: newTimer });
    }
  },

  hideIsland: () => {
    const { timerRef } = get();
    if (timerRef) clearTimeout(timerRef);
    set({ isIslandVisible: false, isPlaylistOpen: false, timerRef: null });
  },

  keepIslandOpen: () => {
    const { timerRef } = get();
    if (timerRef) clearTimeout(timerRef);
    set({ timerRef: null });
  },

  togglePlaylist: () => {
    const { isPlaylistOpen, keepIslandOpen } = get();
    keepIslandOpen();
    set({ isPlaylistOpen: !isPlaylistOpen });
  },

  closePlaylist: () => {
    set({ isPlaylistOpen: false });
  },

  registerPlayer: (player) => {
    set({ playerInstance: player, isReady: true });
    get().syncCurrentTrackFromPlayer();
  },

  setVinyls: (vinyls: VinylCategory[]) => {
    const { activeVinylId } = get();
    const currentVinyl = vinyls.find((v) => v.id === activeVinylId) || vinyls[0];
    const updatedTracks = mapSongsToTracks(currentVinyl ? currentVinyl.songs : []);
    set({
      vinyls,
      currentTracks: updatedTracks,
    });
  },

  fetchVinylsFromDB: async () => {
    try {
      const res = await fetch('/api/music');
      if (!res.ok) return;
      const data = await res.json();
      if (data && data.success && Array.isArray(data.vinyls) && data.vinyls.length > 0) {
        get().setVinyls(data.vinyls);
      }
    } catch (e) {
      console.warn('Could not fetch vinyls from DB:', e);
    }
  },

  addSongLocallyAndPersist: async (vinylId: string, song: VinylSong) => {
    const { vinyls, activeVinylId } = get();

    // 1. Optimistic instant local update so the track appears immediately on screen!
    const updatedVinyls = vinyls.map((v) => {
      if (v.id === vinylId) {
        return {
          ...v,
          songs: [...v.songs, song],
        };
      }
      return v;
    });

    const currentVinyl = updatedVinyls.find((v) => v.id === activeVinylId) || updatedVinyls[0];
    const updatedTracks = mapSongsToTracks(currentVinyl ? currentVinyl.songs : []);

    set({
      vinyls: updatedVinyls,
      currentTracks: updatedTracks,
    });

    // 2. Persist to SQLite DB via API
    try {
      const res = await fetch('/api/music', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vinylId, song }),
      });
      const data = await res.json();
      if (data && data.success && Array.isArray(data.vinyls)) {
        get().setVinyls(data.vinyls);
        return true;
      }
      return true;
    } catch (err) {
      console.error('Error persisting song:', err);
      return false;
    }
  },
}));
