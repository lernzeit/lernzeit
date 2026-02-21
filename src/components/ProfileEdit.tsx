import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Palette, User, Save } from 'lucide-react';
import { AvatarSelector } from './AvatarSelector';
import { getAvatarById } from '@/data/avatars';

interface ProfileEditProps {
  user: any;
  profile: any;
  onBack: () => void;
  onUpdate: (updatedProfile: any) => void;
}

export function ProfileEdit({ user, profile, onBack, onUpdate }: ProfileEditProps) {
  const [name, setName] = useState(profile?.name || '');
  const [saving, setSaving] = useState(false);
  const [showAvatarSelector, setShowAvatarSelector] = useState(false);
  const { toast } = useToast();

  // Get current avatar info from profile
  const currentAvatar = getAvatarById(profile?.avatar_id || 'cat');
  const currentAvatarColor = profile?.avatar_color || '#3b82f6';

  const handleAvatarChange = async (avatarId: string, color: string) => {
    try {
      setSaving(true);

      const { error } = await supabase
        .from('profiles')
        .update({ 
          avatar_id: avatarId,
          avatar_color: color
        })
        .eq('id', user.id);

      if (error) throw error;

      onUpdate({ 
        ...profile, 
        avatar_id: avatarId,
        avatar_color: color
      });
      
      toast({
        title: "Erfolgreich",
        description: "Dein Avatar wurde aktualisiert! ✨",
      });

    } catch (error: any) {
      console.error('Error updating avatar:', error);
      toast({
        title: "Fehler",
        description: "Der Avatar konnte nicht aktualisiert werden.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      const { error } = await supabase
        .from('profiles')
        .update({ name: name.trim() })
        .eq('id', user.id);

      if (error) throw error;

      onUpdate({ ...profile, name: name.trim() });
      
      toast({
        title: "Erfolgreich",
        description: "Profil wurde gespeichert!",
      });

      onBack();
    } catch (error: any) {
      console.error('Error saving profile:', error);
      toast({
        title: "Fehler",
        description: "Das Profil konnte nicht gespeichert werden.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-bg py-4">
      <div className="page-container space-y-6">
        {/* Header */}
        <Card className="shadow-card">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={onBack}>
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <CardTitle>Profil bearbeiten</CardTitle>
            </div>
          </CardHeader>
        </Card>

        {/* Avatar Selection */}
        <Card className="shadow-card">
          <CardContent className="p-6 text-center">
            <div className="space-y-4">
              <div className="relative inline-block">
                <Avatar 
                  className="w-24 h-24 mx-auto" 
                  style={{ backgroundColor: currentAvatarColor }}
                >
                  <AvatarFallback className="text-3xl bg-transparent text-white">
                    {currentAvatar?.emoji || '😊'}
                  </AvatarFallback>
                </Avatar>
                
                <button 
                  onClick={() => setShowAvatarSelector(true)}
                  className="absolute -bottom-2 -right-2 w-8 h-8 bg-primary rounded-full flex items-center justify-center cursor-pointer hover:bg-primary/90 transition-colors"
                >
                  <Palette className="w-4 h-4 text-white" />
                </button>
              </div>
              
              <div className="space-y-2">
                <p className="font-medium">{currentAvatar?.name || 'Dein Avatar'}</p>
                <p className="text-sm text-muted-foreground">
                  Klicke auf das Palette-Symbol um deinen Avatar zu ändern
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Name Edit */}
        <Card className="shadow-card">
          <CardContent className="p-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Dein Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Wie sollen dich alle nennen?"
                  className="mt-2"
                />
              </div>
              
              <Button 
                onClick={handleSave}
                disabled={saving || !name.trim() || (name.trim() === profile?.name)}
                className="w-full"
              >
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Speichert...' : 'Speichern'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Avatar Selector Dialog */}
        <Dialog open={showAvatarSelector} onOpenChange={setShowAvatarSelector}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-center text-xl">
                ✨ Wähle deinen Avatar
              </DialogTitle>
            </DialogHeader>
            <AvatarSelector
              selectedAvatarId={profile?.avatar_id || 'cat'}
              selectedColor={currentAvatarColor}
              onAvatarChange={handleAvatarChange}
              onClose={() => setShowAvatarSelector(false)}
            />
          </DialogContent>
        </Dialog>

      </div>
    </div>
  );
}