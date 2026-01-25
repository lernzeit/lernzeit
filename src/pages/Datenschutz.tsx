import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Datenschutz = () => {
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
              <Shield className="w-6 h-6 text-primary" />
              Datenschutzerklärung
            </CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none">
            <p className="text-muted-foreground mb-6">
              Stand: {new Date().toLocaleDateString('de-DE', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-3">1. Verantwortlicher</h2>
              <p className="text-muted-foreground">
                Verantwortlich für die Datenverarbeitung in dieser App ist der Betreiber, 
                wie im Impressum angegeben. Bei Fragen zum Datenschutz kontaktieren Sie uns 
                bitte über die im Impressum angegebenen Kontaktdaten.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-3">2. Welche Daten werden erhoben?</h2>
              <div className="text-muted-foreground space-y-4">
                <div>
                  <h3 className="font-medium text-foreground">2.1 Registrierungsdaten</h3>
                  <p>Bei der Registrierung erheben wir:</p>
                  <ul className="list-disc list-inside ml-4 mt-2">
                    <li>E-Mail-Adresse</li>
                    <li>Name (optional)</li>
                    <li>Klassenstufe</li>
                    <li>Rolle (Kind oder Elternteil)</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-medium text-foreground">2.2 Nutzungsdaten</h3>
                  <p>Während der Nutzung speichern wir:</p>
                  <ul className="list-disc list-inside ml-4 mt-2">
                    <li>Lernfortschritte und -statistiken</li>
                    <li>Verdiente Bildschirmzeit</li>
                    <li>Beantwortete Fragen und Erfolgsquoten</li>
                    <li>Achievements und Streaks</li>
                  </ul>
                </div>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-3">3. Zweck der Datenverarbeitung</h2>
              <p className="text-muted-foreground">
                Wir verarbeiten Ihre Daten ausschließlich zu folgenden Zwecken:
              </p>
              <ul className="list-disc list-inside ml-4 mt-2 text-muted-foreground">
                <li>Bereitstellung der App-Funktionalitäten</li>
                <li>Speicherung des Lernfortschritts</li>
                <li>Berechnung und Anzeige der verdienten Bildschirmzeit</li>
                <li>Ermöglichung der Eltern-Kind-Verknüpfung</li>
                <li>Verbesserung der App und der Lernfragen</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-3">4. Rechtsgrundlage</h2>
              <p className="text-muted-foreground">
                Die Verarbeitung erfolgt auf Grundlage von:
              </p>
              <ul className="list-disc list-inside ml-4 mt-2 text-muted-foreground">
                <li>Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung)</li>
                <li>Art. 6 Abs. 1 lit. a DSGVO (Einwilligung bei Minderjährigen)</li>
                <li>Art. 8 DSGVO (Bedingungen für die Einwilligung von Kindern)</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-3">5. Besondere Bestimmungen für Kinder</h2>
              <p className="text-muted-foreground">
                LernZeit ist eine Lern-App für Kinder. Wir nehmen den Schutz von Kinderdaten 
                besonders ernst:
              </p>
              <ul className="list-disc list-inside ml-4 mt-2 text-muted-foreground">
                <li>Wir erheben nur die minimal notwendigen Daten</li>
                <li>Kinder unter 16 Jahren benötigen die Zustimmung eines Erziehungsberechtigten</li>
                <li>Es werden keine Daten an Dritte zu Werbezwecken weitergegeben</li>
                <li>Eltern können jederzeit die Daten ihrer Kinder einsehen und löschen lassen</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-3">6. Datenspeicherung</h2>
              <p className="text-muted-foreground">
                Ihre Daten werden auf Servern von Supabase in der Europäischen Union gespeichert. 
                Die Übertragung erfolgt verschlüsselt über HTTPS. Wir bewahren Ihre Daten nur so 
                lange auf, wie es für die Bereitstellung unserer Dienste erforderlich ist oder 
                gesetzliche Aufbewahrungspflichten bestehen.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-3">7. Ihre Rechte</h2>
              <p className="text-muted-foreground">Sie haben folgende Rechte:</p>
              <ul className="list-disc list-inside ml-4 mt-2 text-muted-foreground">
                <li><strong>Auskunftsrecht:</strong> Sie können Auskunft über Ihre gespeicherten Daten verlangen</li>
                <li><strong>Berichtigungsrecht:</strong> Sie können die Berichtigung unrichtiger Daten verlangen</li>
                <li><strong>Löschungsrecht:</strong> Sie können die Löschung Ihrer Daten verlangen</li>
                <li><strong>Einschränkungsrecht:</strong> Sie können die Einschränkung der Verarbeitung verlangen</li>
                <li><strong>Widerspruchsrecht:</strong> Sie können der Verarbeitung widersprechen</li>
                <li><strong>Datenübertragbarkeit:</strong> Sie können Ihre Daten in einem gängigen Format erhalten</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-3">8. Cookies und lokale Speicherung</h2>
              <p className="text-muted-foreground">
                Wir verwenden technisch notwendige Cookies und lokale Speicherung (localStorage) 
                ausschließlich für die Authentifizierung und die Speicherung von Einstellungen. 
                Es werden keine Tracking-Cookies oder Cookies für Werbezwecke verwendet.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-3">9. Änderungen dieser Datenschutzerklärung</h2>
              <p className="text-muted-foreground">
                Wir behalten uns vor, diese Datenschutzerklärung bei Bedarf anzupassen. 
                Die aktuelle Version ist stets in der App verfügbar. Bei wesentlichen Änderungen 
                werden wir Sie informieren.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-3">10. Kontakt und Beschwerderecht</h2>
              <p className="text-muted-foreground">
                Bei Fragen zum Datenschutz kontaktieren Sie uns bitte über die im Impressum 
                angegebenen Kontaktdaten. Sie haben außerdem das Recht, sich bei einer 
                Datenschutz-Aufsichtsbehörde über die Verarbeitung Ihrer Daten zu beschweren.
              </p>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Datenschutz;
