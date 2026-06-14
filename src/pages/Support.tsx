import React, { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ArrowLeft, LifeBuoy, Mail, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Seo from '@/components/Seo';

const SUPPORT_EMAIL = 'info@lernzeit.app';

const Support = () => {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [topic, setTopic] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const subject = encodeURIComponent(`[Support] ${topic || 'Anfrage'}`.slice(0, 150));
    const body = encodeURIComponent(
      `Name: ${name}\nE-Mail: ${email}\n\n${message}`.slice(0, 4000)
    );
    window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;
  };

  return (
    <div className="min-h-screen bg-gradient-bg p-4 pt-safe-top pb-safe-bottom px-safe">
      <Seo
        title="Support & Hilfe – LernZeit"
        description="Hilfe, FAQ und Kontaktformular für LernZeit. Wir helfen Eltern und Kindern bei Fragen rund um die App."
        path="/support"
      />
      <div className="max-w-3xl mx-auto">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Zurück
        </Button>

        <Card className="shadow-card">
          <CardHeader>
            <h1 className="flex items-center gap-2 text-2xl font-semibold leading-none tracking-tight">
              <LifeBuoy className="w-6 h-6 text-primary" />
              Support & Hilfe
            </h1>
          </CardHeader>
          <CardContent className="space-y-8">
            <section>
              <p className="text-muted-foreground">
                Du brauchst Hilfe bei LernZeit? Wir antworten in der Regel innerhalb von
                1–2 Werktagen. Erreiche uns direkt per E-Mail oder über das Kontaktformular.
              </p>
              <a
                href={`mailto:${SUPPORT_EMAIL}`}
                className="inline-flex items-center gap-2 mt-3 text-primary hover:underline"
              >
                <Mail className="w-4 h-4" />
                {SUPPORT_EMAIL}
              </a>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">Häufige Fragen</h2>
              <div className="space-y-4 text-muted-foreground">
                <div>
                  <h3 className="font-medium text-foreground">Wie verknüpfe ich Eltern- und Kinder-Account?</h3>
                  <p>Im Eltern-Dashboard auf „Kind hinzufügen" tippen und den angezeigten Code
                  am Gerät des Kindes eingeben.</p>
                </div>
                <div>
                  <h3 className="font-medium text-foreground">Wie kündige ich Premium?</h3>
                  <p>Im Eltern-Dashboard unter „Abonnement" → „Abo verwalten" (Stripe-Kundenportal).
                  Käufe über den App Store kündigst du in den iOS-Einstellungen.</p>
                </div>
                <div>
                  <h3 className="font-medium text-foreground">Wie lösche ich mein Konto und alle Daten?</h3>
                  <p>Im Eltern-Dashboard unter „Einstellungen" → „Konto löschen". Alle Daten
                  des Kontos und der verknüpften Kinder werden unwiderruflich entfernt.</p>
                </div>
                <div>
                  <h3 className="font-medium text-foreground">Mein Kind hat sein Passwort vergessen.</h3>
                  <p>Im Eltern-Dashboard kann das Passwort des Kindes jederzeit neu vergeben werden.</p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">Kontaktformular</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value.slice(0, 100))}
                      maxLength={100}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">E-Mail</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value.slice(0, 200))}
                      maxLength={200}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="topic">Betreff</Label>
                  <Input
                    id="topic"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value.slice(0, 150))}
                    maxLength={150}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="message">Nachricht</Label>
                  <Textarea
                    id="message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value.slice(0, 4000))}
                    maxLength={4000}
                    rows={6}
                    required
                  />
                </div>
                <Button type="submit" className="w-full sm:w-auto">
                  <Mail className="w-4 h-4 mr-2" />
                  Nachricht per E-Mail senden
                </Button>
                <p className="text-xs text-muted-foreground">
                  Das Formular öffnet dein E-Mail-Programm mit vorausgefülltem Text an {SUPPORT_EMAIL}.
                </p>
              </form>
            </section>

            <section className="text-sm text-muted-foreground border-t pt-6">
              <p>
                Anbieter und vollständige Kontaktdaten findest du im{' '}
                <a href="/impressum" className="text-primary hover:underline inline-flex items-center gap-1">
                  Impressum <ExternalLink className="w-3 h-3" />
                </a>.
              </p>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Support;