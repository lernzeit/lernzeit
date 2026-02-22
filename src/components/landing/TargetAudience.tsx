import { Card, CardContent } from '@/components/ui/card';
import { Check, Trophy, Smile } from 'lucide-react';

const childFeatures = [
  'Spielerisch lernen mit Achievements und Streaks',
  'Eigene Bildschirmzeit verdienen – pro richtige Antwort',
  'KI-Erklärungen bei Fehlern',
];

const parentFeatures = [
  'Tägliches Zeitlimit festlegen (Wochentag / Wochenende)',
  'Belohnung pro Aufgabe je Fach individuell einstellen',
  'Fächer sichtbar/unsichtbar schalten und Schwerpunkte setzen',
  'Lernfortschritte verfolgen',
];

const TargetAudience = () => {
  return (
    <section className="py-16 px-4">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-3xl sm:text-4xl font-bold text-center mb-12">
          Für Eltern & Kinder
        </h2>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Kinder */}
          <Card className="shadow-card border-0 backdrop-blur-sm bg-card/80">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-secondary/20 rounded-xl flex items-center justify-center">
                  <Smile className="w-5 h-5 text-secondary" />
                </div>
                <h3 className="text-xl font-bold">Für Kinder</h3>
              </div>
              <ul className="space-y-3">
                {childFeatures.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check className="w-4 h-4 text-secondary shrink-0 mt-0.5" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Eltern */}
          <Card className="shadow-card border-0 backdrop-blur-sm bg-card/80">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center">
                  <Trophy className="w-5 h-5 text-primary" />
                </div>
                <h3 className="text-xl font-bold">Für Eltern</h3>
              </div>
              <ul className="space-y-3">
                {parentFeatures.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default TargetAudience;
