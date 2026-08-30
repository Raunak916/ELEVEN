'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Sidebar } from './sidebar';
import { Menu, Sparkles, Compass } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AppLayoutProps {
  children: React.ReactNode;
}

const PAGE_NAMES: Record<string, string> = {
  '/auction': 'Overview',
  '/auction/pool': 'Player Pool',
  '/auction/draw': 'Live Draw',
  '/auction/wheel': 'Wheel of Fortune',
  '/auction/cards': 'Cards Deck',
  '/auction/vibe': 'Vibe Arena',
  '/auction/points-table': 'Points Table',
  '/auction/history': 'History',
  '/auction/settings': 'Settings',
};

export function AppLayout({ children }: AppLayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  const currentPageTitle = PAGE_NAMES[pathname] || 'Workspace';

  return (
    <div className="min-h-screen flex flex-col lg:flex-row relative text-foreground bg-[#050608]">
      {/* ===================================================================== */}
      {/* MOBILE / TABLET TOP NAVIGATION BAR (< lg: 1024px ONLY)                */}
      {/* ===================================================================== */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-40 h-16 bg-[#0a0e17]/95 backdrop-blur-2xl border-b border-white/10 px-4 flex items-center justify-between shadow-2xl">
        {/* Left: Prominent Hamburger Menu Trigger + Brand */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[var(--gold)]/15 hover:bg-[var(--gold)]/25 active:scale-95 text-[var(--gold)] border border-[var(--gold)]/35 shadow-gold transition-all"
            aria-label="Open navigation menu"
          >
            <Menu className="h-5 w-5" />
            <span className="font-heading font-black text-xs uppercase tracking-wider hidden xs:inline">
              Menu
            </span>
          </button>

          <Link href="/" className="flex items-center gap-2">
            <div className="relative h-8 w-8">
              <Image
                src="/logo/eleven.png"
                alt="Eleven Logo"
                fill
                className="object-contain"
                priority
              />
            </div>
            <span className="font-heading font-black text-base tracking-wider uppercase text-white">
              ELEVEN
            </span>
          </Link>
        </div>

        {/* Right: Active Page Indicator Badge */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/15 text-[var(--gold)] text-xs font-mono font-bold uppercase tracking-wider shadow-inner">
          <Sparkles className="w-3.5 h-3.5" />
          <span className="truncate max-w-[130px]">{currentPageTitle}</span>
        </div>
      </header>

      {/* Floating Bottom Quick-Nav Action Pill for Mobile (< lg) */}
      <div className="lg:hidden fixed bottom-5 right-5 z-40">
        <button
          type="button"
          onClick={() => setMobileMenuOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-gradient-to-r from-[var(--gold)] via-amber-400 to-amber-500 text-black font-heading font-black text-xs uppercase tracking-wider shadow-2xl hover:scale-105 active:scale-95 transition-all"
        >
          <Compass className="w-4 h-4" />
          <span>Menu</span>
        </button>
      </div>

      {/* Sidebar with Mobile Drawer support */}
      <Sidebar
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
      />

      {/* ===================================================================== */}
      {/* MAIN CONTENT CONTAINER                                                */}
      {/* Desktop (lg: >= 1024px): ml-[12rem] and original full padding          */}
      {/* Mobile (< lg): full-width with top offset pt-16 and compact padding   */}
      {/* ===================================================================== */}
      <main
        className={cn(
          'flex-1 min-w-0 relative z-10',
          'w-full lg:w-[calc(100%-12rem)] lg:ml-[12rem]',
          'pt-16 lg:pt-0'
        )}
      >
        <div className="p-3.5 sm:p-5 md:p-6 lg:p-10 xl:p-14 min-h-screen">
          {children}
        </div>
      </main>
    </div>
  );
}