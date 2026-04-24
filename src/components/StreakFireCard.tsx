import { useEffect, useState } from 'react';
import { Flame, Sprout } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { StreakStatus } from '@/hooks/useStreak';

interface StreakFireCardProps {
  streak: number;
  status: StreakStatus;
  inactiveDays: number;
  loading?: boolean;
  reactivationTrigger?: number;
  onStartRecovery: () => void;
}

export function StreakFireCard({ streak, status, inactiveDays, loading, reactivationTrigger = 0, onStartRecovery }: StreakFireCardProps) {
  const [open, setOpen] = useState(false);
  const [reactivating, setReactivating] = useState(false);
  const isRecoverable = inactiveDays > 0 && inactiveDays <= 2 && streak > 0;
  const icon = status === 'frozen' ? '🪵' : status === 'dim' ? '🔥' : '🔥';
  const title = status === 'frozen' ? 'Feuer ist aus' : status === 'dim' ? 'Flamme wird kleiner' : 'Feuer brennt!';
  const subtitle = loading ? 'Wird geladen...' : `${streak} ${streak === 1 ? 'Tag' : 'Tage'} gespeichert`;

  useEffect(() => {
    if (reactivationTrigger <= 0) return;
    setReactivating(true);
    const timer = window.setTimeout(() => setReactivating(false), 1800);
    return () => window.clearTimeout(timer);
  }, [reactivationTrigger]);

  return (
    <>
      <Card className="shadow-card cursor-pointer transition-transform hover:scale-[1.02] bg-card border-border overflow-hidden" onClick={() => setOpen(true)}>
        <CardContent className="p-4 text-center">
          <div className="relative mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-accent/15">
            {reactivating && <span className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />}
            {reactivating && <span className="absolute -top-2 -right-2 text-sm animate-bounce">✨</span>}
            {reactivating && <span className="absolute -bottom-2 -left-2 text-sm animate-bounce">🔥</span>}
            <span className={reactivating ? 'relative text-4xl animate-scale-in-bounce' : status === 'dim' ? 'relative text-2xl opacity-70' : 'relative text-3xl'}>{reactivating ? '🔥' : icon}</span>
          </div>
          <div className="text-2xl font-bold text-foreground">{loading ? '…' : streak}</div>
          <div className="text-xs text-muted-foreground mt-1">{reactivating ? 'Feuer entfacht!' : title}</div>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {status === 'frozen' ? <Sprout className="h-5 w-5 text-accent" /> : <Flame className="h-5 w-5 text-accent" />}
              {title}
            </DialogTitle>
            <DialogDescription>{subtitle}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 text-sm text-muted-foreground">
            {isRecoverable ? (
              <p>Löse 3 Aufgaben richtig, um dein Lernfeuer wieder zu entfachen. Diese Streak-Session gibt keine Bildschirmzeit-Minuten.</p>
            ) : inactiveDays >= 3 ? (
              <p>Das Feuer ist zu lange aus. Starte eine normale Lernsession, um einen neuen Streak zu beginnen.</p>
            ) : (
              <p>Lerne jeden Tag, damit dein Feuer weiter lodert und dein Streak wächst.</p>
            )}
            {isRecoverable && (
              <Button className="w-full" onClick={() => { setOpen(false); onStartRecovery(); }}>
                Feuer entfachen
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}