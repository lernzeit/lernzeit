import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Trash2, Mail, Smartphone, ShieldCheck, ExternalLink } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import Seo from '@/components/Seo';
import LegalFooter from '@/components/layout/LegalFooter';

const DELETE_EMAIL = 'datenschutz@lernzeit.app';

const KontoLoeschen: React.FC = () => {
  const navigate = useNavigate();

  const mailto =
    `mailto:${DELETE_EMAIL}` +
    `?subject=${encodeURIComponent('Löschung meines LernZeit-Kontos (Art. 17 DSGVO)')}` +
    `&body=${encodeURIComponent(
      'Hallo LernZeit-Team,\n\nhiermit beantrage ich gemäß Art. 17 DSGVO die unwiderrufliche Löschung meines LernZeit-Kontos sowie aller verknüpften Kinder-Konten und sämtlicher zugehöriger personenbezogener Daten.\n\nRegistrierte E-Mail-Adresse: \nName (optional): \n\nDanke!',
    )}`;

  return (
    <div className="min-h-screen bg-gradient-bg p-4 pt-safe-top pb-safe-bottom px-safe">
      <Seo
        title="Konto & Daten löschen – LernZeit"
        description="So löschst du dein LernZeit-Konto und alle personenbezogenen Daten – direkt in der App oder per E-Mail-Antrag nach Art. 17 DSGVO."
        path="/konto-loeschen"
      />
      <div className="max-w-3xl mx-auto">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Zurück
        </Button>

        <Card className="shadow-card">
          <CardHeader>
            <h1 className="flex items-center gap-2 text-2xl font-semibold leading-none tracking-tight">
              <Trash2 className="w-6 h-6 text-primary" />
              Konto & Daten löschen
            </h1>
            <p className="text-sm text-muted-foreground mt-2">
              Du kannst dein LernZeit-Konto jederzeit selbst löschen. Alle personenbezogenen
              Daten – inklusive verknüpfter Kinder-Konten, Lernfortschritt, Erfolge und
              Bildschirmzeit – werden dabei unwiderruflich entfernt.
            </p>
          </CardHeader>
          <CardContent className="space-y-8">
            <section>
              <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-primary" />
                Option 1: Löschung direkt in der App (empfohlen)
              </h2>
              <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                <li>Melde dich mit deinem Eltern-Konto an.</li>
                <li>Öffne <strong>Einstellungen</strong> im Eltern-Dashboard.</li>
                <li>
                  Scrolle nach unten zu <strong>„Account löschen"</strong> und bestätige mit
                  dem Wort <code className="px-1 py-0.5 rounded bg-muted">LÖSCHEN</code>.
                </li>
              </ol>
              <p className="text-sm text-muted-foreground mt-3">
                Die Löschung erfolgt sofort. Ein aktives Premium-Abo muss vorher im
                Kundenportal gekündigt werden.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
                <Mail className="w-5 h-5 text-primary" />
                Option 2: Löschung per E-Mail beantragen
              </h2>
              <p className="text-sm text-muted-foreground mb-3">
                Wenn du keinen Zugriff mehr auf dein Konto hast, sende uns eine formlose
                Löschanfrage. Wir bestätigen die Löschung innerhalb von <strong>30 Tagen</strong>
                {' '}(in der Regel deutlich schneller).
              </p>
              <Button asChild>
                <a href={mailto}>
                  <Mail className="w-4 h-4 mr-2" />
                  Löschanfrage per E-Mail senden
                </a>
              </Button>
              <p className="text-xs text-muted-foreground mt-2">
                Oder direkt an{' '}
                <a href={`mailto:${DELETE_EMAIL}`} className="text-primary hover:underline">
                  {DELETE_EMAIL}
                </a>
                . Bitte schreibe uns von der bei LernZeit registrierten E-Mail-Adresse, damit
                wir dich zuordnen können.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-primary" />
                Welche Daten werden gelöscht?
              </h2>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                <li>Profil, E-Mail-Adresse und Anmeldedaten</li>
                <li>Alle verknüpften Kinder-Konten inkl. Lernfortschritt und Erfolgen</li>
                <li>Verdiente Bildschirmzeit, Streaks, Feedback und Einstellungen</li>
                <li>Eltern-Kind-Verknüpfungen und Bildschirmzeit-Anfragen</li>
                <li>Push-Tokens und Benachrichtigungs-Einstellungen</li>
              </ul>
              <p className="text-xs text-muted-foreground mt-3">
                Bestimmte anonymisierte Daten (z. B. aggregierte Statistiken ohne Personenbezug)
                sowie gesetzlich aufbewahrungspflichtige Rechnungsdaten können darüber hinaus
                für die vorgeschriebene Dauer gespeichert bleiben.
              </p>
            </section>

            <section className="border-t border-border/40 pt-6">
              <p className="text-sm text-muted-foreground">
                Mehr Informationen findest du in unserer{' '}
                <Link to="/datenschutz" className="text-primary hover:underline inline-flex items-center gap-1">
                  Datenschutzerklärung <ExternalLink className="w-3 h-3" />
                </Link>
                {' '}oder auf der{' '}
                <Link to="/support" className="text-primary hover:underline inline-flex items-center gap-1">
                  Support-Seite <ExternalLink className="w-3 h-3" />
                </Link>
                .
              </p>
            </section>
          </CardContent>
        </Card>

        <LegalFooter className="mt-6" />
      </div>
    </div>
  );
};

export default KontoLoeschen;