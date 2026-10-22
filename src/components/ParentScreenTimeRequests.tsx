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
          {/* LernZeit-Handysperre für alle (22.10.2026): auf dem iPhone gibt LernZeit frei */}
          <p className="text-sm text-muted-foreground">
            Auf dem iPhone gibt LernZeit genehmigte Zeit selbst frei, auf Android gibst du sie in Family Link frei.
          </p>
          
          <ScreenTimeRequestWidget userId={userId} role="parent" />
        </div>
      </CardContent>
    </Card>
  );
}