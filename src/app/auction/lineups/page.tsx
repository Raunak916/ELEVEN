'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { useAuctionStore } from '@/lib/auction-store';
import { AppLayout } from '@/components/layout/app-layout';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { DEFAULT_FORMATION_ID, getFormation } from '@/lib/formations';
import {
  Users,
  Shield,
  Sparkles,
  ArrowRight,
  Plus,
  CheckCircle2,
  Layers,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function LineupsPage() {
  const { teams, auctionPlayers, lineups, autoAssignLineup } = useAuctionStore();

  const teamCardsData = useMemo(() => {
    return teams.map((team) => {
      const teamPlayers = auctionPlayers.filter((ap) => ap.teamId === team.id);
      const teamLineup = lineups[team.id] || {
        teamId: team.id,
        formationId: DEFAULT_FORMATION_ID,
        assignments: {},
      };

      const formation = getFormation(teamLineup.formationId);
      const assignedCount = Object.values(teamLineup.assignments).filter(Boolean).length;
      const isComplete = assignedCount === 11;

      // Sample starters photos for avatar stack
      const starterPhotos = Object.values(teamLineup.assignments)
        .filter(Boolean)
        .map((id) => {
          const p = teamPlayers.find((tp) => tp.id === id);
          return p?.player.photo;
        })
        .filter(Boolean)
        .slice(0, 4) as string[];

      return {
        team,
        teamPlayers,
        formation,
        assignedCount,
        isComplete,
        starterPhotos,
        aiRating: teamLineup.aiRating,
      };
    });
  }, [teams, auctionPlayers, lineups]);

  return (
    <AppLayout>
      <div className="space-y-8 pb-16">
        {/* Page Header */}
        <PageHeader
          lines={['TACTICAL', 'LINEUPS']}
          description="Design matchday starting XIs, customize tactical formations, and export lineups for all participated teams."
          action={
            teams.length > 0 ? (
              <div className="flex items-center gap-2">
                <Badge className="px-3 py-1 bg-white/5 border border-white/10 font-mono text-xs text-white/80">
                  {teams.length} Team{teams.length !== 1 ? 's' : ''} Enrolled
                </Badge>
              </div>
            ) : undefined
          }
        />

        {/* Empty State when no teams exist */}
        {teams.length === 0 ? (
          <Card className="border-white/10 bg-black/40 backdrop-blur-xl rounded-3xl p-10 sm:p-16 text-center shadow-2xl">
            <CardContent className="flex flex-col items-center justify-center space-y-5 p-0">
              <div className="w-16 h-16 rounded-2xl bg-[var(--gold)]/10 border border-[var(--gold)]/20 flex items-center justify-center text-[var(--gold)] shadow-gold">
                <Users className="w-8 h-8" />
              </div>
              <div className="max-w-md">
                <h3 className="text-xl sm:text-2xl font-heading font-black text-white">
                  No Teams Created Yet
                </h3>
                <p className="text-sm text-white/60 mt-1.5">
                  Add participating teams in the Overview or Settings tab to start building tactical matchday lineups.
                </p>
              </div>
              <Link href="/auction">
                <Button className="mt-2 gap-2 h-11 px-6 rounded-xl font-heading font-bold text-xs uppercase tracking-wider bg-primary text-primary-foreground hover:bg-primary/90 shadow-gold">
                  <Plus className="w-4 h-4" />
                  Go to Overview & Add Teams
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          /* Participating Teams Lineups Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {teamCardsData.map(({ team, teamPlayers, formation, assignedCount, isComplete, starterPhotos, aiRating }, index) => {
              return (
                <motion.div
                  key={team.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: index * 0.05 }}
                >
                  <div
                    className={cn(
                      'group relative flex flex-col justify-between h-full p-6 rounded-3xl border transition-all duration-300',
                      'bg-[#0a0e14]/85 backdrop-blur-2xl shadow-xl hover:shadow-[0_15px_40px_rgba(0,0,0,0.7)]',
                      isComplete
                        ? 'border-emerald-500/30 hover:border-emerald-500/50'
                        : 'border-white/10 hover:border-[var(--gold)]/40'
                    )}
                  >
                    {/* Top Section: Team Badge & Info */}
                    <div>
                      <div className="flex items-start justify-between gap-3 mb-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[var(--gold)]">
                              TEAM #{index + 1}
                            </span>
                            {aiRating && (
                              <span className="flex items-center gap-1 text-[10px] font-mono font-black px-2 py-0.2 rounded-full bg-[var(--gold)]/15 text-[var(--gold)] border border-[var(--gold)]/30">
                                <Sparkles className="w-2.5 h-2.5" />
                                ★ {aiRating.overallRating}/10
                              </span>
                            )}
                          </div>
                          <h3 className="font-heading font-black text-xl text-white tracking-tight group-hover:text-[var(--gold)] transition-colors truncate">
                            {team.name}
                          </h3>
                          <p className="text-xs text-white/50 font-mono mt-0.5">
                            Owner: <span className="text-white/80 font-bold">{team.owner}</span>
                          </p>
                        </div>

                        {/* Lineup Status Pill */}
                        <div className="shrink-0">
                          {isComplete ? (
                            <Badge className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 gap-1 font-mono text-[10px] font-bold">
                              <CheckCircle2 className="w-3 h-3" />
                              XI READY
                            </Badge>
                          ) : (
                            <Badge className="bg-amber-500/15 text-amber-400 border border-amber-500/30 font-mono text-[10px] font-bold">
                              {assignedCount}/11 SLOTS
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Formation & Squad Metrics Card */}
                      <div className="grid grid-cols-2 gap-2.5 p-3.5 rounded-2xl bg-black/40 border border-white/5 text-xs font-mono mb-4">
                        <div>
                          <span className="text-white/40 text-[10px] uppercase block">Formation</span>
                          <span className="text-white font-bold text-sm truncate block mt-0.5">
                            {formation.name.split(' ')[0]}
                          </span>
                        </div>
                        <div>
                          <span className="text-white/40 text-[10px] uppercase block">Squad Roster</span>
                          <span className="text-white font-bold text-sm block mt-0.5">
                            {teamPlayers.length} Player{teamPlayers.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>

                      {/* Starter Avatars Stack Preview */}
                      {starterPhotos.length > 0 && (
                        <div className="flex items-center gap-2 mb-5">
                          <div className="flex -space-x-2 overflow-hidden">
                            {starterPhotos.map((photo, i) => (
                              <div
                                key={i}
                                className="relative inline-block h-8 w-8 rounded-full ring-2 ring-black bg-black/60 overflow-hidden"
                              >
                                <Image
                                  src={photo}
                                  alt="Starter"
                                  fill
                                  unoptimized={true}
                                  className="object-cover object-top"
                                  sizes="32px"
                                />
                              </div>
                            ))}
                          </div>
                          <span className="text-[11px] font-mono text-white/50">
                            {assignedCount} of 11 in Starting XI
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Bottom Actions */}
                    <div className="pt-2 flex items-center gap-2">
                      <Link href={`/auction/lineups/${team.id}`} className="flex-1">
                        <Button className="w-full gap-2 h-11 rounded-2xl font-heading font-black text-xs uppercase tracking-wider bg-primary text-primary-foreground hover:bg-primary/90 shadow-gold group-hover:scale-[1.02] transition-transform">
                          <span>Build Lineup</span>
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </Link>

                      {teamPlayers.length > 0 && assignedCount < 11 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => autoAssignLineup(team.id)}
                          className="h-11 w-11 rounded-2xl border-white/10 bg-white/5 hover:bg-white/10 text-[var(--gold)] shrink-0"
                          title="Quick Auto-Fill Starters"
                        >
                          <Sparkles className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
