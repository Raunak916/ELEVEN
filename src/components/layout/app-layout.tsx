'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Sidebar } from './sidebar';
import { Menu, Sparkles } from 'lucide-react';
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
    <div className="min-h-screen flex flex-col md:flex-row relative text-foreground bg-[#050608]">
      {/* ===================================================================== */}
      {/* MOBILE TOP NAVIGATION BAR (< md: 768px ONLY)                          */}
      {/* ===================================================================== */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-30 h-14 bg-[#0a0e17]/95 backdrop-blur-xl border-b border-white/10 px-3.5 flex items-center justify-between shadow-lg">
        {/* Left: Hamburger Menu Trigger + Brand */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 active:scale-95 text-white/90 border border-white/10 shadow-sm transition-all flex items-center justify-center"
            aria-label="Open navigation menu"
          >
            <Menu className="h-5 w-5 text-[var(--gold)]" />
          </button>

          <Link href="/" className="flex items-center gap-2">
            <div className="relative h-7 w-7">
              <Image
                src="/logo/eleven.png"
                alt="Eleven Logo"
                fill
                className="object-contain"
                priority
              />
            </div>
            <span className="font-heading font-black text-sm tracking-wider uppercase text-white">
              ELEVEN
            </span>
          </Link>
        </div>

        {/* Right: Active Page Indicator Badge */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--gold)]/10 border border-[var(--gold)]/25 text-[var(--gold)] text-[11px] font-mono font-bold uppercase tracking-wider shadow-inner">
          <Sparkles className="w-3 h-3" />
          <span className="truncate max-w-[120px]">{currentPageTitle}</span>
        </div>
      </header>

      {/* Sidebar with Mobile Drawer support */}
      <Sidebar
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
      />

      {/* ===================================================================== */}
      {/* MAIN CONTENT CONTAINER                                                */}
      {/* Desktop (md: >= 768px): ml-[12rem] and original full padding          */}
      {/* Mobile (< md): full-width with top offset pt-14 and compact padding   */}
      {/* ===================================================================== */}
      <main
        className={cn(
          'flex-1 min-w-0 relative z-10',
          'w-full md:w-[calc(100%-12rem)] md:ml-[12rem]',
          'pt-14 md:pt-0'
        )}
      >
        <div className="p-3.5 sm:p-5 md:p-6 lg:p-10 xl:p-14 min-h-screen">
          {children}
        </div>
      </main>
    </div>
  );
}