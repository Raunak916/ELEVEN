import confetti from 'canvas-confetti';

const FOOTBALL_COLORS = [
  '#78d4c2',
  '#ffd700',
  '#55cc99',
  '#f5f5f5',
  '#0c4a3e',
  '#ef9a9a',
  '#90caf9',
];

// Football-shaped particle (white with black pentagon) - only on client
let football: ReturnType<typeof confetti.shapeFromText> | undefined;
if (typeof window !== 'undefined' && confetti.shapeFromText) {
  football = confetti.shapeFromText({ text: '⚽', scalar: 0.8 });
}

/**
 * Celebratory burst for when a player is revealed.
 * Short, elegant, single burst with slight delay between streams.
 */
export function firePlayerRevealConfetti() {
  const count = 180;
  const defaults = {
    origin: { y: 0.7 },
    colors: FOOTBALL_COLORS,
    zIndex: 1000,
    disableForReducedMotion: true,
  };

  // Left stream
  confetti({
    ...defaults,
    particleCount: Math.floor(count * 0.3),
    angle: 60,
    spread: 55,
    startVelocity: 55,
    scalar: 1.1,
    shapes: football ? [football] : undefined,
  });

  // Right stream
  confetti({
    ...defaults,
    particleCount: Math.floor(count * 0.3),
    angle: 120,
    spread: 55,
    startVelocity: 55,
    scalar: 1.1,
    shapes: football ? [football] : undefined,
  });

  // Center burst
  confetti({
    ...defaults,
    particleCount: Math.floor(count * 0.4),
    spread: 100,
    startVelocity: 45,
    scalar: 1.2,
    ticks: 200,
  });

  // Delayed follow-up for extra flair
  setTimeout(() => {
    confetti({
      ...defaults,
      particleCount: Math.floor(count * 0.25),
      angle: 90,
      spread: 70,
      startVelocity: 40,
      scalar: 0.9,
      drift: 1,
    });
  }, 200);
}

/**
 * Subtle burst when the draw begins.
 */
export function fireDrawStartConfetti() {
  confetti({
    particleCount: 60,
    spread: 50,
    origin: { y: 0.6 },
    colors: FOOTBALL_COLORS,
    startVelocity: 35,
    scalar: 0.8,
    ticks: 120,
    zIndex: 1000,
    disableForReducedMotion: true,
  });
}