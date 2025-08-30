import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';

export function VisualTemplateCleanup() {
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const runCleanup = async () => {
    setLoading(true);
    try {
      console.log('🧹 Starting visual template cleanup...');
      
      // Call validation function to remove visual templates
      const { data, error } = await supabase.functions.invoke('validate-templates');
      
      if (error) {
        throw new Error(`Template cleanup failed: ${error.message}`);
      }
      
      setResults(data);
      
    } catch (error) {
      console.error('❌ Visual template cleanup failed:', error);
      setResults({ 
        success: false, 
        error: error.message 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <CardTitle>🧹 Visual Template Cleanup</CardTitle>
        <p className="text-muted-foreground">
          Remove all templates requiring visual/drawing interactions
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-4 bg-amber-50 border border-amber-200 rounded">
          <h3 className="font-semibold text-amber-800">⚠️ UI Limitation</h3>
          <p className="text-amber-700">Die aktuelle UI unterstützt keine Zeichen- oder visuellen Aufgaben</p>
          <p className="text-amber-700">Alle Vorlagen mit visuellen Elementen müssen entfernt werden</p>
        </div>

        <Button 
          onClick={runCleanup} 
          disabled={loading}
          className="w-full"
          size="lg"
        >
          {loading ? '🔄 Bereinige Vorlagen...' : '🧹 Visuelle Vorlagen entfernen'}
        </Button>
        
        {results && (
          <div className="space-y-4">
            {results.error ? (
              <div className="p-4 bg-destructive/10 border border-destructive rounded">
                <h3 className="font-semibold text-destructive">❌ Bereinigung fehlgeschlagen</h3>
                <p className="text-sm">{results.error}</p>
              </div>
            ) : (
              <>
                <div className={`p-4 border rounded ${results.success ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
                  <h3 className={`font-bold ${results.success ? 'text-green-800' : 'text-amber-800'}`}>
                    {results.success ? '✅ Bereinigung erfolgreich!' : '⚠️ Bereinigung unvollständig'}
                  </h3>
                  <p className={results.success ? 'text-green-700' : 'text-amber-700'}>
                    {results.message}
                  </p>
                </div>

                <div className="p-4 border rounded">
                  <h3 className="font-semibold">📊 Bereinigungsstatistik</h3>
                  <div className="grid grid-cols-2 gap-4 mt-2">
                    <div className="text-center p-3 border rounded">
                      <div className="font-bold text-2xl text-green-600">{results.total_active_templates}</div>
                      <div className="text-sm">Aktive Vorlagen</div>
                    </div>
                    <div className="text-center p-3 border rounded">
                      <div className="font-bold text-2xl text-red-600">{results.visual_templates_removed}</div>
                      <div className="text-sm">Entfernte visuelle Vorlagen</div>
                    </div>
                  </div>
                  
                  {results.remaining_visual_templates > 0 && (
                    <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded">
                      <div className="font-semibold text-amber-800">
                        ⚠️ {results.remaining_visual_templates} visuelle Vorlagen noch vorhanden
                      </div>
                      <div className="text-sm text-amber-700">
                        Weitere Bereinigung möglicherweise erforderlich
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-4 bg-blue-50 border border-blue-200 rounded">
                  <h3 className="font-semibold">🔍 Validierte Schlüsselwörter</h3>
                  <div className="text-sm mt-2">
                    <p className="text-blue-700">Entfernte alle Vorlagen mit:</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {results.validation_keywords?.map((keyword: string) => (
                        <span key={keyword} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                          {keyword}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}