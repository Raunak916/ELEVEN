import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Trophy, Award, TrendingUp, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface PlayerHypeProps {
  playerName: string | null;
  role: string | null;
}

export function PlayerHype({ playerName, role }: PlayerHypeProps) {
  const [hypePoints, setHypePoints] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!playerName) {
      setHypePoints([]);
      return;
    }

    let isMounted = true;
    setLoading(true);
    
    async function fetchHype() {
      try {
        const res = await fetch('/api/ai/hype', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ playerName, role }),
        });
        
        if (!isMounted) return;
        
        const data = await res.json();
        if (data.success && data.hype) {
          setHypePoints(data.hype);
        } else {
          setHypePoints([
            `Star ${role || 'player'} ready for the auction.`,
            `Brings immense quality to the pitch.`,
            `Highly sought after by top managers.`,
          ]);
        }
      } catch (error) {
        if (!isMounted) return;
        console.warn('Failed to fetch hype:', error);
        setHypePoints([
          `Star ${role || 'player'} ready for the auction.`,
          `Brings immense quality to the pitch.`,
          `Highly sought after by top managers.`,
        ]);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchHype();

    return () => {
      isMounted = false;
    };
  }, [playerName, role]);

  const icons = [Trophy, Award, TrendingUp];

  if (!playerName) return null;

  return (
    <Card className="glass border-sidebar-border overflow-hidden relative shadow-2xl h-full flex flex-col">
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-transparent pointer-events-none" />
      
      <div className="p-4 border-b border-border/40 bg-muted/20 relative z-10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-indigo-400" />
          <h3 className="font-heading font-bold text-lg text-foreground">Scout Report</h3>
        </div>
        {loading && <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" />}
      </div>

      <CardContent className="p-6 relative z-10 flex-1 flex flex-col justify-center gap-5">
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground"
            >
              <Sparkles className="h-8 w-8 mb-3 opacity-20 animate-pulse" />
              <p className="text-sm font-medium animate-pulse">AI Scouting {playerName}...</p>
            </motion.div>
          ) : (
            <motion.div
              key="content"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              {hypePoints.map((point, idx) => {
                const Icon = icons[idx % icons.length];
                return (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.15 + 0.2 }}
                    className="flex items-start gap-3 bg-muted/30 rounded-xl p-3 border border-border/40 hover:bg-muted/50 transition-colors"
                  >
                    <div className="h-8 w-8 rounded-lg bg-indigo-500/20 flex items-center justify-center shrink-0 border border-indigo-500/30">
                      <Icon className="h-4 w-4 text-indigo-400" />
                    </div>
                    <p className="text-sm font-medium text-foreground leading-snug pt-1">
                      {point}
                    </p>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
