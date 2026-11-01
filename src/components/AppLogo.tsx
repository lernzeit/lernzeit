/**
 * Das echte LernZeit-Logo (App-Icon: Buch auf Verlauf blau–grün), wie im App Store,
 * auf dem Home-Bildschirm und auf den Werbekarten. Vorher stand an diesen Stellen ein
 * nachgebautes Buch-Symbol (lucide BookOpen) auf blauem Grund.
 * Bis 64 px reicht das 192er-Bild, darüber das 1024er.
 */
interface AppLogoProps {
  /** Kantenlänge in px */
  size: number;
  className?: string;
  /** Nur setzen, wenn kein Text „LernZeit“ daneben steht. */
  alt?: string;
}

export function AppLogo({ size, className = '', alt = '' }: AppLogoProps) {
  const src = size > 64 ? '/app-icon-1024.png' : '/pwa-192x192.png';
  return (
    <img
      src={src}
      width={size}
      height={size}
      alt={alt}
      aria-hidden={alt ? undefined : true}
      draggable={false}
      className={`shrink-0 select-none ${className}`}
      style={{ width: size, height: size, borderRadius: Math.round(size * 0.28) }}
    />
  );
}
