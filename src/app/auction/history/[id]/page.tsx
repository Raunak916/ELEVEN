'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { AppLayout } from '@/components/layout/app-layout';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuctionStore } from '@/lib/auction-store';
import { useHydrated } from '@/lib/use-hydrated';
import { formatCurrency, cn } from '@/lib/utils';
import { ChevronLeft, Clock, Users, Trophy, Wallet, ArrowRight, Copy, Check, Download } from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';
import { toast } from 'sonner';

interface AuctionSnapshot {
  id: string;
  auctionId: string;
  name: string;
  completedAt: string;
  settings: {
    currency: 'INR' | 'USD' | 'EUR' | 'GBP';
    maxTeamBudget: number;
  };
  participants: Array<{
    id: string;
    name: string;
    owner: string;
    budgetLeft: number;
    budgetSpent: number;
    playersAcquired: number;
    players: Array<{
      playerId: string;
      playerName: string;
      role: string;
      basePrice: number;
      soldPrice: number;
      currency: 'INR' | 'USD' | 'EUR' | 'GBP';
    }>;
  }>;
  totalPlayers: number;
  totalParticipants: number;
}

export function generateAuctionHistoryText(auction: AuctionSnapshot): string {
  const dateFormatted = format(new Date(auction.completedAt), 'EEEE, dd MMMM yyyy, HH:mm');
  const currency = auction.settings.currency;

  let text = `========================================\n`;
  text += `🏆 ${auction.name.toUpperCase()}\n`;
  text += `📅 Date: ${dateFormatted}\n`;
  text += `👥 Total Participants: ${auction.totalParticipants}\n`;
  text += `⚽ Total Players Sold: ${auction.totalPlayers}\n`;
  text += `💰 Max Team Budget: ${formatCurrency(auction.settings.maxTeamBudget, currency)}\n`;
  text += `========================================\n\n`;

  auction.participants.forEach((team, index) => {
    text += `----------------------------------------\n`;
    text += `TEAM ${index + 1}: ${team.name.toUpperCase()}\n`;
    text += `👤 Owner: ${team.owner}\n`;
    text += `💸 Budget Spent: ${formatCurrency(team.budgetSpent, currency)}\n`;
    text += `💵 Budget Left: ${formatCurrency(team.budgetLeft, currency)}\n`;
    text += `🏅 Players Acquired (${team.playersAcquired}):\n`;

    if (team.players.length === 0) {
      text += `   (No players acquired)\n`;
    } else {
      team.players.forEach((p, pIdx) => {
        text += `   ${pIdx + 1}. ${p.playerName} [${p.role}] - Sold: ${formatCurrency(p.soldPrice, p.currency)} (Base: ${formatCurrency(p.basePrice, p.currency)})\n`;
      });
    }
    text += `\n`;
  });

  text += `========================================\n`;
  text += `Generated via Eleven Platform\n`;
  text += `========================================\n`;

  return text;
}

export default function AuctionHistoryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { getAuctionSnapshot } = useAuctionStore();
  const hydrated = useHydrated();
  const [auction, setAuction] = React.useState<AuctionSnapshot | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [copied, setCopied] = useState(false);

  React.useEffect(() => {
    const loadAuction = async () => {
      const resolvedParams = await params;
      if (hydrated) {
        const snapshot = getAuctionSnapshot(resolvedParams.id);
        setAuction(snapshot || null);
      }
      setLoading(false);
    };
    loadAuction();
  }, [params, hydrated, getAuctionSnapshot]);

  const handleCopyHistory = () => {
    if (!auction) return;
    const text = generateAuctionHistoryText(auction);
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Auction history summary copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportText = () => {
    if (!auction) return;
    const text = generateAuctionHistoryText(auction);
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const safeName = auction.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
    a.href = url;
    a.download = `${safeName}_auction_history.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Downloaded auction history text file!');
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--gold)] border-t-transparent" aria-hidden="true" />
        </div>
      </AppLayout>
    );
  }

  if (!auction) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] text-center px-6">
          <Clock className="h-12 w-12 text-muted-foreground/30 mb-4" aria-hidden="true" />
          <h3 className="font-heading text-xl font-semibold text-foreground mb-2">Auction not found</h3>
          <p className="text-muted-foreground mb-6">This auction record may have been removed.</p>
          <Link href="/auction/history" className="text-sm font-medium text-[var(--gold)] hover:underline flex items-center gap-1">
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            Back to History
          </Link>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-8">
        {/* Header */}
        <PageHeader
          lines={["AUCTION DETAILS"]}
          description={`Completed on ${format(new Date(auction.completedAt), 'EEEE, dd MMMM yyyy')} at ${format(new Date(auction.completedAt), 'HH:mm')}`}
          action={
            <div className="flex items-center gap-2.5 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyHistory}
                className="gap-2 font-heading font-bold text-xs uppercase tracking-wider rounded-xl border-white/15 bg-white/5 hover:bg-white/10"
              >
                {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                <span>{copied ? 'Copied!' : 'Copy Summary'}</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleExportText}
                className="gap-2 font-heading font-bold text-xs uppercase tracking-wider rounded-xl border-[var(--gold)]/30 text-[var(--gold)] hover:bg-[var(--gold)]/10"
              >
                <Download className="h-4 w-4" />
                <span>Export Text File</span>
              </Button>

              <Link
                href="/auction/history"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/10 hover:bg-white/5 text-xs font-mono font-bold text-muted-foreground hover:text-foreground transition-colors"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                Back to History
              </Link>
            </div>
          }
        />

        {/* Auction Summary Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          <Card className="glass">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-[var(--gold)]/10 flex items-center justify-center">
                  <Trophy className="h-6 w-6 text-[var(--gold)]" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Participants</p>
                  <p className="font-heading text-2xl font-bold text-foreground tabular-nums">
                    {auction.totalParticipants}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-[var(--emerald)]/10 flex items-center justify-center">
                  <Users className="h-6 w-6 text-[var(--emerald)]" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Players Sold</p>
                  <p className="font-heading text-2xl font-bold text-foreground tabular-nums">
                    {auction.totalPlayers}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-[var(--emerald)]/10 flex items-center justify-center">
                  <Wallet className="h-6 w-6 text-[var(--emerald)]" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Starting Budget</p>
                  <p className="font-heading text-2xl font-bold text-foreground tabular-nums">
                    {formatCurrency(auction.settings.maxTeamBudget, auction.settings.currency)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-[var(--gold)]/10 flex items-center justify-center">
                  <Clock className="h-6 w-6 text-[var(--gold)]" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Date</p>
                  <p className="font-heading text-xl font-bold text-foreground tabular-nums">
                    {format(new Date(auction.completedAt), 'dd MMM yyyy')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Participants */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="space-y-4"
        >
          {auction.participants.map((participant, pIndex) => (
            <motion.div
              key={participant.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: pIndex * 0.05, ease: [0.16, 1, 0.3, 1] }}
            >
              <Card className="glass overflow-hidden">
                <CardHeader className="p-5 pb-3 border-b border-border/30">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-xl bg-[var(--gold)]/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-lg font-bold text-[var(--gold)]">{pIndex + 1}</span>
                      </div>
                      <div>
                        <CardTitle className="font-heading text-lg font-semibold">{participant.name}</CardTitle>
                        <p className="text-sm text-muted-foreground">Owner: {participant.owner}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1 font-medium text-foreground">
                        <Wallet className="h-3.5 w-3.5" aria-hidden="true" />
                        {formatCurrency(participant.budgetSpent, auction.settings.currency)} spent
                      </span>
                      <span className="flex items-center gap-1 font-medium text-[var(--emerald)]">
                        <Wallet className="h-3.5 w-3.5" aria-hidden="true" />
                        {formatCurrency(participant.budgetLeft, auction.settings.currency)} left
                      </span>
                      <span className="flex items-center gap-1 font-medium text-foreground">
                        <Trophy className="h-3.5 w-3.5" aria-hidden="true" />
                        {participant.playersAcquired} Players
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-5 pt-0">
                  {participant.players.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <p className="text-sm">No players acquired</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full" role="table">
                        <thead>
                          <tr className="border-b border-border/30">
                            <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground" scope="col">Player</th>
                            <th className="text-center px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground" scope="col">Role</th>
                            <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground" scope="col">Base Price</th>
                            <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground" scope="col">Sold For</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/20">
                          {participant.players.map((player, plIndex) => (
                            <motion.tr
                              key={`${player.playerId}-${plIndex}`}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ duration: 0.2, delay: plIndex * 0.03, ease: [0.16, 1, 0.3, 1] }}
                              className="hover:bg-sidebar-accent transition-colors"
                            >
                              <td className="px-4 py-3">
                                <p className="font-medium text-foreground">{player.playerName}</p>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span className={cn(
                                  'inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-medium',
                                  player.role === 'Goalkeeper' && 'bg-blue-500/20 text-blue-400',
                                  player.role === 'Defender' && 'bg-red-500/20 text-red-400',
                                  player.role === 'Midfielder' && 'bg-yellow-500/20 text-yellow-400',
                                  player.role === 'Forward' && 'bg-green-500/20 text-green-400'
                                )}>
                                  {player.role}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right font-mono tabular-nums text-muted-foreground">
                                {formatCurrency(player.basePrice, player.currency)}
                              </td>
                              <td className="px-4 py-3 text-right font-heading font-semibold text-foreground tabular-nums">
                                {formatCurrency(player.soldPrice, player.currency)}
                              </td>
                            </motion.tr>
                          ))}
                          {/* Total Row */}
                          <tr className="bg-muted/30 font-semibold">
                            <td className="px-4 py-3">Total</td>
                            <td className="px-4 py-3 text-center">{participant.playersAcquired} players</td>
                            <td className="px-4 py-3 text-right font-mono tabular-nums text-muted-foreground">
                              {formatCurrency(participant.players.reduce((sum, p) => sum + p.basePrice, 0), auction.settings.currency)}
                            </td>
                            <td className="px-4 py-3 text-right font-heading text-[var(--emerald)] tabular-nums">
                              {formatCurrency(participant.budgetSpent, auction.settings.currency)}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {auction.participants.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="text-center py-16"
          >
            <p className="text-muted-foreground">No participants in this auction</p>
          </motion.div>
        )}
      </div>
    </AppLayout>
  );
}