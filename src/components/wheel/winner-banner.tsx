'use client';

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Sparkles, X, RotateCw, Trash2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import confetti from 'canvas-confetti';

interface WinnerBannerProps {
  winner: string | null;
  onDismiss: () => void;
  onSpinAgain?: () => void;
  onRemoveWinner?: () => void;
}

export function fireWheelWinnerConfetti() {
  const count = 200;
  const defaults = {
    origin: { y: 0.65 },
    colors: ['#ffd700', '#10b981', '#60a5fa', '#f43f5e', '#a855f7', '#ffffff'],
    zIndex: 1000,
    disableForReducedMotion: true,
  };

  // Left stream
  confetti({
    ...defaults,
    particleCount: Math.floor(count * 0.35),
    angle: 60,
    spread: 60,
    startVelocity: 60,
    scalar: 1.1,
  });

  // Right stream
  confetti({
    ...defaults,
    particleCount: Math.floor(count * 0.35),
    angle: 120,
    spread: 60,
    startVelocity: 60,
    scalar: 1.1,
  });

  // Center star burst
  confetti({
    ...defaults,
    particleCount: Math.floor(count * 0.4),
    spread: 120,
    startVelocity: 50,
    scalar: 1.2,
    ticks: 240,
  });
}

export function WinnerBanner({
  winner,
  onDismiss,
  onSpinAgain,
  onRemoveWinner,
}: WinnerBannerProps) {
  useEffect(() => {
    if (winner) {
      fireWheelWinnerConfetti();
    }
  }, [winner]);

  if (!winner) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="relative overflow-hidden rounded-2xl border-2 border-primary/40 bg-gradient-to-r from-primary/10 via-card to-primary/10 p-6 shadow-2xl backdrop-blur-xl"
      >
        {/* Glow overlay */}
        <div className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-primary/20 blur-3xl pointer-events-none" />
        <div className="absolute -left-10 -bottom-10 h-36 w-36 rounded-full bg-emerald-500/20 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4 text-center sm:text-left">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary via-amber-400 to-amber-600 p-0.5 shadow-lg shadow-primary/25 shrink-0 flex items-center justify-center">
              <div className="w-full h-full rounded-[14px] bg-background/80 flex items-center justify-center">
                <Trophy className="w-7 h-7 text-primary animate-bounce" />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-center sm:justify-start gap-2">
                <span className="text-xs uppercase font-bold tracking-widest text-primary flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" /> Winning Result
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary/20 text-primary border border-primary/30">
                  <CheckCircle2 className="w-3 h-3" /> Selected
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-heading font-black tracking-tight text-foreground mt-1">
                {winner}
              </h2>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 shrink-0">
            {onRemoveWinner && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onRemoveWinner}
                className="text-xs gap-1.5 h-9 bg-card/60 hover:bg-destructive/20 hover:text-destructive hover:border-destructive/40 transition-colors"
                title="Remove this winning item from the wheel"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Remove Winner
              </Button>
            )}

            {onSpinAgain && (
              <Button
                type="button"
                size="sm"
                onClick={onSpinAgain}
                className="text-xs gap-1.5 h-9 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-4 shadow-gold"
              >
                <RotateCw className="w-3.5 h-3.5" />
                Spin Again
              </Button>
            )}

            <button
              type="button"
              onClick={onDismiss}
              aria-label="Dismiss winner banner"
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
