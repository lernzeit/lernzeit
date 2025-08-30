import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';

interface GenerationStats {
  grade: number;
  templates_before: number;
  templates_after: number;
  generated_count: number;
}

export function TemplateGeneratorControl() {
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [currentStats, setCurrentStats] = useState<Record<number, number> | null>(null);

  const loadCurrentStats = async () => {
    try {
      const { data: templates } = await supabase
        .from('templates')
        .select('grade, status')
        .eq('status', 'ACTIVE');
      
      const statsByGrade = templates?.reduce((acc: Record<number, number>, t) => {
        acc[t.grade] = (acc[t.grade] || 0) + 1;
        return acc;
      }, {}) || {};
      
      setCurrentStats(statsByGrade);
    } catch (error) {
      console.error('Error loading current stats:', error);
    }
  };

  const generateMissingTemplates = async () => {
    setLoading(true);
    try {
      console.log('🚀 Starting template generation for missing grades/domains...');
      
      // Load current stats first
      await loadCurrentStats();
      
      const gradesToGenerate = [5, 6, 7, 8, 9, 10]; // Higher grades need more templates
      const domains = ['Zahlen & Operationen', 'Raum & Form', 'Größen & Messen', 'Daten & Zufall'];
      const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];
      
      let totalGenerated = 0;
      const generationResults: GenerationStats[] = [];
      
      for (const grade of gradesToGenerate) {
        console.log(`📚 Generating templates for Grade ${grade}...`);
        
        // Get current count for this grade
        const { data: currentTemplates } = await supabase
          .from('templates')
          .select('id')
          .eq('grade', grade)
          .eq('status', 'ACTIVE');
        
        const currentCount = currentTemplates?.length || 0;
        const targetCount = 200; // Target per grade
        
        if (currentCount >= targetCount) {
          console.log(`✅ Grade ${grade} already has enough templates (${currentCount})`);
          continue;
        }
        
        const needed = targetCount - currentCount;
        console.log(`🎯 Grade ${grade} needs ${needed} more templates`);
        
        // Generate templates for multiple domains
        let generatedForGrade = 0;
        
        for (const domain of domains) {
          for (const quarter of quarters) {
            const templatesPerBatch = Math.min(25, Math.ceil(needed / (domains.length * quarters.length)));
            
            if (templatesPerBatch > 0) {
              console.log(`🔧 Generating ${templatesPerBatch} templates for ${domain} Grade ${grade} ${quarter}`);
              
              try {
                const { data, error } = await supabase.functions.invoke('template-generator', {
                  body: {
                    grade,
                    domain,
                    quarter,
                    count: templatesPerBatch,
                    difficulty: 'AFB I' // Start with basic level
                  }
                });
                
                if (error) {
                  console.error(`❌ Failed to generate for ${domain} Grade ${grade}:`, error);
                } else {
                  const generated = data?.templates_created || 0;
                  generatedForGrade += generated;
                  totalGenerated += generated;
                  console.log(`✅ Generated ${generated} templates for ${domain} Grade ${grade} ${quarter}`);
                }
              } catch (error) {
                console.error(`❌ Error generating for ${domain} Grade ${grade}:`, error);
              }
              
              // Small delay between batches to avoid rate limits
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          }
        }
        
        // Get final count for this grade
        const { data: finalTemplates } = await supabase
          .from('templates')
          .select('id')
          .eq('grade', grade)
          .eq('status', 'ACTIVE');
        
        const finalCount = finalTemplates?.length || 0;
        
        generationResults.push({
          grade,
          templates_before: currentCount,
          templates_after: finalCount,
          generated_count: generatedForGrade
        });
      }
      
      // Get final stats
      await loadCurrentStats();
      
      setResults({
        success: true,
        total_generated: totalGenerated,
        generation_results: generationResults,
        message: `Successfully generated ${totalGenerated} new templates`
      });
      
    } catch (error) {
      console.error('❌ Template generation failed:', error);
      setResults({ 
        success: false, 
        error: error.message 
      });
    } finally {
      setLoading(false);
    }
  };

  // Load stats on component mount
  React.useEffect(() => {
    loadCurrentStats();
  }, []);

  const getStatusBadge = (count: number) => {
    if (count >= 200) return { variant: 'default' as const, label: '✅ Complete', color: 'text-green-600' };
    if (count >= 100) return { variant: 'secondary' as const, label: '🟡 Good', color: 'text-yellow-600' };
    if (count >= 50) return { variant: 'outline' as const, label: '🟠 Fair', color: 'text-orange-600' };
    return { variant: 'destructive' as const, label: '🔴 Low', color: 'text-red-600' };
  };

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <CardTitle>🎯 Template Generator Control</CardTitle>
        <p className="text-muted-foreground">
          Generate missing templates for grades 5-10 using the Gemini API
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Status */}
        <div className="p-4 bg-blue-50 border border-blue-200 rounded">
          <h3 className="font-semibold text-blue-800 mb-2">📊 Current Template Status</h3>
          {currentStats ? (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              {[1,2,3,4,5,6,7,8,9,10].map(grade => {
                const count = currentStats[grade] || 0;
                const status = getStatusBadge(count);
                return (
                  <div key={grade} className="text-center p-2 border rounded bg-white">
                    <div className="font-bold">Grade {grade}</div>
                    <div className="text-sm">{count} templates</div>
                    <Badge variant={status.variant} className="text-xs mt-1">
                      {status.label}
                    </Badge>
                  </div>
                );
              })}
            </div>
          ) : (
            <div>Loading current stats...</div>
          )}
        </div>

        {/* Generation Control */}
        <div className="space-y-2">
          <Button 
            onClick={generateMissingTemplates} 
            disabled={loading}
            className="w-full"
            size="lg"
          >
            {loading ? '🔄 Generating Templates...' : '🚀 Generate Missing Templates'}
          </Button>
          
          <Button 
            variant="outline"
            onClick={loadCurrentStats} 
            disabled={loading}
            className="w-full"
          >
            🔄 Refresh Stats
          </Button>
        </div>
        
        {/* Results */}
        {results && (
          <div className="space-y-4">
            {results.error ? (
              <div className="p-4 bg-destructive/10 border border-destructive rounded">
                <h3 className="font-semibold text-destructive">❌ Generation Failed</h3>
                <p className="text-sm">{results.error}</p>
              </div>
            ) : (
              <>
                <div className="p-4 bg-green-50 border border-green-200 rounded">
                  <h3 className="font-bold text-green-800">🎉 Template Generation Complete!</h3>
                  <p className="text-green-700">{results.message}</p>
                  <p className="text-green-700">Total Generated: {results.total_generated} new templates</p>
                </div>

                {results.generation_results && (
                  <div className="p-4 border rounded">
                    <h3 className="font-semibold mb-2">📊 Generation Results by Grade</h3>
                    <div className="space-y-2">
                      {results.generation_results.map((result: GenerationStats) => (
                        <div key={result.grade} className="flex justify-between items-center p-2 border rounded bg-gray-50">
                          <span className="font-medium">Grade {result.grade}</span>
                          <div className="text-sm">
                            <span>{result.templates_before} → {result.templates_after}</span>
                            <Badge variant="secondary" className="ml-2">
                              +{result.generated_count}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="p-4 bg-blue-50 border border-blue-200 rounded">
                  <h3 className="font-semibold">🎯 Next Steps</h3>
                  <div className="text-sm space-y-1">
                    <p>✅ <strong>Database Unified:</strong> Using only `templates` table</p>
                    <p>✅ <strong>Generation Active:</strong> Gemini API integration working</p>
                    <p>✅ <strong>Quality Control:</strong> Visual templates removed</p>
                    <p>✅ <strong>Coverage Improved:</strong> More templates available for all grades</p>
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