import { Card, CardContent } from '@/components/ui/card';
import { Check, X, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const features = [
  { name: 'Alle Fächer Klasse 1–10', free: true, premium: true },
  { name: 'Bildschirmzeit verdienen', free: true, premium: true },
  { name: 'KI-Tutor Erklärungen', free: false, premium: true },
  { name: 'Belohnung pro Fach anpassen', free: false, premium: true },
  { name: 'Individuelle Zeitlimits', free: false, premium: true },
  { name: 'Erweiterte Lernanalyse', free: false, premium: true },
];

const PricingComparison = () => {
  const navigate = useNavigate();

  return (
    <section className="py-16 px-4 bg-muted/30">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-3xl sm:text-4xl font-bold text-center mb-4">
          Kostenlos starten, jederzeit upgraden
        </h2>
        <p className="text-center text-muted-foreground mb-12 max-w-xl mx-auto">
          Nach der Anmeldung stehen dir 4 Wochen lang alle Premium-Funktionen kostenlos zur Verfügung.
        </p>

        <Card className="shadow-card border-0 backdrop-blur-sm bg-card/80 overflow-hidden">
          <CardContent className="p-0">
            {/* Header */}
            <div className="grid grid-cols-3 text-center font-bold border-b">
              <div className="p-4 text-left text-muted-foreground text-sm">Feature</div>
              <div className="p-4 text-sm">Kostenlos</div>
              <div className="p-4 text-sm flex items-center justify-center gap-1.5">
                <Crown className="w-4 h-4 text-warning" />
                Premium
              </div>
            </div>

            {/* Rows */}
            {features.map((f, i) => (
              <div
                key={f.name}
                className={`grid grid-cols-3 text-center items-center text-sm ${
                  i < features.length - 1 ? 'border-b' : ''
                }`}
              >
                <div className="p-4 text-left">{f.name}</div>
                <div className="p-4 flex justify-center">
                  {f.free ? (
                    <Check className="w-5 h-5 text-secondary" />
                  ) : (
                    <X className="w-5 h-5 text-muted-foreground/40" />
                  )}
                </div>
                <div className="p-4 flex justify-center">
                  <Check className="w-5 h-5 text-primary" />
                </div>
              </div>
            ))}

            {/* CTA row */}
            <div className="bg-gradient-to-r from-primary/10 to-accent/10 p-6 text-center">
              <p className="text-sm font-medium mb-3">4 Wochen kostenlos testen</p>
              <Button
                onClick={() => navigate('/?auth=true')}
                className="bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg"
              >
                Jetzt starten
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
};

export default PricingComparison;
