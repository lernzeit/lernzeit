import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useFamilyLinking } from '@/hooks/useFamilyLinking';
import { UserPlus, Shield, CheckCircle } from 'lucide-react';
import { NotifyParentsButton } from '@/components/child/NotifyParentsButton';
import { trackFireAndForget } from '@/lib/analytics';

interface ChildLinkingProps {
  userId: string;
  onLinked?: () => void;
}

export function ChildLinking({ userId, onLinked }: ChildLinkingProps) {
  const [invitationCode, setInvitationCode] = useState('');
  const [isLinked, setIsLinked] = useState(false);
  const { loading, useInvitationCode } = useFamilyLinking();

  const handleSubmitCode = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (invitationCode.length !== 6) {
      console.log('❌ Code length invalid:', invitationCode.length);
      return;
    }

    console.log('🚀 Starting linking process with code:', invitationCode.toUpperCase(), 'userId:', userId);
    const success = await useInvitationCode(invitationCode.toUpperCase(), userId);
    console.log('✅ Linking result:', success);
    
    if (success) {
      trackFireAndForget('child_linked_later', {});
      setIsLinked(true);
      setInvitationCode('');
      onLinked?.();
    }
  };

  const formatCode = (value: string) => {
    // Remove non-alphanumeric characters and limit to 6 characters
    const cleaned = value.replace(/[^0-9]/g, '').slice(0, 6);
    return cleaned;
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formattedCode = formatCode(e.target.value);
    setInvitationCode(formattedCode);
  };

  if (isLinked) {
    return (
      <Card className="shadow-card">
        <CardContent className="p-8 text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Erfolgreich verknüpft!</h3>
          <p className="text-muted-foreground">
            Dein Konto ist jetzt mit einem Elternteil verbunden.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-card">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center gap-2">
          <UserPlus className="w-5 h-5" />
          Mit Eltern verknüpfen
        </CardTitle>
        <p className="text-muted-foreground text-sm">
          Gib den 6-stelligen Code ein, den deine Eltern erstellt haben
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <NotifyParentsButton className="w-full" />
          <p className="text-xs text-muted-foreground text-center">
            Keinen Code? Schick eine Nachricht an deine Eltern, damit sie einen erstellen.
          </p>
        </div>

        <div className="bg-primary/10 border border-primary/30 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <h4 className="font-medium mb-2">So geht's:</h4>
              <ol className="text-sm space-y-1 list-decimal list-inside">
                <li>Deine Eltern laden LernZeit und registrieren sich als Elternteil.</li>
                <li>Sie erstellen einen 6-stelligen Code.</li>
                <li>Du gibst den Code hier ein.</li>
              </ol>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmitCode} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="invitation-code">Einladungscode</Label>
            <Input
              id="invitation-code"
              type="text"
              value={invitationCode}
              onChange={handleCodeChange}
              placeholder="123456"
              className="text-center text-2xl font-mono tracking-widest"
              maxLength={6}
              required
              autoComplete="off"
            />
            <p className="text-xs text-muted-foreground text-center">
              Gib die 6 Ziffern ein, die deine Eltern dir gegeben haben
            </p>
          </div>

          <Button 
            type="submit" 
            className="w-full"
            disabled={loading || invitationCode.length !== 6}
            variant="default"
          >
            {loading ? (
              "Wird verknüpft..."
            ) : (
              <>
                <Shield className="w-4 h-4 mr-2" />
                Verknüpfen
              </>
            )}
          </Button>
        </form>

        <div className="text-center">
          <p className="text-xs text-muted-foreground">
            Die Verknüpfung ist sicher und kann jederzeit von den Eltern aufgehoben werden.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
