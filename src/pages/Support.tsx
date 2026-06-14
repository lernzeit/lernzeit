import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  ArrowLeft,
  LifeBuoy,
  Mail,
  ExternalLink,
  ShieldCheck,
  Trash2,
  Download,
  Loader2,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import Seo from '@/components/Seo';

const SUPPORT_EMAIL = 'info@lernzeit.app';
const PRIVACY_EMAIL = 'datenschutz@lernzeit.app';

type RequestCategory =
  | 'general'
  | 'gdpr_access'
  | 'gdpr_export'
  | 'gdpr_rectification'
  | 'gdpr_erasure'
  | 'gdpr_restriction'
  | 'gdpr_objection'
  | 'gdpr_consent_withdraw';

const CATEGORY_META: Record<RequestCategory, { label: string; subjectTag: string; isGdpr: boolean; template?: string }> = {
  general: { label: 'Allgemeine Anfrage / Hilfe', subjectTag: 'Support', isGdpr: false },
  gdpr_access: {
    label: 'Auskunft über gespeicherte Daten (Art. 15 DSGVO)',
    subjectTag: 'DSGVO – Auskunft (Art. 15)',
    isGdpr: true,
    template:
      'Hiermit beantrage ich gemäß Art. 15 DSGVO Auskunft über alle zu meiner Person bzw. zum verknüpften Kinder-Account gespeicherten personenbezogenen Daten, Verarbeitungszwecke, Empfänger und Speicherdauer.',
  },
  gdpr_export: {
    label: 'Datenexport / Datenübertragbarkeit (Art. 20 DSGVO)',
    subjectTag: 'DSGVO – Datenexport (Art. 20)',
    isGdpr: true,
    template:
      'Hiermit beantrage ich gemäß Art. 20 DSGVO einen Export aller mich betreffenden personenbezogenen Daten in einem strukturierten, gängigen und maschinenlesbaren Format (z. B. JSON oder CSV).',
  },
  gdpr_rectification: {
    label: 'Berichtigung unrichtiger Daten (Art. 16 DSGVO)',
    subjectTag: 'DSGVO – Berichtigung (Art. 16)',
    isGdpr: true,
    template:
      'Hiermit beantrage ich gemäß Art. 16 DSGVO die Berichtigung folgender unrichtiger oder unvollständiger Daten:\n\n[Bitte konkret beschreiben, welche Daten korrigiert werden sollen.]',
  },
  gdpr_erasure: {
    label: 'Konto & Daten löschen (Art. 17 DSGVO)',
    subjectTag: 'DSGVO – Löschung (Art. 17)',
    isGdpr: true,
    template:
      'Hiermit beantrage ich gemäß Art. 17 DSGVO die unwiderrufliche Löschung meines LernZeit-Kontos sowie aller verknüpften Kinder-Konten und sämtlicher zugehöriger personenbezogener Daten.',
  },
  gdpr_restriction: {
    label: 'Einschränkung der Verarbeitung (Art. 18 DSGVO)',
    subjectTag: 'DSGVO – Einschränkung (Art. 18)',
    isGdpr: true,
    template:
      'Hiermit beantrage ich gemäß Art. 18 DSGVO die Einschränkung der Verarbeitung meiner personenbezogenen Daten aus folgendem Grund:\n\n[Bitte Grund nennen.]',
  },
  gdpr_objection: {
    label: 'Widerspruch gegen Verarbeitung (Art. 21 DSGVO)',
    subjectTag: 'DSGVO – Widerspruch (Art. 21)',
    isGdpr: true,
    template:
      'Hiermit widerspreche ich gemäß Art. 21 DSGVO der Verarbeitung meiner personenbezogenen Daten zum folgenden Zweck:\n\n[Bitte Zweck nennen.]',
  },
  gdpr_consent_withdraw: {
    label: 'Einwilligung widerrufen (Art. 7 DSGVO)',
    subjectTag: 'DSGVO – Widerruf der Einwilligung (Art. 7)',
    isGdpr: true,
    template:
      'Hiermit widerrufe ich gemäß Art. 7 Abs. 3 DSGVO meine zuvor erteilte Einwilligung mit Wirkung für die Zukunft. Bitte bestätigen Sie den Widerruf und stoppen Sie die entsprechende Verarbeitung.',
  },
};

const Support = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [category, setCategory] = useState<RequestCategory>('general');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [topic, setTopic] = useState('');
  const [message, setMessage] = useState('');
  const [isAuthed, setIsAuthed] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (active) setIsAuthed(!!data.session);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthed(!!session);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const meta = CATEGORY_META[category];

  // Prefill subject + message when switching to a GDPR category (only if user hasn't typed yet)
  useEffect(() => {
    if (meta.isGdpr) {
      if (!topic) setTopic(meta.label);
      if (!message && meta.template) setMessage(meta.template);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

  const targetEmail = meta.isGdpr ? PRIVACY_EMAIL : SUPPORT_EMAIL;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const subject = encodeURIComponent(
      `[${meta.subjectTag}] ${topic || meta.label}`.slice(0, 180)
    );
    const identityBlock = meta.isGdpr
      ? `Name: ${name}\nE-Mail (Konto): ${email}\nAnliegen: ${meta.label}\n\n` +
        `Zur Identitätsprüfung bitte aus dem im Konto hinterlegten E-Mail-Postfach senden.\n\n`
      : `Name: ${name}\nE-Mail: ${email}\n\n`;
    const body = encodeURIComponent((identityBlock + message).slice(0, 4000));
    window.location.href = `mailto:${targetEmail}?subject=${subject}&body=${body}`;
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
                <div className="space-y-2">
                  <Label htmlFor="category">Anliegen</Label>
                  <Select value={category} onValueChange={(v) => setCategory(v as RequestCategory)}>
                    <SelectTrigger id="category">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">{CATEGORY_META.general.label}</SelectItem>
                      <SelectItem value="gdpr_access">{CATEGORY_META.gdpr_access.label}</SelectItem>
                      <SelectItem value="gdpr_export">{CATEGORY_META.gdpr_export.label}</SelectItem>
                      <SelectItem value="gdpr_rectification">{CATEGORY_META.gdpr_rectification.label}</SelectItem>
                      <SelectItem value="gdpr_erasure">{CATEGORY_META.gdpr_erasure.label}</SelectItem>
                      <SelectItem value="gdpr_restriction">{CATEGORY_META.gdpr_restriction.label}</SelectItem>
                      <SelectItem value="gdpr_objection">{CATEGORY_META.gdpr_objection.label}</SelectItem>
                      <SelectItem value="gdpr_consent_withdraw">{CATEGORY_META.gdpr_consent_withdraw.label}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {meta.isGdpr && (
                  <Alert className="border-primary/40 bg-primary/5">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    <AlertDescription className="text-sm space-y-2">
                      <p>
                        Deine Anfrage wird automatisch an unseren Datenschutz-Posteingang
                        ({PRIVACY_EMAIL}) geleitet und innerhalb von <strong>30 Tagen</strong>{' '}
                        nach Art. 12 Abs. 3 DSGVO bearbeitet.
                      </p>
                      <p className="text-muted-foreground">
                        Bitte sende die E-Mail aus dem in deinem Konto hinterlegten Postfach,
                        damit wir deine Identität verifizieren können.
                      </p>
                    </AlertDescription>
                  </Alert>
                )}

                {category === 'gdpr_erasure' && (
                  <Alert className="border-destructive/40 bg-destructive/5">
                    <Trash2 className="h-4 w-4 text-destructive" />
                    <AlertDescription className="text-sm space-y-2">
                      <p>
                        <strong>Schneller geht's direkt in der App:</strong> Eingeloggte Eltern
                        können ihr Konto inkl. aller Kinder-Daten sofort selbst löschen.
                      </p>
                      {isAuthed ? (
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => navigate('/?view=settings#account-delete')}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Zur Konto-Löschung im Dashboard
                        </Button>
                      ) : (
                        <p className="text-muted-foreground">
                          Logge dich in der App ein → „Einstellungen" → „Konto löschen".
                          Alternativ kannst du die Löschung per E-Mail beantragen.
                        </p>
                      )}
                    </AlertDescription>
                  </Alert>
                )}

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
                    <Label htmlFor="email">E-Mail{meta.isGdpr && ' (Konto-Adresse)'}</Label>
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
                  Das Formular öffnet dein E-Mail-Programm mit vorausgefülltem Text an{' '}
                  <strong>{targetEmail}</strong>.
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