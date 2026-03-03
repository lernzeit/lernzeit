import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { translateError } from '@/utils/errorMessages';
import { Lock, BookOpen, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    // Listen for PASSWORD_RECOVERY event
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecovery(true);
      }
    });

    // Also check hash for type=recovery
    const hash = window.location.hash;
    if (hash.includes('type=recovery')) {
      setIsRecovery(true);
    }

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast({ title: 'Fehler', description: 'Die Passwörter stimmen nicht überein.', variant: 'destructive' });
      return;
    }
    if (password.length < 6) {
      toast({ title: 'Fehler', description: 'Das Passwort muss mindestens 6 Zeichen lang sein.', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setSuccess(true);
      toast({ title: 'Passwort geändert!', description: 'Du wirst gleich weitergeleitet.' });
      setTimeout(() => navigate('/'), 2000);
    } catch (error: any) {
      toast({ title: 'Fehler', description: translateError(error.message), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  if (!isRecovery && !success) {
    return (
      <div className="min-h-screen bg-gradient-bg flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-card">
          <CardContent className="p-8 text-center">
            <BookOpen className="w-12 h-12 text-primary mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Ungültiger Link</h2>
            <p className="text-muted-foreground mb-4">
              Dieser Link ist abgelaufen oder ungültig. Bitte fordere einen neuen Passwort-Reset-Link an.
            </p>
            <Button onClick={() => navigate('/')}>Zur Startseite</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-bg flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-card">
          <CardContent className="p-8 text-center">
            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Passwort geändert!</h2>
            <p className="text-muted-foreground">Du wirst jetzt weitergeleitet...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-primary to-secondary rounded-2xl mb-3 shadow-lg">
            <Lock className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold">Neues Passwort</h1>
          <p className="text-muted-foreground text-sm">Wähle ein neues Passwort für dein Konto</p>
        </div>
        <Card className="shadow-card">
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">Neues Passwort</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder="••••••••"
                  className="h-12"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Passwort bestätigen</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder="••••••••"
                  className="h-12"
                />
              </div>
              <Button type="submit" className="w-full h-12" disabled={loading}>
                {loading ? 'Wird gespeichert...' : 'Passwort ändern'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
