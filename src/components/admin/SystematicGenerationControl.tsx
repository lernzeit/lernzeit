import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Zap, 
  Target,
  CheckCircle, 
  AlertTriangle,
  Clock,
  TrendingUp
} from 'lucide-react';
import { useSystematicTemplateGeneration } from '@/hooks/useSystematicTemplateGeneration';

export const SystematicGenerationControl = () => {
  const [selectedGrades, setSelectedGrades] = useState<number[]>([1, 2, 3, 4]);
  const [templatesPerGrade, setTemplatesPerGrade] = useState(50);
  
  const {
    progress,
    isGenerating,
    generateForGrade,
    generateForAllGrades,
    fillCriticalGaps,
    resetProgress
  } = useSystematicTemplateGeneration();

  const handleGenerateGrade = async (grade: number) => {
    const result = await generateForGrade(grade, {
      batchSize: templatesPerGrade,
      prioritizeGaps: true,
      targetQuality: 0.8
    });
    console.log('Generation result:', result);
  };

  const handleMassGeneration = async () => {
    const result = await generateForAllGrades(selectedGrades, {
      templatesPerGrade,
      priorityOrder: true
    });
    console.log('Mass generation result:', result);
  };

  const handleFillCriticalGaps = async () => {
    const result = await fillCriticalGaps();
    console.log('Critical gaps result:', result);
  };

  const getPhaseIcon = () => {
    switch (progress.phase) {
      case 'analyzing': return <Clock className="w-4 h-4" />;
      case 'generating': return <Play className="w-4 h-4" />;
      case 'validating': return <CheckCircle className="w-4 h-4" />;
      case 'complete': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'error': return <AlertTriangle className="w-4 h-4 text-red-600" />;
      default: return <Target className="w-4 h-4" />;
    }
  };

  const getPhaseColor = () => {
    switch (progress.phase) {
      case 'complete': return 'text-green-600';
      case 'error': return 'text-red-600';
      case 'generating': return 'text-blue-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Systematic Template Generation Control
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Grade Selection */}
            <div>
              <label className="text-sm font-medium mb-2 block">Target Grades</label>
              <div className="flex flex-wrap gap-2">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(grade => (
                  <Button
                    key={grade}
                    variant={selectedGrades.includes(grade) ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setSelectedGrades(prev =>
                        prev.includes(grade)
                          ? prev.filter(g => g !== grade)
                          : [...prev, grade]
                      );
                    }}
                    disabled={isGenerating}
                  >
                    {grade}
                  </Button>
                ))}
              </div>
            </div>

            {/* Templates per Grade */}
            <div>
              <label className="text-sm font-medium mb-2 block">Templates per Grade</label>
              <input
                type="number"
                value={templatesPerGrade}
                onChange={(e) => setTemplatesPerGrade(Number(e.target.value))}
                className="w-full px-3 py-2 border rounded"
                min={10}
                max={200}
                step={10}
                disabled={isGenerating}
              />
            </div>

            {/* Quick Actions */}
            <div>
              <label className="text-sm font-medium mb-2 block">Quick Actions</label>
              <div className="space-y-2">
                <Button
                  onClick={handleFillCriticalGaps}
                  disabled={isGenerating}
                  variant="outline"
                  size="sm"
                  className="w-full"
                >
                  <Zap className="w-4 h-4 mr-2" />
                  Fill Critical Gaps
                </Button>
                <Button
                  onClick={resetProgress}
                  disabled={isGenerating}
                  variant="ghost"
                  size="sm"
                  className="w-full"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Reset Progress
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Progress Display */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {getPhaseIcon()}
            <span className={getPhaseColor()}>
              Generation Progress - {progress.phase.toUpperCase()}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">{progress.message}</span>
                <Badge variant={progress.phase === 'complete' ? "default" : "secondary"}>
                  {progress.current}/{progress.total}
                </Badge>
              </div>
              <Progress 
                value={progress.total > 0 ? (progress.current / progress.total) * 100 : 0} 
                className="h-2"
              />
            </div>

            {progress.generatedTemplates.length > 0 && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  Successfully generated {progress.generatedTemplates.length} templates
                </AlertDescription>
              </Alert>
            )}

            {progress.errors.length > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {progress.errors.length} errors occurred:
                  <ul className="list-disc list-inside mt-2">
                    {progress.errors.slice(0, 3).map((error, index) => (
                      <li key={index} className="text-xs">{error}</li>
                    ))}
                    {progress.errors.length > 3 && (
                      <li className="text-xs">...and {progress.errors.length - 3} more</li>
                    )}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Generation Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Individual Grade Generation */}
        <Card>
          <CardHeader>
            <CardTitle>Individual Grade Generation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[1, 2, 3, 4, 5, 6].map(grade => (
                <div key={grade} className="flex items-center justify-between">
                  <span className="font-medium">Grade {grade}</span>
                  <Button
                    onClick={() => handleGenerateGrade(grade)}
                    disabled={isGenerating}
                    size="sm"
                    variant={selectedGrades.includes(grade) ? "default" : "outline"}
                  >
                    Generate {templatesPerGrade}
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Mass Generation */}
        <Card>
          <CardHeader>
            <CardTitle>Mass Generation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-2">
                  Generate templates for grades: {selectedGrades.join(', ')}
                </p>
                <p className="text-xs text-gray-500">
                  Total templates: {selectedGrades.length} × {templatesPerGrade} = {selectedGrades.length * templatesPerGrade}
                </p>
              </div>
              
              <Button
                onClick={handleMassGeneration}
                disabled={isGenerating || selectedGrades.length === 0}
                className="w-full"
                size="lg"
              >
                <Play className="w-4 h-4 mr-2" />
                Start Mass Generation
              </Button>

              <div className="grid grid-cols-2 gap-2">
                <Button
                  onClick={() => setSelectedGrades([1, 2, 3, 4])}
                  disabled={isGenerating}
                  variant="outline"
                  size="sm"
                >
                  Primary (1-4)
                </Button>
                <Button
                  onClick={() => setSelectedGrades([5, 6, 7, 8, 9, 10])}
                  disabled={isGenerating}
                  variant="outline"
                  size="sm"
                >
                  Secondary (5-10)
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Phase-specific Information */}
      {progress.phase === 'generating' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-blue-600">Generation in Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <div>
                <p className="font-medium">Creating high-quality templates...</p>
                <p className="text-sm text-gray-600">This may take several minutes. Please be patient.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};