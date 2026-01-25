import confetti from 'canvas-confetti';

/**
 * Trigger a celebration confetti burst
 * Used for screen time approval and other positive events
 */
export function triggerCelebrationConfetti() {
  // First burst - center
  confetti({
    particleCount: 100,
    spread: 70,
    origin: { y: 0.6 },
    colors: ['#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6'],
    zIndex: 9999,
  });

  // Side bursts after a short delay
  setTimeout(() => {
    confetti({
      particleCount: 50,
      angle: 60,
      spread: 55,
      origin: { x: 0, y: 0.7 },
      colors: ['#8b5cf6', '#ec4899', '#f59e0b'],
      zIndex: 9999,
    });
    confetti({
      particleCount: 50,
      angle: 120,
      spread: 55,
      origin: { x: 1, y: 0.7 },
      colors: ['#10b981', '#3b82f6', '#f59e0b'],
      zIndex: 9999,
    });
  }, 150);
}

/**
 * Trigger a small sparkle effect
 * Used for smaller achievements
 */
export function triggerSparkle() {
  confetti({
    particleCount: 30,
    spread: 50,
    origin: { y: 0.5, x: 0.5 },
    colors: ['#fbbf24', '#fcd34d', '#fef3c7'],
    scalar: 0.8,
    zIndex: 9999,
  });
}

/**
 * Trigger a firework-like celebration
 * Used for major achievements
 */
export function triggerFireworks() {
  const duration = 2000;
  const animationEnd = Date.now() + duration;

  const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

  const interval = setInterval(() => {
    const timeLeft = animationEnd - Date.now();

    if (timeLeft <= 0) {
      return clearInterval(interval);
    }

    confetti({
      particleCount: 50,
      startVelocity: 30,
      spread: 360,
      origin: {
        x: randomInRange(0.2, 0.8),
        y: randomInRange(0.2, 0.5),
      },
      colors: ['#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6'],
      zIndex: 9999,
    });
  }, 250);
}
