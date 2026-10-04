import { useEffect, useRef } from 'react';

/**
 * Geraeterahmen fuer echte Bildschirmaufnahmen der App (public/landing,
 * erzeugt mit `npm run werbung:landing`). Groesse ueber die Schriftgroesse:
 * Der Rahmen ist 100em breit, `className="text-[3px]"` ergibt 300 px.
 *
 * Mit `video` laeuft eine stumme Schleife, aber nur solange sie sichtbar ist
 * und ohne "Bewegung reduzieren" — sonst bleibt das Standbild (`bild`).
 */
const Handy = ({
  bild,
  video,
  alt,
  className = '',
}: {
  bild: string;
  video?: string;
  alt: string;
  className?: string;
}) => {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    // React setzt `muted` nicht als Attribut; ohne stumm kein Autoplay.
    el.muted = true;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) el.play().catch(() => {});
      else el.pause();
    }, { threshold: 0.2 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div className={`lp-handy ${className}`}>
      <div className="lp-handy-schirm">
        <div className="lp-handy-insel" />
        <Statusleiste />
        <div className="absolute inset-x-0 bottom-0" style={{ top: `${(47 / 891) * 100}%` }}>
          {video ? (
            <video
              ref={ref}
              className="block w-full h-full object-cover object-top"
              poster={bild}
              muted
              loop
              playsInline
              preload="metadata"
              disablePictureInPicture
              aria-label={alt}
            >
              <source src={`${video}.mp4`} type='video/mp4; codecs="avc1.4D401F"' />
              <source src={`${video}.webm`} type='video/webm; codecs="vp9"' />
            </video>
          ) : (
            <img src={bild} alt={alt} loading="lazy" decoding="async" className="block w-full h-full object-cover object-top" />
          )}
        </div>
      </div>
    </div>
  );
};

/** Statusleiste wie auf dem iPhone (Uhrzeit, Netz, WLAN, Akku), rein dekorativ. */
const Statusleiste = () => (
  <div
    aria-hidden="true"
    className="absolute inset-x-0 top-0 flex items-center justify-between text-[#0b1220]"
    style={{ height: `${(47 / 891) * 100}%`, padding: '0 9.5em 0 11em' }}
  >
    <span style={{ fontSize: '4.1em', fontWeight: 650, letterSpacing: '-0.01em', fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif" }}>9:41</span>
    <span className="flex items-center" style={{ gap: '1.5em' }}>
      <svg viewBox="0 0 18 12" style={{ width: '4.6em' }} fill="currentColor">
        <rect x="0" y="8" width="3" height="4" rx="1" /><rect x="5" y="5.5" width="3" height="6.5" rx="1" />
        <rect x="10" y="3" width="3" height="9" rx="1" /><rect x="15" y="0" width="3" height="12" rx="1" />
      </svg>
      <svg viewBox="0 0 16 12" style={{ width: '4.2em' }} fill="currentColor">
        <path d="M8 2.2c2.3 0 4.4.9 6 2.4l1.2-1.3A10.4 10.4 0 0 0 8 .4 10.4 10.4 0 0 0 .8 3.3L2 4.6a8.6 8.6 0 0 1 6-2.4Zm0 3.6c1.3 0 2.5.5 3.4 1.3l1.3-1.3A6.7 6.7 0 0 0 8 4c-1.8 0-3.5.7-4.7 1.8l1.3 1.3c.9-.8 2.1-1.3 3.4-1.3Zm0 3.5c-.6 0-1.1.2-1.5.6L8 11.5l1.5-1.6c-.4-.4-.9-.6-1.5-.6Z" />
      </svg>
      <svg viewBox="0 0 27 12" style={{ width: '6.6em' }} fill="none">
        <rect x="0.5" y="0.5" width="23" height="11" rx="3.2" stroke="currentColor" opacity="0.4" />
        <rect x="2" y="2" width="20" height="8" rx="2" fill="currentColor" />
        <path d="M25 4v4c.8-.3 1.4-1.1 1.4-2S25.8 4.3 25 4Z" fill="currentColor" opacity="0.45" />
      </svg>
    </span>
  </div>
);

export default Handy;
