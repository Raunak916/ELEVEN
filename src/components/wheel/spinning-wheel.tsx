'use client';

import React, { useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Disc3 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SegmentTheme {
  bg: string;
  text: string;
  stroke: string;
}

export const WHEEL_COLORS: SegmentTheme[] = [
  { bg: '#e11d48', text: '#ffffff', stroke: 'rgba(0, 0, 0, 0.95)' }, // Crimson Red
  { bg: '#2563eb', text: '#ffffff', stroke: 'rgba(0, 0, 0, 0.95)' }, // Royal Blue
  { bg: '#059669', text: '#ffffff', stroke: 'rgba(0, 0, 0, 0.95)' }, // Emerald Green
  { bg: '#d97706', text: '#ffffff', stroke: 'rgba(0, 0, 0, 0.95)' }, // Vivid Amber Gold
  { bg: '#7c3aed', text: '#ffffff', stroke: 'rgba(0, 0, 0, 0.95)' }, // Royal Purple
  { bg: '#0891b2', text: '#ffffff', stroke: 'rgba(0, 0, 0, 0.95)' }, // Deep Cyan
  { bg: '#db2777', text: '#ffffff', stroke: 'rgba(0, 0, 0, 0.95)' }, // Hot Pink
  { bg: '#4f46e5', text: '#ffffff', stroke: 'rgba(0, 0, 0, 0.95)' }, // Electric Indigo
  { bg: '#ea580c', text: '#ffffff', stroke: 'rgba(0, 0, 0, 0.95)' }, // Radiant Orange
  { bg: '#0d9488', text: '#ffffff', stroke: 'rgba(0, 0, 0, 0.95)' }, // Vibrant Teal
  { bg: '#9333ea', text: '#ffffff', stroke: 'rgba(0, 0, 0, 0.95)' }, // Bright Violet
  { bg: '#0284c7', text: '#ffffff', stroke: 'rgba(0, 0, 0, 0.95)' }, // Sky Blue
  { bg: '#be123c', text: '#ffffff', stroke: 'rgba(0, 0, 0, 0.95)' }, // Deep Ruby
  { bg: '#16a34a', text: '#ffffff', stroke: 'rgba(0, 0, 0, 0.95)' }, // Forest Green
  { bg: '#b45309', text: '#ffffff', stroke: 'rgba(0, 0, 0, 0.95)' }, // Bronze Gold
  { bg: '#c026d3', text: '#ffffff', stroke: 'rgba(0, 0, 0, 0.95)' }, // Fuchsia
];

// Helper to get color for index ensuring no adjacent duplicates even on wrap-around
export function getSegmentColor(index: number, total: number): SegmentTheme {
  let colorIndex = index % WHEEL_COLORS.length;
  // If last item has same color as first item (when total is odd and wraps to 0)
  if (total > 1 && index === total - 1 && colorIndex === 0) {
    colorIndex = (colorIndex + 1) % WHEEL_COLORS.length;
  }
  return WHEEL_COLORS[colorIndex];
}

/**
 * Deterministic calculation of winning index from rotation angle:
 * Pointer is fixed at 12 o'clock (0° / top).
 * The wheel starts with Segment 0 spanning [0, segmentAngle) clockwise from top.
 * When rotated clockwise by `rotation` degrees:
 * The segment beneath the top pointer is given by:
 */
export function getWinnerIndexFromRotation(rotation: number, totalItems: number): number {
  if (totalItems <= 0) return -1;
  const segmentAngle = 360 / totalItems;
  const normRotation = ((rotation % 360) + 360) % 360;
  const angleUnderPointer = (360 - normRotation) % 360;
  const index = Math.floor(angleUnderPointer / segmentAngle);
  return Math.min(Math.max(index, 0), totalItems - 1);
}

interface SpinningWheelProps {
  entries: string[];
  isSpinning: boolean;
  onSpinStart: () => void;
  onSpinComplete: (winner: string, winningIndex: number) => void;
  currentRotation: number;
  onRotationChange: (rotation: number) => void;
  disabled?: boolean;
}

export function SpinningWheel({
  entries,
  isSpinning,
  onSpinStart,
  onSpinComplete,
  currentRotation,
  onRotationChange,
  disabled = false,
}: SpinningWheelProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wheelWrapperRef = useRef<HTMLDivElement | null>(null);
  const pointerRef = useRef<HTMLDivElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const lastTickSegmentRef = useRef<number>(-1);
  const currentRotationRef = useRef<number>(currentRotation);

  // Sync ref
  useEffect(() => {
    currentRotationRef.current = currentRotation;
    if (wheelWrapperRef.current && !isSpinning) {
      wheelWrapperRef.current.style.transform = `rotate(${currentRotation}deg)`;
    }
  }, [currentRotation, isSpinning]);

  const canSpin = entries.length >= 2 && !isSpinning && !disabled;

  // Web Audio click generator for tactile ticking
  const playTickSound = useCallback(() => {
    try {
      if (!audioContextRef.current) {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioCtx) {
          audioContextRef.current = new AudioCtx();
        }
      }
      if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume();
      }
      if (audioContextRef.current) {
        const ctx = audioContextRef.current;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(180, ctx.currentTime + 0.015);

        gain.gain.setValueAtTime(0.06, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.015);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start();
        osc.stop(ctx.currentTime + 0.015);
      }
    } catch {
      // Audio playback is optional progressive enhancement
    }
  }, []);

  // Draw the static wheel base onto canvas ONCE per entries update
  const drawWheelBase = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    // Logical rendering size is 800x800 for crystal-clear retina rendering
    const size = 800;
    const center = size / 2;
    const radius = center - 36;
    const hubRadius = 78;

    ctx.clearRect(0, 0, size, size);

    const count = entries.length > 0 ? entries.length : 1;
    const items = entries.length > 0 ? entries : ['Add entries in panel...'];
    const segmentAngle = (2 * Math.PI) / count;

    ctx.save();
    ctx.translate(center, center);

    // 1. Draw Outer Gold / Metallic Rim Base
    ctx.shadowBlur = 35;
    ctx.shadowColor = 'rgba(212, 175, 55, 0.4)';
    ctx.beginPath();
    ctx.arc(0, 0, radius + 18, 0, 2 * Math.PI);
    ctx.fillStyle = '#09090b';
    ctx.fill();
    ctx.shadowBlur = 0;

    // Outer Dark Bezel
    ctx.beginPath();
    ctx.arc(0, 0, radius + 18, 0, 2 * Math.PI);
    ctx.fillStyle = '#141416';
    ctx.fill();

    // Metallic Gold Outer Rim
    const rimGrad = ctx.createRadialGradient(0, 0, radius - 4, 0, 0, radius + 18);
    rimGrad.addColorStop(0, '#27272a');
    rimGrad.addColorStop(0.3, '#f59e0b');
    rimGrad.addColorStop(0.7, '#b45309');
    rimGrad.addColorStop(1, '#09090b');
    ctx.beginPath();
    ctx.arc(0, 0, radius + 18, 0, 2 * Math.PI);
    ctx.lineWidth = 14;
    ctx.strokeStyle = rimGrad;
    ctx.stroke();

    // Perimeter Metal Studs / Pins
    const pinCount = Math.max(count, 16);
    for (let s = 0; s < pinCount; s++) {
      const pinAngle = -Math.PI / 2 + (s * 2 * Math.PI) / pinCount;
      const px = Math.cos(pinAngle) * (radius + 9);
      const py = Math.sin(pinAngle) * (radius + 9);

      // Pin shadow
      ctx.beginPath();
      ctx.arc(px, py, 5, 0, 2 * Math.PI);
      ctx.fillStyle = '#000000';
      ctx.fill();

      // Pin metallic cap
      const pinGrad = ctx.createRadialGradient(px - 1, py - 1, 0.5, px, py, 4.5);
      pinGrad.addColorStop(0, '#ffffff');
      pinGrad.addColorStop(0.4, '#ffd700');
      pinGrad.addColorStop(1, '#78350f');
      ctx.beginPath();
      ctx.arc(px, py, 4, 0, 2 * Math.PI);
      ctx.fillStyle = pinGrad;
      ctx.fill();
    }

    // 2. Draw Wheel Slices
    if (entries.length === 0) {
      // Draw clean empty wheel placeholder surface
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, 2 * Math.PI);
      const emptyGrad = ctx.createRadialGradient(0, 0, hubRadius, 0, 0, radius);
      emptyGrad.addColorStop(0, '#18181b');
      emptyGrad.addColorStop(1, '#0e0e10');
      ctx.fillStyle = emptyGrad;
      ctx.fill();

      // Subtle dashed guideline ring
      ctx.beginPath();
      ctx.arc(0, 0, (radius + hubRadius) / 2, 0, 2 * Math.PI);
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 8]);
      ctx.strokeStyle = 'rgba(212, 175, 55, 0.2)';
      ctx.stroke();
      ctx.setLineDash([]);
    } else {
      // 12 o'clock is at -Math.PI / 2
      for (let i = 0; i < count; i++) {
        const startAngle = -Math.PI / 2 + i * segmentAngle;
        const endAngle = startAngle + segmentAngle;
        const theme = getSegmentColor(i, count);

        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, radius, startAngle, endAngle);
        ctx.closePath();

        // Vibrant solid background color
        ctx.fillStyle = theme.bg;
        ctx.fill();

        // Subtle radial gloss / sheen
        const sheenGrad = ctx.createRadialGradient(0, 0, hubRadius, 0, 0, radius);
        sheenGrad.addColorStop(0, 'rgba(255, 255, 255, 0.16)');
        sheenGrad.addColorStop(0.7, 'rgba(255, 255, 255, 0.02)');
        sheenGrad.addColorStop(1, 'rgba(0, 0, 0, 0.18)');
        ctx.fillStyle = sheenGrad;
        ctx.fill();

        // Crisp slice separator border
        ctx.lineWidth = 3.5;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.stroke();

        // 3. Draw Large, Bold, PURE WHITE Text
        const text = items[i];
        const midAngle = (startAngle + endAngle) / 2;
        ctx.save();
        ctx.rotate(midAngle);

        // Determine optimal font size based on segment count
        let fontSize = 26;
        if (count <= 3) fontSize = 32;
        else if (count <= 6) fontSize = 28;
        else if (count <= 10) fontSize = 24;
        else if (count <= 16) fontSize = 19;
        else if (count <= 24) fontSize = 15;
        else fontSize = 13;

        if (text.length > 16) fontSize = Math.max(fontSize - 3, 11);

        ctx.font = `900 ${fontSize}px "Inter", system-ui, -apple-system, BlinkMacSystemFont, sans-serif`;
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';

        const maxTextWidth = radius - hubRadius - 44;

        // Truncate text with ellipsis if it exceeds segment radial length
        let displayText = text;
        while (ctx.measureText(displayText).width > maxTextWidth && displayText.length > 3) {
          displayText = displayText.slice(0, -1);
        }
        if (displayText !== text) {
          displayText = displayText.slice(0, -2) + '…';
        }

        // Main Text Fill in clean PURE WHITE without black border
        ctx.fillStyle = '#ffffff';
        ctx.fillText(displayText, radius - 38, 0);

        ctx.restore();
      }
    }

    // 4. Center Hub Disk
    ctx.beginPath();
    ctx.arc(0, 0, hubRadius + 10, 0, 2 * Math.PI);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fill();

    // Center Gold Bezel
    const hubRimGrad = ctx.createLinearGradient(-hubRadius, -hubRadius, hubRadius, hubRadius);
    hubRimGrad.addColorStop(0, '#fffbeb');
    hubRimGrad.addColorStop(0.3, '#f59e0b');
    hubRimGrad.addColorStop(0.7, '#b45309');
    hubRimGrad.addColorStop(1, '#78350f');

    ctx.beginPath();
    ctx.arc(0, 0, hubRadius, 0, 2 * Math.PI);
    ctx.fillStyle = '#121214';
    ctx.fill();
    ctx.lineWidth = 7;
    ctx.strokeStyle = hubRimGrad;
    ctx.stroke();

    ctx.restore();
  }, [entries]);

  // Handle canvas sizing and draw on entries change
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 2) : 1;
    const renderSize = 800;

    canvas.width = renderSize * dpr;
    canvas.height = renderSize * dpr;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(dpr, dpr);
    }
    drawWheelBase();
  }, [drawWheelBase]);

  // Clean up animation on unmount
  useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, []);

  // Butter-smooth GPU-accelerated Physics Spin Engine
  const handleSpinClick = useCallback(() => {
    if (!canSpin) return;

    onSpinStart();

    const count = entries.length;
    const segmentAngle = 360 / count;

    // 1. Pick a random continuous angular offset inside the chosen winner wedge
    const targetWinnerIndex = Math.floor(Math.random() * count);
    const segmentOffsetFraction = 0.2 + Math.random() * 0.6; // between 20% and 80%
    const angleInsideSegment = segmentOffsetFraction * segmentAngle;

    const targetLocalAngleUnderPointer = targetWinnerIndex * segmentAngle + angleInsideSegment;
    const targetNormRotation = (360 - targetLocalAngleUnderPointer + 360) % 360;

    // 7 to 10 full turns
    const fullSpins = 7 + Math.floor(Math.random() * 4);

    const startRot = currentRotationRef.current;
    const currentNorm = ((startRot % 360) + 360) % 360;
    let delta = targetNormRotation - currentNorm;
    if (delta <= 0) delta += 360;

    const targetTotalRotation = startRot + fullSpins * 360 + delta;
    const totalRotationDelta = targetTotalRotation - startRot;

    // Spin duration 5.2s
    const duration = 5200 + Math.random() * 500;
    const startTime = performance.now();

    // Quintic Ease-Out curve for ultra-smooth physical momentum deceleration
    const easeOutQuint = (t: number) => 1 - Math.pow(1 - t, 5);

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeOutQuint(progress);

      const currentAngle = startRot + totalRotationDelta * easedProgress;

      // Directly update DOM transform on GPU compositor thread (Zero React re-render overhead!)
      if (wheelWrapperRef.current) {
        wheelWrapperRef.current.style.transform = `rotate(${currentAngle}deg)`;
      }

      // Ticking & pointer tactile wobble
      const currentSegment = getWinnerIndexFromRotation(currentAngle, count);
      if (currentSegment !== lastTickSegmentRef.current) {
        lastTickSegmentRef.current = currentSegment;
        playTickSound();

        if (pointerRef.current) {
          pointerRef.current.style.transform = 'rotate(-10deg) translateY(-2px)';
          setTimeout(() => {
            if (pointerRef.current) {
              pointerRef.current.style.transform = 'rotate(0deg) translateY(0px)';
            }
          }, 35);
        }
      }

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(animate);
      } else {
        // Animation finished!
        const finalAngle = targetTotalRotation;
        currentRotationRef.current = finalAngle;
        if (wheelWrapperRef.current) {
          wheelWrapperRef.current.style.transform = `rotate(${finalAngle}deg)`;
        }

        onRotationChange(finalAngle);

        // Strict deterministic winner calculation from final angle
        const finalWinnerIndex = getWinnerIndexFromRotation(finalAngle, count);
        const finalWinner = entries[finalWinnerIndex];

        onSpinComplete(finalWinner, finalWinnerIndex);
      }
    };

    animFrameRef.current = requestAnimationFrame(animate);
  }, [canSpin, onSpinStart, entries, onRotationChange, playTickSound, onSpinComplete]);

  return (
    <div className="relative flex flex-col items-center justify-center select-none w-full max-w-[620px] xl:max-w-[680px] pt-10 pb-2 px-2">
      {/* Outer ambient glow */}
      <div className="absolute inset-0 max-w-[660px] max-h-[660px] m-auto rounded-full bg-primary/20 blur-3xl pointer-events-none -z-10" />

      {/* EXTERNAL FIXED POINTER (Completely outside the wheel rim at top) */}
      <div className="absolute top-1 left-1/2 -translate-x-1/2 z-40 pointer-events-none flex flex-col items-center">
        {/* Mounting Bracket */}
        <div className="w-14 h-3.5 rounded-t-md bg-gradient-to-b from-amber-200 via-amber-400 to-amber-800 shadow-md border-t border-amber-100 flex items-center justify-around px-1">
          <div className="w-2 h-2 rounded-full bg-zinc-950 border border-amber-300 shadow-inner" />
          <div className="w-2 h-2 rounded-full bg-zinc-950 border border-amber-300 shadow-inner" />
        </div>

        {/* 3D Gold Pointer Arrow Flapper */}
        <div
          ref={pointerRef}
          className="relative transition-transform duration-75 origin-top filter drop-shadow-[0_8px_16px_rgba(212,175,55,0.8)]"
          style={{ willChange: 'transform' }}
        >
          <svg width="52" height="66" viewBox="0 0 52 66" fill="none">
            <defs>
              <linearGradient id="extPointerGold" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="25%" stopColor="#fbbf24" />
                <stop offset="65%" stopColor="#d97706" />
                <stop offset="100%" stopColor="#78350f" />
              </linearGradient>
              <linearGradient id="needleSpine" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#ef4444" />
                <stop offset="100%" stopColor="#991b1b" />
              </linearGradient>
            </defs>

            {/* Main Outer Pointer Arrow */}
            <path
              d="M26 64L8 16C6 9 11 2 18 2H34C41 2 46 9 44 16L26 64Z"
              fill="url(#extPointerGold)"
              stroke="#ffffff"
              strokeWidth="2.5"
            />

            {/* Inner Red Indicator Spine */}
            <path d="M26 9L26 52" stroke="url(#needleSpine)" strokeWidth="3.5" strokeLinecap="round" />

            {/* Top Pivot Gem */}
            <circle cx="26" cy="16" r="7" fill="#18181b" stroke="#f59e0b" strokeWidth="2.5" />
            <circle cx="26" cy="16" r="3" fill="#ef4444" />
          </svg>
        </div>
      </div>

      {/* Rotating Wheel Wrapper (Hardware Accelerated via transform) */}
      <div className="relative w-full aspect-square max-w-[620px] xl:max-w-[680px] flex items-center justify-center">
        <div
          ref={wheelWrapperRef}
          className="w-full h-full"
          style={{
            willChange: 'transform',
            transform: `rotate(${currentRotation}deg)`,
            transition: isSpinning ? 'none' : 'transform 0.3s ease-out',
          }}
        >
          {/* HTML5 Canvas with pre-rendered slices & high-contrast bold text */}
          <canvas
            ref={canvasRef}
            className="w-full h-full cursor-pointer drop-shadow-2xl"
            style={{ width: '100%', height: '100%' }}
            onClick={() => {
              if (canSpin) handleSpinClick();
            }}
          />
        </div>

        {/* Center Hub SPIN Button */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-30">
          <motion.button
            whileHover={canSpin ? { scale: 1.08 } : {}}
            whileTap={canSpin ? { scale: 0.94 } : {}}
            onClick={handleSpinClick}
            disabled={!canSpin}
            aria-label="Spin the wheel"
            className={cn(
              'w-28 h-28 sm:w-32 sm:h-32 md:w-36 md:h-36 rounded-full flex flex-col items-center justify-center font-heading font-black tracking-wider transition-all duration-300 shadow-2xl relative group select-none',
              canSpin
                ? 'bg-gradient-to-b from-[#fef08a] via-[#e5c158] to-[#92400e] text-[#09090b] shadow-[0_0_40px_rgba(212,175,55,0.7)] hover:shadow-[0_0_55px_rgba(212,175,55,0.95)] cursor-pointer'
                : 'bg-muted/80 text-muted-foreground/50 border border-white/10 cursor-not-allowed opacity-80'
            )}
          >
            {/* Pulsating Ring */}
            {canSpin && (
              <span className="absolute -inset-2 rounded-full border-2 border-primary/50 animate-ping opacity-35" />
            )}

            {isSpinning ? (
              <Disc3 className="w-10 h-10 animate-spin text-[#09090b]" />
            ) : (
              <>
                <span className="text-xl sm:text-2xl md:text-3xl font-black tracking-widest drop-shadow-sm">
                  SPIN
                </span>
                <Sparkles className="w-4 h-4 mt-0.5 text-zinc-900/80 opacity-0 group-hover:opacity-100 transition-opacity" />
              </>
            )}
          </motion.button>
        </div>
      </div>
    </div>
  );
}
