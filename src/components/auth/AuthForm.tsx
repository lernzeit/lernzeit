import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { istNativeApp, oauthImAppBrowser } from '@/services/nativeOAuth';
import { googleDirekterWeg, googleImAppBrowserGesperrt, googleNativ, googleWebAbschliessen, googleWebStarten } from '@/services/googleAnmeldung';
import { track, trackFireAndForget } from '@/lib/analytics';
import { translateError } from '@/utils/errorMessages';
import { fehlerTyp, useRegistrierungsMessung } from '@/hooks/useRegistrierungsMessung';
import { Shield, Heart, Mail, Lock, User, GraduationCap, Gift, UserPlus, BookOpen, KeyRound, ChevronLeft, Check } from 'lucide-react';
import Handy from '@/components/landing/Handy';
import Randnotiz from '@/components/landing/Randnotiz';
import { useTurnstile } from '@/hooks/useTurnstile';
import { validateReferralCode, REFERRAL_CODE_HINT } from '@/utils/referralCode';

// Google Icon SVG component
const GoogleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

// Apple Icon SVG (official glyph shape, monochrome)
const AppleIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path fill="currentColor" d="M16.365 1.43c0 1.14-.42 2.22-1.19 3.01-.82.85-2.16 1.51-3.27 1.42-.14-1.11.42-2.27 1.16-3.02.83-.85 2.24-1.48 3.3-1.41zM20.5 17.32c-.55 1.27-.82 1.83-1.53 2.95-.99 1.56-2.38 3.5-4.11 3.52-1.54.01-1.93-1-4.02-.99-2.09.01-2.52 1.01-4.06.99-1.73-.03-3.05-1.78-4.04-3.34C.29 16.24-.05 11.24 1.98 8.58c1.44-1.89 3.7-3 5.83-3 2.17 0 3.53 1.19 5.32 1.19 1.74 0 2.8-1.19 5.31-1.19 1.9 0 3.9 1.03 5.34 2.82-4.69 2.57-3.93 9.28-3.28 8.92z"/>
  </svg>
);

const UNKNOWN_ERROR_FALLBACK = 'Ein Fehler ist aufgetreten. Bitte versuche es erneut.';

const generateAppleRawNonce = () => {
  const charset = '0123456789ABCDEFGHIJKLMNOPQRSTUVXYZabcdefghijklmnopqrstuvwxyz-._';
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => charset[byte % charset.length]).join('');
};

const sha256Hex = async (value: string) => {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
};

const getAppleErrorDescription = (error: any) => {
  const detail = String(
    error?.message ||
    error?.error_description ||
    error?.code ||
    'Unbekannter Fehler'
  );
  const translated = translateError(detail);
  return translated === UNKNOWN_ERROR_FALLBACK && detail !== 'Unbekannter Fehler'
    ? detail
    : translated;
};


interface AuthFormProps {
  onAuthSuccess: () => void;
}

// Gestaltung im Bild der Startseite (Klassen aus src/index.css, Block .lp)
const TAB =
  'h-10 rounded-full text-[0.9375rem] font-bold text-[var(--lp-leise)] data-[state=active]:bg-white data-[state=active]:text-[var(--lp-tinte)] data-[state=active]:shadow-[0_1px_3px_rgba(26,43,109,0.15)]';
const ABSENDEN =
  'w-full h-12 rounded-full bg-[var(--lp-blau)] text-base font-bold text-white shadow-[0_10px_24px_-10px_rgba(37,99,235,0.7)] hover:bg-[#1d4ed8]';

/** Statt des Google-Knopfs im Facebook-/Instagram-Browser (Google sperrt dort). */
function GoogleImAppBrowserHinweis() {
  return (
    <p className="rounded-2xl bg-[var(--lp-heft)] px-4 py-3 text-center text-sm text-[var(--lp-tinte)]" role="note">
      Mit Google geht es in diesem Browser nicht. Öffne die Seite über „…“ → „Im Browser öffnen“
      oder registriere dich unten mit E-Mail.
    </p>
  );
}

export function AuthForm({ onAuthSuccess }: AuthFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  // Bewusst KEIN Standardwert: Eltern, die schnell durchklicken, landeten
  // sonst weiter im Kind-Modus. Die Rolle muss aktiv gewählt werden.
  // Ein Tipp auf eine Karte setzt die Rolle sofort — jeder Zusatzschritt
  // kostet Anmeldungen (Korrektur, 03.10.2026).
  const [role, setRole] = useState<'parent' | 'child' | null>(null);
  const [grade, setGrade] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSent, setResetSent] = useState(false);
  // Child email-less registration
  const [childNoEmail, setChildNoEmail] = useState(false);
  const [username, setUsername] = useState('');
  const [invitationCode, setInvitationCode] = useState('');
  // Login identifier (email or username)
  const [loginIdentifier, setLoginIdentifier] = useState('');
  // Optional tester code (parents only)
  const [testerCode, setTesterCode] = useState('');
  // Referral code (read from URL or localStorage)
  const [referralCode, setReferralCode] = useState<string>('');
  const { toast } = useToast();
  const navigate = useNavigate();
  // Schritte, Fehler und Abbrueche der Registrierung (seit 04.10.2026)
  const messung = useRegistrierungsMessung();
  // „Anmelden“ auf Startseite und Apps führt mit ?anmelden=1 direkt zum Reiter Anmelden
  const [suchParameter] = useSearchParams();
  const startReiter = suchParameter.get('anmelden') === '1' ? 'signin' : 'signup';

  // Registrierungsformular geöffnet (Signup ist der Standard-Tab)
  useEffect(() => {
    trackFireAndForget('sign_up_started', {});
  }, []);

  // Rücksprung von Google (Website, direkter Weg): Token an Supabase geben
  useEffect(() => {
    let aktiv = true;
    void (async () => {
      const ergebnis = await googleWebAbschliessen();
      if (!aktiv || ergebnis.status === 'keiner' || ergebnis.status === 'abgebrochen') return;
      if (ergebnis.status === 'ok') {
        onAuthSuccess();
        return;
      }
      toast({
        title: 'Fehler bei Google-Anmeldung',
        description: translateError(ergebnis.meldung ?? ''),
        variant: 'destructive',
      });
    })();
    return () => { aktiv = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Im Facebook-/Instagram-Browser lässt Google keine Anmeldung zu
  const googleGesperrt = googleImAppBrowserGesperrt();
  const {
    status: captchaStatus,
    errorCode: captchaErrorCode,
    ensureToken,
    resetWidget: resetCaptcha,
    isEnabled: isCaptchaEnabled,
  } = useTurnstile('turnstile-container');

  // Sicherheitspruefung laedt nicht (Skript blockiert, Domain nicht frei):
  // sichtbare Fehlermeldung im Formular, deshalb mitgezaehlt.
  useEffect(() => {
    if (captchaStatus === 'error') messung.fehler(`captcha_laden:${captchaErrorCode ?? 'unbekannt'}`);
  }, [captchaStatus, captchaErrorCode, messung]);

  /**
   * Merkt sich, dass eine Anmeldung über Google oder Apple die Seite verlassen
   * hat. Nur dann darf der Ladezustand beim Zurückkommen zurückgesetzt werden —
   * bei einer laufenden Anmeldung per E-Mail wäre das falsch.
   */
  const oauthRedirectPending = useRef(false);

  /**
   * Setzt den Ladezustand zurück, wenn der Nutzer nach einem abgebrochenen oder
   * fehlgeschlagenen OAuth-Versuch zum Anmeldebildschirm zurückkehrt.
   *
   * handleGoogleSignIn und handleAppleSignIn setzen `loading` auf true und
   * leiten dann weiter; ein Zurücksetzen gibt es dort nur im Fehlerfall, weil
   * die Seite im Erfolgsfall ohnehin verlassen wird. Kehrt der Nutzer aber
   * zurück, OHNE dass die Seite neu geladen wird — Safari stellt sie aus dem
   * bfcache wieder her, die native App kommt aus dem Hintergrund —, montiert
   * React nicht neu. `loading` bleibt auf true stehen, alle Knöpfe bleiben
   * deaktiviert und zeigen nur noch einen Spinner. Für den Nutzer sieht das
   * aus, als sei der Anmeldebildschirm abgestürzt.
   */
  useEffect(() => {
    const clearIfReturning = () => {
      if (!oauthRedirectPending.current) return;
      oauthRedirectPending.current = false;
      setLoading(false);
    };

    // persisted === true bedeutet: aus dem bfcache wiederhergestellt, also
    // ohne Neuaufbau des JavaScript-Zustands.
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) clearIfReturning();
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') clearIfReturning();
    };

    window.addEventListener('pageshow', onPageShow);
    document.addEventListener('visibilitychange', onVisibilityChange);

    // In der nativen App löst die Rückkehr aus dem Systembrowser nicht
    // zuverlässig visibilitychange aus.
    let removeNativeListener: (() => void) | undefined;
    void (async () => {
      try {
        const { Capacitor } = await import('@capacitor/core');
        if (!Capacitor.isNativePlatform()) return;
        const { App } = await import('@capacitor/app');
        const handle = await App.addListener('appStateChange', ({ isActive }) => {
          if (isActive) clearIfReturning();
        });
        removeNativeListener = () => {
          try { handle.remove(); } catch { /* ignore */ }
        };
      } catch { /* ignore */ }
    })();

    return () => {
      window.removeEventListener('pageshow', onPageShow);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      removeNativeListener?.();
    };
  }, []);

  // Detect referral code from URL (?ref=XXXXXX) or localStorage
  useEffect(() => {
    // Einladungslink der Eltern: ?code=123456 → direkt Kind-Registrierung
    try {
      const invite = new URL(window.location.href).searchParams.get('code');
      const digits = (invite || '').replace(/\D/g, '').slice(0, 6);
      if (digits.length === 6) {
        setInvitationCode(digits);
        setRole('child');
        setChildNoEmail(true);
      }
    } catch { /* noop */ }
    try {
      const url = new URL(window.location.href);
      const fromUrl = url.searchParams.get('ref');
      if (fromUrl) {
        const check = validateReferralCode(fromUrl);
        if (!check.valid) {
          // Invalid `?ref=` in URL — inform the user rather than silently ignoring.
          toast({
            title: 'Empfehlungs-Code ungültig',
            description: `${check.message} ${REFERRAL_CODE_HINT}`,
            variant: 'destructive',
          });
        } else {
          const payload = JSON.stringify({ code: check.normalized, expires: Date.now() + 30 * 86400_000 });
          localStorage.setItem('lernzeit_referral_code', payload);
          setReferralCode(check.normalized);
          setTesterCode((prev) => prev || check.normalized);
          return;
        }
      }
      const stored = localStorage.getItem('lernzeit_referral_code');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.code && parsed?.expires > Date.now()) {
          setReferralCode(parsed.code);
          setTesterCode((prev) => prev || parsed.code);
        } else {
          localStorage.removeItem('lernzeit_referral_code');
        }
      }
    } catch { /* noop */ }
    // toast is stable enough (memoized by useToast); ignore for eslint if needed
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getCaptchaErrorDescription = () => {
    if (captchaErrorCode === '110200') {
      return `Domain "${window.location.hostname}" ist in Cloudflare Turnstile nicht freigegeben.`;
    }
    if (captchaErrorCode === 'init_failed') {
      return 'Turnstile konnte nicht initialisiert werden. Bitte Adblocker/Tracking-Schutz deaktivieren und challenges.cloudflare.com erlauben.';
    }
    if (captchaErrorCode) {
      return `Turnstile-Fehlercode: ${captchaErrorCode}. Bitte Seite neu laden und erneut versuchen.`;
    }
    return 'Bitte Seite neu laden und erneut versuchen.';
  };

  const handleCaptchaFailure = () => {
    messung.fehler('captcha');
    toast({
      title: 'Sicherheitsprüfung fehlgeschlagen',
      description: getCaptchaErrorDescription(),
      variant: 'destructive',
    });
  };

  const resolveCaptchaToken = async (): Promise<string | null | undefined> => {
    if (!isCaptchaEnabled) return undefined;
    const tokenToUse = await ensureToken();
    if (!tokenToUse) {
      handleCaptchaFailure();
      return null;
    }
    return tokenToUse;
  };

  // Das Anmeldefenster in der App wurde geschlossen. Mit Erfolg übernimmt
  // der Deep-Link-Handler die Sitzung und dieser Bildschirm verschwindet;
  // ohne Erfolg (Abbruch) darf er nicht im Ladezustand stehen bleiben.
  const beiAbbruch = () => {
    oauthRedirectPending.current = false;
    setLoading(false);
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      // Direkt bei Google, sobald eingerichtet (config/google.ts): Google zeigt
      // dann „lernzeit.app“ statt der Supabase-Adresse.
      const direkt = googleDirekterWeg();
      if (direkt === 'web') {
        oauthRedirectPending.current = true;
        await googleWebStarten();
        return;
      }
      if (direkt === 'nativ') {
        const ergebnis = await googleNativ();
        if (ergebnis === 'ok') onAuthSuccess();
        setLoading(false);
        return;
      }
      // Role/grade/referral will be captured AFTER OAuth via GoogleRoleSelection.
      // Ab hier verlässt der Nutzer die Seite — beim Zurückkommen muss der
      // Ladezustand aufgelöst werden, sonst bleibt der Bildschirm gesperrt.
      oauthRedirectPending.current = true;
      const queryParams = { access_type: 'offline', prompt: 'consent' };
      // In der App nicht die eigene Ansicht umleiten — sie landete sonst in
      // Safari und blieb dort. Siehe services/nativeOAuth.ts.
      if (istNativeApp()) {
        await oauthImAppBrowser('google', queryParams, beiAbbruch);
        return;
      }
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`,
          queryParams,
        },
      });
      if (error) throw error;
    } catch (error: any) {
      oauthRedirectPending.current = false;
      toast({
        title: "Fehler bei Google-Anmeldung",
        description: translateError(error.message),
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    setLoading(true);
    try {
      // Role/grade/referral will be captured AFTER OAuth via GoogleRoleSelection.
      // On native iOS use the native Sign in with Apple dialog and pass the
      // identity token to Supabase (avoids the web redirect flow entirely).
      try {
        const { Capacitor } = await import('@capacitor/core');
        if (Capacitor.getPlatform() === 'ios') {
          const { SignInWithApple } = await import('@capacitor-community/apple-sign-in');
          const rawNonce = generateAppleRawNonce();
          const nonceDigest = await sha256Hex(rawNonce);
          const result = await SignInWithApple.authorize({
            clientId: 'de.lernzeit.app',
            redirectURI: 'https://lernzeit.app/',
            scopes: 'email name',
            state: Math.random().toString(36).slice(2),
            nonce: nonceDigest,
          });

          const identityToken = result?.response?.identityToken;
          if (!identityToken) throw new Error('Kein Apple Identity Token erhalten.');

          const { error: idErr } = await supabase.auth.signInWithIdToken({
            provider: 'apple',
            token: identityToken,
            nonce: rawNonce,
          });
          if (idErr) throw idErr;

          onAuthSuccess();
          return;
        }
      } catch (nativeErr: any) {
        // Cancel by user should be silent
        const msg = String(nativeErr?.message || nativeErr?.code || '');
        if (/cancel/i.test(msg) || nativeErr?.code === '1001') {
          setLoading(false);
          return;
        }
        console.error('[Apple Sign-In] native error:', nativeErr);
        throw nativeErr;
      }

      // Web-Weiterleitung (nicht der native iOS-Dialog oben): Der Nutzer
      // verlässt die Seite, deshalb wie bei Google markieren.
      oauthRedirectPending.current = true;
      // Android: gleicher Fehler wie bei Google, gleicher Weg.
      if (istNativeApp()) {
        await oauthImAppBrowser('apple', undefined, beiAbbruch);
        return;
      }
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'apple',
        options: {
          redirectTo: `${window.location.origin}/`,
        },
      });
      if (error) throw error;
    } catch (error: any) {
      oauthRedirectPending.current = false;
      console.error('[Apple Sign-In] failed:', error);
      toast({
        title: "Fehler bei Apple-Anmeldung",
        description: getAppleErrorDescription(error),
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) return;
    setLoading(true);
    try {
      const tokenToUse = await resolveCaptchaToken();
      if (tokenToUse === null) { setLoading(false); return; }
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
        ...(typeof tokenToUse === 'string' ? { captchaToken: tokenToUse } : {}),
      });
      if (error) throw error;
      setResetSent(true);
      toast({ title: 'Link gesendet!', description: 'Prüfe dein E-Mail-Postfach für den Reset-Link.' });
    } catch (error: any) {
      toast({ title: 'Fehler', description: translateError(error.message), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const validateUsername = (value: string): boolean => {
    return /^[a-zA-Z0-9_]{3,20}$/.test(value);
  };

  const checkUsernameAvailability = async (uname: string): Promise<boolean> => {
    // Use SECURITY DEFINER RPC to bypass RLS (anon can't read profiles)
    const { data, error } = await supabase.rpc('get_email_by_username', {
      p_username: uname,
    });
    if (error) return false;
    // If data is null/empty, username is available
    return !data;
  };

  const generatePseudoEmail = (uname: string): string => {
    const random = Math.random().toString(36).substring(2, 6);
    return `${uname.toLowerCase()}_${random}@lernzeit.internal`;
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    messung.schritt('absenden');

    try {
      const tokenToUse = await resolveCaptchaToken();
      if (tokenToUse === null) { setLoading(false); return; }

      if (role !== 'parent' && role !== 'child') {
        messung.fehler('rolle_fehlt');
        toast({
          title: 'Bitte zuerst auswählen',
          description: 'Wähle aus, ob du Elternteil oder Kind bist.',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      // Child without email registration
      if (role === 'child' && childNoEmail) {
        if (!validateUsername(username)) {
          messung.fehler('benutzername_ungueltig');
          toast({
            title: 'Ungültiger Benutzername',
            description: 'Der Benutzername muss 3–20 Zeichen lang sein und darf nur Buchstaben, Zahlen und _ enthalten.',
            variant: 'destructive',
          });
          setLoading(false);
          return;
        }

        if (invitationCode && invitationCode.length !== 6) {
          messung.fehler('code_unvollstaendig');
          toast({
            title: 'Einladungscode unvollständig',
            description: 'Der Code hat 6 Ziffern. Lass ihn leer, wenn du dich später verbinden möchtest.',
            variant: 'destructive',
          });
          setLoading(false);
          return;
        }

        const isAvailable = await checkUsernameAvailability(username);
        if (!isAvailable) {
          messung.fehler('benutzername_vergeben');
          toast({
            title: 'Benutzername vergeben',
            description: 'Dieser Benutzername ist bereits vergeben. Bitte wähle einen anderen.',
            variant: 'destructive',
          });
          setLoading(false);
          return;
        }

        const pseudoEmail = generatePseudoEmail(username);

        // Create child account via edge function (admin API, auto-confirmed).
        // Der Einladungscode ist optional: Ein Kind darf sich auch ohne Eltern
        // registrieren und ueben; die Verknuepfung kann spaeter erfolgen.
        const { data: createData, error: createError } = await supabase.functions.invoke('confirm-child-account', {
          body: {
            email: pseudoEmail,
            password,
            name: name || username,
            role: 'child',
            grade,
            username: username.toLowerCase(),
            invitationCode: invitationCode || undefined,
          },
        });

        if (createError || createData?.error) {
          // Extract error message: createData may be null for non-2xx responses
          let errorMsg = 'Konto konnte nicht erstellt werden.';
          if (createData?.error) {
            errorMsg = createData.error;
          } else if (createError && 'context' in createError) {
            try {
              const errBody = await (createError as any).context.json();
              errorMsg = errBody?.error || errorMsg;
            } catch { /* fallback to generic */ }
          }
          messung.fehler('kinderkonto_fehlgeschlagen');
          toast({
            title: 'Registrierung fehlgeschlagen',
            description: errorMsg,
            variant: 'destructive',
          });
          setLoading(false);
          return;
        }

        const userId = createData?.user_id;
        if (!userId) throw new Error('Benutzer konnte nicht erstellt werden.');

        // Sign in immediately (account is already confirmed)
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: pseudoEmail,
          password,
        });

        if (signInError) throw signInError;

        // Claim invitation code to link with parent (nur wenn ein Code vorliegt)
        if (invitationCode) {
          try {
            await supabase.rpc('claim_invitation_code', {
              code_to_claim: invitationCode,
              claiming_child_id: userId,
            });
          } catch (claimErr) {
            console.warn('Code claim failed:', claimErr);
            toast({
              title: 'Hinweis',
              description: 'Dein Konto wurde erstellt, aber der Einladungscode konnte nicht eingelöst werden. Du kannst ihn später in den Einstellungen eingeben.',
            });
          }
        }

        toast({
          title: 'Willkommen! 🎉',
          description: `Dein Konto wurde erstellt. Merke dir deinen Benutzernamen: ${username.toLowerCase()}`,
        });

        // Abgewartet, nicht nachgeworfen: Direkt danach wechselt die Ansicht.
        // Ein Ereignis, das noch unterwegs ist, wenn die Seite umschaltet,
        // kann verloren gehen — und genau das ist hier offenbar passiert.
        // Seit Messbeginn am 18.08.2026 sind 16 Konten entstanden und
        // `sign_up_completed` stand null Mal im Protokoll.
        messung.abgeschlossen();
        await track('sign_up_completed', { role: 'child', method: 'username' });
        if (invitationCode) {
          trackFireAndForget('invitation_code_redeemed', {});
        } else {
          trackFireAndForget('child_registered_without_code', { method: 'username' });
        }

        onAuthSuccess();
        return;
      }

      // Standard email registration
      const manualCodeRaw = testerCode.trim();
      let effectiveReferral: string | undefined;
      if (role === 'parent') {
        if (manualCodeRaw) {
          const check = validateReferralCode(manualCodeRaw);
          if (!check.valid) {
            messung.fehler('empfehlungscode_ungueltig');
            toast({
              title: 'Empfehlungs-Code ungültig',
              description: `${check.message} ${REFERRAL_CODE_HINT}`,
              variant: 'destructive',
            });
            setLoading(false);
            if (isCaptchaEnabled) resetCaptcha();
            return;
          }
          effectiveReferral = check.normalized;
        } else if (referralCode) {
          effectiveReferral = referralCode;
        }
      }
      const manualCode = effectiveReferral ?? '';
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          ...(typeof tokenToUse === 'string' ? { captchaToken: tokenToUse } : {}),
          data: {
            name,
            role,
            grade: role === 'child' ? grade : null,
            // Also send as tester_code — the server handles a mismatch gracefully
            // (only real tester codes in `tester_codes` grant founding-family status).
            tester_code: role === 'parent' && manualCode ? manualCode : undefined,
            referral_code: effectiveReferral,
          },
          emailRedirectTo: `${window.location.origin}/`
        }
      });

      if (error) throw error;
      messung.abgeschlossen();
      // Abgewartet — siehe der Kind-Weg weiter oben. Unmittelbar danach wird
      // auf die Bestaetigungsseite gewechselt.
      await track('sign_up_completed', { role, method: 'email' });
      if (role === 'parent' && effectiveReferral) {
        localStorage.removeItem('lernzeit_referral_code');
      }
      navigate(`/email-bestaetigung?email=${encodeURIComponent(email)}`);
    } catch (error: any) {
      if (isCaptchaEnabled) resetCaptcha();
      messung.fehler(fehlerTyp(error?.message));
      toast({
        title: "Fehler",
        description: translateError(error.message),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const tokenToUse = await resolveCaptchaToken();
      if (tokenToUse === null) { setLoading(false); return; }

      let resolvedEmail = loginIdentifier;

      // If no @ sign, treat as username and resolve to email
      if (!loginIdentifier.includes('@')) {
        const { data, error } = await supabase.rpc('get_email_by_username', {
          p_username: loginIdentifier,
        });

        if (error || !data) {
          toast({
            title: 'Benutzer nicht gefunden',
            description: 'Dieser Benutzername existiert nicht.',
            variant: 'destructive',
          });
          setLoading(false);
          return;
        }
        resolvedEmail = data as string;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: resolvedEmail,
        password,
        ...(typeof tokenToUse === 'string' ? { options: { captchaToken: tokenToUse } } : {}),
      });

      if (error) throw error;
      onAuthSuccess();
    } catch (error: any) {
      if (isCaptchaEnabled) resetCaptcha();
      toast({
        title: "Fehler",
        description: translateError(error.message),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Kein `overflow-hidden` und kein `items-center` auf dem aeusseren Container:
  // beides verhindert, dass die Seite scrollt, sobald der Inhalt hoeher ist als
  // der sichtbare Bereich (z. B. wenn die Tastatur aufgeht). Stattdessen
  // `flex-col` + `my-auto` am Inhalt: zentriert bei genug Platz, scrollt sauber,
  // sobald es eng wird.
  //
  // Bis 30.09.2026 pulsierten hier drei verschwommene Farbkreise im
  // Hintergrund, dazu Funkel-Symbole und „Dein persönlicher Lern-Assistent" —
  // der typische KI-Baukasten-Look. Der erste Bildschirm der App soll ruhig
  // sein und sagen, worum es geht.
  // Seit 04.10.2026 im Gestaltungsbild der Startseite (Schulheft: Karo, Tinte,
  // Plus Jakarta Sans) und mit einem sichtbaren Weg zurueck zur Startseite.
  // Ab 1024 px links ein Band mit Claim, Fakten und echtem App-Bildschirm.
  return (
    <div className="lp min-h-screen lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <aside className="lp-band lp-karo relative hidden overflow-hidden lg:flex lg:flex-col lg:justify-between lg:px-12 lg:py-10 xl:px-16">
        <Link to="/start" className="flex items-center gap-2.5" aria-label="LernZeit – zur Startseite">
          <span className="grid h-9 w-9 place-items-center rounded-[11px] bg-gradient-to-br from-primary to-secondary">
            <BookOpen className="h-5 w-5 text-white" strokeWidth={2.25} />
          </span>
          <span className="text-[1.25rem] font-extrabold tracking-[-0.02em] text-white">LernZeit</span>
        </Link>
        <div className="py-10">
          <h1 className="text-[2.5rem] font-extrabold xl:text-[3rem]">
            Lernen belohnen<span className="-ml-[0.05em]">.</span>
            <br />
            Handyzeit verdienen<span className="-ml-[0.05em]">.</span>
          </h1>
          <ul className="mt-8 space-y-2.5 text-[1rem]">
            {['Klasse 1 bis 10, nach Lehrplan', '4 Wochen alle Funktionen kostenlos', 'Keine Zahlungsdaten nötig', 'Server in der EU'].map((t) => (
              <li key={t} className="flex items-center gap-3">
                <Check className="h-4 w-4 shrink-0 text-[var(--lp-gruen-hell)]" strokeWidth={3} />
                {t}
              </li>
            ))}
          </ul>
        </div>
        <div className="relative -mb-24 ml-auto mr-4 w-max xl:mr-10">
          <Handy bild="/landing/demo-aufgaben.webp" alt="" className="text-[1.9px] xl:text-[2.15px]" />
          <Randnotiz drehung={-5} className="absolute -left-48 top-10 w-[11rem] text-[1.25rem] !text-white" pfeil="rechts-unten">
            +30 Sek. für jede richtige Aufgabe
          </Randnotiz>
        </div>
      </aside>

      {/* Kein `overflow-hidden` und kein `items-center` am Container: sonst
          scrollt die Seite nicht, wenn die Tastatur aufgeht. `my-auto` am
          Inhalt zentriert bei genug Platz. */}
      <div className="flex min-h-screen flex-col px-4 pb-safe-bottom pt-safe-top sm:px-8">
        <div className="flex h-16 shrink-0 items-center justify-between">
          <Link
            to="/start"
            className="-ml-2 inline-flex h-11 items-center gap-1 rounded-full pl-1 pr-4 text-[0.9375rem] font-bold text-[var(--lp-tinte)] transition-colors hover:bg-[var(--lp-heft)]"
          >
            <ChevronLeft className="h-5 w-5" strokeWidth={2.5} />
            Zur Startseite
          </Link>
          <Link to="/start" className="flex items-center gap-2 lg:hidden" aria-label="LernZeit – zur Startseite">
            <span className="grid h-8 w-8 place-items-center rounded-[10px] bg-gradient-to-br from-primary to-secondary">
              <BookOpen className="h-[18px] w-[18px] text-white" strokeWidth={2.25} />
            </span>
            <span className="text-[1.0625rem] font-extrabold tracking-[-0.02em] text-[var(--lp-tinte)]">LernZeit</span>
          </Link>
        </div>

      <div className="relative z-10 mx-auto my-auto w-full max-w-md py-6">
        <div className="mb-7 lg:hidden">
          <h1 className="text-[2rem] font-extrabold">
            Lernen belohnen<span className="-ml-[0.05em]">.</span>
            <br />
            Handyzeit verdienen<span className="-ml-[0.05em]">.</span>
          </h1>
          <p className="mt-3 text-[1rem] text-[var(--lp-leise)]">4 Wochen alle Funktionen kostenlos, keine Zahlungsdaten nötig.</p>
        </div>

        <Card className="rounded-[28px] border-[var(--lp-karo)] shadow-[0_30px_70px_-40px_rgba(26,43,109,0.35)]">
          <CardContent className="p-5 sm:p-8">
            <Tabs defaultValue={startReiter} className="w-full" onValueChange={messung.tabGewechselt}>
              <TabsList className="mb-7 grid h-12 w-full grid-cols-2 rounded-full bg-[var(--lp-heft)] p-1">
                <TabsTrigger value="signup" className={TAB}>Registrieren</TabsTrigger>
                <TabsTrigger value="signin" className={TAB}>Anmelden</TabsTrigger>
              </TabsList>

              {/* Shared Turnstile CAPTCHA widget */}
              {isCaptchaEnabled && (
                <>
                  <div id="turnstile-container" className="flex justify-center mb-2 min-h-[1px]"></div>
                  {captchaStatus === 'loading' && (
                    <p className="text-xs text-muted-foreground text-center mb-3">Sicherheitsprüfung wird geladen…</p>
                  )}
                  {captchaStatus === 'error' && (
                    <p className="text-xs text-destructive text-center mb-3">
                      {captchaErrorCode === '110200'
                        ? `Domain "${window.location.hostname}" ist für Turnstile nicht freigegeben.`
                        : captchaErrorCode === 'init_failed'
                          ? 'Turnstile konnte nicht initialisiert werden (Skript blockiert oder Netzwerkproblem).'
                          : captchaErrorCode
                            ? `CAPTCHA-Fehler (${captchaErrorCode}).`
                            : 'CAPTCHA konnte nicht geladen werden.'}
                    </p>
                  )}
                </>
              )}
              
              <TabsContent value="signin" className="space-y-5 animate-fade-in">
                <div className="text-center mb-4">
                  <h3 className="text-xl font-extrabold">Willkommen zurück!</h3>
                  <p className="text-sm text-muted-foreground">Schön, dass du wieder da bist.</p>
                </div>

                {/* Social sign-in (fast path) — shown above the manual form */}
                <div className="space-y-3">
                  {googleGesperrt ? (
                    <GoogleImAppBrowserHinweis />
                  ) : (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-12 rounded-full border-[1.5px] border-[var(--lp-karo-dunkel)] text-base font-bold text-[var(--lp-tinte)] hover:bg-[var(--lp-heft)]"
                    onClick={handleGoogleSignIn}
                    disabled={loading}
                  >
                    <GoogleIcon />
                    <span className="ml-2">Mit Google anmelden</span>
                  </Button>
                  )}
                  <Button
                    type="button"
                    className="w-full h-12 rounded-full bg-black text-base font-bold text-white hover:bg-black/85"
                    onClick={handleAppleSignIn}
                    disabled={loading}
                  >
                    <AppleIcon />
                    <span className="ml-2">Mit Apple anmelden</span>
                  </Button>
                </div>

                {/* Divider */}
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-[var(--lp-karo)]"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="bg-card px-3 text-[var(--lp-leise)]">oder mit E-Mail</span>
                  </div>
                </div>

                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-identifier" className="text-sm font-medium">E-Mail oder Benutzername</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="login-identifier"
                        type="text"
                        value={loginIdentifier}
                        onChange={(e) => setLoginIdentifier(e.target.value)}
                        required
                        placeholder="E-Mail oder Benutzername"
                        className="pl-10 h-12 rounded-xl border-[1.5px] border-[var(--lp-karo-dunkel)] bg-white text-base focus-visible:border-[var(--lp-blau)] focus-visible:ring-2 focus-visible:ring-[var(--lp-blau)]/20 focus-visible:ring-offset-0"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-sm font-medium">Passwort</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        placeholder="••••••••"
                        className="pl-10 h-12 rounded-xl border-[1.5px] border-[var(--lp-karo-dunkel)] bg-white text-base focus-visible:border-[var(--lp-blau)] focus-visible:ring-2 focus-visible:ring-[var(--lp-blau)]/20 focus-visible:ring-offset-0"
                      />
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    className={ABSENDEN} 
                    disabled={loading}
                  >
                    {loading ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        Wird angemeldet...
                      </div>
                    ) : (
                      'Anmelden'
                    )}
                  </Button>
                </form>

                {/* Forgot password */}
                {showForgotPassword ? (
                  <div className="mt-4 p-4 rounded-xl border bg-muted/30 space-y-3 animate-fade-in">
                    {resetSent ? (
                      <p className="text-sm text-center text-muted-foreground">
                        ✅ Link gesendet! Prüfe dein E-Mail-Postfach.
                      </p>
                    ) : (
                      <form onSubmit={handleForgotPassword} className="space-y-3">
                        <p className="text-sm text-muted-foreground">Gib deine E-Mail ein und wir senden dir einen Link zum Zurücksetzen.</p>
                        <Input
                          type="email"
                          value={resetEmail}
                          onChange={(e) => setResetEmail(e.target.value)}
                          placeholder="deine-email@beispiel.de"
                          required
                          className="h-10"
                        />
                        <div className="flex gap-2">
                          <Button type="button" variant="ghost" size="sm" onClick={() => setShowForgotPassword(false)}>
                            Abbrechen
                          </Button>
                          <Button type="submit" size="sm" disabled={loading} className="flex-1">
                            {loading ? 'Wird gesendet...' : 'Link senden'}
                          </Button>
                        </div>
                        <div className="mt-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                          <p className="text-xs text-amber-800 dark:text-amber-200">
                            <strong>📝 Benutzername-Konto?</strong> Wenn du dich mit einem Benutzernamen (ohne E-Mail) anmeldest, kann dein Passwort nur von deinen Eltern zurückgesetzt werden. Bitte deine Eltern, das Passwort im Eltern-Dashboard zu ändern.
                          </p>
                        </div>
                      </form>
                    )}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => { setShowForgotPassword(true); setResetEmail(loginIdentifier.includes('@') ? loginIdentifier : ''); }}
                    className="mt-2 text-sm text-primary hover:underline w-full text-center"
                  >
                    Passwort vergessen?
                  </button>
                )}
              </TabsContent>
              
              <TabsContent value="signup" className="space-y-5 animate-fade-in">
                {role === null ? (
                  <div className="space-y-4 animate-fade-in">
                    <div className="text-center mb-2">
                      <h3 className="text-xl font-extrabold">Wer legt hier ein Konto an?</h3>
                      <p className="text-sm text-muted-foreground">
                        Bitte wähle aus – danach zeigen wir dir die passenden Felder.
                      </p>
                    </div>
                    <div role="radiogroup" aria-label="Rolle auswählen" className="space-y-3">
                      <button
                        type="button"
                        role="radio"
                        aria-checked={role === 'parent'}
                        onClick={() => { setRole('parent'); setChildNoEmail(false); messung.schritt('rolle_gewaehlt', { rolle: 'parent' }); }}
                        className={`w-full flex items-center gap-4 p-5 border-2 rounded-2xl text-left transition-all duration-200 ${
                          role === 'parent'
                            ? 'border-[var(--lp-blau)] bg-[var(--lp-heft)]'
                            : 'border-[var(--lp-karo)] hover:border-[var(--lp-karo-dunkel)] hover:bg-[var(--lp-heft)]'
                        }`}
                      >
                        <div className="w-12 h-12 shrink-0 bg-blue-600 rounded-full flex items-center justify-center">
                          <Shield className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1">
                          <div className="font-bold text-base text-[var(--lp-tinte)]">Ich bin Elternteil</div>
                          <div className="text-sm text-muted-foreground">
                            Du verbindest dein Kind und gibst Bildschirmzeit frei.
                          </div>
                        </div>
                      </button>
                      <button
                        type="button"
                        role="radio"
                        aria-checked={role === 'child'}
                        onClick={() => { setRole('child'); messung.schritt('rolle_gewaehlt', { rolle: 'child' }); }}
                        className={`w-full flex items-center gap-4 p-5 border-2 rounded-2xl text-left transition-all duration-200 ${
                          role === 'child'
                            ? 'border-[var(--lp-blau)] bg-[var(--lp-heft)]'
                            : 'border-[var(--lp-karo)] hover:border-[var(--lp-karo-dunkel)] hover:bg-[var(--lp-heft)]'
                        }`}
                      >
                        <div className="w-12 h-12 shrink-0 bg-emerald-600 rounded-full flex items-center justify-center">
                          <Heart className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1">
                          <div className="font-bold text-base text-[var(--lp-tinte)]">Ich bin ein Kind</div>
                          <div className="text-sm text-muted-foreground">
                            Du löst Aufgaben und verdienst Bildschirmzeit. Deine Eltern brauchen ein eigenes Konto.
                          </div>
                        </div>
                      </button>
                    </div>
                  </div>
                ) : (
                <>
                <div className="text-center mb-4">
                  <h3 className="text-xl font-extrabold">Konto erstellen</h3>
                  <p className="text-sm text-muted-foreground">
                    {role === 'parent'
                      ? 'Eltern-Konto – 4 Wochen alle Funktionen kostenlos'
                      : 'Kinder-Konto – lernen und Bildschirmzeit verdienen'}
                  </p>
                  <button
                    type="button"
                    onClick={() => setRole(null)}
                    className="mt-2 text-xs text-primary hover:underline"
                  >
                    Rolle ändern
                  </button>
                </div>

                {/* Tipp für Kinder: Eltern legen zuerst ihr Konto an */}
                {role === 'child' && (
                  <p className="text-sm text-muted-foreground text-center" role="note">
                    Tipp: Am besten legen zuerst deine Eltern ihr Konto an und erstellen einen Code für dich.
                  </p>
                )}

                {/* Social sign-up (fast path) — shown above the manual form */}
                <div className="space-y-3">
                  {googleGesperrt ? (
                    <GoogleImAppBrowserHinweis />
                  ) : (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-12 rounded-full border-[1.5px] border-[var(--lp-karo-dunkel)] text-base font-bold text-[var(--lp-tinte)] hover:bg-[var(--lp-heft)]"
                    onClick={() => { messung.schritt('oauth', { anbieter: 'google' }); void handleGoogleSignIn(); }}
                    disabled={loading}
                  >
                    <GoogleIcon />
                    <span className="ml-2">Mit Google registrieren</span>
                  </Button>
                  )}
                  <Button
                    type="button"
                    className="w-full h-12 rounded-full bg-black text-base font-bold text-white hover:bg-black/85"
                    onClick={() => { messung.schritt('oauth', { anbieter: 'apple' }); void handleAppleSignIn(); }}
                    disabled={loading}
                  >
                    <AppleIcon />
                    <span className="ml-2">Mit Apple registrieren</span>
                  </Button>
                  <p className="text-xs text-center text-muted-foreground">
                    Rolle, Klassenstufe und Empfehlungs-Code werden im nächsten Schritt abgefragt.
                  </p>
                </div>

                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-[var(--lp-karo)]"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="bg-card px-3 text-[var(--lp-leise)]">oder mit E-Mail</span>
                  </div>
                </div>

                <form
                  onSubmit={handleSignUp}
                  onFocusCapture={() => messung.schritt('eingabe_begonnen')}
                  onInvalidCapture={messung.browserFehler}
                  className="space-y-4"
                >
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-sm font-medium">Name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required={!childNoEmail || !username}
                        placeholder="Dein Name"
                        className="pl-10 h-12 rounded-xl border-[1.5px] border-[var(--lp-karo-dunkel)] bg-white text-base focus-visible:border-[var(--lp-blau)] focus-visible:ring-2 focus-visible:ring-[var(--lp-blau)]/20 focus-visible:ring-offset-0"
                      />
                    </div>
                  </div>
                  
                  {role === 'child' && (
                    <div className="space-y-2 animate-fade-in">
                      <Label htmlFor="grade" className="text-sm font-medium">Klassenstufe</Label>
                      <div className="relative">
                        <GraduationCap className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                        <select 
                          value={grade}
                          onChange={(e) => setGrade(Number(e.target.value))}
                          className="w-full pl-10 h-12 rounded-xl border-[1.5px] border-[var(--lp-karo-dunkel)] bg-white text-base focus:border-[var(--lp-blau)] focus:outline-none focus:ring-2 focus:ring-[var(--lp-blau)]/20 appearance-none cursor-pointer"
                        >
                          {Array.from({ length: 10 }, (_, i) => i + 1).map(g => (
                            <option key={g} value={g}>Klasse {g}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}

                  {/* Toggle: with or without email for children */}
                  {role === 'child' && (
                    <div className="animate-fade-in">
                      <button
                        type="button"
                        onClick={() => setChildNoEmail(!childNoEmail)}
                        className="w-full text-sm text-primary hover:underline flex items-center justify-center gap-2 py-2"
                      >
                        <KeyRound className="w-4 h-4" />
                        {childNoEmail ? 'Mit E-Mail registrieren' : 'Ohne E-Mail registrieren (nur Benutzername)'}
                      </button>
                    </div>
                  )}

                  {/* Email-less child registration fields */}
                  {role === 'child' && childNoEmail ? (
                    <div className="space-y-4 animate-fade-in">
                      <div className="space-y-2">
                        <Label htmlFor="username" className="text-sm font-medium">Benutzername</Label>
                        <div className="relative">
                          <User className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                          <Input
                            id="username"
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 20))}
                            required
                            placeholder="z.B. max2015"
                            className="pl-10 h-12 rounded-xl border-[1.5px] border-[var(--lp-karo-dunkel)] bg-white text-base focus-visible:border-[var(--lp-blau)] focus-visible:ring-2 focus-visible:ring-[var(--lp-blau)]/20 focus-visible:ring-offset-0"
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">3–20 Zeichen, Buchstaben, Zahlen und _</p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="invitation-code" className="text-sm font-medium">
                          Einladungscode der Eltern <span className="text-muted-foreground font-normal">(optional)</span>
                        </Label>
                        <div className="relative">
                          <KeyRound className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                          <Input
                            id="invitation-code"
                            type="text"
                            value={invitationCode}
                            onChange={(e) => setInvitationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            placeholder="6-stelliger Code"
                            maxLength={6}
                            className="pl-10 h-12 rounded-xl border-[1.5px] border-[var(--lp-karo-dunkel)] bg-white text-base focus-visible:border-[var(--lp-blau)] focus-visible:ring-2 focus-visible:ring-[var(--lp-blau)]/20 focus-visible:ring-offset-0 text-center text-lg tracking-widest font-mono"
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Hast du einen Einladungscode von deinen Eltern? Dann trag ihn hier ein.
                          Ohne Code kannst du trotzdem loslegen und dich später verbinden.
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="password-signup-nomail" className="text-sm font-medium">Passwort</Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                          <Input
                            id="password-signup-nomail"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            placeholder="••••••••"
                            minLength={6}
                            className="pl-10 h-12 rounded-xl border-[1.5px] border-[var(--lp-karo-dunkel)] bg-white text-base focus-visible:border-[var(--lp-blau)] focus-visible:ring-2 focus-visible:ring-[var(--lp-blau)]/20 focus-visible:ring-offset-0"
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">Mindestens 6 Zeichen</p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="email-signup" className="text-sm font-medium">E-Mail</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                          <Input
                            id="email-signup"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            placeholder="deine-email@beispiel.de"
                            className="pl-10 h-12 rounded-xl border-[1.5px] border-[var(--lp-karo-dunkel)] bg-white text-base focus-visible:border-[var(--lp-blau)] focus-visible:ring-2 focus-visible:ring-[var(--lp-blau)]/20 focus-visible:ring-offset-0"
                          />
                        </div>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          Du erhältst eine Bestätigungs-E-Mail
                        </p>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="password-signup" className="text-sm font-medium">Passwort</Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                          <Input
                            id="password-signup"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            placeholder="••••••••"
                            minLength={6}
                            className="pl-10 h-12 rounded-xl border-[1.5px] border-[var(--lp-karo-dunkel)] bg-white text-base focus-visible:border-[var(--lp-blau)] focus-visible:ring-2 focus-visible:ring-[var(--lp-blau)]/20 focus-visible:ring-offset-0"
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">Mindestens 6 Zeichen</p>
                      </div>

                      {role === 'parent' && (
                        <div className="space-y-2 animate-fade-in">
                          <Label htmlFor="tester-code" className="text-sm font-medium">
                            Empfehlungs-Code <span className="text-muted-foreground font-normal">(optional)</span>
                          </Label>
                          <div className="relative">
                            <Gift className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                            <Input
                              id="tester-code"
                              type="text"
                              value={testerCode}
                              onChange={(e) => setTesterCode(e.target.value.replace(/[^a-zA-Z0-9]/g, '').slice(0, 20))}
                              placeholder="z. B. ABC123"
                              aria-invalid={testerCode.trim().length > 0 && !validateReferralCode(testerCode).valid}
                              aria-describedby="tester-code-hint"
                              className={`pl-10 h-12 rounded-xl border-[1.5px] border-[var(--lp-karo-dunkel)] bg-white text-base focus-visible:border-[var(--lp-blau)] focus-visible:ring-2 focus-visible:ring-[var(--lp-blau)]/20 focus-visible:ring-offset-0 uppercase tracking-wider ${
                                testerCode.trim().length > 0 && !validateReferralCode(testerCode).valid
                                  ? 'border-destructive focus:border-destructive'
                                  : ''
                              }`}
                            />
                          </div>
                          {(() => {
                            const check = validateReferralCode(testerCode);
                            if (testerCode.trim().length > 0 && !check.valid) {
                              return (
                                <p id="tester-code-hint" className="text-xs text-destructive" role="alert">
                                  {check.message} {REFERRAL_CODE_HINT}
                                </p>
                              );
                            }
                            return (
                              <p id="tester-code-hint" className="text-xs text-muted-foreground">
                                Wurdest du von jemandem eingeladen? Trage den Code hier ein und erhalte 2 Monate Premium statt 1.
                              </p>
                            );
                          })()}
                        </div>
                      )}

                      {referralCode && role === 'parent' && (
                        <div className="rounded-lg border-2 border-[#22d3ee]/40 bg-[#22d3ee]/10 px-4 py-3 animate-fade-in">
                          <p className="text-sm font-medium text-foreground">
                            🎉 Du wurdest eingeladen!
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Code <span className="font-mono font-semibold text-[#22d3ee]">{referralCode}</span> erkannt — du startest mit <strong>2 Monaten Premium</strong> statt 1.
                          </p>
                        </div>
                      )}
                    </>
                  )}
                  
                  <Button 
                    type="submit" 
                    className={ABSENDEN} 
                    disabled={loading}
                  >
                    {loading ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        Wird erstellt...
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <UserPlus className="w-4 h-4" />
                        Konto erstellen
                      </div>
                    )}
                  </Button>
                </form>
                </>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <p className="mt-6 flex items-center justify-center gap-2 text-center text-sm text-[var(--lp-leise)]">
          <Lock className="h-3.5 w-3.5 shrink-0" />
          Server in der EU, Übertragung verschlüsselt
        </p>
      </div>
      </div>
    </div>
  );
}
