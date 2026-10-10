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
          {/* Kurz und nur Apples Bildschirmzeit (10.10.2026): Die LernZeit-Sperre
              ist vorerst nur für freigeschaltete Testgeräte sichtbar. */}
          <p className="text-sm text-muted-foreground">
            Genehmigte Zeit gibst du in der Bildschirmzeit des Kindes frei: auf dem iPhone unter
            Einstellungen → Bildschirmzeit, auf Android in Family Link.
          </p>
          
          <ScreenTimeRequestWidget userId={userId} role="parent" />
        </div>
      </CardContent>
    </Card>
  );
}