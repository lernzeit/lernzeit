import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { openAIService, GenerationRequest, GenerationResult } from '@/services/openAIService';
import { supabase } from '@/lib/supabase';
import { 
  Settings, 
  Zap, 
  Database, 
  CheckCircle, 
  XCircle, 
  Loader2,
  RefreshCw,
  FileText,
  TrendingUp
} from 'lucide-react';

interface TemplateStats {
  total: number;
  active: number;
  recent: number;
  byGrade: Record<number, number>;
  byDomain: Record<string, number>;
}

export function AdminDashboard() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'connected' | 'error'>('unknown');
  const [templateStats, setTemplateStats] = useState<TemplateStats | null>(null);
  const [lastResult, setLastResult] = useState<GenerationResult | null>(null);
  const { toast } = useToast();

  // Generation form state
  const [formData, setFormData] = useState<GenerationRequest>({
    grade: 5,
    domain: 'Zahlen & Operationen',
    subcategory: 'Grundrechenarten',
    quarter: 'Q1',
    count: 5,
    difficulty: 'medium'
  });

  useEffect(() => {
    loadTemplateStats();
    testOpenAIConnection();
  }, []);

  const testOpenAIConnection = async () => {
    try {
      const result = await openAIService.testConnection();
      setConnectionStatus(result.success ? 'connected' : 'error');
      
      if (!result.success) {
        toast({
          title: "Verbindungsfehler",
          description: result.error,
          variant: "destructive",
        });
      }
    } catch (error) {
      setConnectionStatus('error');
    }
  };

  const loadTemplateStats = async () => {
    try {
      const { data: templates, error } = await supabase
        .from('templates')
        .select('grade, domain, created_at, status');

      if (error) throw error;

      if (templates) {
        const now = new Date();
        const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        const stats: TemplateStats = {
          total: templates.length,
          active: templates.filter(t => t.status === 'ACTIVE').length,
          recent: templates.filter(t => new Date(t.created_at) > last7Days).length,
          byGrade: {},
          byDomain: {}
        };

        templates.forEach(template => {
          // Grade stats
          stats.byGrade[template.grade] = (stats.byGrade[template.grade] || 0) + 1;
          
          // Domain stats
          stats.byDomain[template.domain] = (stats.byDomain[template.domain] || 0) + 1;
        });

        setTemplateStats(stats);
      }
    } catch (error) {
      console.error('Error loading template stats:', error);
    }
  };

  const handleGenerate = async () => {
    if (connectionStatus !== 'connected') {
      toast({
        title: "Keine Verbindung",
        description: "OpenAI-Verbindung nicht verfügbar",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    setLastResult(null);

    try {
      const result = await openAIService.generateTemplates(formData);
      setLastResult(result);

      if (result.success) {
        toast({
          title: "Templates erstellt!",
          description: `${result.saved_count} von ${result.generated_count} Templates gespeichert`,
        });
        // Reload stats
        loadTemplateStats();
      } else {
        toast({
          title: "Fehler bei Generierung",
          description: result.error,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Generierungsfehler",
        description: error instanceof Error ? error.message : 'Unbekannter Fehler',
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const domains = [
    'Zahlen & Operationen',
    'Raum & Form', 
    'Größen & Messen',
    'Daten & Zufall',
    'Gleichungen & Funktionen'
  ];

  const subcategories: Record<string, string[]> = {
    'Zahlen & Operationen': ['Grundrechenarten', 'Bruchrechnung', 'Dezimalzahlen', 'Prozentrechnung'],
    'Raum & Form': ['Geometrische Formen', 'Flächenberechnung', 'Volumenberechnung', 'Konstruktionen'],
    'Größen & Messen': ['Längen', 'Gewichte', 'Zeit', 'Geld'],
    'Daten & Zufall': ['Diagramme', 'Statistik', 'Wahrscheinlichkeit', 'Kombinatorik'],
    'Gleichungen & Funktionen': ['Terme', 'Gleichungen', 'Funktionen', 'Koordinatensystem']
  };

  return (
    <div className="min-h-screen bg-gradient-bg p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <Card className="shadow-card bg-gradient-to-r from-purple-500/10 to-blue-500/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-2xl">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
                <Settings className="w-6 h-6 text-white" />
              </div>
              Admin Panel - OpenAI Template Generator
            </CardTitle>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${
                  connectionStatus === 'connected' ? 'bg-green-500' : 
                  connectionStatus === 'error' ? 'bg-red-500' : 'bg-gray-400'
                }`}></div>
                <span className="text-sm">
                  OpenAI: {connectionStatus === 'connected' ? 'Verbunden' : 
                          connectionStatus === 'error' ? 'Fehler' : 'Unbekannt'}
                </span>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={testOpenAIConnection}
                disabled={connectionStatus === 'unknown'}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Test
              </Button>
            </div>
          </CardHeader>
        </Card>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Generation Form */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5" />
                Template Generierung
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Klassenstufe</Label>
                  <Select 
                    value={formData.grade.toString()} 
                    onValueChange={(value) => setFormData({...formData, grade: parseInt(value)})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({length: 10}, (_, i) => i + 1).map(grade => (
                        <SelectItem key={grade} value={grade.toString()}>
                          Klasse {grade}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Quartal</Label>
                  <Select 
                    value={formData.quarter} 
                    onValueChange={(value) => setFormData({...formData, quarter: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Q1">Q1</SelectItem>
                      <SelectItem value="Q2">Q2</SelectItem>
                      <SelectItem value="Q3">Q3</SelectItem>
                      <SelectItem value="Q4">Q4</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Domain</Label>
                <Select 
                  value={formData.domain} 
                  onValueChange={(value) => setFormData({
                    ...formData, 
                    domain: value,
                    subcategory: subcategories[value]?.[0] || ''
                  })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {domains.map(domain => (
                      <SelectItem key={domain} value={domain}>{domain}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Unterkategorie</Label>
                <Select 
                  value={formData.subcategory} 
                  onValueChange={(value) => setFormData({...formData, subcategory: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {subcategories[formData.domain]?.map(sub => (
                      <SelectItem key={sub} value={sub}>{sub}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Schwierigkeit</Label>
                  <Select 
                    value={formData.difficulty} 
                    onValueChange={(value) => setFormData({...formData, difficulty: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="easy">Leicht</SelectItem>
                      <SelectItem value="medium">Mittel</SelectItem>
                      <SelectItem value="hard">Schwer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Anzahl</Label>
                  <Input
                    type="number"
                    min="1"
                    max="20"
                    value={formData.count}
                    onChange={(e) => setFormData({...formData, count: parseInt(e.target.value) || 1})}
                  />
                </div>
              </div>

              <Button 
                onClick={handleGenerate}
                disabled={isGenerating || connectionStatus !== 'connected'}
                className="w-full h-12"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generiere Templates...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 mr-2" />
                    Templates generieren
                  </>
                )}
              </Button>

              {lastResult && (
                <div className={`p-4 rounded-lg ${
                  lastResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    {lastResult.success ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-600" />
                    )}
                    <span className="font-medium">
                      {lastResult.success ? 'Erfolgreich!' : 'Fehler'}
                    </span>
                  </div>
                  {lastResult.success ? (
                    <p className="text-sm text-green-700">
                      {lastResult.saved_count} von {lastResult.generated_count} Templates gespeichert
                    </p>
                  ) : (
                    <p className="text-sm text-red-700">{lastResult.error}</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Statistics */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Template Statistiken
              </CardTitle>
            </CardHeader>
            <CardContent>
              {templateStats ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">{templateStats.total}</div>
                      <div className="text-sm text-blue-700">Gesamt</div>
                    </div>
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">{templateStats.active}</div>
                      <div className="text-sm text-green-700">Aktiv</div>
                    </div>
                    <div className="text-center p-3 bg-purple-50 rounded-lg">
                      <div className="text-2xl font-bold text-purple-600">{templateStats.recent}</div>
                      <div className="text-sm text-purple-700">Diese Woche</div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">Nach Klassenstufe:</h4>
                    <div className="space-y-1">
                      {Object.entries(templateStats.byGrade)
                        .sort(([a], [b]) => parseInt(a) - parseInt(b))
                        .map(([grade, count]) => (
                        <div key={grade} className="flex justify-between items-center">
                          <span className="text-sm">Klasse {grade}</span>
                          <Badge variant="secondary">{count}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">Nach Domain:</h4>
                    <div className="space-y-1">
                      {Object.entries(templateStats.byDomain).map(([domain, count]) => (
                        <div key={domain} className="flex justify-between items-center">
                          <span className="text-sm">{domain}</span>
                          <Badge variant="secondary">{count}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                  <p className="text-muted-foreground">Lade Statistiken...</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}