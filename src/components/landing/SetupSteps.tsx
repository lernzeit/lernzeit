import { useEffect, useRef } from 'react';
import { UserPlus, Share2, Smartphone } from 'lucide-react';

// Die Einrichtung besteht aus ZWEI Konten – deinem und dem deines Kindes.
// Genau das stand bisher nirgends auf der Seite, und genau daran ist ein Teil
// der Eltern haengengeblieben: neun von sechzehn haben nie ein Kind verknuepft.
const steps = [
  {
    icon: UserPlus,
    title: 'Du legst dein Elternkonto an',
    text: 'Registrierung in unter einer Minute – 4 Wochen alle Funktionen kostenlos, keine Zahlungsdaten nötig.',
  },
  {
    icon: Share2,
    title: 'Du legst ein Kinderprofil an',
    text: 'Mit Klassenstufe – danach bekommst du einen Einladungslink, den du deinem Kind schickst.',
  },
  {
    icon: Smartphone,
    title: 'Dein Kind meldet sich damit an',
    text: 'Über den Link, auf seinem eigenen Gerät. Fertig verknüpft, ohne dass du etwas abtippen musst.',
  },
];

const SetupSteps = () => {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => entries.forEach(e => e.isIntersecting && e.target.classList.add('animate-in')),
      { threshold: 0.1 }
    );
    sectionRef.current?.querySelectorAll('.scroll-fade').forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={sectionRef} className="py-24 px-4 relative overflow-hidden">
      <div className="relative max-w-4xl mx-auto">
        <div className="scroll-fade opacity-0 translate-y-4 transition-all duration-700 text-center mb-14">
          <span className="text-sm font-semibold text-primary uppercase tracking-wider">Einrichtung</span>
          <h2 className="text-4xl sm:text-5xl font-extrabold mt-3 tracking-tight">
            So richtest du es in{' '}
            <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              3 Minuten
            </span>{' '}
            ein
          </h2>
        </div>

        <ol className="scroll-fade opacity-0 translate-y-4 transition-all duration-700 delay-200 grid gap-5 sm:grid-cols-3">
          {steps.map((step, i) => (
            <li key={step.title} className="bg-card rounded-2xl border shadow-sm p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center">
                  <step.icon className="w-5 h-5" />
                </div>
                <span className="text-sm font-bold text-muted-foreground">Schritt {i + 1}</span>
              </div>
              <h3 className="font-bold mb-2">{step.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{step.text}</p>
            </li>
          ))}
        </ol>

        <p className="scroll-fade opacity-0 translate-y-4 transition-all duration-700 delay-300 mt-8 text-center text-sm text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          Dein Kind kann die App auch auf deinem Gerät nutzen. Der Sinn der verdienten
          Bildschirmzeit entfaltet sich aber erst, wenn es ein eigenes Gerät hat.
        </p>
      </div>

      <style>{`
        .animate-in { opacity: 1 !important; transform: translateY(0) !important; }
      `}</style>
    </section>
  );
};

export default SetupSteps;
