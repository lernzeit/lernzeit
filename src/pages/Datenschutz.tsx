import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Seo from '@/components/Seo';

const Datenschutz = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-bg p-4 pt-safe-top pb-safe-bottom px-safe">
      <Seo
        title="Datenschutz – LernZeit"
        description="Datenschutzerklärung von LernZeit: So gehen wir mit den Daten von Eltern und Kindern um. Transparenz und Sicherheit nach DSGVO."
        path="/datenschutz"
      />
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
            <h1 className="flex items-center gap-2 text-2xl font-semibold leading-none tracking-tight">
              <Shield className="w-6 h-6 text-primary" />
              Datenschutzerklärung
            </h1>
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
              <p className="text-muted-foreground mt-4">
                In Übereinstimmung mit den Apple App Store „Kids Category"-Richtlinien sowie
                der DSGVO (insb. Art. 8) gilt zusätzlich:
              </p>
              <ul className="list-disc list-inside ml-4 mt-2 text-muted-foreground">
                <li>
                  <strong>Keine Werbung:</strong> In LernZeit wird weder personalisierte noch
                  kontextbezogene Werbung Dritter ausgespielt. Es sind keine Werbe-SDKs
                  (z. B. AdMob, Meta Audience Network) integriert.
                </li>
                <li>
                  <strong>Kein Tracking & keine Profilbildung:</strong> Wir nutzen keine
                  Tracking-Technologien geräte- oder app-übergreifend. Die App fragt unter
                  iOS daher auch keine „App Tracking Transparency"-Erlaubnis (ATT) ab.
                </li>
                <li>
                  <strong>Keine Weitergabe an Werbenetzwerke oder Datenhändler:</strong>
                  Daten von Kindern werden nicht für Marketing-, Profiling- oder
                  Analysezwecke Dritter verwendet oder verkauft.
                </li>
                <li>
                  <strong>Eingeschränkte Analytics:</strong> Wir verwenden ausschließlich
                  datensparsame, aggregierte technische Logs zur Stabilitätssicherung – ohne
                  Werbe-Identifier (IDFA/AAID) und ohne personenbezogene Profilbildung.
                </li>
                <li>
                  <strong>In-App-Käufe nur durch Eltern:</strong> Premium-Abonnements und
                  Käufe sind ausschließlich im Eltern-Account verfügbar und durch das Eltern-
                  bzw. App-Store-Konto geschützt.
                </li>
                <li>
                  <strong>Externe Links & Social Media:</strong> Innerhalb der Kinder-Ansicht
                  gibt es keine Verlinkungen zu externen Webseiten oder sozialen Netzwerken,
                  die nicht zuvor eine Eltern-Bestätigung erfordern.
                </li>
                <li>
                  <strong>Elterliche Einwilligung:</strong> Bei der Anlage eines Kinder-Accounts
                  wird die elterliche Einwilligung gemäß Art. 8 DSGVO eingeholt und protokolliert.
                </li>
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
              <h2 className="text-xl font-semibold mb-3">6a. Eingesetzte Dienstleister (Auftragsverarbeiter)</h2>
              <p className="text-muted-foreground">
                Zur Bereitstellung der App nutzen wir sorgfältig ausgewählte Dienstleister,
                mit denen Auftragsverarbeitungsverträge (Art. 28 DSGVO) bestehen:
              </p>
              <ul className="list-disc list-inside ml-4 mt-2 text-muted-foreground">
                <li><strong>Supabase</strong> (EU-Region) – Hosting, Datenbank, Authentifizierung</li>
                <li><strong>Stripe Payments Europe, Ltd.</strong> – Zahlungsabwicklung für Premium-Abos (nur Eltern-Accounts)</li>
                <li><strong>Google (Lovable AI Gateway / Gemini)</strong> sowie <strong>OpenRouter</strong> – Generierung von Lernfragen und KI-Erklärungen; Eingaben werden ohne personenbezogene Identifikatoren übertragen</li>
                <li><strong>Resend</strong> – Versand transaktionaler E-Mails (z. B. Bestätigungen)</li>
                <li><strong>Apple App Store / Google Play</strong> – App-Bereitstellung und ggf. In-App-Käufe</li>
              </ul>
              <p className="text-muted-foreground mt-2">
                Diese Dienste werden ausschließlich zum Betrieb der App eingesetzt und nicht
                für Werbezwecke. Datenübermittlungen in Drittländer (z. B. USA) erfolgen nur
                auf Grundlage geeigneter Garantien (Standardvertragsklauseln und ggf. EU-US
                Data Privacy Framework).
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
                Bei Fragen zum Datenschutz erreichen Sie uns per E-Mail unter{' '}
                <a href="mailto:info@lernzeit.app" className="text-primary hover:underline">info@lernzeit.app</a>{' '}
                oder über unsere <a href="/support" className="text-primary hover:underline">Support-Seite</a>.
                Vollständige Kontaktdaten finden Sie im <a href="/impressum" className="text-primary hover:underline">Impressum</a>.
                Sie haben außerdem das Recht, sich bei einer Datenschutz-Aufsichtsbehörde
                über die Verarbeitung Ihrer Daten zu beschweren.
              </p>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Datenschutz;
