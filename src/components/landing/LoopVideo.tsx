import { useEffect, useRef } from 'react';

/** Dekorative Loops bleiben unter /videos, damit das Render-Skript sie ersetzt. */
const LoopVideo = ({ name, className = '' }: { name: 'kind' | 'eltern'; className?: string }) => {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let visible = false;
    let disposed = false;
    const update = () => {
      if (motion.matches || !visible || document.hidden) {
        video.pause();
        if (motion.matches) {
          video.removeAttribute('src');
          video.load();
        }
        return;
      }
      if (!video.hasAttribute('src')) video.src = `/videos/loop-${name}.mp4`;
      video.muted = true;
      video.play().then(() => {
        if (disposed || !visible || motion.matches || document.hidden) video.pause();
      }).catch(() => { /* Das Poster bleibt bei gesperrtem Autoplay sichtbar. */ });
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      update();
    }, { threshold: 0.1 });
    observer.observe(video);
    motion.addEventListener('change', update);
    document.addEventListener('visibilitychange', update);
    return () => {
      disposed = true;
      observer.disconnect();
      motion.removeEventListener('change', update);
      document.removeEventListener('visibilitychange', update);
      video.pause();
    };
  }, [name]);
  return <video ref={ref} width={720} height={900} poster={`/videos/loop-${name}.jpg`} muted loop playsInline preload="none" aria-hidden="true" disablePictureInPicture className={`lp-loop block h-auto w-full ${className}`} />;
};

export default LoopVideo;