'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { AppLayout } from '@/components/layout/app-layout';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuctionStore } from '@/lib/auction-store';
import { useHydrated } from '@/lib/use-hydrated';
import { formatCurrency } from '@/lib/utils';
import { ChevronRight, Clock, Users, Trophy, Wallet, Trash2, AlertTriangle, Copy, Check, Download } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { generateAuctionHistoryText } from './[id]/page';

export default function HistoryPage() {
  const { getHistory, removeHistoryItem } = useAuctionStore();
  const hydrated = useHydrated();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const history = hydrated ? getHistory() : [];

  const handleCopy = (auction: any) => {
    const text = generateAuctionHistoryText(auction);
    navigator.clipboard.writeText(text);
    setCopiedId(auction.id);
    toast.success(`Copied "${auction.name}" summary to clipboard!`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleExport = (auction: any) => {
    const text = generateAuctionHistoryText(auction);
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const safeName = auction.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
    a.href = url;
    a.download = `${safeName}_auction_history.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Downloaded "${auction.name}" text file!`);
  };

  const renderEmptyState = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col items-center justify-center py-24 px-6 text-center"
    >
      <div className="h-16 w-16 rounded-full bg-[var(--pitch-dark)] flex items-center justify-center mb-6">
        <Clock className="h-8 w-8 text-muted-foreground/30" aria-hidden="true" />
      </div>
      <h3 className="font-heading text-2xl font-semibold text-foreground mb-3">
        No auction history yet
      </h3>
      <p className="text-muted-foreground max-w-md mb-8">
        Complete an auction to see it appear here. Auctions are automatically
        saved to history when finished.
      </p>
    </motion.div>
  );

  const renderHistoryCards = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-4"
    >
      {history
        .slice()
        .reverse()
        .map((auction, index) => (
          <motion.article
            key={auction.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05, ease: [0.16, 1, 0.3, 1] }}
          >
            <Card className="glass overflow-hidden hover:border-border/50 transition-all duration-300">
              <CardContent className="p-5 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  {/* Auction Info */}
                  <div className="flex items-center gap-4 min-w-0 flex-1">
                    <div className="h-12 w-12 rounded-xl bg-[var(--gold)]/10 flex items-center justify-center flex-shrink-0">
                      <Trophy className="h-6 w-6 text-[var(--gold)]" aria-hidden="true" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-3 flex-wrap">
                        <h3 className="font-heading text-lg font-semibold text-foreground truncate">
                          {auction.name}
                        </h3>
                        <span className="text-xs font-medium px-2 py-1 rounded-full bg-muted/50 text-muted-foreground whitespace-nowrap">
                          {format(new Date(auction.completedAt), 'dd MMMM yyyy')}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {auction.totalParticipants} Teams · {auction.totalPlayers} Players Sold
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end sm:justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopy(auction)}
                      className="h-9 px-3 text-xs font-mono font-bold text-muted-foreground hover:text-foreground gap-1.5"
                      title="Copy Summary Text"
                    >
                      {copiedId === auction.id ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                      <span className="hidden md:inline">{copiedId === auction.id ? 'Copied' : 'Copy'}</span>
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleExport(auction)}
                      className="h-9 px-3 text-xs font-mono font-bold text-muted-foreground hover:text-foreground gap-1.5"
                      title="Download Text File"
                    >
                      <Download className="h-4 w-4" />
                      <span className="hidden md:inline">Export</span>
                    </Button>

                    <Link
                      href={`/auction/history/${auction.id}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/10 hover:bg-white/5 text-xs font-mono font-bold text-muted-foreground hover:text-foreground transition-colors duration-200"
                    >
                      <span>VIEW</span>
                      <ChevronRight className="h-4 w-4" aria-hidden="true" />
                    </Link>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (confirm('Delete this auction record? This action cannot be undone.')) {
                          removeHistoryItem(auction.id);
                        }
                      }}
                      className="h-9 w-9 text-destructive hover:bg-destructive/10 hover:text-destructive transition-colors duration-200"
                      aria-label={`Delete ${auction.name}`}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.article>
        ))}
    </motion.div>
  );

  return (
    <AppLayout>
      <div className="space-y-8">
        <PageHeader
          lines={["HISTORY"]}
          description="Completed auction records"
        />

        {history.length === 0 ? renderEmptyState() : renderHistoryCards()}
      </div>
    </AppLayout>
  );
}