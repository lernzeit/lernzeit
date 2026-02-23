import { BookOpen, Brain, Clock } from 'lucide-react';
import { useEffect, useRef } from 'react';

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

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => entries.forEach(e => e.isIntersecting && e.target.classList.add('animate-in')),
      { threshold: 0.1 }
    );
    sectionRef.current?.querySelectorAll('.scroll-fade').forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={sectionRef} className="py-24 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="scroll-fade opacity-0 translate-y-4 transition-all duration-700 text-center mb-16">
          <span className="text-sm font-semibold text-primary uppercase tracking-wider">So einfach geht's</span>
          <h2 className="text-4xl sm:text-5xl font-extrabold mt-3 tracking-tight">
            In drei Schritten zur{' '}
            <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              verdienten Zeit
            </span>
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((step, i) => (
            <div
              key={step.title}
              className={`scroll-fade opacity-0 translate-y-4 transition-all duration-700 group relative bg-card rounded-3xl p-10 border shadow-sm hover:shadow-xl hover:-translate-y-2`}
              style={{ transitionDelay: `${i * 150}ms` }}
            >
              <span className="text-7xl font-black text-muted/50 absolute top-5 right-7">
                {step.number}
              </span>
              <div className={`w-16 h-16 bg-gradient-to-br ${step.gradient} rounded-2xl flex items-center justify-center mb-8 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                <step.icon className="w-8 h-8 text-primary-foreground" />
              </div>
              <h3 className="font-bold text-2xl mb-3">{step.title}</h3>
              <p className="text-muted-foreground text-base leading-relaxed">{step.description}</p>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        .animate-in { opacity: 1 !important; transform: translateY(0) !important; }
      `}</style>
    </section>
  );
};

export default HowItWorks;
