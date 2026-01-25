import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Building2, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Alert, AlertDescription } from '@/components/ui/alert';

const Impressum = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-bg p-4">
      <div className="max-w-4xl mx-auto">
        <Button 
          variant="ghost" 
          onClick={() => navigate(-1)}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Zurück
        </Button>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-6 h-6 text-primary" />
              Impressum
            </CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none">
            <Alert className="mb-6 border-amber-500 bg-amber-50">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800">
                <strong>Hinweis:</strong> Bitte ersetzen Sie die Platzhalter unten mit Ihren echten 
                Kontaktdaten, bevor Sie die App im Store veröffentlichen.
              </AlertDescription>
            </Alert>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-3">Angaben gemäß § 5 TMG</h2>
              <div className="text-muted-foreground">
                <p className="font-medium text-foreground">[Ihr Name / Firmenname]</p>
                <p>[Straße und Hausnummer]</p>
                <p>[PLZ] [Ort]</p>
                <p>Deutschland</p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-3">Kontakt</h2>
              <div className="text-muted-foreground">
                <p>Telefon: [Ihre Telefonnummer]</p>
                <p>E-Mail: [Ihre E-Mail-Adresse]</p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-3">Verantwortlich für den Inhalt nach § 55 Abs. 2 RStV</h2>
              <div className="text-muted-foreground">
                <p className="font-medium text-foreground">[Ihr Name]</p>
                <p>[Straße und Hausnummer]</p>
                <p>[PLZ] [Ort]</p>
              </div>
            </section>

            {/* Optional: Falls gewerblich */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-3">Handelsregister (falls zutreffend)</h2>
              <div className="text-muted-foreground">
                <p>Registergericht: [Amtsgericht]</p>
                <p>Registernummer: [HRB-Nummer]</p>
                <p>Umsatzsteuer-ID: [USt-IdNr.]</p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-3">EU-Streitschlichtung</h2>
              <p className="text-muted-foreground">
                Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit: 
                <a 
                  href="https://ec.europa.eu/consumers/odr/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:underline ml-1"
                >
                  https://ec.europa.eu/consumers/odr/
                </a>
              </p>
              <p className="text-muted-foreground mt-2">
                Unsere E-Mail-Adresse finden Sie oben im Impressum.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-3">Verbraucherstreitbeilegung/Universalschlichtungsstelle</h2>
              <p className="text-muted-foreground">
                Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer 
                Verbraucherschlichtungsstelle teilzunehmen.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-3">Haftung für Inhalte</h2>
              <p className="text-muted-foreground">
                Als Diensteanbieter sind wir gemäß § 7 Abs.1 TMG für eigene Inhalte auf diesen 
                Seiten nach den allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 TMG sind 
                wir als Diensteanbieter jedoch nicht verpflichtet, übermittelte oder gespeicherte 
                fremde Informationen zu überwachen oder nach Umständen zu forschen, die auf eine 
                rechtswidrige Tätigkeit hinweisen.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-3">Urheberrecht</h2>
              <p className="text-muted-foreground">
                Die durch die Seitenbetreiber erstellten Inhalte und Werke auf diesen Seiten 
                unterliegen dem deutschen Urheberrecht. Die Vervielfältigung, Bearbeitung, 
                Verbreitung und jede Art der Verwertung außerhalb der Grenzen des Urheberrechtes 
                bedürfen der schriftlichen Zustimmung des jeweiligen Autors bzw. Erstellers.
              </p>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Impressum;
