import { useEffect, useRef, useState } from 'react';

/**
 * Kurzer, stummer Motion-Loop aus public/videos (erzeugt mit
 * `npm run werbung:landing-loops`). Rein dekorativ: kein Ton, keine Steuerung,
 * fuer Screenreader ausgeblendet.
 *
 * Laedt erst beim Abspielen (preload="none") und spielt nur, solange das Video
 * sichtbar und `aktiv` ist. Bei "Bewegung reduzieren" bleibt das Standbild.
 */
const LoopVideo = ({
  name,
  aktiv = true,
  className = '',
}: {
  name: 'kind' | 'eltern';
  aktiv?: boolean;
  className?: string;
}) => {
  const video = useRef<HTMLVideoElement>(null);
  const [sichtbar, setSichtbar] = useState(false);

  useEffect(() => {
    const el = video.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([e]) => setSichtbar(e.isIntersecting), { threshold: 0.25 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const el = video.current;
    if (!el) return;
    const ruhig = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    if (sichtbar && aktiv && !ruhig) {
      // React setzt das muted-Attribut nicht zuverlaessig; ohne muted kein Autoplay.
      el.muted = true;
      el.play().catch(() => {});
    } else {
      el.pause();
    }
  }, [sichtbar, aktiv]);

  return (
    <video
      ref={video}
      className={`block w-full h-auto ${className}`}
      width={720}
      height={900}
      poster={`/videos/loop-${name}.jpg`}
      muted
      loop
      playsInline
      preload="none"
      disablePictureInPicture
      aria-hidden="true"
      tabIndex={-1}
    >
      {/* H.264 zuerst (Safari/iOS); Browser ohne H.264 nehmen WebM */}
      <source src={`/videos/loop-${name}.mp4`} type='video/mp4; codecs="avc1.4D401F"' />
      <source src={`/videos/loop-${name}.webm`} type='video/webm; codecs="vp9"' />
    </video>
  );
};

export default LoopVideo;
