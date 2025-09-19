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
          <div className="text-sm text-muted-foreground">
            Hier können Sie Bildschirmzeit-Anfragen Ihrer Kinder verwalten. 
            Wenn Sie eine Anfrage genehmigen, müssen Sie die Bildschirmzeit 
            manuell in den Geräteeinstellungen freigeben.
          </div>
          
          <ScreenTimeRequestWidget userId={userId} role="parent" />
          
          <div className="bg-blue-50 p-4 rounded-lg space-y-2">
            <h4 className="font-semibold text-blue-900">So geben Sie Bildschirmzeit frei:</h4>
            <div className="text-sm text-blue-800 space-y-1">
              <div><strong>📱 iPhone/iPad:</strong> Einstellungen → Bildschirmzeit → [Kind] → App-Limits</div>
              <div><strong>🤖 Android:</strong> Family Link App → [Kind] → Gerätezeit → Heute mehr Zeit</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}