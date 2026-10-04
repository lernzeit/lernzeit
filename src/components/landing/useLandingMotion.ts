import { useEffect, type RefObject } from 'react';

/** Progressive enhancement: ohne JS bleibt jeder Inhalt sichtbar. */
export function useLandingMotion(root: RefObject<HTMLElement>) {
  useEffect(() => {
    const element = root.current;
    if (!element) return;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let cleanup = () => {};
    const setup = () => {
      cleanup();
      if (motion.matches || typeof IntersectionObserver === 'undefined') return;
      const targets = Array.from(element.querySelectorAll<HTMLElement>('section h2, section ol > li, [data-reveal]'));
      const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return;
          entry.target.classList.remove('lp-reveal-pending');
          observer.unobserve(entry.target);
        });
      }, { threshold: 0.08 });
      targets.forEach(target => {
        const rect = target.getBoundingClientRect();
        if (rect.top < window.innerHeight) return;
        const siblings = target.parentElement ? Array.from(target.parentElement.children) : [];
        target.style.setProperty('--lp-reveal-delay', `${Math.min(siblings.indexOf(target), 3) * 90}ms`);
        target.classList.add('lp-reveal', 'lp-reveal-pending');
        observer.observe(target);
      });
      const layers = Array.from(element.querySelectorAll<HTMLElement>('[data-parallax]'));
      let frame = 0;
      const draw = () => {
        frame = 0;
        const offset = Math.min(window.scrollY, 1000) * (window.innerWidth < 768 ? 0.015 : 0.045);
        layers.forEach(layer => layer.style.setProperty('--lp-parallax', `${offset}px`));
      };
      const scroll = () => { if (!frame) frame = requestAnimationFrame(draw); };
      window.addEventListener('scroll', scroll, { passive: true });
      draw();
      cleanup = () => {
        observer.disconnect();
        window.removeEventListener('scroll', scroll);
        cancelAnimationFrame(frame);
        targets.forEach(target => target.classList.remove('lp-reveal-pending'));
        layers.forEach(layer => layer.style.removeProperty('--lp-parallax'));
      };
    };
    setup();
    motion.addEventListener('change', setup);
    return () => { cleanup(); motion.removeEventListener('change', setup); };
  }, [root]);
}