import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { translateError } from '@/utils/errorMessages';
import { Shield, Heart, Mail, Lock, User, GraduationCap, Sparkles, BookOpen, KeyRound } from 'lucide-react';
import { useTurnstile } from '@/hooks/useTurnstile';

// Google Icon SVG component
const GoogleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

interface AuthFormProps {
  onAuthSuccess: () => void;
}

export function AuthForm({ onAuthSuccess }: AuthFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'parent' | 'child'>('child');
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
  const { toast } = useToast();
  const navigate = useNavigate();
  const {
    status: captchaStatus,
    errorCode: captchaErrorCode,
    ensureToken,
    resetWidget: resetCaptcha,
    isEnabled: isCaptchaEnabled,
  } = useTurnstile('turnstile-container');

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

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`,
          queryParams: { access_type: 'offline', prompt: 'consent' },
        },
      });
      if (error) throw error;
    } catch (error: any) {
      toast({
        title: "Fehler bei Google-Anmeldung",
        description: translateError(error.message),
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
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .ilike('username', uname)
      .limit(1);
    if (error) return false;
    return !data || data.length === 0;
  };

  const generatePseudoEmail = (uname: string): string => {
    const random = Math.random().toString(36).substring(2, 6);
    return `${uname.toLowerCase()}_${random}@lernzeit.internal`;
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const tokenToUse = await resolveCaptchaToken();
      if (tokenToUse === null) { setLoading(false); return; }

      // Child without email registration
      if (role === 'child' && childNoEmail) {
        if (!validateUsername(username)) {
          toast({
            title: 'Ungültiger Benutzername',
            description: 'Der Benutzername muss 3–20 Zeichen lang sein und darf nur Buchstaben, Zahlen und _ enthalten.',
            variant: 'destructive',
          });
          setLoading(false);
          return;
        }

        if (!invitationCode || invitationCode.length !== 6) {
          toast({
            title: 'Einladungscode fehlt',
            description: 'Bitte gib den 6-stelligen Code deiner Eltern ein.',
            variant: 'destructive',
          });
          setLoading(false);
          return;
        }

        const isAvailable = await checkUsernameAvailability(username);
        if (!isAvailable) {
          toast({
            title: 'Benutzername vergeben',
            description: 'Dieser Benutzername ist bereits vergeben. Bitte wähle einen anderen.',
            variant: 'destructive',
          });
          setLoading(false);
          return;
        }

        const pseudoEmail = generatePseudoEmail(username);

        // Create child account via edge function (admin API, auto-confirmed)
        const { data: createData, error: createError } = await supabase.functions.invoke('confirm-child-account', {
          body: {
            email: pseudoEmail,
            password,
            name: name || username,
            role: 'child',
            grade,
            username: username.toLowerCase(),
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

        // Claim invitation code to link with parent
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

        toast({
          title: 'Willkommen! 🎉',
          description: `Dein Konto wurde erstellt. Merke dir deinen Benutzernamen: ${username.toLowerCase()}`,
        });

        onAuthSuccess();
        return;
      }

      // Standard email registration
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          ...(typeof tokenToUse === 'string' ? { captchaToken: tokenToUse } : {}),
          data: {
            name,
            role,
            grade: role === 'child' ? grade : null,
          },
          emailRedirectTo: `${window.location.origin}/`
        }
      });

      if (error) throw error;
      navigate(`/email-bestaetigung?email=${encodeURIComponent(email)}`);
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

  return (
    <div className="min-h-screen bg-gradient-bg flex items-center justify-center p-4 pt-safe-top pb-safe-bottom relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/20 rounded-full animate-pulse blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-secondary/20 rounded-full animate-pulse blur-3xl" style={{animationDelay: '1s'}}></div>
        <div className="absolute top-1/3 left-1/4 w-20 h-20 bg-accent/30 rounded-full animate-pulse blur-xl" style={{animationDelay: '2s'}}></div>
      </div>

      <div className="relative z-10 w-full max-w-md lg:max-w-lg">
        {/* Header with logo animation */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-primary to-secondary rounded-3xl mb-4 shadow-lg animate-scale-in">
            <BookOpen className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-2">
            LernZeit
          </h1>
          <p className="text-muted-foreground text-lg">
            Dein persönlicher Lern-Assistent
          </p>
          <div className="flex items-center justify-center gap-2 mt-2 text-sm text-muted-foreground">
            <Sparkles className="w-4 h-4 text-primary animate-pulse" />
            <span>Löse Aufgaben und verdiene Handyzeit</span>
            <Sparkles className="w-4 h-4 text-primary animate-pulse" />
          </div>
        </div>

        <Card className="shadow-card backdrop-blur-sm bg-card/95 border-0 animate-slide-up">
          <CardContent className="p-6">
            <Tabs defaultValue="signup" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6 bg-muted/50">
                <TabsTrigger value="signup" className="data-[state=active]:bg-background">Registrieren</TabsTrigger>
                <TabsTrigger value="signin" className="data-[state=active]:bg-background">Anmelden</TabsTrigger>
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
                  <h3 className="text-lg font-semibold">Willkommen zurück!</h3>
                  <p className="text-sm text-muted-foreground">Melde dich an und setze dein Lernabenteuer fort</p>
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
                        className="pl-10 h-12 border-2 focus:border-primary transition-colors"
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
                        className="pl-10 h-12 border-2 focus:border-primary transition-colors"
                      />
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full h-12 text-base font-medium bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105" 
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

                {/* Divider */}
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border"></div>
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">oder</span>
                  </div>
                </div>

                {/* Google Sign In */}
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-12 text-base font-medium border-2 hover:bg-muted/50 transition-all duration-200"
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                >
                  <GoogleIcon />
                  <span className="ml-2">Mit Google anmelden</span>
                </Button>
              </TabsContent>
              
              <TabsContent value="signup" className="space-y-5 animate-fade-in">
                <div className="text-center mb-4">
                  <h3 className="text-lg font-semibold">Konto erstellen</h3>
                  <p className="text-sm text-muted-foreground">
                    {role === 'parent'
                      ? 'Behalte den Lernfortschritt deiner Kinder im Blick'
                      : 'Starte dein Lernabenteuer und verdiene Handyzeit'}
                  </p>
                </div>
                
                <form onSubmit={handleSignUp} className="space-y-4">
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
                        className="pl-10 h-12 border-2 focus:border-primary transition-colors"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Ich bin ein...</Label>
                    <RadioGroup value={role} onValueChange={(value) => { setRole(value as 'parent' | 'child'); if (value === 'parent') setChildNoEmail(false); }}>
                      <div className="space-y-2">
                        <div className={`flex items-center space-x-3 p-4 border-2 rounded-xl cursor-pointer transition-all duration-200 hover:scale-105 ${role === 'child' ? 'border-primary bg-primary/5 shadow-md' : 'border-border hover:border-primary/50'}`}>
                          <RadioGroupItem value="child" id="child" className="border-2" />
                          <Label htmlFor="child" className="flex items-center gap-3 cursor-pointer flex-1">
                            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                              <Heart className="w-5 h-5 text-white" />
                            </div>
                            <div>
                              <div className="font-medium">Kind</div>
                              <div className="text-xs text-muted-foreground">Lerne und verdiene Handyzeit</div>
                            </div>
                          </Label>
                        </div>
                        <div className={`flex items-center space-x-3 p-4 border-2 rounded-xl cursor-pointer transition-all duration-200 hover:scale-105 ${role === 'parent' ? 'border-primary bg-primary/5 shadow-md' : 'border-border hover:border-primary/50'}`}>
                          <RadioGroupItem value="parent" id="parent" className="border-2" />
                          <Label htmlFor="parent" className="flex items-center gap-3 cursor-pointer flex-1">
                            <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-red-600 rounded-full flex items-center justify-center">
                              <Shield className="w-5 h-5 text-white" />
                            </div>
                            <div>
                              <div className="font-medium">Elternteil</div>
                              <div className="text-xs text-muted-foreground">Verwalte die Lernzeit deiner Kinder</div>
                            </div>
                          </Label>
                        </div>
                      </div>
                    </RadioGroup>
                  </div>

                  {role === 'child' && (
                    <div className="space-y-2 animate-fade-in">
                      <Label htmlFor="grade" className="text-sm font-medium">Klassenstufe</Label>
                      <div className="relative">
                        <GraduationCap className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                        <select 
                          value={grade}
                          onChange={(e) => setGrade(Number(e.target.value))}
                          className="w-full pl-10 h-12 border-2 rounded-lg bg-background focus:border-primary transition-colors appearance-none cursor-pointer"
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
                        {childNoEmail ? 'Mit E-Mail registrieren' : 'Ohne E-Mail registrieren (mit Eltern-Code)'}
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
                            className="pl-10 h-12 border-2 focus:border-primary transition-colors"
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">3–20 Zeichen, Buchstaben, Zahlen und _</p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="invitation-code" className="text-sm font-medium">Einladungscode der Eltern</Label>
                        <div className="relative">
                          <KeyRound className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                          <Input
                            id="invitation-code"
                            type="text"
                            value={invitationCode}
                            onChange={(e) => setInvitationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            required
                            placeholder="6-stelliger Code"
                            maxLength={6}
                            className="pl-10 h-12 border-2 focus:border-primary transition-colors text-center text-lg tracking-widest font-mono"
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">Frage deine Eltern nach dem Code</p>
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
                            className="pl-10 h-12 border-2 focus:border-primary transition-colors"
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
                            className="pl-10 h-12 border-2 focus:border-primary transition-colors"
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
                            className="pl-10 h-12 border-2 focus:border-primary transition-colors"
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">Mindestens 6 Zeichen</p>
                      </div>
                    </>
                  )}
                  
                  <Button 
                    type="submit" 
                    className="w-full h-12 text-base font-medium bg-gradient-to-r from-secondary to-secondary/90 hover:from-secondary/90 hover:to-secondary shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105" 
                    disabled={loading}
                  >
                    {loading ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        Wird erstellt...
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4" />
                        Konto erstellen
                      </div>
                    )}
                  </Button>
                </form>

                {/* Divider */}
                {!(role === 'child' && childNoEmail) && (
                  <>
                    <div className="relative my-6">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-border"></div>
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-card px-2 text-muted-foreground">oder</span>
                      </div>
                    </div>

                    {/* Google Sign Up */}
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full h-12 text-base font-medium border-2 hover:bg-muted/50 transition-all duration-200"
                      onClick={handleGoogleSignIn}
                      disabled={loading}
                    >
                      <GoogleIcon />
                      <span className="ml-2">Mit Google registrieren</span>
                    </Button>
                  </>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <div className="text-center mt-6 text-xs text-muted-foreground animate-fade-in">
          <p>🔒 Deine Daten sind sicher und werden verschlüsselt übertragen</p>
          <p className="mt-2 opacity-40">v1.0.9</p>
        </div>
      </div>
    </div>
  );
}
