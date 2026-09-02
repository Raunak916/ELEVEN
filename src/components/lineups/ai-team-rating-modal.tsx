'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AiTeamRating, Team } from '@/lib/types';
import { toast } from 'sonner';
import {
  Sparkles,
  Shield,
  Zap,
  Swords,
  Users,
  Copy,
  Check,
  RotateCcw,
  Star,
  AlertTriangle,
  Flame,
  Award,
  X,
  TrendingUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AiTeamRatingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  team: Team;
  formationName: string;
  rating: AiTeamRating | null;
  isLoading: boolean;
  onReAnalyze: () => void;
}

function getRatingTier(score: number): { label: string; color: string; bg: string; border: string } {
  if (score >= 9.5) {
    return {
      label: 'S+ LEGENDARY',
      color: 'text-amber-300',
      bg: 'bg-amber-400/20',
      border: 'border-amber-400/40',
    };
  }
  if (score >= 9.0) {
    return {
      label: 'S WORLD CLASS',
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/20',
      border: 'border-emerald-500/40',
    };
  }
  if (score >= 8.0) {
    return {
      label: 'A+ ELITE',
      color: 'text-sky-400',
      bg: 'bg-sky-500/20',
      border: 'border-sky-500/40',
    };
  }
  if (score >= 7.0) {
    return {
      label: 'A CONTENDER',
      color: 'text-purple-400',
      bg: 'bg-purple-500/20',
      border: 'border-purple-500/40',
    };
  }
  return {
    label: 'B COMPETITIVE',
    color: 'text-amber-400',
    bg: 'bg-amber-500/20',
    border: 'border-amber-500/40',
  };
}

export function AiTeamRatingModal({
  open,
  onOpenChange,
  team,
  formationName,
  rating,
  isLoading,
  onReAnalyze,
}: AiTeamRatingModalProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyReport = () => {
    if (!rating) return;

    let text = `========================================\n`;
    text += `⚡ AI TACTICAL SCOUT REPORT: ${team.name.toUpperCase()}\n`;
    text += `👔 Manager/Owner: ${team.owner}\n`;
    text += `📋 Formation: ${formationName}\n`;
    text += `⭐ Overall Rating: ${rating.overallRating} / 10\n`;
    text += `🎯 Style: ${rating.styleArchetype}\n`;
    text += `========================================\n\n`;

    text += `📊 TACTICAL RATINGS:\n`;
    text += `🛡️ Defense:  ${rating.subRatings.defense}/10\n`;
    text += `⚙️ Midfield: ${rating.subRatings.midfield}/10\n`;
    text += `⚔️ Attack:   ${rating.subRatings.attack}/10\n`;
    text += `👥 Depth:    ${rating.subRatings.depth}/10\n\n`;

    text += `📝 EXECUTIVE VERDICT:\n`;
    text += `"${rating.verdictSummary}"\n\n`;

    text += `✅ KEY STRENGTHS:\n`;
    rating.strengths.forEach((s) => {
      text += `• ${s}\n`;
    });
    text += `\n`;

    text += `⚠️ TACTICAL RISKS:\n`;
    rating.weaknesses.forEach((w) => {
      text += `• ${w}\n`;
    });
    text += `\n`;

    text += `🌟 KEY TALISMAN: ${rating.keyPlayer.name}\n`;
    text += `"${rating.keyPlayer.reason}"\n\n`;

    text += `========================================\n`;
    text += `Generated via Eleven AI Tactical Engine\n`;
    text += `========================================\n`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Tactical Scout Report copied to clipboard!');
    setTimeout(() => setCopied(false), 2500);
  };

  const tier = rating ? getRatingTier(rating.overallRating) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className={cn(
          'w-[95vw] sm:max-w-2xl max-h-[90vh] p-0 gap-0 overflow-hidden rounded-3xl',
          'bg-[#080c12]/98 text-foreground backdrop-blur-3xl border border-white/15 shadow-[0_30px_90px_rgba(0,0,0,0.9)]'
        )}
      >
        {/* Header */}
        <DialogHeader className="p-5 sm:p-6 pb-4 border-b border-white/10 shrink-0 bg-black/40">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[var(--gold)]/20 to-amber-500/20 border border-[var(--gold)]/40 flex items-center justify-center text-[var(--gold)] shadow-gold shrink-0">
                <Sparkles className="w-5 h-5 animate-pulse" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-lg sm:text-xl font-heading font-black text-white flex items-center gap-2">
                  <span className="truncate">AI TACTICAL SCOUT REPORT</span>
                </DialogTitle>
                <DialogDescription className="text-white/60 text-xs mt-0.5 truncate font-mono">
                  {team.name} · {formationName} · Manager: {team.owner}
                </DialogDescription>
              </div>
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="h-8 w-8 rounded-xl text-white/50 hover:text-white hover:bg-white/10 shrink-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        {/* Modal Body */}
        <div data-lenis-prevent className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-6 max-h-[70vh] overscroll-contain scrollbar-thin">
          {isLoading ? (
            /* Loading State with animated tactical radar scanner */
            <div className="flex flex-col items-center justify-center py-16 text-center space-y-6">
              <div className="relative">
                <div className="absolute -inset-4 rounded-full bg-[var(--gold)]/20 animate-ping" />
                <div className="w-20 h-20 rounded-3xl bg-[var(--gold)]/10 border border-[var(--gold)]/40 flex items-center justify-center text-[var(--gold)] shadow-xl relative z-10">
                  <Sparkles className="w-10 h-10 animate-spin" style={{ animationDuration: '3s' }} />
                </div>
              </div>

              <div className="space-y-2 max-w-sm">
                <h3 className="text-xl font-heading font-black text-white uppercase tracking-wider">
                  Analyzing Squad Tactics...
                </h3>
                <p className="text-xs text-white/60 font-mono">
                  Evaluating positional synergy, defensive transitions, midfield control, and goal threat with Gemini Pro Engine.
                </p>
              </div>

              <div className="w-48 h-1.5 rounded-full bg-white/10 overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-[var(--gold)] to-emerald-400"
                  animate={{ x: ['-100%', '100%'] }}
                  transition={{ repeat: Infinity, duration: 1.2, ease: 'easeInOut' }}
                />
              </div>
            </div>
          ) : rating ? (
            /* Report Content */
            <div className="space-y-6">
              {/* Top Hero: Score & Archetype */}
              <div className="relative p-6 rounded-3xl bg-gradient-to-br from-white/[0.05] via-black/50 to-white/[0.02] border border-white/15 overflow-hidden shadow-xl">
                {/* Decorative radial blur */}
                <div className="absolute -right-10 -top-10 w-40 h-40 bg-[var(--gold)]/15 rounded-full blur-3xl pointer-events-none" />

                <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-5 relative z-10">
                  {/* Left: Score Card */}
                  <div className="flex items-center gap-4 text-center sm:text-left">
                    <div className="w-20 h-20 sm:w-22 sm:h-22 rounded-3xl bg-black/80 border-2 border-[var(--gold)] flex flex-col items-center justify-center shadow-gold shrink-0">
                      <span className="font-heading font-black text-3xl sm:text-4xl text-white tracking-tight leading-none">
                        {rating.overallRating}
                      </span>
                      <span className="text-[10px] font-mono font-bold text-white/50 uppercase mt-1">
                        / 10.0
                      </span>
                    </div>

                    <div>
                      {tier && (
                        <span
                          className={cn(
                            'inline-block px-2.5 py-0.5 rounded-full text-[10px] font-mono font-black uppercase tracking-wider mb-1.5 border',
                            tier.bg,
                            tier.color,
                            tier.border
                          )}
                        >
                          {tier.label}
                        </span>
                      )}
                      <h3 className="font-heading font-black text-lg sm:text-xl text-white tracking-tight">
                        {rating.verdictTitle}
                      </h3>
                      <p className="text-xs font-mono text-[var(--gold)] flex items-center gap-1.5 mt-0.5">
                        <Zap className="w-3.5 h-3.5 shrink-0" />
                        <span>{rating.styleArchetype}</span>
                      </p>
                    </div>
                  </div>
                </div>

                {/* 4 Sub-Rating Gauges */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-white/10">
                  {/* Defense */}
                  <div className="p-3 rounded-2xl bg-black/40 border border-white/5 space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-mono font-bold">
                      <span className="text-white/60 flex items-center gap-1">
                        <Shield className="w-3 h-3 text-sky-400" /> Defense
                      </span>
                      <span className="text-white">{rating.subRatings.defense}</span>
                    </div>
                    <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                      <div
                        style={{ width: `${Math.min(100, rating.subRatings.defense * 10)}%` }}
                        className="h-full bg-sky-400 rounded-full transition-all duration-500"
                      />
                    </div>
                  </div>

                  {/* Midfield */}
                  <div className="p-3 rounded-2xl bg-black/40 border border-white/5 space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-mono font-bold">
                      <span className="text-white/60 flex items-center gap-1">
                        <Zap className="w-3 h-3 text-amber-400" /> Midfield
                      </span>
                      <span className="text-white">{rating.subRatings.midfield}</span>
                    </div>
                    <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                      <div
                        style={{ width: `${Math.min(100, rating.subRatings.midfield * 10)}%` }}
                        className="h-full bg-amber-400 rounded-full transition-all duration-500"
                      />
                    </div>
                  </div>

                  {/* Attack */}
                  <div className="p-3 rounded-2xl bg-black/40 border border-white/5 space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-mono font-bold">
                      <span className="text-white/60 flex items-center gap-1">
                        <Swords className="w-3 h-3 text-rose-400" /> Attack
                      </span>
                      <span className="text-white">{rating.subRatings.attack}</span>
                    </div>
                    <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                      <div
                        style={{ width: `${Math.min(100, rating.subRatings.attack * 10)}%` }}
                        className="h-full bg-rose-400 rounded-full transition-all duration-500"
                      />
                    </div>
                  </div>

                  {/* Squad Depth */}
                  <div className="p-3 rounded-2xl bg-black/40 border border-white/5 space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-mono font-bold">
                      <span className="text-white/60 flex items-center gap-1">
                        <Users className="w-3 h-3 text-purple-400" /> Depth
                      </span>
                      <span className="text-white">{rating.subRatings.depth}</span>
                    </div>
                    <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                      <div
                        style={{ width: `${Math.min(100, rating.subRatings.depth * 10)}%` }}
                        className="h-full bg-purple-400 rounded-full transition-all duration-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Executive Summary */}
              <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.03] border border-white/10">
                <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-white/40 mb-2 flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5 text-[var(--gold)]" />
                  Scout Verdict
                </h4>
                <p className="text-sm text-white/90 leading-relaxed italic">
                  &ldquo;{rating.verdictSummary}&rdquo;
                </p>
              </div>

              {/* Strengths & Weaknesses Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Strengths */}
                <div className="p-4 rounded-2xl bg-emerald-500/[0.04] border border-emerald-500/20 space-y-2.5">
                  <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5" />
                    Key Strengths
                  </h4>
                  <ul className="space-y-1.5">
                    {rating.strengths.map((s, idx) => (
                      <li key={idx} className="text-xs text-white/80 flex items-start gap-2">
                        <span className="text-emerald-400 font-bold shrink-0">✓</span>
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Vulnerabilities */}
                <div className="p-4 rounded-2xl bg-amber-500/[0.04] border border-amber-500/20 space-y-2.5">
                  <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Tactical Vulnerabilities
                  </h4>
                  <ul className="space-y-1.5">
                    {rating.weaknesses.map((w, idx) => (
                      <li key={idx} className="text-xs text-white/80 flex items-start gap-2">
                        <span className="text-amber-400 font-bold shrink-0">⚠</span>
                        <span>{w}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Key Talisman Card */}
              {rating.keyPlayer && (
                <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-[var(--gold)]/10 via-black/40 to-black/40 border border-[var(--gold)]/30 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-[var(--gold)]/20 border border-[var(--gold)]/40 flex items-center justify-center text-[var(--gold)] shadow-gold shrink-0">
                    <Star className="w-6 h-6 fill-[var(--gold)] text-[var(--gold)]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] font-mono font-bold text-[var(--gold)] uppercase tracking-wider block">
                      KEY TALISMAN & MATCH-WINNER
                    </span>
                    <h4 className="font-heading font-black text-base text-white truncate">
                      {rating.keyPlayer.name}
                    </h4>
                    <p className="text-xs text-white/60 mt-0.5">
                      {rating.keyPlayer.reason}
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>

        {/* Modal Footer Actions */}
        {rating && !isLoading && (
          <div className="p-5 border-t border-white/10 bg-black/40 flex items-center justify-between gap-3 shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onReAnalyze}
              className="gap-1.5 rounded-xl text-xs font-mono border-white/10 bg-white/5 hover:bg-white/10"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Re-Analyze
            </Button>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCopyReport}
                className="gap-1.5 rounded-xl text-xs font-mono border-white/10 bg-white/5 hover:bg-white/10 text-white"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied!' : 'Copy Report'}
              </Button>

              <Button
                type="button"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="rounded-xl px-5 font-heading font-bold text-xs uppercase tracking-wider bg-primary text-primary-foreground hover:bg-primary/90 shadow-gold"
              >
                Done
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
