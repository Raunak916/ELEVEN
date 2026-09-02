'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { X, Sparkles } from 'lucide-react';
import { SidebarMusicPlayer } from './sidebar-music-player';

const NAV_ITEMS = [
  { href: '/auction', number: '01', label: 'OVERVIEW' },
  { href: '/auction/pool', number: '02', label: 'PLAYER POOL' },
  { href: '/auction/draw', number: '03', label: 'DRAW' },
  { href: '/auction/wheel', number: '04', label: 'WHEEL' },
  { href: '/auction/cards', number: '05', label: 'CARDS' },
  { href: '/auction/vibe', number: '06', label: 'VIBE' },
  { href: '/auction/lineups', number: '07', label: 'LINEUPS' },
  { href: '/auction/points-table', number: '08', label: 'POINTS TABLE' },
  { href: '/auction/history', number: '09', label: 'HISTORY' },
  { href: '/auction/settings', number: '10', label: 'SETTINGS' },
] as const;

interface SidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function Sidebar({ mobileOpen = false, onMobileClose }: SidebarProps) {
  const pathname = usePathname();

  const handleNavClick = () => {
    if (onMobileClose) {
      onMobileClose();
    }
  };

  const navContent = (
    <div className="h-full flex flex-col justify-between overflow-hidden">
      {/* Top: Logo & Close Button for Mobile */}
      <div className="flex h-20 lg:h-28 items-center justify-between lg:justify-center px-4 border-b border-sidebar-border shrink-0">
        <Link href="/" onClick={handleNavClick} className="flex items-center justify-center group" aria-label="Eleven Home">
          <div className="relative h-14 w-14 lg:h-20 lg:w-20 transition-transform duration-300 group-hover:scale-105">
            <Image
              src="/logo/eleven.png"
              alt="Eleven Logo"
              fill
              className="object-contain"
              priority
            />
          </div>
        </Link>

        {/* Mobile Close Button */}
        {onMobileClose && (
          <button
            type="button"
            onClick={onMobileClose}
            className="lg:hidden p-2 rounded-xl bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-white border border-white/10 transition-colors"
            aria-label="Close sidebar"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 lg:px-4 py-4 lg:py-6 overflow-y-auto scrollbar-thin">
        <ul className="space-y-1" role="navigation" aria-label="Main navigation">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/auction' && pathname.startsWith(item.href));
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={handleNavClick}
                  className={cn(
                    'relative flex items-center gap-3 px-3 py-2.5 rounded-xl',
                    'transition-all duration-200 ease-out',
                    'hover:bg-sidebar-accent/70 active:scale-[0.98]',
                    isActive ? 'bg-sidebar-accent text-foreground font-semibold shadow-sm' : 'text-muted-foreground'
                  )}
                  aria-current={isActive ? 'page' : undefined}
                >
                  {/* Active indicator bar */}
                  {isActive && (
                    <motion.span
                      layoutId="sidebar-active-indicator"
                      className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full bg-primary shadow-[0_0_10px_rgba(255,215,0,0.4)]"
                      transition={{
                        type: 'spring',
                        stiffness: 380,
                        damping: 32,
                      }}
                    />
                  )}

                  {/* Number */}
                  <span className={cn(
                    'text-tiny font-mono font-bold tabular-nums w-7 text-right transition-colors',
                    isActive ? 'text-primary' : 'text-muted-foreground/60'
                  )}>
                    {item.number}
                  </span>

                  {/* Label */}
                  <span className={cn(
                    'text-small tracking-wider flex-1 transition-colors',
                    isActive ? 'text-foreground font-semibold' : 'text-muted-foreground group-hover:text-foreground'
                  )}>
                    {item.label}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Bottom: Music Player */}
      <div className="shrink-0">
        <SidebarMusicPlayer />
      </div>
    </div>
  );

  return (
    <>
      {/* ===================================================================== */}
      {/* DESKTOP SIDEBAR (lg: >= 1024px) - Exact original fixed docking        */}
      {/* ===================================================================== */}
      <aside className="hidden lg:flex fixed left-0 top-0 z-40 h-screen w-[12rem] min-w-[12rem] max-w-[12rem] flex-shrink-0 bg-sidebar border-r border-sidebar-border flex-col overflow-hidden">
        {navContent}
      </aside>

      {/* ===================================================================== */}
      {/* MOBILE DRAWER SIDEBAR (< lg: 1024px) - Smooth slide-over + backdrop   */}
      {/* ===================================================================== */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={onMobileClose}
              className="lg:hidden fixed inset-0 z-50 bg-black/80 backdrop-blur-md"
              aria-hidden="true"
            />

            {/* Mobile Slide-Over Panel */}
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 280 }}
              className="lg:hidden fixed left-0 top-0 bottom-0 z-50 w-[16rem] bg-[#0c1017]/98 border-r border-white/15 shadow-2xl backdrop-blur-2xl flex flex-col"
            >
              {navContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}