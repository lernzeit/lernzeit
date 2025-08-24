import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAchievements } from '@/hooks/useAchievements';
import { useAuth } from '@/hooks/useAuth';
import { Badge } from '@/components/ui/badge';

export function AchievementTest() {
  const { user } = useAuth();
  const { updateProgress, userAchievements, loading } = useAchievements(user?.id);
  const [testResults, setTestResults] = useState<any[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const runAchievementTests = async () => {
    if (!user?.id || !updateProgress) {
      console.error('❌ No user or updateProgress function available');
      return;
    }

    setIsRunning(true);
    const results: any[] = [];

    try {
      console.log('🧪 Starting Achievement Tests...');

      // Test 1: Questions Solved Achievement
      console.log('🧪 Test 1: Questions Solved');
      const result1 = await updateProgress('math', 'questions_solved', 5);
      results.push({
        test: 'Questions Solved (math)',
        result: result1,
        success: Array.isArray(result1)
      });

      // Test 2: Total Questions Achievement
      console.log('🧪 Test 2: Total Questions');
      const result2 = await updateProgress('general', 'total_questions', 3);
      results.push({
        test: 'Total Questions (general)',
        result: result2,
        success: Array.isArray(result2)
      });

      // Test 3: Streak Achievement
      console.log('🧪 Test 3: Daily Streak');
      const result3 = await updateProgress('general', 'streak', 1);
      results.push({
        test: 'Daily Streak (general)',
        result: result3,
        success: Array.isArray(result3)
      });

      // Test 4: Accuracy Master Achievement
      console.log('🧪 Test 4: Accuracy Master');
      const result4 = await updateProgress('general', 'accuracy_master', 95);
      results.push({
        test: 'Accuracy Master (95%)',
        result: result4,
        success: Array.isArray(result4)
      });

      // Test 5: Night Owl Achievement
      console.log('🧪 Test 5: Night Owl');
      const result5 = await updateProgress('general', 'night_owl', 1);
      results.push({
        test: 'Night Owl Learning',
        result: result5,
        success: Array.isArray(result5)
      });

      setTestResults(results);
      console.log('✅ Achievement Tests completed:', results);
    } catch (error) {
      console.error('❌ Achievement Test Error:', error);
      results.push({
        test: 'ERROR',
        result: error,
        success: false
      });
      setTestResults(results);
    } finally {
      setIsRunning(false);
    }
  };

  if (!user) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">Bitte anmelden für Achievement-Tests</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          🧪 Achievement System Test
          <Badge variant="outline">Debug Mode</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center gap-4">
          <Button 
            onClick={runAchievementTests} 
            disabled={isRunning || loading}
            variant="default"
          >
            {isRunning ? '🔄 Testing...' : '🚀 Run Achievement Tests'}
          </Button>
          <div className="text-sm text-muted-foreground">
            User: {user.email} | Achievements loaded: {userAchievements.length}
          </div>
        </div>

        {/* Current User Achievements */}
        <div>
          <h3 className="text-lg font-semibold mb-3">🏆 Current Achievements ({userAchievements.length})</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {userAchievements
              .filter(a => a.is_completed)
              .slice(0, 6)
              .map((achievement, index) => (
              <div key={index} className="bg-green-50 border border-green-200 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{achievement.icon}</span>
                  <div>
                    <div className="font-medium text-sm">{achievement.name}</div>
                    <div className="text-xs text-green-600">+{achievement.reward_minutes}min</div>
                  </div>
                </div>
              </div>
            ))}
            {userAchievements.filter(a => a.is_completed).length === 0 && (
              <div className="col-span-full text-center text-muted-foreground py-4">
                Noch keine Achievements freigeschaltet
              </div>
            )}
          </div>
        </div>

        {/* Test Results */}
        {testResults.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-3">🧪 Test Results</h3>
            <div className="space-y-2">
              {testResults.map((result, index) => (
                <div 
                  key={index} 
                  className={`p-3 rounded-lg border ${
                    result.success 
                      ? 'bg-green-50 border-green-200' 
                      : 'bg-red-50 border-red-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">
                      {result.success ? '✅' : '❌'} {result.test}
                    </span>
                    <span className="text-sm">
                      {result.success 
                        ? `${Array.isArray(result.result) ? result.result.length : 0} new achievements`
                        : 'Failed'
                      }
                    </span>
                  </div>
                  {result.result && Array.isArray(result.result) && result.result.length > 0 && (
                    <div className="mt-2 text-sm">
                      <strong>New Achievements:</strong>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {result.result.map((ach: any, i: number) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {ach.icon} {ach.name} (+{ach.reward_minutes}min)
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Progress Tracker */}
        <div>
          <h3 className="text-lg font-semibold mb-3">📈 Achievement Progress</h3>
          <div className="space-y-2">
            {userAchievements
              .filter(a => !a.is_completed)
              .slice(0, 5)
              .map((achievement, index) => {
                const progress = (achievement.current_progress || 0) / achievement.requirement_value;
                return (
                  <div key={index} className="bg-muted/30 rounded-lg p-3">
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="font-medium">
                        {achievement.icon} {achievement.name}
                      </span>
                      <span className="text-muted-foreground">
                        {achievement.current_progress || 0}/{achievement.requirement_value}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-primary h-2 rounded-full transition-all" 
                        style={{ width: `${Math.min(progress * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}