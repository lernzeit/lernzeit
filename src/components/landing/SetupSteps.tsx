import { useEffect, useRef } from 'react';
import { UserPlus, KeyRound, SlidersHorizontal } from 'lucide-react';

const steps = [
  {
    icon: UserPlus,
    title: 'Eltern-Konto anlegen',
    text: 'Registriere dich in unter einer Minute – 4 Wochen alle Funktionen kostenlos, keine Zahlungsdaten nötig.',
  },
  {
    icon: KeyRound,
    title: 'Kind per Code verbinden',
    text: 'Du erzeugst einen 6-stelligen Einladungscode. Dein Kind gibt ihn bei der Anmeldung ein – fertig verknüpft.',
  },
  {
    icon: SlidersHorizontal,
    title: 'Belohnung festlegen',
    text: 'Lege pro Fach fest, wie viele Sekunden eine richtige Aufgabe wert ist, und setze das Tageslimit.',
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
      </div>

      <style>{`
        .animate-in { opacity: 1 !important; transform: translateY(0) !important; }
      `}</style>
    </section>
  );
};

export default SetupSteps;
