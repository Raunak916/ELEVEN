'use client';

import React, { useRef, useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Disc, Play, Pause, Sparkles, Music2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { VinylCategory } from '@/lib/music-playlists';
import { useMusicStore } from '@/lib/music-store';

interface Vinyl3DCarouselProps {
  vinyls: VinylCategory[];
  activeVinylId: string;
  onSelectVinyl: (vinylId: string) => void;
  className?: string;
}

export function Vinyl3DCarousel({
  vinyls,
  activeVinylId,
  onSelectVinyl,
  className,
}: Vinyl3DCarouselProps) {
  const count = vinyls.length;
  const { isPlaying, togglePlay } = useMusicStore();

  const frameRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const posRef = useRef(0);
  const targetRef = useRef(0);
  const widthRef = useRef(260);
  const rafRef = useRef<number | null>(null);
  const dragRef = useRef<{
    id: number;
    x: number;
    pos: number;
    v: number;
    t: number;
  } | null>(null);
  const isDraggingRef = useRef(false);

  const initialIndex = Math.max(0, vinyls.findIndex((v) => v.id === activeVinylId));
  const [selected, setSelected] = useState(initialIndex);

  const rotate = 40;
  const depth = 0.65;
  const falloff = 0.55;
  const fade = 0.3;
  const gap = 0.3;

  const indexAt = useCallback(
    (pos: number) => {
      if (count === 0) return 0;
      return Math.max(0, Math.min(count - 1, Math.round(pos)));
    },
    [count]
  );

  const paint = useCallback(() => {
    const width = widthRef.current || 260;
    if (count === 0) return;
    const pitch = width * (1 + gap);
    const pos = posRef.current;

    cardRefs.current.forEach((card, index) => {
      if (!card) return;

      const offset = index - pos;
      const distance = Math.abs(offset);
      const ramp = Math.pow(distance, falloff);
      const tilt = Math.min(rotate * ramp, 65) * Math.sign(offset);

      card.style.transform =
        `translateX(calc(-50% + ${offset * pitch}px)) ` +
        `translateZ(${-depth * width * ramp}px) rotateY(${-tilt}deg)`;

      card.style.opacity = String(Math.max(0, 1 - fade * distance));
      card.style.zIndex = String(index === selected ? 110 : 100 - Math.round(distance * 10));
    });
  }, [count, depth, fade, falloff, gap, rotate, selected]);

  const settle = useCallback(
    (target: number) => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      targetRef.current = target;
      const newIdx = indexAt(target);
      setSelected(newIdx);
      if (vinyls[newIdx]) {
        onSelectVinyl(vinyls[newIdx].id);
      }

      const step = () => {
        const remaining = target - posRef.current;
        if (Math.abs(remaining) < 0.0004) {
          posRef.current = target;
          paint();
          rafRef.current = null;
          return;
        }
        posRef.current += remaining * 0.22;
        paint();
        rafRef.current = requestAnimationFrame(step);
      };
      rafRef.current = requestAnimationFrame(step);
    },
    [indexAt, onSelectVinyl, paint, vinyls]
  );

  const goTo = useCallback(
    (index: number) => {
      if (count === 0) return;
      const target = Math.max(0, Math.min(count - 1, index));
      settle(target);
    },
    [count, settle]
  );

  const nudge = useCallback(
    (by: number) => {
      if (count === 0) return;
      const nextIdx = Math.max(0, Math.min(count - 1, selected + by));
      goTo(nextIdx);
    },
    [count, goTo, selected]
  );

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    event.currentTarget.setPointerCapture(event.pointerId);
    targetRef.current = posRef.current;
    isDraggingRef.current = false;
    dragRef.current = {
      id: event.pointerId,
      x: event.clientX,
      pos: posRef.current,
      v: 0,
      t: performance.now(),
    };
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.id !== event.pointerId) return;

    const pitch = (widthRef.current || 260) * (1 + gap);
    if (!pitch) return;

    const deltaX = Math.abs(event.clientX - drag.x);
    if (deltaX > 5) {
      isDraggingRef.current = true;
    }

    const now = performance.now();
    const previous = posRef.current;
    posRef.current = Math.max(0, Math.min(count - 1, drag.pos - (event.clientX - drag.x) / pitch));
    drag.v = ((posRef.current - previous) / Math.max(now - drag.t, 1)) * 1000;
    drag.t = now;

    const index = indexAt(posRef.current);
    if (index !== selected) {
      setSelected(index);
      if (vinyls[index]) onSelectVinyl(vinyls[index].id);
    }
    paint();
  };

  const endDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.id !== event.pointerId) return;
    dragRef.current = null;
    const carried = Math.max(-1.2, Math.min(1.2, drag.v * 0.22));
    settle(Math.max(0, Math.min(count - 1, Math.round(posRef.current + carried))));
  };

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;

    const measure = () => {
      const card = cardRefs.current[0];
      if (!card) return;
      widthRef.current = card.offsetWidth;
      paint();
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(frame);
    return () => observer.disconnect();
  }, [paint, vinyls]);

  useEffect(() => {
    const matched = vinyls.findIndex((vy) => vy.id === activeVinylId);
    if (matched >= 0 && matched !== selected) {
      settle(matched);
    }
  }, [activeVinylId, vinyls, settle, selected]);

  useEffect(() => {
    paint();
  }, [paint, selected]);

  const active = vinyls[selected] || vinyls[0];

  return (
    <div className={cn('w-full flex flex-col items-center select-none', className)}>
      {/* 3D Carousel Viewport - Note: onWheel removed so page scrolling is uninterrupted */}
      <div
        ref={frameRef}
        className="relative w-full h-[320px] sm:h-[380px] md:h-[420px] flex items-center justify-center overflow-hidden cursor-grab active:cursor-grabbing touch-pan-y"
        style={{ perspective: '1200px', transformStyle: 'preserve-3d' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        {vinyls.map((vinyl, index) => {
          const isSelected = index === selected;
          const isActivePlaying = isSelected && isPlaying && activeVinylId === vinyl.id;

          return (
            <div
              key={vinyl.id}
              ref={(el) => {
                cardRefs.current[index] = el;
              }}
              onClick={() => {
                if (isDraggingRef.current) return;
                if (index !== selected) {
                  goTo(index);
                } else {
                  onSelectVinyl(vinyl.id);
                }
              }}
              className={cn(
                'absolute left-1/2 top-1/2 -translate-y-1/2',
                'w-[240px] sm:w-[280px] md:w-[320px] aspect-[4/5] rounded-[28px]',
                'p-4 sm:p-5 flex flex-col justify-between',
                'bg-black/40 backdrop-blur-3xl border border-white/15',
                'shadow-[0_25px_60px_-10px_rgba(0,0,0,0.85),0_0_20px_rgba(255,255,255,0.04),inset_0_1px_1px_rgba(255,255,255,0.18)]',
                'transition-shadow duration-300 cursor-pointer group',
                isSelected
                  ? 'ring-2 ring-white/50 shadow-[0_35px_80px_rgba(0,0,0,0.95)]'
                  : 'opacity-70 hover:opacity-90'
              )}
              style={{
                willChange: 'transform, opacity',
              }}
            >
              {/* Top Highlight Sheen */}
              <div className="absolute inset-x-6 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none" />

              {/* Subtle Backstage Glow for Active Item */}
              {isSelected && (
                <div
                  className="absolute inset-0 rounded-[28px] opacity-25 blur-2xl pointer-events-none"
                  style={{
                    background: `radial-gradient(circle, ${vinyl.accent.glow} 0%, transparent 70%)`,
                  }}
                />
              )}

              {/* Top: Category Pill + Song Count */}
              <div className="relative z-10 flex items-center justify-between">
                <span
                  className={cn(
                    'px-3 py-1 rounded-full text-[10.5px] font-mono font-bold uppercase tracking-wider border shadow-sm',
                    vinyl.accent.pillBg,
                    vinyl.accent.pillText,
                    vinyl.accent.badgeBorder
                  )}
                >
                  {vinyl.category}
                </span>

                <span className="text-[11px] font-mono text-white/70 bg-white/10 px-2.5 py-0.5 rounded-full border border-white/15 backdrop-blur-md">
                  {vinyl.songs.length} Tracks
                </span>
              </div>

              {/* Center: Popping Out 3D Vinyl Disc Artwork */}
              <div className="relative z-10 w-full flex items-center justify-center my-auto py-2">
                <div className="relative w-36 h-36 sm:w-44 sm:h-44 md:w-48 md:h-48 flex items-center justify-center">
                  {/* Vinyl Disc Body */}
                  <div
                    className={cn(
                      'w-full h-full rounded-full relative overflow-hidden',
                      'bg-gradient-to-tr from-[#050505] via-[#151515] to-[#080808]',
                      'border-2 border-white/25 shadow-2xl flex items-center justify-center',
                      isActivePlaying && 'animate-[spin_4s_linear_infinite]'
                    )}
                  >
                    {/* Concentric Grooves */}
                    <div className="absolute inset-2 rounded-full border border-white/10 opacity-80" />
                    <div className="absolute inset-4 rounded-full border border-white/10 opacity-60" />
                    <div className="absolute inset-6 rounded-full border border-white/10 opacity-50" />
                    <div className="absolute inset-8 rounded-full border border-white/10 opacity-40" />

                    {/* Center Vinyl Category Artwork */}
                    <div
                      className={cn(
                        'w-14 h-14 sm:w-18 sm:h-18 md:w-20 md:h-20 rounded-full relative',
                        'bg-gradient-to-tr border border-white/40 shadow-inner',
                        'flex flex-col items-center justify-center p-1 text-center',
                        vinyl.accent.labelGradient
                      )}
                    >
                      <div className="w-3 h-3 rounded-full bg-black border border-white/40 shadow-sm" />
                      <span className="text-[8px] sm:text-[9px] font-mono font-black text-black/85 uppercase truncate max-w-[60px] mt-0.5">
                        {vinyl.category.split(' ')[0]}
                      </span>
                    </div>

                    {/* Sheen Glare */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/15 to-transparent pointer-events-none -skew-y-12" />
                  </div>
                </div>
              </div>

              {/* Bottom: Vinyl Title, Description & Action */}
              <div className="relative z-10 flex flex-col gap-1 border-t border-white/10 pt-3">
                <h4 className="font-heading font-black text-sm sm:text-base text-white truncate">
                  {vinyl.title}
                </h4>
                <p className="text-[11px] text-white/60 line-clamp-2 leading-relaxed">
                  {vinyl.description}
                </p>

                <div className="mt-2 flex items-center justify-between pt-1">
                  <span className="text-[10px] font-mono text-white/50 uppercase tracking-wider">
                    {isSelected ? 'ACTIVE ON DECK' : 'CLICK TO SELECT'}
                  </span>

                  {isSelected && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        togglePlay();
                      }}
                      className={cn(
                        'p-2 rounded-full font-bold transition-all shadow-md',
                        isPlaying
                          ? 'bg-[var(--gold)] text-black'
                          : 'bg-white/20 text-white hover:bg-white/30'
                      )}
                    >
                      {isPlaying ? <Pause className="h-3.5 w-3.5 fill-current" /> : <Play className="h-3.5 w-3.5 fill-current ml-0.5" />}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Navigation Controls & Micro Dots */}
      <div className="w-full max-w-xl flex items-center justify-between px-4 mt-2">
        <button
          type="button"
          onClick={() => nudge(-1)}
          disabled={selected === 0}
          className="p-2 rounded-full text-white/70 hover:text-white hover:bg-white/10 disabled:opacity-20 disabled:pointer-events-none transition-colors"
          title="Previous Vinyl"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>

        {/* Dots */}
        <div className="flex items-center gap-2">
          {vinyls.map((vy, i) => (
            <button
              key={vy.id}
              type="button"
              onClick={() => goTo(i)}
              className={cn(
                'h-2 rounded-full transition-all duration-300',
                i === selected ? 'w-8 bg-white shadow-lg' : 'w-2 bg-white/30 hover:bg-white/50'
              )}
              title={vy.title}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={() => nudge(1)}
          disabled={selected === count - 1}
          className="p-2 rounded-full text-white/70 hover:text-white hover:bg-white/10 disabled:opacity-20 disabled:pointer-events-none transition-colors"
          title="Next Vinyl"
        >
          <ChevronRight className="h-6 w-6" />
        </button>
      </div>
    </div>
  );
}
