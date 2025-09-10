import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Shuffle, 
  Target, 
  BarChart3, 
  CheckCircle,
  AlertCircle,
  TrendingUp
} from 'lucide-react';
import { useTemplateRotation } from '@/hooks/useTemplateRotation';
import { SessionDuplicatePrevention } from '@/services/SessionDuplicatePrevention';

interface EnhancedTemplateSelectorProps {
  userId: string;
  grade: number;
  category: string;
  sessionId?: string;
  onTemplateSelected: (template: any, metadata: any) => void;
  onError?: (error: string) => void;
}

export const EnhancedTemplateSelector = ({
  userId,
  grade,
  category,
  sessionId,
  onTemplateSelected,
  onError
}: EnhancedTemplateSelectorProps) => {
  const [selectedDifficulty, setSelectedDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [enforceDiversity, setEnforceDiversity] = useState(true);
  const [rotationHistory, setRotationHistory] = useState<any[]>([]);
  
  const {
    isRotating,
    rotationStats,
    getOptimalTemplate,
    getRotationStatistics,
    rotateTemplatePool
  } = useTemplateRotation();

  useEffect(() => {
    // Load initial rotation statistics
    loadRotationStats();
  }, [grade, getRotationStatistics]);

  const loadRotationStats = async () => {
    const result = await getRotationStatistics(grade);
    if (!result.success && onError) {
      onError(result.error);
    }
  };

  const handleTemplateSelection = async () => {
    const result = await getOptimalTemplate({
      userId,
      grade,
      category,
      sessionId,
      preferredDifficulty: selectedDifficulty,
      enforceTypeDiversity: enforceDiversity
    });

    if (result.success && result.template) {
      // Track rotation in history
      setRotationHistory(prev => [...prev.slice(-4), {
        timestamp: new Date(),
        template: result.template,
        reason: result.metadata?.rotationReason,
        quality: result.metadata?.qualityScore
      }]);

      onTemplateSelected(result.template, result.metadata);
    } else {
      if (onError) {
        onError(result.error || 'Template selection failed');
      }
    }
  };

  const handlePoolRotation = async () => {
    const domain = getCategoryDomain(category);
    const result = await rotateTemplatePool(grade, domain);
    
    if (!result.success && onError) {
      onError(result.error);
    }
  };

  const getCategoryDomain = (category: string): string => {
    const domainMap = {
      'math': 'Zahlen & Operationen',
      'mathematik': 'Zahlen & Operationen',
      'geometry': 'Raum & Form',
      'measurement': 'Größen & Messen',
      'data': 'Daten & Zufall'
    };
    return domainMap[category as keyof typeof domainMap] || 'Zahlen & Operationen';
  };

  const getSessionStats = () => {
    if (!sessionId) return null;
    return SessionDuplicatePrevention.getSessionStats(sessionId);
  };

  const sessionStats = getSessionStats();

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="w-5 h-5" />
          Enhanced Template Selector
        </CardTitle>
        <div className="flex items-center gap-2">
          <Badge variant="outline">Grade {grade}</Badge>
          <Badge variant="secondary">{category}</Badge>
          {sessionStats && (
            <Badge className="bg-blue-100 text-blue-800">
              {sessionStats.templatesUsed} templates used
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Selection Options */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Preferred Difficulty</label>
            <select 
              value={selectedDifficulty}
              onChange={(e) => setSelectedDifficulty(e.target.value as 'easy' | 'medium' | 'hard')}
              className="w-full px-3 py-2 border rounded"
              disabled={isRotating}
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="diversity"
              checked={enforceDiversity}
              onChange={(e) => setEnforceDiversity(e.target.checked)}
              disabled={isRotating}
            />
            <label htmlFor="diversity" className="text-sm font-medium">
              Enforce Question Type Diversity
            </label>
          </div>
        </div>

        {/* Rotation Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 border rounded">
            <div className="text-2xl font-bold">{rotationStats.totalRotations}</div>
            <div className="text-xs text-gray-600">Rotations</div>
          </div>
          <div className="text-center p-3 border rounded">
            <div className="text-2xl font-bold text-green-600">
              {(rotationStats.averageQuality * 10).toFixed(1)}
            </div>
            <div className="text-xs text-gray-600">Avg Quality</div>
          </div>
          <div className="text-center p-3 border rounded">
            <div className="text-2xl font-bold text-blue-600">
              {(rotationStats.diversityScore * 100).toFixed(0)}%
            </div>
            <div className="text-xs text-gray-600">Diversity</div>
          </div>
          <div className="text-center p-3 border rounded">
            <div className="text-sm font-bold">
              {rotationStats.lastRotation ? 
                new Date(rotationStats.lastRotation).toLocaleTimeString().slice(0, 5) : 
                'Never'
              }
            </div>
            <div className="text-xs text-gray-600">Last Rotation</div>
          </div>
        </div>

        {/* Quality Indicators */}
        {rotationStats.averageQuality > 0 && (
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">Template Quality</span>
              <span className="text-sm text-gray-600">
                {(rotationStats.averageQuality * 100).toFixed(1)}%
              </span>
            </div>
            <Progress value={rotationStats.averageQuality * 100} className="h-2" />
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button 
            onClick={handleTemplateSelection}
            disabled={isRotating}
            className="flex-1"
          >
            {isRotating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Selecting...
              </>
            ) : (
              <>
                <Shuffle className="w-4 h-4 mr-2" />
                Get Optimal Template
              </>
            )}
          </Button>

          <Button 
            onClick={handlePoolRotation}
            variant="outline"
            disabled={isRotating}
          >
            <BarChart3 className="w-4 h-4 mr-2" />
            Rotate Pool
          </Button>
        </div>

        {/* Recent Rotation History */}
        {rotationHistory.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2">Recent Selections</h4>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {rotationHistory.slice(-3).reverse().map((rotation, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded text-xs">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-3 h-3 text-green-600" />
                    <span className="font-medium">{rotation.template.student_prompt.slice(0, 30)}...</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Badge variant="outline" className="text-xs">
                      {(rotation.quality * 10).toFixed(1)}
                    </Badge>
                    <span className="text-gray-500">
                      {new Date(rotation.timestamp).toLocaleTimeString().slice(0, 5)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Rotation Reasons */}
        {rotationStats.rotationReasons.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2">Selection Strategies</h4>
            <div className="flex flex-wrap gap-1">
              {Array.from(new Set(rotationStats.rotationReasons.slice(-5))).map((reason, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {reason}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};