'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Actual filenames verified in /public/backgrounds/
const backgrounds = [
  '/backgrounds/ChatGPT Image Aug 18, 2026, 05_08_58 PM.png',
  '/backgrounds/ChatGPT Image Aug 18, 2026, 05_09_32 PM.png',
  '/backgrounds/ChatGPT Image Aug 18, 2026, 05_09_36 PM.png',
  '/backgrounds/ChatGPT Image Aug 18, 2026, 05_09_47 PM.png',
  '/backgrounds/ChatGPT Image Aug 18, 2026, 05_09_51 PM.png',
  '/backgrounds/ChatGPT Image Aug 18, 2026, 05_09_56 PM.png',
  '/backgrounds/ChatGPT Image Aug 18, 2026, 05_10_29 PM.png',
  '/backgrounds/ChatGPT Image Aug 18, 2026, 05_10_37 PM.png',
  '/backgrounds/ChatGPT Image Aug 18, 2026, 05_10_42 PM.png',
  '/backgrounds/ChatGPT Image Aug 18, 2026, 05_10_49 PM.png',
  '/backgrounds/ChatGPT Image Aug 18, 2026, 05_12_32 PM.png',
  '/backgrounds/ChatGPT Image Aug 18, 2026, 07_50_54 PM.png',
  '/backgrounds/ChatGPT Image Aug 18, 2026, 07_51_04 PM.png',
  '/backgrounds/ChatGPT Image Aug 18, 2026, 09_58_40 PM.png',
  '/backgrounds/ChatGPT Image Aug 18, 2026, 10_49_17 PM.png',
  '/backgrounds/ChatGPT Image Aug 18, 2026, 11_00_04 PM.png',
];

const DISPLAY_INTERVAL = 8000; // 8 seconds per slide
const CROSSFADE_DURATION = 2.2; // 2.2 seconds silky smooth crossfade

export function BackgroundSlideshow() {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Preload next images in the background to ensure instantaneous rendering without flash
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Preload next 2 upcoming images
    const nextIdx1 = (currentIndex + 1) % backgrounds.length;
    const nextIdx2 = (currentIndex + 2) % backgrounds.length;

    const img1 = new window.Image();
    img1.src = backgrounds[nextIdx1];

    const img2 = new window.Image();
    img2.src = backgrounds[nextIdx2];
  }, [currentIndex]);

  // Slideshow interval timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % backgrounds.length);
    }, DISPLAY_INTERVAL);

    return () => clearInterval(timer);
  }, []);

  return (
    <div
      className="absolute inset-0 z-0 pointer-events-none overflow-hidden bg-[#050505]"
      aria-hidden="true"
      role="img"
      aria-label="Cinematic football atmosphere background"
    >
      {/* Crossfading Background Images */}
      <AnimatePresence mode="sync" initial={false}>
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: CROSSFADE_DURATION, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="absolute inset-0"
        >
          <img
            src={backgrounds[currentIndex]}
            alt=""
            className="w-full h-full object-cover"
            style={{
              filter: 'blur(1px) brightness(0.72)',
              transform: 'scale(1.03)',
            }}
          />
        </motion.div>
      </AnimatePresence>

      {/* Persistent Dark Cinematic Radial Overlay */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 85% 65% at 50% 35%, transparent 35%, rgba(0,0,0,0.2) 70%, rgba(0,0,0,0.5) 100%)',
        }}
      />

      {/* Persistent Cinematic Vignette */}
      <div
        className="absolute inset-0"
        style={{
          boxShadow: 'inset 0 0 120px rgba(0,0,0,0.3)',
        }}
      />

      {/* Persistent Film Grain */}
      <div
        className="absolute inset-0 opacity-[0.035] mix-blend-soft-light"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
          backgroundSize: '256px 256px',
        }}
      />
    </div>
  );
}