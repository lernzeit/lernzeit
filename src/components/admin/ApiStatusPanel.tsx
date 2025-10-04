import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, XCircle, AlertTriangle, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface ApiStatus {
  name: string;
  status: 'online' | 'offline' | 'error';
  responseTime?: number;
  lastChecked: Date;
  error?: string;
}

export const ApiStatusPanel = () => {
  const [apiStatuses, setApiStatuses] = useState<ApiStatus[]>([]);
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    checkAllApis();
  }, []);

  const checkAllApis = async () => {
    setIsChecking(true);
    const statuses: ApiStatus[] = [];

    // Check Gemini API via direct-template-generator
    try {
      const startTime = Date.now();
      const { error } = await supabase.functions.invoke('direct-template-generator', {
        body: { grade: 1, domain: 'Zahlen & Operationen', count: 1, test: true }
      });
      const responseTime = Date.now() - startTime;

      statuses.push({
        name: 'Gemini API (Template Generator)',
        status: error ? 'error' : 'online',
        responseTime,
        lastChecked: new Date(),
        error: error?.message
      });
    } catch (err: any) {
      statuses.push({
        name: 'Gemini API (Template Generator)',
        status: 'offline',
        lastChecked: new Date(),
        error: err.message
      });
    }

    // Check Supabase Database
    try {
      const startTime = Date.now();
      const { error } = await supabase.from('templates').select('id').limit(1);
      const responseTime = Date.now() - startTime;

      statuses.push({
        name: 'Supabase Database',
        status: error ? 'error' : 'online',
        responseTime,
        lastChecked: new Date(),
        error: error?.message
      });
    } catch (err: any) {
      statuses.push({
        name: 'Supabase Database',
        status: 'offline',
        lastChecked: new Date(),
        error: err.message
      });
    }

    // Check Cron Job (last template creation)
    try {
      const { data, error } = await supabase
        .from('templates')
        .select('created_at')
        .order('created_at', { ascending: false })
        .limit(1);

      const lastCreated = data?.[0]?.created_at;
      const hoursSinceLastCreation = lastCreated 
        ? (Date.now() - new Date(lastCreated).getTime()) / 1000 / 60 / 60
        : 999;

      statuses.push({
        name: 'Hourly Cron Job',
        status: hoursSinceLastCreation < 2 ? 'online' : hoursSinceLastCreation < 6 ? 'error' : 'offline',
        lastChecked: new Date(),
        responseTime: Math.round(hoursSinceLastCreation * 60),
        error: hoursSinceLastCreation > 2 ? `Letztes Template vor ${Math.round(hoursSinceLastCreation)}h erstellt` : undefined
      });
    } catch (err: any) {
      statuses.push({
        name: 'Hourly Cron Job',
        status: 'offline',
        lastChecked: new Date(),
        error: err.message
      });
    }

    setApiStatuses(statuses);
    setIsChecking(false);
  };

  const getStatusIcon = (status: ApiStatus['status']) => {
    switch (status) {
      case 'online':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'error':
        return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      case 'offline':
        return <XCircle className="w-5 h-5 text-red-600" />;
    }
  };

  const getStatusBadge = (status: ApiStatus['status']) => {
    switch (status) {
      case 'online':
        return <Badge className="bg-green-100 text-green-800">Online</Badge>;
      case 'error':
        return <Badge className="bg-yellow-100 text-yellow-800">Warnung</Badge>;
      case 'offline':
        return <Badge variant="destructive">Offline</Badge>;
    }
  };

  const allOnline = apiStatuses.every(api => api.status === 'online');

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          {allOnline ? <Wifi className="w-5 h-5" /> : <WifiOff className="w-5 h-5" />}
          API Status
        </CardTitle>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={checkAllApis} 
          disabled={isChecking}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isChecking ? 'animate-spin' : ''}`} />
          Prüfen
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {apiStatuses.map((api) => (
          <div key={api.name} className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center gap-3">
              {getStatusIcon(api.status)}
              <div>
                <div className="font-medium">{api.name}</div>
                <div className="text-sm text-muted-foreground">
                  Geprüft: {api.lastChecked.toLocaleTimeString('de-DE')}
                  {api.responseTime && api.status === 'online' && ` • ${api.responseTime}ms`}
                </div>
                {api.error && (
                  <div className="text-xs text-red-600 mt-1">{api.error}</div>
                )}
              </div>
            </div>
            {getStatusBadge(api.status)}
          </div>
        ))}

        {!allOnline && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Einige APIs sind nicht verfügbar. Überprüfe die Konfiguration und Edge Function Logs.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};
