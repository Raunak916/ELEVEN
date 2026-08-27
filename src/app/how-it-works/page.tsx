'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  ExternalLink,
  LayoutDashboard,
  Users,
  Dices,
  Disc,
  Layers,
  Trophy,
  History,
  Settings,
  Sparkles,
  CheckCircle2,
  HelpCircle,
  Search,
} from 'lucide-react';
import Link from 'next/link';

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

interface PageGuideItem {
  id: string;
  number: string;
  title: string;
  href: string;
  category: 'Core Dashboard' | 'Pool Management' | 'Draw Modes' | 'Squad & Analytics' | 'System';
  icon: React.ElementType;
  tagline: string;
  serves: string;
  features: string[];
  howToUse: string[];
  tips?: string;
}

const PAGE_GUIDES: PageGuideItem[] = [
  {
    id: 'overview',
    number: '01',
    title: 'OVERVIEW',
    href: '/auction',
    category: 'Core Dashboard',
    icon: LayoutDashboard,
    tagline: 'Real-time Command Center & Auction Health',
    serves: 'Provides a consolidated dashboard tracking overall auction status, squad position distributions, and live player draw activity at a single glance.',
    features: [
      'Distinct Role Breakdown Cards: 4 customized cards for Goalkeepers (Sky Blue), Defenders (Amber Gold), Midfielders (Emerald), and Attackers (Rose) with circular SVG progress gauges.',
      'Metric Badges: Live counters for Total Players, Available Players, Drawn/Sold, and Unsold counts.',
      'Recent Draw Feed: Real-time stream of the latest players revealed and auctioned.',
      'Quick Action Shortcuts: Fast buttons to jump straight into adding players or launching draws.',
    ],
    howToUse: [
      'Access from the sidebar navigation link "01 OVERVIEW" or after entering the auction.',
      'Observe the role allocation cards to monitor how many players remain available in each position tier.',
      'Check the recent activity list to verify past draws during active rounds.',
    ],
    tips: 'Use this dashboard between auction rounds to assess if your pool is balanced across all four playing positions.',
  },
  {
    id: 'pool',
    number: '02',
    title: 'PLAYER POOL',
    href: '/auction/pool',
    category: 'Pool Management',
    icon: Users,
    tagline: 'Database Curation, Custom Creation & Bulk Import',
    serves: 'The central roster management hub where you search, create, filter, edit, and organize all player assets participating in the auction.',
    features: [
      'Multi-Select Batch Removal: Select multiple players using card checkboxes and delete them in bulk with one click.',
      'Background Import Animation: Dynamic progress bar and live sync ticker showing players being added during bulk import.',
      'Global Database Search: Access 10,000+ real footballers with authentic photos, ratings, and country flags.',
      'Custom Player Creator: Build custom players with your own name, nationality, custom photo upload, and stats.',
      'Bulk CSV/JSON Import: Upload entire rosters with one click using formatted templates.',
      'Player Card Quick Actions: Edit auction role, custom base price, and currency, or remove players from the pool.',
      'Advanced Filtering & Sorting: Filter by Position (GK, DEF, MID, ATT), Availability status, Base Price, or Category tiers.',
    ],
    howToUse: [
      'Click "Add Player" in the top header to search the database or create custom player profiles.',
      'Click "Bulk Import" to download templates and import large rosters with live sync feedback.',
      'Toggle "Select Multiple" in the toolbar to check multiple player cards and remove them together via the floating action bar.',
      'Click the "..." menu on any player card and choose "Edit Details" to customize role, starting price, and currency, then click "Done" to save.',
    ],
    tips: 'Ensure all players have their intended base price and role configured before starting the live draw.',
  },
  {
    id: 'draw',
    number: '03',
    title: 'DRAW SCREEN',
    href: '/auction/draw',
    category: 'Draw Modes',
    icon: Dices,
    tagline: 'Cinematic Live Player Reveal & Real-time Bidding',
    serves: 'The primary auction stage designed for live presentation, projecting player reveals with high-energy animations and managing live bidding assignment to teams.',
    features: [
      'Cinematic Reveal Engine: Shuffles through available candidates and lands on a player with celebratory visual effects and role glow.',
      'One-by-One Unsold Player Draw: Once the normal pool is completed, seamlessly start an unsold round to draw and re-bid on unsold players one by one.',
      'Right-Edge Docked Assignment Tab: Glassmorphic tab docked to the right edge of the screen to open team assignment without obstructing the player card.',
      'Compact Collectible Cards: 3D interactive tilt cards with role-specific ambient neon halos, badges, and base pricing.',
      'Unsold Handling: Option to mark a player as "Unsold" to hold them for the subsequent unsold draw round.',
    ],
    howToUse: [
      'Click "DRAW NEXT PLAYER" to initiate the randomized selection animation.',
      'Once the player is revealed, conduct the live bidding in your auction room.',
      'Click the "ASSIGN" tab on the right edge of the screen to open the drawer, pick the winning team, and enter the final bid amount.',
      'Click "Confirm Sale" to log the transaction, or click "Mark Unsold" if no team places a bid.',
      'When all regular pool players are completed, click "DRAW UNSOLD PLAYERS" to process the unsold roster one by one.',
    ],
    tips: 'Use full-screen mode (F11 in browser) during live events for a stadium-level broadcast feel.',
  },
  {
    id: 'wheel',
    number: '04',
    title: 'SPIN WHEEL',
    href: '/auction/wheel',
    category: 'Draw Modes',
    icon: Disc,
    tagline: 'Interactive Roulette Wheel for Random Selection',
    serves: 'An alternative gamified draw mode featuring a physical spin wheel to randomly pick candidate players with suspense and deceleration physics.',
    features: [
      'Interactive Physics Wheel: Dynamic segments representing available pool players with realistic spin deceleration.',
      'Sound FX & Confetti: Haptic auditory feedback while spinning and celebration burst upon segment selection.',
      'Instant Bidding Handoff: Directly triggers the bidding assignment flow for the winning wheel segment.',
      'Dynamic Pool Sync: Automatically removes drawn players from wheel segments to keep the wheel clean.',
    ],
    howToUse: [
      'Navigate to "04 WHEEL" from the sidebar.',
      'Click the center "SPIN" button or drag the wheel to trigger the rotation.',
      'Watch the wheel decelerate until the pointer stops on the chosen player.',
      'Proceed with bidding and assign the player to the highest bidder.',
    ],
    tips: 'Great for tie-breakers, special marquee player rounds, or adding excitement during live streamer events.',
  },
  {
    id: 'cards',
    number: '05',
    title: 'MYSTERY CARDS',
    href: '/auction/cards',
    category: 'Draw Modes',
    icon: Layers,
    tagline: 'Tactile 3D Mystery Deck Flip Selection',
    serves: 'A tactile, interactive card board where auctioneers or team captains pick face-down mystery cards to uncover hidden players for bidding.',
    features: [
      '3D Flip Animations: High-fidelity card flip transitions with smooth 3D perspective shaders.',
      'Mystery Deck Grid: Displays available players disguised in stylized themed card backs.',
      'Captain Choice Mode: Let team managers pick their own card numbers to decide who goes up for auction next.',
      'Direct Auction Modal: Flips the card into a full spotlight view with bidding assignment tools.',
    ],
    howToUse: [
      'Go to "05 CARDS" in the navigation menu.',
      'Allow team representatives or auctioneers to select any numbered card in the grid.',
      'Click on the selected card to flip and reveal the concealed footballer.',
      'Assign the revealed player to the winning bidder in the pop-up modal.',
    ],
    tips: 'Use this mode when you want participants to feel they have direct agency in picking the auction sequence.',
  },
  {
    id: 'points-table',
    number: '06',
    title: 'POINTS TABLE & SQUADS',
    href: '/auction/points-table',
    category: 'Squad & Analytics',
    icon: Trophy,
    tagline: 'Live Standings, Budget Ledger & Squad Balance',
    serves: 'The financial and squad management control center tracking team expenditures, remaining budgets, squad lists, and positional balances in real time.',
    features: [
      'Live Team Purse Tracker: Real-time calculation of remaining balance, total spend, and squad counts for every team.',
      'Expandable Squad Drawers: Click any team to inspect their complete roster of purchased players and purchase costs.',
      'Player Transfers & Pool Returns: Reassign mistakenly awarded players between teams or return them to the active pool.',
      'Budget Override & Reset: Manually adjust team budgets on the fly for penalty points, bonuses, or corrections.',
      'Positional Balance Indicators: Quick visual gauges showing whether a squad has adequate GKs, Defenders, Midfielders, and Forwards.',
    ],
    howToUse: [
      'Open "06 POINTS TABLE" to view the overall leaderboard and purse rankings.',
      'Click on any team row to expand their full squad breakdown and player-by-player acquisition cost.',
      'Use the "Transfer" or "Return to Pool" buttons if any bid needs to be rectified or reversed.',
      'Click the edit pencil next to budget numbers to manually adjust team funds if needed.',
    ],
    tips: 'Check this page frequently during the auction to monitor which teams have the most spending power remaining.',
  },
  {
    id: 'history',
    number: '07',
    title: 'AUCTION HISTORY',
    href: '/auction/history',
    category: 'Squad & Analytics',
    icon: History,
    tagline: 'Complete Audit Log & Text Summary Export',
    serves: 'Archival vault saving detailed records of all completed auction sessions, transaction histories, price records, and winner statistics with quick sharing options.',
    features: [
      'One-Click Summary Copy: Copy structured markdown/text auction reports (teams, budgets spent/left, players acquired, prices) directly to the clipboard.',
      'Text File Export: Download a formatted `.txt` summary file of past auctions ready to send via WhatsApp, Discord, or email.',
      'Detailed Transaction Timeline: Full drill-down view (`/auction/history/[id]`) showing every single player sale with timestamps and buyer details.',
      'Record Pruning: Safely delete obsolete auction session records.',
    ],
    howToUse: [
      'Click "07 HISTORY" in the sidebar.',
      'Click "Copy" or "Export" directly on any history card to grab the text summary immediately.',
      'Select any archived auction card to view its complete transaction ledger and export full details.',
    ],
    tips: 'When an auction is finalized via Settings ("Complete Auction"), it is automatically archived into History.',
  },
  {
    id: 'settings',
    number: '08',
    title: 'SETTINGS & CUSTOMIZATION',
    href: '/auction/settings',
    category: 'System',
    icon: Settings,
    tagline: 'Global Rules, Team Configuration & Budget Limits',
    serves: 'The administrative command panel for defining auction rules, managing team franchises, and setting currencies.',
    features: [
      'Team Franchise Manager: Add new competing teams, set team owners, and assign custom starting purse caps.',
      'Currency & Budget Rules: Set primary currency (₹ INR, $ USD, € EUR, £ GBP) and enforce maximum spending limits.',
      'Auction Preferences: Toggle animations and sound effects for live draw rounds.',
      'Auction Finalization: Complete and archive your active auction session into History.',
    ],
    howToUse: [
      'Open "08 SETTINGS" from the sidebar navigation.',
      'Add all participating teams with their names and starting purse allocations.',
      'Select the primary currency symbol for your event.',
      'Configure maximum squad budgets and animation preferences.',
      'Click "Complete Auction" when your event finishes to save everything to History.',
    ],
    tips: 'Always set up your teams and budget limits here first before adding players and starting the live draw.',
  },
];

const CATEGORIES = ['All Pages', 'Core Dashboard', 'Pool Management', 'Draw Modes', 'Squad & Analytics', 'System'] as const;

export default function HowItWorksPage() {
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState<string>('All Pages');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredGuides = PAGE_GUIDES.filter((guide) => {
    const matchesCategory = activeCategory === 'All Pages' || guide.category === activeCategory;
    const matchesSearch =
      searchQuery.trim() === '' ||
      guide.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      guide.tagline.toLowerCase().includes(searchQuery.toLowerCase()) ||
      guide.serves.toLowerCase().includes(searchQuery.toLowerCase()) ||
      guide.features.some((f) => f.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  return (
    <main className="relative min-h-screen w-full overflow-x-hidden bg-background text-foreground">
      {/* Background Atmosphere Layers */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute inset-0 bg-background" />
        <div
          className="absolute left-1/2 top-10 h-[120vmax] w-[120vmax] -translate-x-1/2 opacity-[0.08] dark:opacity-[0.12]"
          style={{ background: 'radial-gradient(circle at center, var(--gold), transparent 60%)' }}
        />
        <div
          className="absolute right-0 top-1/3 h-[70vmax] w-[70vmax] opacity-[0.04] dark:opacity-[0.05]"
          style={{ background: 'radial-gradient(circle at center, var(--emerald), transparent 60%)' }}
        />
        <div
          className="absolute inset-0 opacity-[0.025] dark:opacity-[0.035]"
          style={{
            backgroundImage: `
              linear-gradient(to right, currentColor 1px, transparent 1px),
              linear-gradient(to bottom, currentColor 1px, transparent 1px)
            `,
            backgroundSize: '64px 64px',
          }}
        />
      </div>

      {/* Main Container */}
      <div className="relative z-10 flex min-h-screen flex-col">
        {/* Top Bar */}
        <header className="flex items-center justify-between border-b border-border/40 bg-card/80 px-6 py-5 backdrop-blur-md sm:px-10 lg:px-16">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/')}
              className="group inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-4 py-2 text-xs font-medium tracking-wider text-foreground/70 transition-all duration-300 hover:border-primary/40 hover:bg-muted hover:text-foreground"
              aria-label="Back to Home"
            >
              <ArrowLeft className="h-3.5 w-3.5 transition-transform duration-300 group-hover:-translate-x-1" />
              HOME
            </button>
            <div className="hidden h-4 w-px bg-white/10 sm:block" />
            <span className="hidden text-xs tracking-[0.3em] text-foreground/40 sm:inline-block">
              ELEVEN PLATFORM MANUAL
            </span>
          </div>

          <Link
            href="/auction"
            className="group inline-flex items-center gap-2 rounded-full bg-[var(--gold)] px-5 py-2 text-xs font-bold tracking-wider text-[#0a0a0a] transition-all duration-300 hover:shadow-[0_0_25px_oklch(0.75_0.18_75/0.4)]"
          >
            ENTER AUCTION
            <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
          </Link>
        </header>

        {/* Hero Section */}
        <section className="px-6 pt-12 pb-10 sm:px-10 lg:px-16 text-center max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: EASE_OUT_EXPO }}
          >
            <span className="inline-flex items-center gap-2 rounded-full border border-[var(--gold)]/30 bg-[var(--gold)]/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.35em] text-[var(--gold)]">
              <Sparkles className="h-3.5 w-3.5" /> Complete Platform Manual
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: EASE_OUT_EXPO, delay: 0.15 }}
            className="mt-6 font-sans text-4xl font-extrabold tracking-tight text-foreground sm:text-6xl lg:text-7xl"
          >
            EVERY PAGE. EVERY FEATURE.{' '}
            <span className="bg-gradient-to-r from-[var(--gold)] via-amber-200 to-[var(--gold)] bg-clip-text text-transparent">
              TOTAL CLARITY.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: EASE_OUT_EXPO, delay: 0.3 }}
            className="mt-6 text-sm font-light leading-relaxed tracking-wide text-foreground/70 sm:text-base lg:text-lg max-w-3xl mx-auto"
          >
            Explore all 8 dedicated modules of Eleven. Discover what each page serves,
            its core features, and step-by-step guidance on how to use them effectively during your live auction event.
          </motion.p>

          {/* 4-Step Quick Workflow */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: EASE_OUT_EXPO, delay: 0.45 }}
            className="mt-12 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 text-left"
          >
            {[
              {
                step: '01',
                title: 'Set Up Rules & Teams',
                page: 'Settings Page',
                desc: 'Configure budgets, currencies, sound themes, and participating franchises.',
              },
              {
                step: '02',
                title: 'Curate Player Pool',
                page: 'Player Pool Page',
                desc: 'Add from 10,000+ real players, create custom cards, or bulk import CSVs.',
              },
              {
                step: '03',
                title: 'Run Live Draws & Bids',
                page: 'Draw, Wheel & Cards',
                desc: 'Reveal players dynamically, hold live bidding, and assign to buyer teams.',
              },
              {
                step: '04',
                title: 'Track Squads & History',
                page: 'Points Table & History',
                desc: 'Monitor team purse balances, manage transfers, and view audit records.',
              },
            ].map((step) => (
              <div
                key={step.step}
                className="relative rounded-xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-sm transition-all duration-300 hover:border-[var(--gold)]/40 hover:bg-white/[0.06]"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xl font-bold text-[var(--gold)]">{step.step}</span>
                  <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
                    {step.page}
                  </span>
                </div>
                <h3 className="mt-3 font-heading font-semibold text-foreground text-sm">{step.title}</h3>
                <p className="mt-1 text-xs text-foreground/60 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </motion.div>
        </section>

        {/* Filter and Search Bar */}
        <section className="px-6 sm:px-10 lg:px-16 max-w-7xl mx-auto w-full pb-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-y border-white/10 py-4">
            {/* Category Filter Chips */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mr-1">
                Filter:
              </span>
              {CATEGORIES.map((category) => (
                <button
                  key={category}
                  onClick={() => setActiveCategory(category)}
                  className={`rounded-lg px-3.5 py-1.5 text-xs font-medium transition-all duration-200 ${
                    activeCategory === category
                      ? 'bg-[var(--gold)] text-black font-semibold shadow-[0_0_15px_oklch(0.75_0.18_75/0.3)]'
                      : 'bg-white/5 text-foreground/70 hover:bg-white/10 hover:text-foreground'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search features, pages, tools..."
                className="w-full rounded-lg border border-white/10 bg-white/5 pl-9 pr-4 py-2 text-xs text-foreground placeholder-muted-foreground focus:border-[var(--gold)] focus:outline-none"
              />
            </div>
          </div>
        </section>

        {/* Detailed Directory of Every Page */}
        <section className="px-6 sm:px-10 lg:px-16 max-w-7xl mx-auto w-full pb-20">
          <div className="grid grid-cols-1 gap-8">
            <AnimatePresence mode="popLayout">
              {filteredGuides.map((guide, index) => {
                const IconComponent = guide.icon;
                return (
                  <motion.article
                    key={guide.id}
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.5, delay: index * 0.05, ease: EASE_OUT_EXPO }}
                    className="group relative overflow-hidden rounded-2xl border border-white/10 bg-[#0c0c0e]/90 p-6 sm:p-8 backdrop-blur-xl shadow-xl transition-all duration-300 hover:border-[var(--gold)]/40 hover:shadow-[0_8px_30px_-8px_rgba(0,0,0,0.5)]"
                  >
                    {/* Background accent glow */}
                    <div className="pointer-events-none absolute -right-20 -top-20 h-60 w-60 rounded-full bg-[var(--gold)]/5 blur-3xl transition-opacity duration-500 group-hover:opacity-100" />

                    {/* Header: Number, Icon, Title, Route badge and CTA */}
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-white/10 pb-5">
                      <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--gold)]/10 text-[var(--gold)] border border-[var(--gold)]/20 shadow-inner">
                          <IconComponent className="h-6 w-6" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2.5">
                            <span className="font-mono text-xs font-bold text-[var(--gold)]">
                              PAGE {guide.number}
                            </span>
                            <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-foreground/70 uppercase tracking-wider">
                              {guide.category}
                            </span>
                          </div>
                          <h2 className="font-sans text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                            {guide.title}
                          </h2>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="font-mono text-xs text-foreground/50 bg-black/40 px-3 py-1.5 rounded-lg border border-white/5">
                          {guide.href}
                        </span>
                        <Link
                          href={guide.href}
                          className="inline-flex items-center gap-2 rounded-lg bg-white/10 hover:bg-[var(--gold)] hover:text-black px-4 py-2 text-xs font-semibold text-foreground transition-all duration-300"
                        >
                          Open Page
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Link>
                      </div>
                    </div>

                    {/* Tagline & Serves Summary */}
                    <div className="mt-5 space-y-2">
                      <p className="text-sm font-semibold uppercase tracking-wider text-[var(--gold)]">
                        {guide.tagline}
                      </p>
                      <p className="text-sm sm:text-base font-light text-foreground/80 leading-relaxed">
                        <span className="font-semibold text-foreground">What it Serves: </span>
                        {guide.serves}
                      </p>
                    </div>

                    {/* Features and How To Use Grid */}
                    <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
                      {/* Key Features */}
                      <div className="rounded-xl border border-white/5 bg-white/[0.02] p-5">
                        <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground mb-3">
                          <CheckCircle2 className="h-4 w-4 text-[var(--gold)]" />
                          Key Features & Capabilities
                        </h4>
                        <ul className="space-y-2.5">
                          {guide.features.map((feature, i) => (
                            <li key={i} className="flex items-start gap-2.5 text-xs sm:text-sm text-foreground/70 leading-relaxed">
                              <span className="h-1.5 w-1.5 rounded-full bg-[var(--gold)]/80 mt-1.5 flex-shrink-0" />
                              <span>{feature}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* How to Use / See Them */}
                      <div className="rounded-xl border border-white/5 bg-white/[0.02] p-5">
                        <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground mb-3">
                          <HelpCircle className="h-4 w-4 text-emerald-400" />
                          How to Use & See Features
                        </h4>
                        <ol className="space-y-2.5">
                          {guide.howToUse.map((instruction, i) => (
                            <li key={i} className="flex items-start gap-2.5 text-xs sm:text-sm text-foreground/70 leading-relaxed">
                              <span className="font-mono text-xs font-bold text-emerald-400 flex-shrink-0 mt-0.5">
                                {i + 1}.
                              </span>
                              <span>{instruction}</span>
                            </li>
                          ))}
                        </ol>
                      </div>
                    </div>

                    {/* Pro Tip */}
                    {guide.tips && (
                      <div className="mt-4 flex items-center gap-2 rounded-lg bg-[var(--gold)]/5 border border-[var(--gold)]/20 px-4 py-2.5 text-xs text-[var(--gold)]">
                        <span className="font-bold uppercase tracking-wider">Pro-Tip:</span>
                        <span className="text-foreground/80">{guide.tips}</span>
                      </div>
                    )}
                  </motion.article>
                );
              })}
            </AnimatePresence>

            {filteredGuides.length === 0 && (
              <div className="py-16 text-center border border-border rounded-2xl bg-muted/20">
                <p className="text-base text-muted-foreground">No pages match your current search criteria.</p>
                <button
                  onClick={() => {
                    setActiveCategory('All Pages');
                    setSearchQuery('');
                  }}
                  className="mt-4 text-xs font-semibold text-[var(--gold)] underline hover:text-foreground"
                >
                  Clear search and reset filters
                </button>
              </div>
            )}
          </div>
        </section>

        {/* Footer CTA */}
        <footer className="border-t border-border bg-card/60 py-12 px-6 text-center">
          <h3 className="font-sans text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Ready to Run Your Auction?
          </h3>
          <p className="mt-2 text-sm text-foreground/60 max-w-md mx-auto">
            Jump into the auction room, build your roster, and let the real-time bidding begin.
          </p>
          <div className="mt-6 flex items-center justify-center gap-4">
            <Link
              href="/auction"
              className="inline-flex items-center gap-2.5 rounded-full bg-[var(--gold)] px-8 py-3.5 text-sm font-semibold tracking-wide text-primary-foreground transition-all duration-300 hover:shadow-[0_0_30px_oklch(0.75_0.18_75/0.4)] hover:scale-[1.02]"
            >
              ENTER AUCTION ROOM
              <ArrowRight className="h-4 w-4" />
            </Link>
            <button
              onClick={() => router.push('/')}
              className="inline-flex items-center gap-2 rounded-full border border-border px-6 py-3.5 text-sm font-medium tracking-wide text-foreground/80 transition-all duration-300 hover:border-primary/40 hover:text-foreground"
            >
              Back to Home
            </button>
          </div>
        </footer>
      </div>
    </main>
  );
}