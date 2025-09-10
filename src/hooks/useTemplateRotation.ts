import { useState, useCallback } from 'react';
import { TemplateRotator } from '@/services/TemplateRotator';

interface RotationOptions {
  userId: string;
  grade: number;
  category: string;
  sessionId?: string;
  preferredDifficulty?: 'easy' | 'medium' | 'hard';
  enforceTypeDiversity?: boolean;
}

interface RotationStats {
  totalRotations: number;
  averageQuality: number;
  diversityScore: number;
  lastRotation: Date | null;
  rotationReasons: string[];
}

export const useTemplateRotation = () => {
  const [isRotating, setIsRotating] = useState(false);
  const [rotationStats, setRotationStats] = useState<RotationStats>({
    totalRotations: 0,
    averageQuality: 0,
    diversityScore: 0,
    lastRotation: null,
    rotationReasons: []
  });

  const getOptimalTemplate = useCallback(async (options: RotationOptions) => {
    setIsRotating(true);
    
    try {
      console.log(`🔄 Starting template rotation for user ${options.userId}`);
      
      const result = await TemplateRotator.getOptimalTemplate(options);
      
      if (result) {
        // Update rotation statistics
        setRotationStats(prev => ({
          totalRotations: prev.totalRotations + 1,
          averageQuality: (prev.averageQuality * prev.totalRotations + result.qualityScore) / (prev.totalRotations + 1),
          diversityScore: result.diversityScore,
          lastRotation: new Date(),
          rotationReasons: [...prev.rotationReasons.slice(-4), result.rotationReason] // Keep last 5
        }));

        console.log(`✅ Template rotation successful: ${result.template.id}`);
        console.log(`📊 Rotation reason: ${result.rotationReason}`);
        
        return {
          success: true,
          template: result.template,
          metadata: {
            rotationReason: result.rotationReason,
            qualityScore: result.qualityScore,
            diversityScore: result.diversityScore
          }
        };
      } else {
        console.warn('⚠️ No suitable template found during rotation');
        return {
          success: false,
          error: 'No suitable template found',
          template: null
        };
      }
    } catch (error) {
      console.error('❌ Template rotation error:', error);
      return {
        success: false,
        error: error.message,
        template: null
      };
    } finally {
      setIsRotating(false);
    }
  }, []);

  const getRotationStatistics = useCallback(async (grade: number) => {
    try {
      const stats = await TemplateRotator.getRotationStatistics(grade);
      return {
        success: true,
        data: stats
      };
    } catch (error) {
      console.error('Error fetching rotation statistics:', error);
      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }, []);

  const rotateTemplatePool = useCallback(async (grade: number, domain: string) => {
    try {
      await TemplateRotator.rotateTemplatePool(grade, domain);
      return {
        success: true,
        message: `Template pool rotated for Grade ${grade}, ${domain}`
      };
    } catch (error) {
      console.error('Error rotating template pool:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }, []);

  const resetRotationStats = useCallback(() => {
    setRotationStats({
      totalRotations: 0,
      averageQuality: 0,
      diversityScore: 0,
      lastRotation: null,
      rotationReasons: []
    });
  }, []);

  return {
    // State
    isRotating,
    rotationStats,
    
    // Actions
    getOptimalTemplate,
    getRotationStatistics,
    rotateTemplatePool,
    resetRotationStats
  };
};