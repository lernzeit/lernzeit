import confetti from 'canvas-confetti';

/**
 * Trigger a celebration confetti burst
 * Used for screen time approval and other positive events
 */
export function triggerCelebrationConfetti() {
  confetti({
    particleCount: 100,
    spread: 70,
    origin: { y: 0.6 },
    colors: ['#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6'],
    zIndex: 9999,
  });

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
    if (timeLeft <= 0) return clearInterval(interval);

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

/** Speed bonus effect – lightning burst */
export function triggerSpeedBonus() {
  confetti({
    particleCount: 60,
    spread: 100,
    startVelocity: 45,
    origin: { y: 0.5 },
    colors: ['#facc15', '#fbbf24', '#f59e0b', '#eab308'],
    scalar: 1.2,
    zIndex: 9999,
  });
}

/** Rainbow explosion for perfect rounds */
export function triggerRainbow() {
  const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899'];
  
  confetti({
    particleCount: 120,
    spread: 360,
    startVelocity: 35,
    origin: { x: 0.5, y: 0.4 },
    colors,
    scalar: 1.1,
    zIndex: 9999,
  });

  setTimeout(() => {
    confetti({
      particleCount: 80,
      spread: 180,
      startVelocity: 25,
      origin: { x: 0.5, y: 0.6 },
      colors,
      zIndex: 9999,
    });
  }, 300);
}

/** Combo burst for streaks */
export function triggerCombo() {
  confetti({
    particleCount: 80,
    spread: 120,
    startVelocity: 40,
    origin: { y: 0.5 },
    colors: ['#f97316', '#ef4444', '#eab308'],
    scalar: 1.0,
    zIndex: 9999,
  });
}
