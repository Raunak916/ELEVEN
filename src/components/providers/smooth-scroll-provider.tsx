'use client';

import React, { useEffect, useRef } from 'react';
import Lenis from 'lenis';
import { usePathname } from 'next/navigation';

export function SmoothScrollProvider({ children }: { children: React.ReactNode }) {
  const lenisRef = useRef<Lenis | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    // Check if user prefers reduced motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    const lenis = new Lenis({
      duration: 1.15,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // Apple-style exponential ease out
      smoothWheel: true,
      touchMultiplier: 1.4,
      infinite: false,
      prevent: (node) => {
        if (!node) return false;
        // Never intercept wheel scroll for dialogs, modals, scrollable sheets, or data-lenis-prevent elements
        return Boolean(
          node.closest?.('[data-lenis-prevent]') ||
          node.closest?.('[role="dialog"]') ||
          node.closest?.('[data-slot="dialog-content"]') ||
          node.closest?.('[data-slot="dialog-overlay"]') ||
          node.closest?.('[data-slot="scroll-area"]') ||
          node.closest?.('.overflow-y-auto') ||
          node.closest?.('.overflow-auto')
        );
      },
    });

    lenisRef.current = lenis;

    // Pause Lenis completely whenever a modal/dialog is open in DOM
    const observer = new MutationObserver(() => {
      const isModalOpen = Boolean(
        document.querySelector('[data-slot="dialog-content"]') ||
        document.querySelector('[role="dialog"]') ||
        document.querySelector('[data-slot="dialog-overlay"]')
      );
      if (isModalOpen) {
        lenis.stop();
      } else {
        lenis.start();
      }
    });

    observer.observe(document.body, { childList: true, subtree: true, attributes: true });

    let rafId: number;
    function raf(time: number) {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    }
    rafId = requestAnimationFrame(raf);

    return () => {
      observer.disconnect();
      cancelAnimationFrame(rafId);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, []);

  // Scroll to top smoothly on pathname change
  useEffect(() => {
    if (lenisRef.current) {
      lenisRef.current.scrollTo(0, { immediate: true });
    }
  }, [pathname]);

  return <>{children}</>;
}
