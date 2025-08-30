import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, Zap, BarChart3, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface GenerationRequest {
  grade: number;
  domain: string;
  quarter: string;
  count?: number;
  difficulty?: string;
}

interface GenerationResult {
  success: boolean;
  generated_count: number;
  total_templates: number;
  message: string;
}

export const TemplateGenerator: React.FC = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [lastResult, setLastResult] = useState<GenerationResult | null>(null);
  const [formData, setFormData] = useState<GenerationRequest>({
    grade: 1,
    domain: 'Zahlen & Operationen',
    quarter: 'Q1',
    count: 50,
    difficulty: 'AFB I'
  });

  const domains = [
    'Zahlen & Operationen',
    'Raum & Form', 
    'Größen & Messen',
    'Daten & Zufall',
    'Gleichungen & Funktionen'
  ];

  const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];
  const difficulties = ['AFB I', 'AFB II', 'AFB III'];

  const handleGenerate = async () => {
    if (isGenerating) return;
    
    setIsGenerating(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('template-generator', {
        body: formData
      });

      if (error) {
        console.error('Generation error:', error);
        toast.error(`Fehler bei der Template-Generierung: ${error.message}`);
        return;
      }

      setLastResult(data as GenerationResult);
      
      if (data.success) {
        toast.success(`${data.generated_count} neue Templates erstellt! Gesamt: ${data.total_templates}`);
      } else {
        toast.error(data.message || 'Generation fehlgeschlagen');
      }
      
    } catch (error) {
      console.error('Unexpected error:', error);
      toast.error('Unerwarteter Fehler bei der Template-Generierung');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-primary" />
          Template Generator
        </CardTitle>
        <CardDescription>
          Generiere neue Aufgaben-Templates für das Curriculum mit KI
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Klasse</label>
            <Select 
              value={formData.grade.toString()} 
              onValueChange={(value) => setFormData(prev => ({...prev, grade: parseInt(value)}))}
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

          <div className="space-y-2">
            <label className="text-sm font-medium">Quartal</label>
            <Select 
              value={formData.quarter} 
              onValueChange={(value) => setFormData(prev => ({...prev, quarter: value}))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {quarters.map(quarter => (
                  <SelectItem key={quarter} value={quarter}>
                    {quarter}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Domäne</label>
          <Select 
            value={formData.domain} 
            onValueChange={(value) => setFormData(prev => ({...prev, domain: value}))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {domains.map(domain => (
                <SelectItem key={domain} value={domain}>
                  {domain}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Schwierigkeit</label>
            <Select 
              value={formData.difficulty} 
              onValueChange={(value) => setFormData(prev => ({...prev, difficulty: value}))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {difficulties.map(difficulty => (
                  <SelectItem key={difficulty} value={difficulty}>
                    {difficulty}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Anzahl</label>
            <Select 
              value={formData.count?.toString() || '50'} 
              onValueChange={(value) => setFormData(prev => ({...prev, count: parseInt(value)}))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="25">25 Templates</SelectItem>
                <SelectItem value="50">50 Templates</SelectItem>
                <SelectItem value="100">100 Templates</SelectItem>
                <SelectItem value="200">200 Templates</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button 
          onClick={handleGenerate} 
          disabled={isGenerating}
          className="w-full"
          size="lg"
        >
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Templates werden generiert...
            </>
          ) : (
            <>
              <Zap className="mr-2 h-4 w-4" />
              Templates generieren
            </>
          )}
        </Button>

        {lastResult && (
          <Card className={`border-2 ${lastResult.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                {lastResult.success ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <BarChart3 className="h-5 w-5 text-red-600" />
                )}
                <div className="flex-1">
                  <p className={`font-medium ${lastResult.success ? 'text-green-800' : 'text-red-800'}`}>
                    {lastResult.message}
                  </p>
                  {lastResult.success && (
                    <div className="flex gap-2 mt-2">
                      <Badge variant="outline" className="text-green-700 border-green-300">
                        {lastResult.generated_count} neu erstellt
                      </Badge>
                      <Badge variant="outline" className="text-blue-700 border-blue-300">
                        {lastResult.total_templates} gesamt
                      </Badge>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  );
};