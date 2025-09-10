import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { TemplatePoolManager } from '@/services/TemplatePoolManager';
import { QualityAssurancePipeline } from '@/services/QualityAssurancePipeline';

interface GenerationProgress {
  phase: 'analyzing' | 'generating' | 'validating' | 'complete' | 'error';
  current: number;
  total: number;
  message: string;
  generatedTemplates: any[];
  errors: string[];
}

export const useSystematicTemplateGeneration = () => {
  const [progress, setProgress] = useState<GenerationProgress>({
    phase: 'analyzing',
    current: 0,
    total: 0,
    message: 'Ready to generate',
    generatedTemplates: [],
    errors: []
  });

  const [isGenerating, setIsGenerating] = useState(false);

  const generateForGrade = useCallback(async (
    grade: number, 
    options: {
      batchSize?: number;
      prioritizeGaps?: boolean;
      targetQuality?: number;
    } = {}
  ) => {
    const {
      batchSize = 50,
      prioritizeGaps = true,
      targetQuality = 0.8
    } = options;

    console.log(`🎯 Starting systematic generation for Grade ${grade}`);
    setIsGenerating(true);

    try {
      // Phase 1: Analyze current coverage
      setProgress(prev => ({
        ...prev,
        phase: 'analyzing',
        current: 0,
        total: 100,
        message: `Analyzing template coverage for Grade ${grade}...`,
        errors: []
      }));

      const coverage = await TemplatePoolManager.analyzeCoverage();
      const gradeGaps = coverage.gaps.filter(gap => gap.grade === grade);
      
      if (gradeGaps.length === 0) {
        setProgress(prev => ({
          ...prev,
          phase: 'complete',
          message: `Grade ${grade} already has complete template coverage!`,
          current: 100,
          total: 100
        }));
        return { success: true, message: 'Coverage complete', templatesGenerated: 0 };
      }

      // Phase 2: Generate templates systematically
      setProgress(prev => ({
        ...prev,
        phase: 'generating',
        current: 0,
        total: Math.min(gradeGaps.length, batchSize),
        message: `Generating ${Math.min(gradeGaps.length, batchSize)} templates...`
      }));

      const results = await supabase.functions.invoke('batch-generate-questions', {
        body: {
          grade,
          batchSize,
          prioritizeGaps,
          targetQuality
        }
      });

      if (results.error) {
        throw new Error(results.error.message || 'Generation failed');
      }

      const generationData = results.data;

      // Phase 3: Validate generated templates
      setProgress(prev => ({
        ...prev,
        phase: 'validating',
        current: 0,
        total: generationData.results.successful,
        message: 'Validating generated templates...'
      }));

      const templateIds = generationData.results.generated_templates.map((t: any) => t.id);
      const validationResults = await QualityAssurancePipeline.batchValidateTemplates(templateIds);

      // Update quality scores in database
      let validatedCount = 0;
      for (const [templateId, validation] of validationResults) {
        await QualityAssurancePipeline.updateTemplateQualityScore(templateId, validation.score);
        validatedCount++;
        
        setProgress(prev => ({
          ...prev,
          current: validatedCount,
          message: `Validated ${validatedCount}/${templateIds.length} templates`
        }));
      }

      // Phase 4: Complete
      setProgress(prev => ({
        ...prev,
        phase: 'complete',
        current: generationData.results.successful,
        total: generationData.results.successful,
        message: `Successfully generated ${generationData.results.successful} high-quality templates for Grade ${grade}`,
        generatedTemplates: generationData.results.generated_templates,
        errors: generationData.results.errors
      }));

      console.log(`✅ Systematic generation complete for Grade ${grade}: ${generationData.results.successful} templates`);

      return {
        success: true,
        message: `Generated ${generationData.results.successful} templates`,
        templatesGenerated: generationData.results.successful,
        errors: generationData.results.errors
      };

    } catch (error) {
      console.error('Systematic generation error:', error);
      
      setProgress(prev => ({
        ...prev,
        phase: 'error',
        message: `Generation failed: ${error.message}`,
        errors: [...prev.errors, error.message]
      }));

      return {
        success: false,
        message: `Generation failed: ${error.message}`,
        templatesGenerated: 0,
        errors: [error.message]
      };
    } finally {
      setIsGenerating(false);
    }
  }, []);

  const generateForAllGrades = useCallback(async (
    grades: number[] = [1, 2, 3, 4],
    options: {
      templatesPerGrade?: number;
      priorityOrder?: boolean;
    } = {}
  ) => {
    const {
      templatesPerGrade = 30,
      priorityOrder = true
    } = options;

    console.log(`🚀 Starting mass generation for grades: ${grades.join(', ')}`);
    setIsGenerating(true);

    try {
      // Sort grades by priority if requested
      const orderedGrades = priorityOrder ? 
        grades.sort((a, b) => {
          // Priority: 1-4 = HIGH, 5-6 = MEDIUM, 7-10 = LOW
          const aPriority = a <= 4 ? 0 : a <= 6 ? 1 : 2;
          const bPriority = b <= 4 ? 0 : b <= 6 ? 1 : 2;
          return aPriority - bPriority;
        }) : grades;

      const totalResults = {
        successful: 0,
        failed: 0,
        errors: [] as string[]
      };

      for (let i = 0; i < orderedGrades.length; i++) {
        const grade = orderedGrades[i];
        
        setProgress(prev => ({
          ...prev,
          phase: 'generating',
          current: i,
          total: orderedGrades.length,
          message: `Processing Grade ${grade} (${i + 1}/${orderedGrades.length})...`
        }));

        const gradeResult = await generateForGrade(grade, {
          batchSize: templatesPerGrade,
          prioritizeGaps: true,
          targetQuality: 0.7 // Slightly lower for mass generation
        });

        if (gradeResult.success) {
          totalResults.successful += gradeResult.templatesGenerated;
        } else {
          totalResults.failed++;
          totalResults.errors.push(`Grade ${grade}: ${gradeResult.message}`);
        }

        // Small delay between grades
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      setProgress(prev => ({
        ...prev,
        phase: 'complete',
        current: orderedGrades.length,
        total: orderedGrades.length,
        message: `Mass generation complete: ${totalResults.successful} templates generated across ${orderedGrades.length} grades`,
        errors: totalResults.errors
      }));

      return {
        success: totalResults.failed < orderedGrades.length / 2, // Success if < 50% failed
        message: `Generated ${totalResults.successful} templates across ${orderedGrades.length} grades`,
        templatesGenerated: totalResults.successful,
        errors: totalResults.errors
      };

    } catch (error) {
      console.error('Mass generation error:', error);
      
      setProgress(prev => ({
        ...prev,
        phase: 'error',
        message: `Mass generation failed: ${error.message}`,
        errors: [...prev.errors, error.message]
      }));

      return {
        success: false,
        message: `Mass generation failed: ${error.message}`,
        templatesGenerated: 0,
        errors: [error.message]
      };
    } finally {
      setIsGenerating(false);
    }
  }, [generateForGrade]);

  const fillCriticalGaps = useCallback(async () => {
    console.log('🔥 Filling critical template gaps...');
    setIsGenerating(true);

    try {
      setProgress(prev => ({
        ...prev,
        phase: 'analyzing',
        message: 'Identifying critical gaps...'
      }));

      const coverage = await TemplatePoolManager.analyzeCoverage();
      const criticalGaps = coverage.gaps
        .filter(gap => gap.priority === 'HIGH' && gap.current_count === 0)
        .slice(0, 20); // Limit to 20 most critical

      if (criticalGaps.length === 0) {
        setProgress(prev => ({
          ...prev,
          phase: 'complete',
          message: 'No critical gaps found!'
        }));
        return { success: true, message: 'No critical gaps', templatesGenerated: 0 };
      }

      setProgress(prev => ({
        ...prev,
        phase: 'generating',
        total: criticalGaps.length,
        message: `Filling ${criticalGaps.length} critical gaps...`
      }));

      const results = await supabase.functions.invoke('batch-generate-questions', {
        body: {
          batchSize: criticalGaps.length,
          prioritizeGaps: true,
          targetQuality: 0.9 // High quality for critical gaps
        }
      });

      if (results.error) throw new Error(results.error.message);

      setProgress(prev => ({
        ...prev,
        phase: 'complete',
        current: results.data.results.successful,
        total: criticalGaps.length,
        message: `Successfully filled ${results.data.results.successful} critical gaps`,
        generatedTemplates: results.data.results.generated_templates
      }));

      return {
        success: true,
        message: `Filled ${results.data.results.successful} critical gaps`,
        templatesGenerated: results.data.results.successful
      };

    } catch (error) {
      console.error('Critical gap filling error:', error);
      
      setProgress(prev => ({
        ...prev,
        phase: 'error',
        message: `Failed to fill critical gaps: ${error.message}`,
        errors: [error.message]
      }));

      return {
        success: false,
        message: `Failed: ${error.message}`,
        templatesGenerated: 0,
        errors: [error.message]
      };
    } finally {
      setIsGenerating(false);
    }
  }, []);

  const resetProgress = useCallback(() => {
    setProgress({
      phase: 'analyzing',
      current: 0,
      total: 0,
      message: 'Ready to generate',
      generatedTemplates: [],
      errors: []
    });
  }, []);

  return {
    progress,
    isGenerating,
    generateForGrade,
    generateForAllGrades,
    fillCriticalGaps,
    resetProgress
  };
};