import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { TemplateBankMaintenance } from '@/maintenance/templateBankMaintenance';

export function TemplateBankTest() {
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [grade, setGrade] = useState<number>(3);
  const [domain, setDomain] = useState<string>('Zahlen & Operationen');
  const [count, setCount] = useState<number>(8);
  const [maintenanceStats, setMaintenanceStats] = useState<any>(null);

  const domains = [
    'Zahlen & Operationen',
    'Größen & Messen', 
    'Raum & Form',
    'Gleichungen & Funktionen',
    'Daten & Zufall'
  ];

  const testSeedTemplates = async () => {
    setIsLoading(true);
    setResults(null);
    
    try {
      console.log(`🧪 Testing template seeding: Grade ${grade}, Domain: ${domain}, Count: ${count}`);
      
      const { data, error } = await supabase.functions.invoke('seed_templates', {
        body: { 
          grade, 
          domain, 
          n: count 
        }
      });

      if (error) {
        throw error;
      }

      setResults({
        success: true,
        data: data,
        timestamp: new Date().toLocaleString()
      });

      console.log('✅ Template seeding test completed:', data);

    } catch (error) {
      console.error('❌ Template seeding test failed:', error);
      setResults({
        success: false,
        error: error.message,
        timestamp: new Date().toLocaleString()
      });
    } finally {
      setIsLoading(false);
    }
  };

  const runMaintenance = async () => {
    setIsLoading(true);
    
    try {
      console.log('🔧 Running template bank maintenance...');
      
      const maintenanceResult = await TemplateBankMaintenance.runMaintenanceCycle();
      setMaintenanceStats(maintenanceResult);
      
      console.log('✅ Maintenance completed:', maintenanceResult);

    } catch (error) {
      console.error('❌ Maintenance failed:', error);
      setMaintenanceStats({
        error: error.message,
        timestamp: new Date().toLocaleString()
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getHealthScore = async () => {
    setIsLoading(true);
    
    try {
      const healthScore = await TemplateBankMaintenance.getHealthScore();
      setMaintenanceStats({
        ...maintenanceStats,
        healthScore,
        timestamp: new Date().toLocaleString()
      });
      
    } catch (error) {
      console.error('❌ Health score calculation failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>🏦 Template Bank Test & Maintenance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          
          {/* Template Generation Test */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Template Generation Test</h3>
            
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Klasse</label>
                <Select value={grade.toString()} onValueChange={(value) => setGrade(parseInt(value))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1,2,3,4,5,6,7,8,9,10].map(g => (
                      <SelectItem key={g} value={g.toString()}>Klasse {g}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Domäne</label>
                <Select value={domain} onValueChange={setDomain}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {domains.map(d => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Anzahl</label>
                <Select value={count.toString()} onValueChange={(value) => setCount(parseInt(value))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="4">4 Templates</SelectItem>
                    <SelectItem value="8">8 Templates</SelectItem>
                    <SelectItem value="12">12 Templates</SelectItem>
                    <SelectItem value="20">20 Templates</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-2">
              <Button 
                onClick={testSeedTemplates}
                disabled={isLoading}
              >
                {isLoading ? '⏳ Generating...' : '🚀 Generate Templates'}
              </Button>
              
              <Button 
                onClick={runMaintenance}
                disabled={isLoading}
                variant="outline"
              >
                {isLoading ? '⏳ Running...' : '🔧 Run Maintenance'}
              </Button>
              
              <Button 
                onClick={getHealthScore}
                disabled={isLoading}
                variant="outline"
              >
                {isLoading ? '⏳ Calculating...' : '📊 Health Score'}
              </Button>
            </div>
          </div>

          {/* Results Display */}
          {results && (
            <div className="space-y-2">
              <h4 className="font-medium">Generation Results:</h4>
              <div className="flex gap-2 mb-2">
                <Badge variant={results.success ? "default" : "destructive"}>
                  {results.success ? '✅ Success' : '❌ Error'}
                </Badge>
                <Badge variant="outline">{results.timestamp}</Badge>
              </div>
              
              <Textarea
                value={JSON.stringify(results, null, 2)}
                className="font-mono text-sm h-48"
                readOnly
              />
            </div>
          )}

          {/* Maintenance Results */}
          {maintenanceStats && (
            <div className="space-y-2">
              <h4 className="font-medium">Maintenance Results:</h4>
              
              {maintenanceStats.healthScore && (
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-primary">
                      {maintenanceStats.healthScore.score}
                    </div>
                    <div className="text-sm text-muted-foreground">Health Score</div>
                  </div>
                  
                  <div className="space-y-1">
                    {Object.entries(maintenanceStats.healthScore.factors).map(([key, factor]: [string, any]) => (
                      <div key={key} className="flex justify-between text-sm">
                        <span className="capitalize">{key}:</span>
                        <span className="font-medium">{Math.round(factor.score)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {maintenanceStats.stats && (
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold">{maintenanceStats.stats.active_templates}</div>
                    <div className="text-sm text-muted-foreground">Active Templates</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{maintenanceStats.stats.avg_quality_score.toFixed(1)}</div>
                    <div className="text-sm text-muted-foreground">Avg Quality</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{maintenanceStats.stats.low_coverage_areas.length}</div>
                    <div className="text-sm text-muted-foreground">Low Coverage Areas</div>
                  </div>
                </div>
              )}
              
              <Textarea
                value={JSON.stringify(maintenanceStats, null, 2)}
                className="font-mono text-sm h-64"
                readOnly
              />
            </div>
          )}

          {/* Quick Stats Display */}
          <div className="text-xs text-muted-foreground space-y-1 p-3 bg-secondary/20 rounded">
            <div><strong>Target:</strong> 60 Templates pro (Klasse × Domäne) = 3.000 Templates gesamt</div>
            <div><strong>Domains:</strong> Zahlen & Operationen, Größen & Messen, Raum & Form, Gleichungen & Funktionen, Daten & Zufall</div>
            <div><strong>Schwierigkeit:</strong> AFB I (50%), AFB II (35%), AFB III (15%)</div>
            <div><strong>Itemtypen:</strong> Multiple Choice (45%), Text-Input (35%), Matching (20%)</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}