'use client';

import React, { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { ArrowRight, Play } from 'lucide-react';
import { BackgroundSlideshow } from '@/components/landing/background-slideshow';

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

export default function LandingPage() {
  const router = useRouter();

  return (
    <main className="relative min-h-screen w-full overflow-hidden bg-[#050505] text-foreground">
      {/* Cinematic background slideshow - z-0 */}
      <BackgroundSlideshow />

      {/* Foreground content */}
      <div className="relative z-10 flex min-h-screen flex-col">
        {/* Top bar */}
        <header className="flex items-center justify-between px-6 py-5 sm:px-10 lg:px-16">
          <div className="flex items-center gap-4 sm:gap-5">
            <div className="relative h-16 w-16 sm:h-20 sm:w-20 flex-shrink-0">
              <Image
                src="/logo/eleven.png"
                alt="Eleven Logo"
                fill
                className="object-contain"
                priority
              />
            </div>
            <div className="flex items-center gap-2.5 sm:gap-3.5">
              <span className="text-base sm:text-lg font-bold tracking-[0.35em] text-foreground/90">
                ELEVEN
              </span>
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--gold)]" />
              <span className="text-xs sm:text-sm font-light tracking-[0.35em] text-foreground/40">
                THE GAME BEGINS
              </span>
            </div>
          </div>
          <div className="hidden text-xs font-light tracking-[0.3em] text-foreground/35 sm:block">
            FOOTBALL · MARKET · CONTROL
          </div>
        </header>

        {/* Center content */}
        <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
          <h1 className="max-w-4xl text-balance font-sans text-[10vw] font-semibold leading-[0.95] tracking-[-0.02em] text-foreground sm:text-6xl lg:text-7xl xl:text-[7.5rem]">
            THE AUCTION
            <br />
            STARTS HERE.
          </h1>

          <p className="mt-6 max-w-lg text-sm font-light leading-relaxed tracking-wide text-foreground/60 sm:text-base">
            Build your pool. Control the market. Let the bidding begin.
          </p>

          <div className="mt-10 flex flex-col items-center gap-3.5 sm:flex-row">
            <button
              onClick={() => router.push('/auction')}
              className="group relative inline-flex items-center gap-2.5 overflow-hidden rounded-full bg-[var(--gold)] px-8 py-3.5 text-sm font-semibold tracking-wide text-[#0a0a0a] transition-all duration-500 ease-out-expo hover:shadow-[0_0_40px_oklch(0.75_0.18_75/0.4)]"
            >
              <span className="relative z-10">ENTER AUCTION</span>
              <ArrowRight className="relative z-10 h-3.5 w-3.5 transition-transform duration-500 ease-out-expo group-hover:translate-x-1" />
              <span className="absolute inset-0 -translate-x-full bg-white/25 transition-transform duration-700 ease-out-expo group-hover:translate-x-0" />
            </button>

            <button
              onClick={() => router.push('/how-it-works')}
              className="group inline-flex items-center gap-2.5 rounded-full border border-foreground/15 px-7 py-3.5 text-sm font-light tracking-wide text-foreground/80 backdrop-blur-sm transition-all duration-500 ease-out-expo hover:border-foreground/35 hover:text-foreground"
            >
              <Play className="h-3.5 w-3.5 transition-transform duration-500 ease-out-expo group-hover:scale-110" />
              HOW IT WORKS
            </button>
          </div>
        </div>

        {/* Bottom bar & About Me button */}
        <div className="pb-8" />

        {/* Bottom Right: About Me */}
        <div className="absolute bottom-6 right-6 sm:bottom-8 sm:right-10 z-20">
          <button
            onClick={() => router.push('/credits')}
            className="group inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/40 px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.25em] text-white/90 backdrop-blur-md transition-all duration-300 hover:scale-105 hover:border-[var(--gold)]/60 hover:bg-[var(--gold)]/15 hover:text-white shadow-lg"
            title="Read about the creator & experience the 3D credits"
          >
            <span className="relative z-10">ABOUT ME</span>
            <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5 text-[var(--gold)]" />
          </button>
        </div>
      </div>
    </main>
  );
}