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

    // Check Gemini API via ai-question-generator
    try {
      const startTime = Date.now();
      const { error } = await supabase.functions.invoke('ai-question-generator', {
        body: { grade: 1, subject: 'math', difficulty: 'easy', test: true }
      });
      const responseTime = Date.now() - startTime;

      statuses.push({
        name: 'Gemini API (KI-Fragen)',
        status: error ? 'error' : 'online',
        responseTime,
        lastChecked: new Date(),
        error: error?.message
      });
    } catch (err: any) {
      statuses.push({
        name: 'Gemini API (KI-Fragen)',
        status: 'offline',
        lastChecked: new Date(),
        error: err.message
      });
    }

    // Check Supabase Database via ai_question_cache
    try {
      const startTime = Date.now();
      const { error } = await supabase.from('ai_question_cache').select('id').limit(1);
      const responseTime = Date.now() - startTime;

      statuses.push({
        name: 'Supabase Datenbank',
        status: error ? 'error' : 'online',
        responseTime,
        lastChecked: new Date(),
        error: error?.message
      });
    } catch (err: any) {
      statuses.push({
        name: 'Supabase Datenbank',
        status: 'offline',
        lastChecked: new Date(),
        error: err.message
      });
    }

    // Check Cache growth (last cached question)
    try {
      const { data } = await supabase
        .from('ai_question_cache')
        .select('created_at')
        .order('created_at', { ascending: false })
        .limit(1);

      const lastCreated = data?.[0]?.created_at;
      const hoursSinceLast = lastCreated
        ? (Date.now() - new Date(lastCreated).getTime()) / 1000 / 60 / 60
        : 999;

      statuses.push({
        name: 'Fragen-Cache',
        status: hoursSinceLast < 24 ? 'online' : hoursSinceLast < 72 ? 'error' : 'offline',
        lastChecked: new Date(),
        error: hoursSinceLast > 24 ? `Letzte gecachte Frage vor ${Math.round(hoursSinceLast)}h` : undefined
      });
    } catch (err: any) {
      statuses.push({
        name: 'Fragen-Cache',
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
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0">
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
          {allOnline ? <Wifi className="w-4 h-4 sm:w-5 sm:h-5" /> : <WifiOff className="w-4 h-4 sm:w-5 sm:h-5" />}
          API Status
        </CardTitle>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={checkAllApis} 
          disabled={isChecking}
          className="w-full sm:w-auto"
        >
          <RefreshCw className={`w-3 h-3 sm:w-4 sm:h-4 mr-2 ${isChecking ? 'animate-spin' : ''}`} />
          Prüfen
        </Button>
      </CardHeader>
      <CardContent className="space-y-3 sm:space-y-4">
        {apiStatuses.map((api) => (
          <div key={api.name} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 p-3 border rounded-lg">
            <div className="flex items-start sm:items-center gap-3 flex-1 min-w-0">
              <div className="flex-shrink-0">
                {getStatusIcon(api.status)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm sm:text-base truncate">{api.name}</div>
                <div className="text-xs sm:text-sm text-muted-foreground break-words">
                  Geprüft: {api.lastChecked.toLocaleTimeString('de-DE')}
                  {api.responseTime && api.status === 'online' && ` • ${api.responseTime}ms`}
                </div>
                {api.error && (
                  <div className="text-xs text-red-600 mt-1 break-words">{api.error}</div>
                )}
              </div>
            </div>
            <div className="flex-shrink-0 self-end sm:self-auto">
              {getStatusBadge(api.status)}
            </div>
          </div>
        ))}

        {!allOnline && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-xs sm:text-sm">
              Einige APIs sind nicht verfügbar. Überprüfe die Konfiguration und Edge Function Logs.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};
