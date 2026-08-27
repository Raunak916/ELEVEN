"use client";

import * as React from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, RotateCw, Sparkles, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { CustomAuctionCard } from "./cards-data";

const useIsoLayoutEffect =
  typeof window !== "undefined" ? React.useLayoutEffect : React.useEffect;

export interface CoverflowCarouselProps {
  cards: CustomAuctionCard[];
  /** Degrees the first neighbour tilts. */
  rotate?: number;
  /** How far the first neighbour recedes, as a fraction of card width. */
  depth?: number;
  /** Viewer distance as a multiple of card width — smaller is a wider lens. */
  perspective?: number;
  /** Exponent on distance. Below 1 the rake eases off as cards travel out. */
  falloff?: number;
  /** Opacity lost per step from the centre. */
  fade?: number;
  /** Any CSS length. Everything else is derived from it, so the rake scales. */
  cardWidth?: string;
  /** Space between cards, as a fraction of card width. */
  gap?: number;
  loop?: boolean;
  showCaption?: boolean;
  showPagination?: boolean;
  showNavigation?: boolean;
  /** Names the carousel for assistive tech. */
  label?: string;
  className?: string;
  cardClassName?: string;
  onToggleFlip?: (cardId: string) => void;
}

export function CoverflowCarousel({
  cards,
  rotate = 44,
  depth = 0.6,
  perspective = 3,
  falloff = 0.56,
  fade = 0.1,
  cardWidth = "clamp(180px, 22vw, 280px)",
  gap = 0.05,
  loop = true,
  showCaption = true,
  showPagination = true,
  showNavigation = true,
  label = "Cards Coverflow",
  className,
  cardClassName,
  onToggleFlip,
}: CoverflowCarouselProps) {
  const count = cards.length;

  const frameRef = React.useRef<HTMLDivElement>(null);
  const cardRefs = React.useRef<(HTMLDivElement | null)[]>([]);
  /** Fractional card index at the centre. The single source of truth. */
  const posRef = React.useRef(0);
  /** Where the current settle is headed. */
  const targetRef = React.useRef(0);
  const widthRef = React.useRef(0);
  const rafRef = React.useRef<number | null>(null);
  const dragRef = React.useRef<{
    id: number;
    x: number;
    pos: number;
    v: number;
    t: number;
  } | null>(null);
  const isDraggingRef = React.useRef(false);

  const [selected, setSelected] = React.useState(0);

  /** Nearest whole card, folded back into 0..count-1. */
  const indexAt = React.useCallback(
    (pos: number) => {
      if (count === 0) return 0;
      return ((Math.round(pos) % count) + count) % count;
    },
    [count],
  );

  // Paint straight to the DOM with zero CSS transition interference
  const paint = React.useCallback(() => {
    const width = widthRef.current;
    if (!width || count === 0) return;
    const pitch = width * (1 + gap);
    const pos = posRef.current;

    cardRefs.current.forEach((card, index) => {
      if (!card) return;

      let offset = index - pos;
      if (loop && count > 1) {
        offset = ((offset % count) + count) % count;
        if (offset > count / 2) offset -= count;
      }

      const distance = Math.abs(offset);
      const ramp = Math.pow(distance, falloff);
      const tilt = Math.min(rotate * ramp, 82) * Math.sign(offset);

      card.style.transform =
        `translateX(calc(-50% + ${offset * pitch}px)) ` +
        `translateZ(${-depth * width * ramp}px) rotateY(${-tilt}deg)`;

      const edge = loop && count > 1 ? Math.min(1, Math.max(0, count / 2 - distance)) : 1;
      card.style.opacity = String(Math.max(0, 1 - fade * distance) * edge);
      card.style.zIndex = String(100 - Math.round(distance));
    });
  }, [count, depth, fade, falloff, gap, loop, rotate]);

  const settle = React.useCallback(
    (target: number) => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      targetRef.current = target;
      setSelected(indexAt(target));

      const step = () => {
        const remaining = target - posRef.current;
        if (Math.abs(remaining) < 0.0004) {
          posRef.current = target;
          paint();
          rafRef.current = null;
          return;
        }
        posRef.current += remaining * 0.16;
        paint();
        rafRef.current = requestAnimationFrame(step);
      };
      rafRef.current = requestAnimationFrame(step);
    },
    [indexAt, paint],
  );

  const clamp = React.useCallback(
    (pos: number) => (loop ? pos : Math.max(0, Math.min(count - 1, pos))),
    [count, loop],
  );

  const goTo = React.useCallback(
    (index: number) => {
      if (count === 0) return;
      const target = loop
        ? index + Math.round((targetRef.current - index) / count) * count
        : index;
      settle(clamp(target));
    },
    [clamp, count, loop, settle],
  );

  const nudge = React.useCallback(
    (by: number) => {
      if (count === 0) return;
      settle(clamp(Math.round(targetRef.current) + by));
    },
    [clamp, count, settle],
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

    const pitch = widthRef.current * (1 + gap);
    if (!pitch) return;

    const deltaX = Math.abs(event.clientX - drag.x);
    if (deltaX > 4) {
      isDraggingRef.current = true;
    }

    const now = performance.now();
    const previous = posRef.current;
    posRef.current = clamp(drag.pos - (event.clientX - drag.x) / pitch);
    // Cards per second, for the throw.
    drag.v = ((posRef.current - previous) / Math.max(now - drag.t, 1)) * 1000;
    drag.t = now;

    const index = indexAt(posRef.current);
    if (index !== selected) setSelected(index);
    paint();
  };

  const endDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.id !== event.pointerId) return;
    dragRef.current = null;
    // Let a flick carry, but never more than two cards.
    const carried = Math.max(-2, Math.min(2, drag.v * 0.18));
    settle(clamp(Math.round(posRef.current + carried)));
  };

  const handleCardClick = (index: number, card: CustomAuctionCard) => {
    if (isDraggingRef.current) return;
    if (index !== selected) {
      goTo(index);
    } else {
      if (onToggleFlip) {
        onToggleFlip(card.id);
      }
    }
  };

  useIsoLayoutEffect(() => {
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
  }, [paint, cards]);

  React.useEffect(() => {
    if (selected >= count && count > 0) {
      setSelected(0);
      posRef.current = 0;
      targetRef.current = 0;
    }
    paint();
  }, [cards, count, selected, paint]);

  React.useEffect(
    () => () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    },
    [],
  );

  const activeCard = cards[selected];

  if (cards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground glass rounded-2xl border border-sidebar-border w-full">
        <p className="text-sm font-medium text-foreground">No cards in this deck</p>
        <p className="text-xs text-muted-foreground mt-1">Add cards in the panel below to begin.</p>
      </div>
    );
  }

  return (
    <div
      className={cn("w-full", className)}
      style={{ ["--cf-card" as string]: cardWidth }}
      role="region"
      aria-roledescription="carousel"
      aria-label={label}
    >
      <div className="relative">
        <div
          ref={frameRef}
          tabIndex={0}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onKeyDown={(event) => {
            if (event.key === "ArrowLeft") {
              event.preventDefault();
              nudge(-1);
            } else if (event.key === "ArrowRight") {
              event.preventDefault();
              nudge(1);
            }
          }}
          // Vertical padding keeps the drop shadows clear of the overflow clip.
          className="cursor-grab overflow-hidden py-10 outline-none ring-ring focus-visible:ring-2 active:cursor-grabbing"
          style={{
            perspective: `calc(var(--cf-card) * ${perspective})`,
            touchAction: "pan-y",
          }}
        >
          <div
            className="relative select-none"
            style={{
              height: "calc(var(--cf-card) * 1.38)",
              transformStyle: "preserve-3d",
            }}
          >
            {cards.map((card, index) => {
              const isSelected = index === selected;
              const isFlipped = Boolean(card.isFlipped);

              return (
                <div
                  key={card.id}
                  ref={(node) => {
                    cardRefs.current[index] = node;
                  }}
                  onClick={() => handleCardClick(index, card)}
                  role="group"
                  aria-roledescription="slide"
                  aria-label={`Card ${card.number}`}
                  className={cn(
                    "absolute left-1/2 top-0 aspect-[3/4.2] overflow-visible rounded-3xl will-change-transform cursor-pointer",
                    cardClassName,
                  )}
                  style={{
                    width: "var(--cf-card)",
                  }}
                >
                  {/* Inner 3D Flippable Container */}
                  <div
                    className={cn(
                      "w-full h-full relative rounded-3xl transition-transform duration-500 ease-out shadow-2xl",
                      isFlipped ? "[transform:rotateY(180deg)]" : "[transform:rotateY(0deg)]",
                      isSelected
                        ? "border-2 border-primary/80 ring-2 ring-primary/30 shadow-2xl"
                        : "border border-border hover:border-primary/40 shadow-xl"
                    )}
                    style={{
                      transformStyle: "preserve-3d",
                    }}
                  >
                    {/* FRONT FACE (INVERTED / NUMBER SIDE) */}
                    <div
                      className={cn(
                        "absolute inset-0 w-full h-full rounded-3xl p-5 sm:p-6 flex flex-col items-center justify-between shadow-2xl backdrop-blur-2xl select-none overflow-hidden",
                        "bg-card/95 border border-border"
                      )}
                      style={{
                        backfaceVisibility: "hidden",
                        WebkitBackfaceVisibility: "hidden",
                      }}
                    >
                      {/* Top Header Row with Middle Emblem and Category Label */}
                      <div className="w-full flex items-center justify-between relative z-10">
                        <span className="font-mono text-xs font-bold text-foreground/80 tracking-widest">
                          #{String(card.number).padStart(2, "0")}
                        </span>

                        {/* Centered Top Emblem */}
                        <div className="relative h-16 w-16 sm:h-18 sm:w-18 flex-shrink-0 translate-x-[1.5px]">
                          <Image
                            src="/logo/eleven-card.png"
                            alt="Eleven Emblem"
                            fill
                            className="object-contain"
                            priority
                          />
                        </div>

                        <span className={cn(
                          "text-[10px] font-mono font-bold tracking-wider px-2.5 py-0.5 rounded-full border",
                          card.category === "power"
                            ? "bg-primary/15 text-primary border-primary/30"
                            : "bg-rose-500/15 text-rose-500 dark:text-rose-300 border-rose-500/30"
                        )}>
                          {card.category === "power" ? "POWER" : "SICK"}
                        </span>
                      </div>

                      {/* Giant Number */}
                      <div className="my-auto flex flex-col items-center justify-center relative z-10">
                        <span className="text-6xl sm:text-7xl font-heading font-black text-foreground tracking-tighter select-none">
                          {card.number}
                        </span>
                        <div className={cn(
                          "w-8 h-0.5 mt-2 rounded-full",
                          card.category === "power" ? "bg-primary/50" : "bg-rose-500/50"
                        )} />
                      </div>

                      {/* Bottom Prompt */}
                      <div className="w-full text-center relative z-10">
                        <span className="text-[10px] font-mono font-medium text-muted-foreground tracking-widest uppercase flex items-center justify-center gap-1.5">
                          <Sparkles className="w-3 h-3 text-primary" /> Click to Reveal
                        </span>
                      </div>
                    </div>

                    {/* BACK FACE (REVEALED TEXT SIDE) */}
                    <div
                      className={cn(
                        "absolute inset-0 w-full h-full rounded-3xl p-5 sm:p-6 flex flex-col items-center justify-between shadow-2xl backdrop-blur-2xl select-none overflow-hidden",
                        "bg-card/95 border border-primary/40",
                        "[transform:rotateY(180deg)]"
                      )}
                      style={{
                        backfaceVisibility: "hidden",
                        WebkitBackfaceVisibility: "hidden",
                      }}
                    >
                      {/* Top Header of Revealed Card */}
                      <div className="w-full flex items-center justify-between border-b border-border pb-2.5 relative z-10">
                        <span className="text-xs font-mono font-bold text-primary flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> CARD #{card.number}
                        </span>

                        <div className="relative h-10 w-10 flex-shrink-0 translate-x-[1.5px]">
                          <Image
                            src="/logo/eleven-card.png"
                            alt="Eleven Emblem"
                            fill
                            className="object-contain"
                          />
                        </div>

                        <span className={cn(
                          "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border",
                          card.category === "power"
                            ? "bg-primary/15 text-primary border-primary/30"
                            : "bg-rose-500/15 text-rose-500 dark:text-rose-300 border-rose-500/30"
                        )}>
                          {card.category === "power" ? "POWER" : "SICK"}
                        </span>
                      </div>

                      {/* Power / Disadvantage Text */}
                      <div className="my-auto text-center px-2 relative z-10">
                        <p className="text-sm sm:text-base font-heading font-bold text-foreground leading-relaxed select-none">
                          {card.text}
                        </p>
                      </div>

                      {/* Bottom Footer */}
                      <div className="w-full pt-2 border-t border-border flex items-center justify-center relative z-10">
                        <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                          <RotateCw className="w-3 h-3" /> Flip back
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {showNavigation && count > 1 && (
          <>
            <button
              type="button"
              aria-label="Previous card"
              onClick={() => nudge(-1)}
              className="absolute left-3 top-1/2 z-[200] -translate-y-1/2 rounded-full bg-background/70 p-2 text-foreground backdrop-blur transition hover:bg-background border border-border"
            >
              <ChevronLeft className="size-5" />
            </button>
            <button
              type="button"
              aria-label="Next card"
              onClick={() => nudge(1)}
              className="absolute right-3 top-1/2 z-[200] -translate-y-1/2 rounded-full bg-background/70 p-2 text-foreground backdrop-blur transition hover:bg-background border border-border"
            >
              <ChevronRight className="size-5" />
            </button>
          </>
        )}
      </div>

      {showCaption && activeCard && (
        <div
          key={`${activeCard.id}-${activeCard.isFlipped}`}
          className="mt-4 flex flex-col items-center px-6 duration-300 animate-in fade-in max-w-lg mx-auto text-center"
        >
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono font-bold text-primary">
              CARD #{activeCard.number}
            </span>
            <span className="text-xs text-muted-foreground uppercase font-semibold">
              {activeCard.category === "power" ? "Power Card" : "Sick Card"}
            </span>
          </div>

          <div className="mt-2 p-3.5 rounded-xl glass border border-sidebar-border w-full">
            {activeCard.isFlipped ? (
              <p className="text-sm sm:text-base font-heading font-bold text-foreground leading-relaxed">
                {activeCard.text}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Card #{activeCard.number} is Hidden. Click the card to flip & reveal.
              </p>
            )}
          </div>

          <div className="mt-3">
            <button
              type="button"
              onClick={() => {
                if (onToggleFlip) onToggleFlip(activeCard.id);
              }}
              className="px-5 py-1.5 rounded-lg text-xs font-semibold bg-muted/80 hover:bg-muted text-foreground border border-border flex items-center gap-1.5 transition-colors"
            >
              <RotateCw className="w-3.5 h-3.5" />
              {activeCard.isFlipped ? "Flip Back / Hide" : "Flip & Reveal"}
            </button>
          </div>
        </div>
      )}

      {showPagination && count > 1 && (
        <div className="mt-6 flex items-center justify-center gap-2">
          {cards.map((card, index) => (
            <button
              key={card.id}
              type="button"
              aria-label={`Go to card ${card.number}`}
              aria-current={index === selected}
              onClick={() => goTo(index)}
              className={cn(
                "size-2 rounded-full bg-foreground transition-opacity",
                index === selected ? "opacity-100 bg-primary" : "opacity-30",
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}
