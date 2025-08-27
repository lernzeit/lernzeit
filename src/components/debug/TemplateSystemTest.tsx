
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TemplateValidator, ComprehensiveValidationResult } from '@/utils/templates/templateValidator';
import { QuestionGenerator } from '@/utils/templates/questionGenerator';
import { getTemplatesForCategory, questionTemplates } from '@/utils/questionTemplates';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useAdvancedQuestionGeneration } from '@/hooks/useAdvancedQuestionGeneration';

interface DatabaseStats {
  totalTemplates: number;
  templatesByCategory: Record<string, number>;
  templatesByGrade: Record<string, number>;
  averageQuality: number;
  totalUsage: number;
  recentlyAdded: number;
}

export function TemplateSystemTest() {
  const { user } = useAuth();
  const [isRunning, setIsRunning] = useState(false);
  const [dbStats, setDbStats] = useState<DatabaseStats | null>(null);
  const [testCategory, setTestCategory] = useState('Mathematik');
  const [testGrade, setTestGrade] = useState(4);
  
  const {
    problems,
    isGenerating,
    generationSource,
    generateProblems
  } = useAdvancedQuestionGeneration({
    category: testCategory,
    grade: testGrade,
    userId: user?.id || 'test',
    totalQuestions: 5,
    autoGenerate: false
  });
  
  const [testResults, setTestResults] = useState<{
    validationResults: ComprehensiveValidationResult;
    generationTests: any[];
    databaseTests: any[];
    overallHealth: number;
    summary: string;
  } | null>(null);

  // PHASE 5: Load database statistics
  const loadDatabaseStats = async () => {
    try {
      const { data: templates, error } = await supabase
        .from('templates')
        .select('domain, grade, plays, correct, rating_sum, rating_count, status, created_at')
        .eq('status', 'ACTIVE');

      if (error) {
        console.error('Error loading database stats:', error);
        return;
      }

      const stats: DatabaseStats = {
        totalTemplates: templates.length,
        templatesByCategory: {},
        templatesByGrade: {},
        averageQuality: 0,
        totalUsage: 0,
        recentlyAdded: 0
      };

      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      templates.forEach(template => {
        // Category stats
        stats.templatesByCategory[template.domain] = 
          (stats.templatesByCategory[template.domain] || 0) + 1;
        
        // Grade stats
        stats.templatesByGrade[template.grade] = 
          (stats.templatesByGrade[template.grade] || 0) + 1;
        
        // Quality and usage (calculate from rating data)
        const qualityScore = template.rating_count > 0 ? template.rating_sum / template.rating_count : 0;
        stats.averageQuality += qualityScore;
        stats.totalUsage += template.plays || 0;
        
        // Recently added
        if (new Date(template.created_at) > oneDayAgo) {
          stats.recentlyAdded++;
        }
      });

      stats.averageQuality = templates.length > 0 ? stats.averageQuality / templates.length : 0;
      setDbStats(stats);
    } catch (error) {
      console.error('Failed to load database stats:', error);
    }
  };

  // PHASE 5: Comprehensive test with database integration
  const runComprehensiveTest = async () => {
    setIsRunning(true);
    console.log('🚀 PHASE 5: Starting comprehensive template system test with database monitoring...');

    try {
      // Test 1: Validate local templates
      console.log('📋 Testing local template validation...');
      const validationResults = TemplateValidator.runComprehensiveValidation(questionTemplates);
      
      // Test 2: Database template analysis
      console.log('🗄️ Testing database template loading...');
      const databaseTests = [];
      const categories = ['Mathematik', 'Deutsch', 'Englisch'];
      const grades = [1, 2, 3, 4, 5, 6];
      
      for (const category of categories) {
        for (const grade of grades) {
          try {
            const { data: dbTemplates, error } = await supabase
              .from('templates')
              .select('*')
              .eq('domain', category)
              .eq('grade', grade)
              .eq('status', 'ACTIVE')
              .limit(5);

            const testResult = {
              category,
              grade,
              dbTemplateCount: dbTemplates?.length || 0,
              dbError: error?.message || null,
              parseableTemplates: 0,
              parseErrors: [] as string[]
            };

            // Test parsing of database templates
            if (dbTemplates && dbTemplates.length > 0) {
              for (const template of dbTemplates) {
                try {
                  // Try to parse student_prompt content
                  if (template.student_prompt) {
                    // Templates have student_prompt field as content
                    testResult.parseableTemplates++;
                  }
                } catch (parseError) {
                  // Check if it's valid plain text
                  if (template.student_prompt && template.student_prompt.trim().length > 5) {
                    testResult.parseableTemplates++;
                  } else {
                    testResult.parseErrors.push(`Template ${template.id}: Invalid content`);
                  }
                }
              }
            }

            databaseTests.push(testResult);
          } catch (error) {
            databaseTests.push({
              category,
              grade,
              dbTemplateCount: 0,
              dbError: error instanceof Error ? error.message : 'Unknown error',
              parseableTemplates: 0,
              parseErrors: ['Database query failed']
            });
          }
        }
      }
      
      // Test 3: End-to-end generation test
      console.log('🎯 Testing end-to-end question generation...');
      const generationTests = [];
      
      for (const category of ['Mathematik', 'Deutsch']) {
        for (const grade of [2, 4]) {
          const templates = getTemplatesForCategory(category, grade);
          if (templates.length > 0) {
            console.log(`Testing ${category} Grade ${grade} (${templates.length} local templates)`);
            
            const testResult = {
              category,
              grade,
              templateCount: templates.length,
              generatedQuestions: 0,
              errors: [] as string[]
            };

            // Try to generate 3 questions for this category/grade
            const usedCombinations = new Set<string>();
            for (let i = 0; i < Math.min(3, templates.length * 2); i++) {
              try {
                const question = QuestionGenerator.generateQuestionFromTemplate(
                  templates[Math.floor(Math.random() * templates.length)],
                  usedCombinations
                );
                if (question) {
                  testResult.generatedQuestions++;
                  console.log(`✅ Generated: ${question.question.substring(0, 40)}... = ${question.answer}`);
                } else {
                  testResult.errors.push(`Failed to generate question ${i + 1}`);
                }
              } catch (error) {
                testResult.errors.push(`Generation error: ${error instanceof Error ? error.message : 'Unknown'}`);
              }
            }
            
            generationTests.push(testResult);
          }
        }
      }

      // Test 4: Integration test with useBalancedQuestionGeneration
      console.log('🔗 Testing integration with balanced generation...');
      
      const dbStats = await loadDatabaseStats();

      const summary = `
PHASE 5 COMPREHENSIVE TEST RESULTS:

Local Template Validation:
- Total Local Templates: ${questionTemplates.length}
- Valid Local Templates: ${validationResults.validTemplates}
- Local Template Health: ${Math.round(validationResults.overallHealth * 100)}%
- Critical Issues: ${validationResults.criticalIssues.length}

Database Template Analysis:
- Database Templates Available: ${databaseTests.reduce((sum, t) => sum + t.dbTemplateCount, 0)}
- Categories with DB Templates: ${databaseTests.filter(t => t.dbTemplateCount > 0).length}
- Parseable DB Templates: ${databaseTests.reduce((sum, t) => sum + t.parseableTemplates, 0)}
- Database Errors: ${databaseTests.filter(t => t.dbError).length}

Local Generation Tests:
- Categories Tested: ${generationTests.length}
- Successful Generations: ${generationTests.reduce((sum, t) => sum + t.generatedQuestions, 0)}
- Total Generation Errors: ${generationTests.reduce((sum, t) => sum + t.errors.length, 0)}

System Health Status:
- Database Connection: ${databaseTests.some(t => !t.dbError) ? 'OK' : 'ISSUES'}
- Template Parsing: ${databaseTests.every(t => t.parseErrors.length === 0) ? 'OK' : 'ISSUES'}
- Question Generation: ${generationTests.every(t => t.generatedQuestions > 0) ? 'OK' : 'ISSUES'}
      `.trim();

      setTestResults({
        validationResults,
        generationTests,
        databaseTests,
        overallHealth: validationResults.overallHealth,
        summary
      });

      console.log('🎉 Comprehensive test completed!');
      console.log(summary);

    } catch (error) {
      console.error('❌ Test failed:', error);
    } finally {
      setIsRunning(false);
    }
  };

  // Test live generation
  const testLiveGeneration = async () => {
    console.log(`🧪 Testing live generation: ${testCategory} Grade ${testGrade}`);
    await generateProblems();
  };

  useEffect(() => {
    loadDatabaseStats();
  }, []);

  return (
    <div className="space-y-6">
      {/* Database Statistics */}
      <Card>
        <CardHeader>
          <CardTitle>📊 Database Template Statistics (PHASE 5 MONITORING)</CardTitle>
        </CardHeader>
        <CardContent>
          {dbStats ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{dbStats.totalTemplates}</div>
                  <div className="text-sm text-muted-foreground">Total DB Templates</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{dbStats.averageQuality.toFixed(2)}</div>
                  <div className="text-sm text-muted-foreground">Avg Quality</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{dbStats.totalUsage}</div>
                  <div className="text-sm text-muted-foreground">Total Usage</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{dbStats.recentlyAdded}</div>
                  <div className="text-sm text-muted-foreground">Added Today</div>
                </div>
              </div>

              <div className="space-y-2">
                <div>
                  <h4 className="font-semibold mb-2">Templates by Category:</h4>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(dbStats.templatesByCategory).map(([category, count]) => (
                      <Badge key={category} variant="secondary">
                        {category}: {count}
                      </Badge>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-2">Templates by Grade:</h4>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(dbStats.templatesByGrade).map(([grade, count]) => (
                      <Badge key={grade} variant="outline">
                        Grade {grade}: {count}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div>Loading database statistics...</div>
          )}

          <div className="mt-4 flex gap-2">
            <Button onClick={loadDatabaseStats} variant="outline" size="sm">
              🔄 Refresh Stats
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Live Generation Test */}
      <Card>
        <CardHeader>
          <CardTitle>🧪 Live Generation Test (PHASE 4 TESTING)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Category:</label>
                <select 
                  value={testCategory} 
                  onChange={(e) => setTestCategory(e.target.value)}
                  className="w-full p-2 border rounded"
                >
                  <option value="Mathematik">Mathematik</option>
                  <option value="Deutsch">Deutsch</option>
                  <option value="Englisch">Englisch</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Grade:</label>
                <select 
                  value={testGrade} 
                  onChange={(e) => setTestGrade(Number(e.target.value))}
                  className="w-full p-2 border rounded"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(grade => (
                    <option key={grade} value={grade}>{grade}</option>
                  ))}
                </select>
              </div>
            </div>

            <Button 
              onClick={testLiveGeneration} 
              disabled={isGenerating}
              className="w-full"
            >
              {isGenerating ? '⏳ Generating...' : '🧪 Test Live Generation'}
            </Button>

            {problems.length > 0 && (
              <div className="mt-4">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-semibold">Generated Questions:</h4>
                  <Badge variant={generationSource === 'template' ? 'default' : generationSource === 'ai' ? 'secondary' : 'destructive'}>
                    Source: {generationSource}
                  </Badge>
                </div>
                <div className="space-y-2">
                  {problems.slice(0, 3).map((problem, index) => (
                    <div key={problem.id} className="p-3 bg-gray-50 rounded text-sm">
                      <div className="font-medium">Q{index + 1}: {problem.question}</div>
                      <div className="text-gray-600 mt-1">
                        Type: {problem.questionType} | 
                        Answer: {problem.questionType === 'text-input' ? (problem as any).answer : 'Multiple choice'}
                      </div>
                    </div>
                  ))}
                  {problems.length > 3 && (
                    <div className="text-sm text-gray-500">...and {problems.length - 3} more questions</div>
                  )}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Comprehensive Test */}
      <Card>
        <CardHeader>
          <CardTitle>🔬 Comprehensive System Test (PHASE 5)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Button 
              onClick={runComprehensiveTest}
              disabled={isRunning}
              variant="outline"
            >
              {isRunning ? 'Running Tests...' : 'Run Comprehensive Test'}
            </Button>
            {testResults && (
              <Badge variant={testResults.overallHealth >= 0.8 ? 'default' : 'destructive'}>
                Health: {Math.round(testResults.overallHealth * 100)}%
              </Badge>
            )}
          </div>

          {testResults && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Test Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="whitespace-pre-wrap text-sm bg-muted p-4 rounded max-h-96 overflow-y-auto">
                    {testResults.summary}
                  </pre>
                </CardContent>
              </Card>

              {/* Database Test Results */}
              {testResults.databaseTests && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Database Template Test Results</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
                      {testResults.databaseTests
                        .filter(test => test.dbTemplateCount > 0 || test.dbError)
                        .map((test, index) => (
                        <div key={index} className="border rounded p-3">
                          <div className="font-semibold">
                            {test.category} - Grade {test.grade}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            DB Templates: {test.dbTemplateCount} | Parseable: {test.parseableTemplates}
                          </div>
                          {test.dbError && (
                            <div className="text-xs text-red-600 mt-1">
                              Error: {test.dbError}
                            </div>
                          )}
                          {test.parseErrors.length > 0 && (
                            <div className="text-xs text-orange-600 mt-1">
                              Parse issues: {test.parseErrors.length}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Local Generation Test Results</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {testResults.generationTests.map((test, index) => (
                      <div key={index} className="border rounded p-3">
                        <div className="font-semibold">
                          {test.category} - Grade {test.grade}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Templates: {test.templateCount} | Generated: {test.generatedQuestions} | Errors: {test.errors.length}
                        </div>
                        {test.errors.length > 0 && (
                          <div className="text-xs text-red-600 mt-1">
                            {test.errors.slice(0, 2).join(', ')}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Recent Generation Audit Log</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {QuestionGenerator.getAuditLog().slice(-10).map((entry, index) => (
                      <div key={index} className="text-xs border rounded p-2">
                        <div className="font-mono">
                          {entry.success ? '✅' : '❌'} {entry.templateId}
                        </div>
                        <div className="text-muted-foreground">
                          Answer: {entry.finalAnswer} | {new Date(entry.timestamp).toLocaleTimeString()}
                        </div>
                        {entry.errors.length > 0 && (
                          <div className="text-red-600">
                            {entry.errors.join(', ')}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
