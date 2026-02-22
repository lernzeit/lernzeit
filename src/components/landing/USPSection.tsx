import { Card, CardContent } from '@/components/ui/card';
import { Clock, Shield, Brain, GraduationCap } from 'lucide-react';

const usps = [
  {
    icon: Clock,
    title: 'Bildschirmzeit als Belohnung',
    description:
      'Pro richtige Antwort verdienen Kinder Bildschirmzeit – Eltern legen pro Fach fest, wie viele Sekunden eine Aufgabe wert ist.',
  },
  {
    icon: Shield,
    title: 'Eltern behalten die Kontrolle',
    description:
      'Eltern setzen ein tägliches Zeitlimit und steuern die Belohnung je Fach – alles über das Eltern-Dashboard.',
  },
  {
    icon: Brain,
    title: 'KI-Tutor',
    description:
      'Falsche Antworten werden kindgerecht erklärt – mit Vorlese-Funktion für jüngere Kinder.',
  },
  {
    icon: GraduationCap,
    title: 'Lehrplanorientiert',
    description:
      'Klasse 1–10, alle Hauptfächer, an deutschen Lehrplänen orientiert.',
  },
];

const USPSection = () => {
  return (
    <section className="py-16 px-4 bg-muted/30">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-3xl sm:text-4xl font-bold text-center mb-4">
          Was uns besonders macht
        </h2>
        <p className="text-center text-muted-foreground mb-12 max-w-xl mx-auto">
          LernZeit verbindet Lernen mit einem durchdachten Belohnungssystem – unter voller Kontrolle der Eltern.
        </p>

        <div className="grid sm:grid-cols-2 gap-6">
          {usps.map((usp) => (
            <Card
              key={usp.title}
              className="shadow-card border-0 backdrop-blur-sm bg-card/80 hover:shadow-xl transition-all duration-300"
            >
              <CardContent className="p-6 flex gap-4">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
                  <usp.icon className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-lg mb-1">{usp.title}</h3>
                  <p className="text-muted-foreground text-sm">{usp.description}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default USPSection;
