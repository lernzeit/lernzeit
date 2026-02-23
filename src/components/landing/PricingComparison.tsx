import { Check, X, Crown, ArrowRight } from 'lucide-react';
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
    <section className="py-24 px-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-background via-muted/30 to-background pointer-events-none" />

      <div className="relative max-w-4xl mx-auto">
        <div className="text-center mb-16">
          <span className="text-sm font-semibold text-accent uppercase tracking-wider">Preise</span>
          <h2 className="text-4xl sm:text-5xl font-extrabold mt-3 tracking-tight">
            Kostenlos starten,{' '}
            <span className="bg-gradient-to-r from-accent to-primary bg-clip-text text-transparent">
              jederzeit upgraden
            </span>
          </h2>
          <p className="text-muted-foreground mt-4 text-lg max-w-xl mx-auto">
            Nach der Anmeldung stehen dir 4 Wochen lang alle Premium-Funktionen kostenlos zur Verfügung.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-6">
          {/* Free */}
          <div className="bg-card rounded-3xl border p-8 shadow-sm">
            <h3 className="text-xl font-bold mb-1">Kostenlos</h3>
            <p className="text-muted-foreground text-sm mb-6">Für immer gratis</p>
            <div className="text-4xl font-extrabold mb-8">0 €<span className="text-base font-normal text-muted-foreground"> /Monat</span></div>
            <ul className="space-y-4">
              {features.map((f) => (
                <li key={f.name} className="flex items-center gap-3 text-sm">
                  {f.free ? (
                    <Check className="w-5 h-5 text-secondary shrink-0" />
                  ) : (
                    <X className="w-5 h-5 text-muted-foreground/30 shrink-0" />
                  )}
                  <span className={f.free ? '' : 'text-muted-foreground/50'}>{f.name}</span>
                </li>
              ))}
            </ul>
            <Button
              onClick={() => navigate('/?auth=true')}
              variant="outline"
              className="w-full mt-8 h-12 rounded-full font-semibold"
            >
              Kostenlos starten
            </Button>
          </div>

          {/* Premium */}
          <div className="relative bg-card rounded-3xl border-2 border-primary/30 p-8 shadow-xl">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-primary to-secondary text-primary-foreground text-xs font-bold px-4 py-1.5 rounded-full flex items-center gap-1.5">
              <Crown className="w-3.5 h-3.5" />
              4 Wochen gratis
            </div>
            <h3 className="text-xl font-bold mb-1">Premium</h3>
            <p className="text-muted-foreground text-sm mb-6">Volle Kontrolle & KI-Tutor</p>
            <div className="text-4xl font-extrabold mb-8">4,99 €<span className="text-base font-normal text-muted-foreground"> /Monat</span></div>
            <ul className="space-y-4">
              {features.map((f) => (
                <li key={f.name} className="flex items-center gap-3 text-sm">
                  <Check className="w-5 h-5 text-primary shrink-0" />
                  <span>{f.name}</span>
                </li>
              ))}
            </ul>
            <Button
              onClick={() => navigate('/?auth=true')}
              className="w-full mt-8 h-12 rounded-full font-semibold"
            >
              Jetzt testen
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PricingComparison;
