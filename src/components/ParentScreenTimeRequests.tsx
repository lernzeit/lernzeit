import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScreenTimeRequestWidget } from './ScreenTimeRequestWidget';
import { Smartphone } from 'lucide-react';

interface ParentScreenTimeRequestsProps {
  userId: string;
}

export function ParentScreenTimeRequests({ userId }: ParentScreenTimeRequestsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smartphone className="h-5 w-5" />
          Bildschirmzeit-Verwaltung
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="text-sm text-muted-foreground space-y-3">
            <p>
              Hier verwaltest du die Bildschirmzeit-Anfragen deiner Kinder.
            </p>
            <p>
              <strong className="text-foreground">Die Gerätesperre richtest du auf dem
              Gerät deines Kindes ein</strong>, nicht hier: dort LernZeit öffnen →
              Einstellungen → Bildschirmzeit. Du weist dich dabei mit deinem
              Elternkonto aus.
            </p>
            <p>
              Das ist keine Umständlichkeit, sondern eine Vorgabe von Apple: Welche
              Apps gesperrt werden, lässt sich nur auf dem Gerät auswählen, auf dem
              sie liegen. Ohne eingerichtete Sperre gibst du die genehmigte Zeit wie
              bisher selbst in der iOS-Bildschirmzeit frei.
            </p>
          </div>
          
          <ScreenTimeRequestWidget userId={userId} role="parent" />
        </div>
      </CardContent>
    </Card>
  );
}