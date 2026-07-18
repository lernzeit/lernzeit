import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Shield, Heart, GraduationCap, Loader2, Sparkles } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { validateReferralCode, REFERRAL_CODE_HINT } from '@/utils/referralCode';

interface GoogleRoleSelectionProps {
  userId: string;
  onComplete: (role: string, grade?: number) => void;
}

export function GoogleRoleSelection({ userId, onComplete }: GoogleRoleSelectionProps) {
  const [role, setRole] = useState<'parent' | 'child'>('child');
  const [grade, setGrade] = useState<number>(1);
  const [referralCode, setReferralCode] = useState<string>(() => {
    try {
      const stored = localStorage.getItem('lernzeit_referral_code');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.code && parsed?.expires > Date.now()) return parsed.code as string;
      }
    } catch { /* ignore */ }
    return '';
  });
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const updateData: any = {
        role,
        ...(role === 'child' ? { grade } : { grade: null }),
      };

      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', userId);

      if (error) throw error;

      // Also update user metadata so it's consistent
      await supabase.auth.updateUser({
        data: { role, ...(role === 'child' ? { grade } : {}) },
      });

      // Link referral code (parents only): prefer manually entered code, fall back to stored
      if (role === 'parent') {
        const rawCode = (referralCode || '').trim();
        const check = rawCode ? validateReferralCode(rawCode) : null;
        if (check && !check.valid) {
          toast({
            title: 'Empfehlungs-Code ungültig',
            description: `${check.message} ${REFERRAL_CODE_HINT}`,
            variant: 'destructive',
          });
          setSaving(false);
          return;
        }
        const code = check?.valid ? check.normalized : '';
        try {
          if (code) {
            const { data, error: refErr } = await supabase.rpc('link_referral', { p_code: code });
            if (refErr) throw refErr;
            const res = data as any;
            if (res?.success) {
              toast({
                title: 'Empfehlungscode eingelöst 🎉',
                description: 'Du startest mit 2 Monaten Premium statt 1.',
              });
            } else if (res?.error && res.error !== 'no_code') {
              toast({
                title: 'Empfehlungscode nicht angewendet',
                description: 'Der Code konnte nicht eingelöst werden — du kannst ihn später in den Einstellungen erneut probieren.',
                variant: 'destructive',
              });
            }
          }
          localStorage.removeItem('lernzeit_referral_code');
        } catch (refErr) {
          console.warn('Referral link after OAuth failed:', refErr);
        }
      }

      localStorage.setItem(`lernzeit_role_confirmed_${userId}`, 'true');
      onComplete(role, role === 'child' ? grade : undefined);
    } catch (error: any) {
      toast({
        title: 'Fehler',
        description: 'Rolle konnte nicht gespeichert werden.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-bg flex items-center justify-center p-4 pt-safe-top pb-safe-bottom px-safe">
      <Card className="w-full max-w-md shadow-card">
        <CardContent className="p-6 space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold text-foreground">Willkommen bei LernZeit! 🎉</h2>
            <p className="text-muted-foreground">Bitte wähle deine Rolle, um fortzufahren.</p>
          </div>

          <RadioGroup
            value={role}
            onValueChange={(v) => setRole(v as 'parent' | 'child')}
            className="space-y-3"
          >
            <div
              className={`flex items-center space-x-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                role === 'child'
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/40'
              }`}
              onClick={() => setRole('child')}
            >
              <RadioGroupItem value="child" id="role-child" />
              <Label htmlFor="role-child" className="flex items-center gap-2 cursor-pointer flex-1">
                <Heart className="w-5 h-5 text-primary" />
                <div>
                  <p className="font-semibold">Kind / Schüler</p>
                  <p className="text-sm text-muted-foreground">Ich möchte lernen und Bildschirmzeit verdienen</p>
                </div>
              </Label>
            </div>

            <div
              className={`flex items-center space-x-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                role === 'parent'
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/40'
              }`}
              onClick={() => setRole('parent')}
            >
              <RadioGroupItem value="parent" id="role-parent" />
              <Label htmlFor="role-parent" className="flex items-center gap-2 cursor-pointer flex-1">
                <Shield className="w-5 h-5 text-primary" />
                <div>
                  <p className="font-semibold">Elternteil</p>
                  <p className="text-sm text-muted-foreground">Ich möchte das Lernen meines Kindes begleiten</p>
                </div>
              </Label>
            </div>
          </RadioGroup>

          {role === 'child' && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <GraduationCap className="w-4 h-4" />
                Klassenstufe
              </Label>
              <div className="grid grid-cols-5 gap-2">
                {Array.from({ length: 10 }, (_, i) => i + 1).map((g) => (
                  <Button
                    key={g}
                    type="button"
                    variant={grade === g ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setGrade(g)}
                    className="text-sm"
                  >
                    {g}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {role === 'parent' && (
            <div className="space-y-2">
              <Label htmlFor="referral-code-oauth" className="flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                Empfehlungs-Code <span className="text-muted-foreground font-normal text-xs">(optional)</span>
              </Label>
              {(() => {
                const check = validateReferralCode(referralCode);
                const showError = referralCode.trim().length > 0 && !check.valid;
                return (
                  <>
                    <Input
                      id="referral-code-oauth"
                      type="text"
                      value={referralCode}
                      onChange={(e) => setReferralCode(e.target.value.replace(/[^a-zA-Z0-9]/g, '').slice(0, 12).toUpperCase())}
                      placeholder="z. B. ABC123"
                      aria-invalid={showError}
                      aria-describedby="referral-code-oauth-hint"
                      className={`uppercase tracking-wider font-mono ${showError ? 'border-destructive focus:border-destructive' : ''}`}
                    />
                    {showError ? (
                      <p id="referral-code-oauth-hint" className="text-xs text-destructive" role="alert">
                        {check.message} {REFERRAL_CODE_HINT}
                      </p>
                    ) : (
                      <p id="referral-code-oauth-hint" className="text-xs text-muted-foreground">
                        Wurdest du von jemandem eingeladen? Trage den Code hier ein und erhalte <strong>2 Monate Premium</strong> statt 1.
                      </p>
                    )}
                  </>
                );
              })()}
            </div>
          )}

          <Button
            onClick={handleSubmit}
            disabled={saving}
            className="w-full"
            size="lg"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Speichern...
              </>
            ) : (
              'Weiter'
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
