import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Shield, Heart, GraduationCap, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

interface GoogleRoleSelectionProps {
  userId: string;
  onComplete: (role: string, grade?: number) => void;
}

export function GoogleRoleSelection({ userId, onComplete }: GoogleRoleSelectionProps) {
  const [role, setRole] = useState<'parent' | 'child'>('child');
  const [grade, setGrade] = useState<number>(1);
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
    <div className="min-h-screen bg-gradient-bg flex items-center justify-center p-4">
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
