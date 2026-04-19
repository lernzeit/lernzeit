import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Lock, Loader2, Eye, EyeOff, Check } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

interface ChildPasswordResetProps {
  childId: string;
  childName: string;
}

export function ChildPasswordReset({ childId, childName }: ChildPasswordResetProps) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const { toast } = useToast();

  const handleReset = async () => {
    if (newPassword.length < 6) {
      toast({
        title: "Fehler",
        description: "Das Passwort muss mindestens 6 Zeichen lang sein.",
        variant: "destructive",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Fehler",
        description: "Die Passwörter stimmen nicht überein.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('reset-child-password', {
        body: { child_id: childId, new_password: newPassword },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setSuccess(true);
      setNewPassword('');
      setConfirmPassword('');
      toast({
        title: "Passwort geändert",
        description: `Das Passwort von ${childName} wurde erfolgreich zurückgesetzt.`,
      });

      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      toast({
        title: "Fehler",
        description: err.message || "Passwort konnte nicht zurückgesetzt werden.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pt-2 border-t">
      <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
        <Lock className="h-4 w-4 text-primary" />
        Passwort zurücksetzen
      </h3>
      <p className="text-xs text-muted-foreground mb-3">
        {childName} hat ein Benutzername-Konto ohne E-Mail. Du kannst das Passwort hier neu setzen.
      </p>
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor={`pw-${childId}`} className="text-xs">Neues Passwort</Label>
          <div className="relative">
            <Input
              id={`pw-${childId}`}
              type={showPassword ? "text" : "password"}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Neues Passwort"
              className="pr-10"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`pw-confirm-${childId}`} className="text-xs">Passwort bestätigen</Label>
          <Input
            id={`pw-confirm-${childId}`}
            type={showPassword ? "text" : "password"}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Passwort bestätigen"
          />
        </div>
        <Button
          onClick={handleReset}
          disabled={loading || !newPassword || !confirmPassword}
          size="sm"
          className="w-full"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Wird geändert...
            </>
          ) : success ? (
            <>
              <Check className="h-4 w-4 mr-2" />
              Passwort geändert!
            </>
          ) : (
            <>
              <Lock className="h-4 w-4 mr-2" />
              Passwort zurücksetzen
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
