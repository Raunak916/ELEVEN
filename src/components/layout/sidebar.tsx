'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { SidebarMusicPlayer } from './sidebar-music-player';

const NAV_ITEMS = [
  { href: '/auction', number: '01', label: 'OVERVIEW' },
  { href: '/auction/pool', number: '02', label: 'PLAYER POOL' },
  { href: '/auction/draw', number: '03', label: 'DRAW' },
  { href: '/auction/wheel', number: '04', label: 'WHEEL' },
  { href: '/auction/cards', number: '05', label: 'CARDS' },
  { href: '/auction/vibe', number: '06', label: 'VIBE' },
  { href: '/auction/points-table', number: '07', label: 'POINTS TABLE' },
  { href: '/auction/history', number: '08', label: 'HISTORY' },
  { href: '/auction/settings', number: '09', label: 'SETTINGS' },
] as const;

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-[12rem] min-w-[12rem] max-w-[12rem] flex-shrink-0 bg-sidebar border-r border-sidebar-border flex flex-col overflow-hidden">
      {/* Top: Logo Only */}
      <div className="flex h-28 items-center justify-center px-4 border-b border-sidebar-border">
        <Link href="/" className="flex items-center justify-center group" aria-label="Eleven Home">
          <div className="relative h-20 w-20 transition-transform duration-300 group-hover:scale-105">
            <Image
              src="/logo/eleven.png"
              alt="Eleven Logo"
              fill
              className="object-contain"
              priority
            />
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 overflow-y-auto">
        <ul className="space-y-1" role="navigation" aria-label="Main navigation">
          {NAV_ITEMS.map((item, index) => {
            const isActive = pathname === item.href;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'relative flex items-center gap-3 px-3 py-2.5 rounded-xl',
                    'transition-colors duration-200 ease-out',
                    'hover:bg-sidebar-accent/70 active:scale-[0.98]',
                    isActive ? 'bg-sidebar-accent text-foreground font-semibold' : 'text-muted-foreground'
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
      <SidebarMusicPlayer />
    </aside>
  );
}