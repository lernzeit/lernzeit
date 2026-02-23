import { Clock, Shield, Brain, GraduationCap } from 'lucide-react';

const usps = [
  {
    icon: Clock,
    title: 'Bildschirmzeit als Belohnung',
    description:
      'Pro richtige Antwort verdienen Kinder Bildschirmzeit – Eltern legen pro Fach fest, wie viele Sekunden eine Aufgabe wert ist.',
    color: 'bg-primary/10 text-primary',
  },
  {
    icon: Shield,
    title: 'Eltern behalten die Kontrolle',
    description:
      'Eltern setzen ein tägliches Zeitlimit und steuern die Belohnung je Fach – alles über das Eltern-Dashboard.',
    color: 'bg-secondary/10 text-secondary',
  },
  {
    icon: Brain,
    title: 'KI-Tutor',
    description:
      'Falsche Antworten werden kindgerecht erklärt – mit Vorlese-Funktion für jüngere Kinder.',
    color: 'bg-accent/10 text-accent',
  },
  {
    icon: GraduationCap,
    title: 'Lehrplanorientiert',
    description:
      'Klasse 1–10, alle Hauptfächer, an deutschen Lehrplänen orientiert.',
    color: 'bg-destructive/10 text-destructive',
  },
];

const USPSection = () => {
  return (
    <section className="py-24 px-4 relative overflow-hidden">
      {/* Background accent */}
      <div className="absolute inset-0 bg-gradient-to-b from-muted/50 via-muted/30 to-background pointer-events-none" />
      
      <div className="relative max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <span className="text-sm font-semibold text-secondary uppercase tracking-wider">Unsere Stärken</span>
          <h2 className="text-4xl sm:text-5xl font-extrabold mt-3 tracking-tight">
            Was LernZeit{' '}
            <span className="bg-gradient-to-r from-secondary to-primary bg-clip-text text-transparent">
              besonders macht
            </span>
          </h2>
        </div>

        <div className="grid sm:grid-cols-2 gap-6">
          {usps.map((usp, i) => (
            <div
              key={usp.title}
              className={`group relative bg-card rounded-3xl p-8 border shadow-sm hover:shadow-xl transition-all duration-500 hover:-translate-y-1 ${
                i === 0 ? 'sm:col-span-2' : ''
              }`}
            >
              <div className="flex gap-5">
                <div className={`w-14 h-14 ${usp.color} rounded-2xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300`}>
                  <usp.icon className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="font-bold text-xl mb-2">{usp.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{usp.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default USPSection;
