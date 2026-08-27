'use client';

import React, { useEffect, useRef } from 'react';
import { useMusicStore, PLAYLIST_TRACKS } from '@/lib/music-store';
import { DynamicIslandMusic } from './dynamic-island-music';

declare global {
  interface Window {
    onYouTubeIframeAPIReady?: () => void;
    YT?: any;
  }
}

export function GlobalMusicPlayer() {
  const {
    volume,
    setIsPlaying,
    setIsReady,
    registerPlayer,
    fetchVinylsFromDB,
  } = useMusicStore();

  const playerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    fetchVinylsFromDB();

    if (initializedRef.current) return;
    initializedRef.current = true;

    // Load saved volume
    const savedVolume = localStorage.getItem('auction-music-volume');
    const initialVol = savedVolume !== null ? parseInt(savedVolume, 10) : volume;

    const hostEl = containerRef.current;
    if (!hostEl) return;

    // Create an unmanaged child node for YouTube to bind to
    const unmanagedDiv = document.createElement('div');
    unmanagedDiv.id = 'yt-unmanaged-player-element';
    hostEl.appendChild(unmanagedDiv);

    const initPlayer = () => {
      if (!window.YT || !window.YT.Player) return;
      if (playerRef.current) return;

      try {
        const initialTrackId = PLAYLIST_TRACKS[0].id;

        playerRef.current = new window.YT.Player(unmanagedDiv, {
          height: '200',
          width: '200',
          videoId: initialTrackId,
          playerVars: {
            autoplay: 0,
            controls: 0,
            disablekb: 1,
            fs: 0,
            modestbranding: 1,
            rel: 0,
            playsinline: 1,
            origin: typeof window !== 'undefined' ? window.location.origin : '',
          },
          events: {
            onReady: (event: any) => {
              setIsReady(true);
              registerPlayer(event.target);
              try {
                event.target.setVolume(initialVol);
                event.target.cueVideoById(initialTrackId);
              } catch (e) {}
            },
            onStateChange: (event: any) => {
              const state = useMusicStore.getState();
              // 1: PLAYING, 2: PAUSED, 0: ENDED, 3: BUFFERING, 5: CUED
              if (event.data === 1) {
                setIsPlaying(true);
                try {
                  const current = event.target.getCurrentTime() || 0;
                  const total = event.target.getDuration() || 0;
                  if (total > 0 || current > 0) {
                    state.setTimeData(current, total);
                  }
                } catch (e) {}
              } else if (event.data === 2 || event.data === 5) {
                setIsPlaying(false);
              } else if (event.data === 0) {
                // Track finished naturally: auto-advance to next song and reveal island
                try {
                  state.nextTrack();
                } catch (e) {}
              }
            },
            onError: (event: any) => {
              console.warn('YouTube video playback error, advancing:', event);
              try {
                const state = useMusicStore.getState();
                state.nextTrack();
              } catch (err) {}
            },
          },
        });
      } catch (err) {
        console.warn('Failed to initialize YouTube Player:', err);
      }
    };

    if (window.YT && window.YT.Player) {
      initPlayer();
    } else {
      if (!document.getElementById('yt-iframe-api-script')) {
        const script = document.createElement('script');
        script.id = 'yt-iframe-api-script';
        script.src = 'https://www.youtube.com/iframe_api';
        script.async = true;
        document.head.appendChild(script);
      }

      // Check via polling in case the event fired prior to component mount
      const checkInterval = setInterval(() => {
        if (window.YT && window.YT.Player) {
          clearInterval(checkInterval);
          initPlayer();
        }
      }, 100);

      const existingReady = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (typeof existingReady === 'function') existingReady();
        clearInterval(checkInterval);
        initPlayer();
      };
    }

    // High frequency time & progress ticker (150ms) querying active player directly from store
    const ticker = setInterval(() => {
      const state = useMusicStore.getState();
      const player = state.playerInstance || playerRef.current;
      if (!player) return;

      try {
        if (typeof player.getCurrentTime === 'function' && typeof player.getDuration === 'function') {
          const current = player.getCurrentTime() || 0;
          const total = player.getDuration() || 0;
          if (total > 0 || current > 0) {
            state.setTimeData(current, total);
          }
        }
      } catch (e) {}
    }, 150);

    return () => {
      clearInterval(ticker);
    };
  }, [registerPlayer, setIsPlaying, setIsReady, volume]);

  return (
    <>
      {/* 
        Persistent Headless YouTube Player Container 
        Kept in non-zero dimension outside viewport to prevent browser media throttling
      */}
      <div
        ref={containerRef}
        className="fixed -bottom-96 -right-96 w-[200px] h-[200px] pointer-events-none opacity-0 z-[-10] overflow-hidden"
        aria-hidden="true"
      />

      {/* Global Dynamic Island floating music controller */}
      <DynamicIslandMusic />
    </>
  );
}
