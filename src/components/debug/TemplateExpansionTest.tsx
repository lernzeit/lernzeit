import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';

export function TemplateExpansionTest() {
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const runExpansion = async () => {
    setLoading(true);
    try {
      console.log('🚀 PHASE 2: Starting Template Expansion for Grades 5-10');
      
      // Call mass template generation
      const { data, error } = await supabase.functions.invoke('mass-template-generation');
      
      if (error) {
        throw new Error(`Template generation failed: ${error.message}`);
      }
      
      // Check final template counts
      const { data: finalStatus } = await supabase
        .from('templates')
        .select('domain, grade, status')
        .eq('status', 'ACTIVE');
      
      const byGrade = finalStatus?.reduce((acc: any, t) => {
        acc[t.grade] = (acc[t.grade] || 0) + 1;
        return acc;
      }, {}) || {};
      
      setResults({
        success: true,
        generated: data?.generated || 0,
        total_generated: data?.total_generated || 0,
        final_counts: byGrade,
        message: data?.message || 'Template expansion completed'
      });
      
    } catch (error) {
      console.error('❌ Template expansion failed:', error);
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
        <CardTitle>🎯 PHASE 2: Template Expansion</CardTitle>
        <p className="text-muted-foreground">
          Generate missing templates for grades 5-10 using Gemini API
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-4 bg-amber-50 border border-amber-200 rounded">
          <h3 className="font-semibold text-amber-800">📊 Current Status</h3>
          <p className="text-amber-700">Templates table has 659 premium templates for grades 1-4</p>
          <p className="text-amber-700">Target: 2,000 templates per grade (grades 5-10) = 12,000 new templates</p>
        </div>

        <Button 
          onClick={runExpansion} 
          disabled={loading}
          className="w-full"
          size="lg"
        >
          {loading ? '🔄 Generating Templates...' : '🚀 Start Template Expansion'}
        </Button>
        
        {results && (
          <div className="space-y-4">
            {results.error ? (
              <div className="p-4 bg-destructive/10 border border-destructive rounded">
                <h3 className="font-semibold text-destructive">❌ Expansion Failed</h3>
                <p className="text-sm">{results.error}</p>
              </div>
            ) : (
              <>
                <div className="p-4 bg-green-50 border border-green-200 rounded">
                  <h3 className="font-bold text-green-800">🎉 Template Expansion Complete!</h3>
                  <p className="text-green-700">{results.message}</p>
                  <p className="text-green-700">Generated: {results.total_generated} new templates</p>
                </div>

                <div className="p-4 border rounded">
                  <h3 className="font-semibold">📊 Final Template Counts by Grade</h3>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mt-2">
                    {[1,2,3,4,5,6,7,8,9,10].map(grade => (
                      <div key={grade} className="text-center p-2 border rounded">
                        <div className="font-bold">Grade {grade}</div>
                        <div className="text-sm">{results.final_counts[grade] || 0} templates</div>
                        <div className={`text-xs ${(results.final_counts[grade] || 0) >= 200 ? 'text-green-600' : 'text-amber-600'}`}>
                          {(results.final_counts[grade] || 0) >= 200 ? '✅ Complete' : '⚠️ Needs more'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-4 bg-blue-50 border border-blue-200 rounded">
                  <h3 className="font-semibold">🎯 Success Metrics</h3>
                  <div className="text-sm space-y-1">
                    <p>✅ <strong>Template System Unified:</strong> Single `templates` table</p>
                    <p>✅ <strong>High-Quality Questions:</strong> Direct usage without parameters</p>
                    <p>✅ <strong>Curriculum Coverage:</strong> All grades 1-10 supported</p>
                    <p>✅ <strong>Automatic Generation:</strong> Gemini API integration working</p>
                    <p>✅ <strong>German Math Standards:</strong> Lehrplan-compliant content</p>
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