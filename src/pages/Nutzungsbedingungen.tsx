import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Nutzungsbedingungen = () => {
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
              <FileText className="w-6 h-6 text-primary" />
              Nutzungsbedingungen (AGB)
            </CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none">
            <p className="text-muted-foreground mb-6">
              Stand: {new Date().toLocaleDateString('de-DE', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-3">1. Geltungsbereich</h2>
              <p className="text-muted-foreground">
                Diese Nutzungsbedingungen gelten für die Nutzung der LernZeit-App (nachfolgend "App"). 
                Mit der Registrierung und Nutzung der App akzeptieren Sie diese Bedingungen.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-3">2. Leistungsbeschreibung</h2>
              <p className="text-muted-foreground">
                LernZeit ist eine Lern-App, die es Kindern ermöglicht, durch das Lösen von 
                Lernaufgaben Bildschirmzeit zu verdienen. Die App bietet:
              </p>
              <ul className="list-disc list-inside ml-4 mt-2 text-muted-foreground">
                <li>Lernaufgaben in verschiedenen Schulfächern</li>
                <li>Ein Belohnungssystem mit verdienter Bildschirmzeit</li>
                <li>Fortschrittsverfolgung und Statistiken</li>
                <li>Eltern-Kind-Verknüpfung zur Überwachung</li>
                <li>Achievements und Motivationselemente</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-3">3. Registrierung und Nutzerkonto</h2>
              <div className="text-muted-foreground space-y-3">
                <p>
                  3.1. Die Nutzung der App erfordert eine Registrierung mit einer gültigen E-Mail-Adresse.
                </p>
                <p>
                  3.2. Bei Minderjährigen unter 16 Jahren ist die Zustimmung eines Erziehungsberechtigten erforderlich.
                </p>
                <p>
                  3.3. Sie sind für die Geheimhaltung Ihrer Zugangsdaten verantwortlich.
                </p>
                <p>
                  3.4. Die Angabe falscher Daten bei der Registrierung ist nicht gestattet.
                </p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-3">4. Nutzungsregeln</h2>
              <p className="text-muted-foreground">Bei der Nutzung der App ist es nicht gestattet:</p>
              <ul className="list-disc list-inside ml-4 mt-2 text-muted-foreground">
                <li>Die App für rechtswidrige Zwecke zu nutzen</li>
                <li>Technische Schutzmaßnahmen zu umgehen</li>
                <li>Die App zu manipulieren oder zu hacken</li>
                <li>Automatisierte Systeme zur Nutzung einzusetzen</li>
                <li>Inhalte ohne Genehmigung zu kopieren oder zu verbreiten</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-3">5. Bildschirmzeit-System</h2>
              <div className="text-muted-foreground space-y-3">
                <p>
                  5.1. Die verdiente Bildschirmzeit ist ein Belohnungssystem innerhalb der App und 
                  stellt keinen rechtlichen Anspruch dar.
                </p>
                <p>
                  5.2. Eltern/Erziehungsberechtigte haben jederzeit die Möglichkeit, die Bildschirmzeit 
                  zu überprüfen und anzupassen.
                </p>
                <p>
                  5.3. Die Umrechnung von gelösten Aufgaben in Bildschirmzeit kann angepasst werden.
                </p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-3">6. Eltern-Kind-Verknüpfung</h2>
              <div className="text-muted-foreground space-y-3">
                <p>
                  6.1. Eltern können ihre Kinder über einen Einladungscode mit ihrem Konto verknüpfen.
                </p>
                <p>
                  6.2. Verknüpfte Eltern haben Einsicht in die Lernstatistiken und verdiente Bildschirmzeit ihrer Kinder.
                </p>
                <p>
                  6.3. Eltern können die Bildschirmzeit-Einstellungen für ihre Kinder anpassen.
                </p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-3">7. Geistiges Eigentum</h2>
              <p className="text-muted-foreground">
                Alle Inhalte der App (Texte, Aufgaben, Grafiken, Design) sind urheberrechtlich 
                geschützt. Eine Nutzung außerhalb der App ist ohne ausdrückliche Genehmigung nicht gestattet.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-3">8. Haftungsausschluss</h2>
              <div className="text-muted-foreground space-y-3">
                <p>
                  8.1. Die App wird "wie besehen" bereitgestellt. Wir übernehmen keine Garantie für 
                  ununterbrochene Verfügbarkeit.
                </p>
                <p>
                  8.2. Die Lerninhalte dienen der Übung und ersetzen keinen Schulunterricht.
                </p>
                <p>
                  8.3. Wir haften nicht für Schäden, die durch unsachgemäße Nutzung entstehen.
                </p>
                <p>
                  8.4. Die Haftung ist auf Vorsatz und grobe Fahrlässigkeit beschränkt.
                </p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-3">9. Kündigung und Kontolöschung</h2>
              <div className="text-muted-foreground space-y-3">
                <p>
                  9.1. Sie können Ihr Konto jederzeit löschen. Dabei werden alle gespeicherten Daten entfernt.
                </p>
                <p>
                  9.2. Wir behalten uns vor, Konten bei Verstoß gegen diese Bedingungen zu sperren oder zu löschen.
                </p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-3">10. Änderungen der Nutzungsbedingungen</h2>
              <p className="text-muted-foreground">
                Wir behalten uns vor, diese Nutzungsbedingungen anzupassen. Über wesentliche 
                Änderungen werden Sie informiert. Die weitere Nutzung nach Änderung gilt als Zustimmung.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-3">11. Schlussbestimmungen</h2>
              <div className="text-muted-foreground space-y-3">
                <p>
                  11.1. Es gilt deutsches Recht.
                </p>
                <p>
                  11.2. Sollten einzelne Bestimmungen unwirksam sein, bleibt die Wirksamkeit der 
                  übrigen Bestimmungen unberührt.
                </p>
                <p>
                  11.3. Gerichtsstand ist, soweit gesetzlich zulässig, der Sitz des Betreibers.
                </p>
              </div>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Nutzungsbedingungen;
