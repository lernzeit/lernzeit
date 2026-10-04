import { BookOpen, Brain, Clock } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import LoopVideo from './LoopVideo';

const steps = [
  {
    icon: BookOpen,
    number: '01',
    title: 'Fach wählen',
    description: 'Mathe, Deutsch, Englisch und viele weitere Fächer – von Klasse 1 bis 10.',
    gradient: 'from-primary to-primary/70',
  },
  {
    icon: Brain,
    number: '02',
    title: 'Aufgaben lösen',
    description: 'Altersgerechte Fragen beantworten – bei Fehlern hilft der KI-Tutor mit Erklärungen.',
    gradient: 'from-secondary to-secondary/70',
  },
  {
    icon: Clock,
    number: '03',
    title: 'Zeit verdienen',
    description: 'Pro richtige Antwort erhalten Kinder Bildschirmzeit – Eltern legen die Sekunden pro Fach fest.',
    gradient: 'from-accent to-accent/70',
  },
];

const HowItWorks = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const schritte = useRef<(HTMLLIElement | null)[]>([]);
  // Schritt in der Bildschirmmitte: fuellt die Linie und waehlt das Video
  const [aktiv, setAktiv] = useState(0);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => entries.forEach(e => e.isIntersecting && e.target.classList.add('animate-in')),
      { threshold: 0.1 }
    );
    sectionRef.current?.querySelectorAll('.scroll-fade').forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (!e.isIntersecting) return;
        const i = schritte.current.indexOf(e.target as HTMLLIElement);
        if (i >= 0) setAktiv(i);
      }),
      { rootMargin: '-45% 0px -45% 0px' }
    );
    schritte.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <section ref={sectionRef} data-abschnitt="so_funktionierts" className="py-24 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="scroll-fade opacity-0 translate-y-4 transition-all duration-700 text-center mb-16">
          <span className="text-sm font-semibold text-primary uppercase tracking-wider">So einfach geht's</span>
          <h2 className="text-4xl sm:text-5xl font-extrabold mt-3 tracking-tight">
            In drei Schritten zur{' '}
            <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              verdienten Zeit
            </span>
          </h2>
        </div>

        <div className="grid md:grid-cols-2 gap-12 lg:gap-20 items-start">
          <ol className="relative">
            {steps.map((step, i) => (
              <li
                key={step.title}
                ref={(el) => { schritte.current[i] = el; }}
                className="scroll-fade opacity-0 translate-y-4 transition-all duration-700 relative flex gap-5 md:gap-6 pb-12 last:pb-0 md:min-h-[240px] md:last:min-h-0"
                style={{ transitionDelay: `${i * 120}ms` }}
              >
                {/* Verbindung zum naechsten Schritt, fuellt sich, sobald er erreicht ist */}
                {i < steps.length - 1 && (
                  <div aria-hidden="true" className="absolute left-6 md:left-7 top-14 md:top-16 bottom-2 w-0.5 -translate-x-1/2 bg-border rounded-full overflow-hidden">
                    <div
                      className={`w-full bg-gradient-to-b ${i === 0 ? 'from-primary to-secondary' : 'from-secondary to-accent'} rounded-full transition-[height] duration-700 ease-out motion-reduce:transition-none`}
                      style={{ height: aktiv > i ? '100%' : '0%' }}
                    />
                  </div>
                )}
                <div
                  className={`relative z-10 w-12 h-12 md:w-14 md:h-14 shrink-0 rounded-2xl flex items-center justify-center shadow-lg transition-all duration-500 motion-reduce:transition-none bg-gradient-to-br ${step.gradient} ${
                    i <= aktiv ? 'scale-100 opacity-100' : 'scale-90 opacity-40 grayscale'
                  }`}
                >
                  <step.icon className="w-6 h-6 md:w-7 md:h-7 text-primary-foreground" />
                </div>
                <div className="min-w-0 pt-1">
                  <span className="text-sm font-bold text-muted-foreground">{step.number}</span>
                  <h3 className="font-bold text-xl md:text-2xl mb-2">{step.title}</h3>
                  <p className="text-muted-foreground text-base leading-relaxed">{step.description}</p>
                  {/* Mobil: Eltern-Loop direkt beim letzten Schritt (der Kind-Loop laeuft schon oben) */}
                  {i === steps.length - 1 && (
                    <div className="md:hidden mt-6 max-w-[240px] rounded-[1.75rem] overflow-hidden shadow-xl ring-1 ring-foreground/5 bg-card">
                      <LoopVideo name="eltern" />
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ol>

          {/* Desktop: Video bleibt stehen und wechselt mit dem Schritt */}
          <div className="hidden md:block md:sticky md:top-24">
            <div className="relative mx-auto max-w-[380px]">
              <div className="absolute -inset-6 bg-gradient-to-br from-primary/25 via-secondary/20 to-accent/25 rounded-[3rem] blur-3xl pointer-events-none" />
              <div className="relative rounded-[2rem] overflow-hidden shadow-2xl ring-1 ring-foreground/5 bg-card">
                <div className={`transition-opacity duration-500 motion-reduce:transition-none ${aktiv < 2 ? 'opacity-100' : 'opacity-0'}`}>
                  <LoopVideo name="kind" aktiv={aktiv < 2} />
                </div>
                <div className={`absolute inset-0 transition-opacity duration-500 motion-reduce:transition-none ${aktiv >= 2 ? 'opacity-100' : 'opacity-0'}`}>
                  <LoopVideo name="eltern" aktiv={aktiv >= 2} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .animate-in { opacity: 1 !important; transform: translateY(0) !important; }
      `}</style>
    </section>
  );
};

export default HowItWorks;
