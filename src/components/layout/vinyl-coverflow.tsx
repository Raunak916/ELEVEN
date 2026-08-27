'use client';

import * as React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { VinylCategory } from '@/lib/music-playlists';
import { useMusicStore } from '@/lib/music-store';

export interface VinylCoverflowProps {
  vinyls: VinylCategory[];
  activeVinylId: string;
  onSelectVinyl: (vinylId: string) => void;
  className?: string;
}

export function VinylCoverflow({
  vinyls,
  activeVinylId,
  onSelectVinyl,
  className,
}: VinylCoverflowProps) {
  const count = vinyls.length;
  const { isPlaying } = useMusicStore();

  const frameRef = React.useRef<HTMLDivElement>(null);
  const cardRefs = React.useRef<(HTMLDivElement | null)[]>([]);
  const posRef = React.useRef(0);
  const targetRef = React.useRef(0);
  const widthRef = React.useRef(180);
  const rafRef = React.useRef<number | null>(null);
  const dragRef = React.useRef<{
    id: number;
    x: number;
    pos: number;
    v: number;
    t: number;
  } | null>(null);
  const isDraggingRef = React.useRef(false);

  const initialIndex = Math.max(0, vinyls.findIndex((vy) => vy.id === activeVinylId));
  const [selected, setSelected] = React.useState(initialIndex);

  const rotate = 36;
  const depth = 0.55;
  const falloff = 0.58;
  const fade = 0.25;
  const gap = 0.25;

  const indexAt = React.useCallback(
    (pos: number) => {
      if (count === 0) return 0;
      return Math.max(0, Math.min(count - 1, Math.round(pos)));
    },
    [count]
  );

  const paint = React.useCallback(() => {
    const width = widthRef.current || 180;
    if (count === 0) return;
    const pitch = width * (1 + gap);
    const pos = posRef.current;

    cardRefs.current.forEach((card, index) => {
      if (!card) return;

      const offset = index - pos;
      const distance = Math.abs(offset);
      const ramp = Math.pow(distance, falloff);
      const tilt = Math.min(rotate * ramp, 60) * Math.sign(offset);

      card.style.transform =
        `translateX(calc(-50% + ${offset * pitch}px)) ` +
        `translateZ(${-depth * width * ramp}px) rotateY(${-tilt}deg)`;

      card.style.opacity = String(Math.max(0, 1 - fade * distance));
      card.style.zIndex = String(index === selected ? 110 : 100 - Math.round(distance * 10));
    });
  }, [count, depth, fade, falloff, gap, rotate, selected]);

  const settle = React.useCallback(
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

  const goTo = React.useCallback(
    (index: number) => {
      if (count === 0) return;
      const target = Math.max(0, Math.min(count - 1, index));
      settle(target);
    },
    [count, settle]
  );

  const nudge = React.useCallback(
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

    const pitch = (widthRef.current || 180) * (1 + gap);
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
    const carried = Math.max(-1, Math.min(1, drag.v * 0.21));
    settle(Math.max(0, Math.min(count - 1, Math.round(posRef.current + carried))));
  };

  React.useEffect(() => {
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

  React.useEffect(() => {
    const matched = vinyls.findIndex((vy) => vy.id === activeVinylId);
    if (matched >= 0 && matched !== selected) {
      settle(matched);
    }
  }, [activeVinylId, vinyls, settle, selected]);

  React.useEffect(() => {
    paint();
  }, [paint, selected]);

  const currentVinyl = vinyls[selected] || vinyls[0];

  return (
    <div className={cn('w-full flex flex-col items-center select-none', className)}>
      <div
        ref={frameRef}
        className="relative w-full h-44 sm:h-52 flex items-center justify-center overflow-hidden cursor-grab active:cursor-grabbing touch-pan-y"
        style={{ perspective: '1100px', transformStyle: 'preserve-3d' }}
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
                'w-36 h-36 sm:w-44 sm:h-44 rounded-full',
                'flex items-center justify-center',
                'transition-shadow duration-200 cursor-pointer',
                isSelected ? 'ring-2 ring-white/40 shadow-[0_20px_50px_rgba(0,0,0,0.9)]' : 'opacity-70 hover:opacity-90'
              )}
              style={{
                willChange: 'transform, opacity',
              }}
            >
              <div
                className={cn(
                  'w-full h-full rounded-full relative overflow-hidden',
                  'bg-gradient-to-tr from-[#050505] via-[#131313] to-[#090909]',
                  'border-2 border-white/20',
                  'shadow-2xl flex items-center justify-center',
                  isActivePlaying && 'animate-[spin_4s_linear_infinite]'
                )}
              >
                <div className="absolute inset-1.5 rounded-full border border-white/10 opacity-80" />
                <div className="absolute inset-3 rounded-full border border-white/10 opacity-60" />
                <div className="absolute inset-5 rounded-full border border-white/10 opacity-50" />
                <div className="absolute inset-7 rounded-full border border-white/10 opacity-40" />

                <div
                  className={cn(
                    'w-14 h-14 sm:w-18 sm:h-18 rounded-full relative',
                    'bg-gradient-to-tr border border-white/30',
                    'flex flex-col items-center justify-center shadow-inner p-1 text-center',
                    vinyl.accent.labelGradient
                  )}
                >
                  <div className="w-2.5 h-2.5 rounded-full bg-black border border-white/40 shadow-sm" />
                  <span className="text-[8px] font-mono font-black text-black/80 truncate max-w-[50px] uppercase mt-0.5">
                    {vinyl.category.split(' ')[0]}
                  </span>
                </div>

                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/15 to-transparent pointer-events-none -skew-y-12" />
              </div>
            </div>
          );
        })}
      </div>

      <div className="w-full flex items-center justify-between gap-2 px-1 pt-1">
        <button
          type="button"
          onClick={() => nudge(-1)}
          disabled={selected === 0}
          className="p-1.5 rounded-full text-white/60 hover:text-white hover:bg-white/10 disabled:opacity-20 disabled:pointer-events-none transition-colors"
          title="Previous Vinyl"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        <div className="flex flex-col items-center text-center min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span
              className={cn(
                'px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider border',
                currentVinyl.accent.pillBg,
                currentVinyl.accent.pillText,
                currentVinyl.accent.badgeBorder
              )}
            >
              {currentVinyl.category}
            </span>
            <span className="text-[11px] font-mono text-white/50">
              {currentVinyl.songs.length} songs
            </span>
          </div>

          <h3 className="font-heading font-black text-sm sm:text-base text-white truncate max-w-[260px] sm:max-w-[340px]">
            {currentVinyl.title}
          </h3>
          <p className="text-[10px] text-white/60 truncate max-w-[280px]">
            {currentVinyl.description}
          </p>
        </div>

        <button
          type="button"
          onClick={() => nudge(1)}
          disabled={selected === count - 1}
          className="p-1.5 rounded-full text-white/60 hover:text-white hover:bg-white/10 disabled:opacity-20 disabled:pointer-events-none transition-colors"
          title="Next Vinyl"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      <div className="flex items-center gap-1.5 mt-2">
        {vinyls.map((vy, i) => (
          <button
            key={vy.id}
            type="button"
            onClick={() => goTo(i)}
            className={cn(
              'h-1.5 rounded-full transition-all',
              i === selected ? 'w-6 bg-white' : 'w-1.5 bg-white/30'
            )}
            title={vy.title}
          />
        ))}
      </div>
    </div>
  );
}
