import { useEffect, useRef, useState } from 'react';
import { Clock, Shield, Brain, GraduationCap, Trophy, BarChart3 } from 'lucide-react';

const usps = [
  {
    icon: Clock,
    title: 'Bildschirmzeit als Belohnung',
    description: 'Kinder verdienen sich Bildschirmzeit durch richtige Antworten.',
    back: 'Pro richtige Antwort gibt es Bildschirmzeit – Eltern legen pro Fach fest, wie viele Sekunden eine Aufgabe wert ist.',
    color: 'bg-primary/10 text-primary',
  },
  {
    icon: Shield,
    title: 'Eltern behalten die Kontrolle',
    description: 'Tägliche Limits, Fächersteuerung und Schwerpunkte setzen.',
    back: 'Eltern setzen ein tägliches Zeitlimit (Wochentag/Wochenende), schalten Fächer sichtbar oder unsichtbar und setzen individuelle Schwerpunkte.',
    color: 'bg-secondary/10 text-secondary',
  },
  {
    icon: Brain,
    title: 'KI-Tutor',
    description: 'Falsche Antworten werden kindgerecht erklärt.',
    back: 'Der KI-Tutor gibt Schritt-für-Schritt-Erklärungen und liest sie jüngeren Kindern sogar vor – so lernen alle dazu.',
    color: 'bg-accent/10 text-accent',
  },
  {
    icon: BarChart3,
    title: 'Lernanalyse für Eltern',
    description: 'Fortschritte und Ergebnisse auf einen Blick.',
    back: 'Eltern sehen Lerntrends, Erfolgsquoten und Fehlerschwerpunkte – mit individuellen Empfehlungen für jedes Kind.',
    color: 'bg-primary/10 text-primary',
  },
  {
    icon: GraduationCap,
    title: 'Lehrplanorientiert',
    description: 'Klasse 1–10, alle Hauptfächer.',
    back: 'Inhalte orientieren sich an deutschen Lehrplänen und werden passend zur Klassenstufe ausgespielt.',
    color: 'bg-destructive/10 text-destructive',
  },
  {
    icon: Trophy,
    title: 'Achievements & Streaks',
    description: 'Spielerische Motivation durch Erfolge.',
    back: 'Kinder sammeln Achievements und halten Lern-Streaks aufrecht – das motiviert zum regelmäßigen Lernen.',
    color: 'bg-secondary/10 text-secondary',
  },
];

const FlipCard = ({ usp }: { usp: typeof usps[0] }) => {
  const [flipped, setFlipped] = useState(false);

  return (
    <div
      className="group cursor-pointer [perspective:1000px]"
      onMouseEnter={() => setFlipped(true)}
      onMouseLeave={() => setFlipped(false)}
      onClick={() => setFlipped(f => !f)}
    >
      <div className={`relative w-full h-64 transition-transform duration-500 [transform-style:preserve-3d] ${flipped ? '[transform:rotateY(180deg)]' : ''}`}>
        {/* Front */}
        <div className="absolute inset-0 bg-card rounded-3xl p-7 border shadow-sm flex flex-col items-center justify-center text-center [backface-visibility:hidden]">
          <div className={`w-16 h-16 ${usp.color} rounded-2xl flex items-center justify-center mb-5`}>
            <usp.icon className="w-8 h-8" />
          </div>
          <h3 className="font-bold text-lg mb-1">{usp.title}</h3>
          <p className="text-muted-foreground text-sm leading-relaxed">{usp.description}</p>
        </div>
        {/* Back */}
        <div className="absolute inset-0 bg-card rounded-3xl p-7 border shadow-sm flex items-center justify-center text-center [backface-visibility:hidden] [transform:rotateY(180deg)]">
          <div>
            <div className={`w-12 h-12 ${usp.color} rounded-xl flex items-center justify-center mx-auto mb-4`}>
              <usp.icon className="w-6 h-6" />
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">{usp.back}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

const MobileUSPCard = ({ usp }: { usp: typeof usps[0] }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className="bg-card rounded-2xl border shadow-sm overflow-hidden cursor-pointer"
      onClick={() => setExpanded(e => !e)}
    >
      <div className="flex items-center gap-3 p-4">
        <div className={`w-10 h-10 shrink-0 ${usp.color} rounded-xl flex items-center justify-center`}>
          <usp.icon className="w-5 h-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-bold text-sm">{usp.title}</h3>
          <p className="text-muted-foreground text-xs">{usp.description}</p>
        </div>
        <svg className={`w-4 h-4 shrink-0 text-muted-foreground transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
      </div>
      {expanded && (
        <div className="px-4 pb-4 pt-0">
          <p className="text-sm text-muted-foreground leading-relaxed border-t pt-3">{usp.back}</p>
        </div>
      )}
    </div>
  );
};
const USPSection = () => {
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
      <div className="absolute inset-0 bg-gradient-to-b from-muted/50 via-muted/30 to-background pointer-events-none" />

      <div className="relative max-w-5xl mx-auto">
        <div className="scroll-fade opacity-0 translate-y-4 transition-all duration-700 text-center mb-16">
          <span className="text-sm font-semibold text-secondary uppercase tracking-wider">Unsere Stärken</span>
          <h2 className="text-4xl sm:text-5xl font-extrabold mt-3 tracking-tight">
            Was{' '}
            <span className="bg-gradient-to-r from-secondary to-primary bg-clip-text text-transparent">
              LernZeit besonders
            </span>{' '}
            macht
          </h2>
          <p className="text-muted-foreground mt-3 text-sm">Hover oder tippe auf eine Kachel für mehr Details</p>
        </div>

        <div className="scroll-fade opacity-0 translate-y-4 transition-all duration-700 delay-200">
          {/* Desktop: 3-col flip grid */}
          <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {usps.map((usp) => (
              <FlipCard key={usp.title} usp={usp} />
            ))}
          </div>

          {/* Mobile: compact accordion-style list */}
          <div className="sm:hidden space-y-3">
            {usps.map((usp) => (
              <MobileUSPCard key={usp.title} usp={usp} />
            ))}
          </div>
        </div>
      </div>

      <style>{`
        .animate-in { opacity: 1 !important; transform: translateY(0) !important; }
      `}</style>
    </section>
  );
};

export default USPSection;
