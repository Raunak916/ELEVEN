'use client';

import React from 'react';
import Link from 'next/link';
import { useAuctionStore } from '@/lib/auction-store';
import { useHydrated } from '@/lib/use-hydrated';
import { LineupBuilderScreen } from '@/components/lineups/lineup-builder-screen';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Users } from 'lucide-react';

interface TeamLineupPageProps {
  params: Promise<{ teamId: string }>;
}

export default function TeamLineupPage({ params }: TeamLineupPageProps) {
  const { teamId } = React.use(params);
  const { teams } = useAuctionStore();
  const hydrated = useHydrated();

  if (!hydrated) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-pulse font-mono text-xs text-white/50">
          Loading lineup tactical engine...
        </div>
      </div>
    );
  }

  const team = teams.find((t) => t.id === teamId);

  if (!team) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
          <Users className="w-8 h-8" />
        </div>
        <div>
          <h2 className="text-xl font-heading font-black text-white">Team Not Found</h2>
          <p className="text-xs text-white/50 mt-1">
            The requested team could not be found or has been removed from this auction.
          </p>
        </div>
        <Link href="/auction/lineups">
          <Button variant="outline" className="gap-2 rounded-xl border-white/10 text-xs font-mono">
            <ChevronLeft className="w-4 h-4" />
            Back to Lineups Hub
          </Button>
        </Link>
      </div>
    );
  }

  return <LineupBuilderScreen team={team} />;
}
