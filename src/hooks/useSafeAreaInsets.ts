import * as React from 'react';

/**
 * React-Hook für Safe-Area-Insets in Pixeln.
 *
 * Liest die zentralen CSS-Variablen aus `src/styles/safe-area.css`
 * (`--lz-safe-top` etc.) und aktualisiert bei Resize/Orientation-Change.
 *
 * Für reines Styling sollten die Tailwind-Klassen (`safe-pt`,
 * `safe-area-screen`, …) bevorzugt werden. Diesen Hook nur einsetzen,
 * wenn ein Pixelwert in JS gebraucht wird (z. B. Berechnungen, inline
 * Style auf Bibliotheks-Komponenten, die keine Klassen akzeptieren).
 */
export interface SafeAreaInsets {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

const readInset = (side: 'top' | 'bottom' | 'left' | 'right'): number => {
  if (typeof window === 'undefined' || typeof document === 'undefined') return 0;
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue(`--lz-safe-${side}`)
    .trim();
  const n = parseFloat(raw);
  return Number.isFinite(n) ? n : 0;
};

const readAll = (): SafeAreaInsets => ({
  top: readInset('top'),
  bottom: readInset('bottom'),
  left: readInset('left'),
  right: readInset('right'),
});

export function useSafeAreaInsets(): SafeAreaInsets {
  const [insets, setInsets] = React.useState<SafeAreaInsets>(readAll);

  React.useEffect(() => {
    const update = () => setInsets(readAll());
    update();
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
    };
  }, []);

  return insets;
}