import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link2, Clock } from 'lucide-react';

interface ChildLinkPromptCardProps {
  totalMinutes: number;
  onConnect: () => void;
}

/**
 * Ein Kind kann sich ohne Einladungscode registrieren und ueben. Ohne
 * Eltern-Verknuepfung kann es aber keine Bildschirmzeit beantragen — ohne
 * Erklaerung wirkt die App an dieser Stelle kaputt.
 */
export function ChildLinkPromptCard({ totalMinutes, onConnect }: ChildLinkPromptCardProps) {
  return (
    <Card className="shadow-card border-primary/30 bg-primary/5">
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          <div className="w-11 h-11 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
            <Clock className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-bold text-base">Du sammelst schon Zeit</p>
            <p className="text-sm text-muted-foreground mt-1">
              Du hast bisher {totalMinutes} Minuten erarbeitet. Damit du sie auch nutzen kannst,
              muss ein Elternteil dich freigeben. Deine Minuten bleiben so lange erhalten.
            </p>
            <Button size="sm" className="mt-3" onClick={onConnect}>
              <Link2 className="h-4 w-4 mr-2" />
              Mit Eltern verbinden
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}