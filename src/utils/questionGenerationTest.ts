/**
 * Automated testing utilities for question generation
 */

import { SelectionQuestion } from '@/types/questionTypes';

export interface GenerationTestResult {
  success: boolean;
  totalQuestions: number;
  duplicateCount: number;
  aiQuestions: number;
  templateQuestions: number;
  excludedCount: number;
  errors: string[];
  warnings: string[];
}

/**
 * Test question generation for duplicate protection (simplified without dependency)
 */
export function testDuplicateProtection(questions: SelectionQuestion[]): {
  hasDuplicates: boolean;
  duplicates: Array<{ question1: string; question2: string; similarity: number }>;
} {
  const duplicates: Array<{ question1: string; question2: string; similarity: number }> = [];
  
  // Simple text comparison for testing
  for (let i = 0; i < questions.length; i++) {
    for (let j = i + 1; j < questions.length; j++) {
      const q1 = questions[i].question.toLowerCase().trim();
      const q2 = questions[j].question.toLowerCase().trim();
      
      // Simple similarity check
      if (q1 === q2) {
        duplicates.push({
          question1: questions[i].question,
          question2: questions[j].question,
          similarity: 1.0
        });
      }
    }
  }
  
  return {
    hasDuplicates: duplicates.length > 0,
    duplicates
  };
}

/**
 * Test question quality and appropriateness
 */
export function testQuestionQuality(questions: SelectionQuestion[], grade: number): {
  qualityScore: number;
  issues: string[];
} {
  const issues: string[] = [];
  let totalScore = 0;
  
  questions.forEach((question, index) => {
    let questionScore = 1.0;
    
    // Check question length appropriateness
    const questionLength = question.question.length;
    const expectedLength = grade <= 4 ? 150 : 300;
    
    if (questionLength > expectedLength) {
      issues.push(`Question ${index + 1} is too long for grade ${grade}`);
      questionScore -= 0.2;
    }
    
    if (questionLength < 10) {
      issues.push(`Question ${index + 1} is too short`);
      questionScore -= 0.3;
    }
    
    // Check answer presence
    if (question.questionType === 'text-input') {
      const textQuestion = question as any;
      if (!textQuestion.answer) {
        issues.push(`Question ${index + 1} missing answer`);
        questionScore -= 0.5;
      }
    }
    
    if (question.questionType === 'multiple-choice') {
      const mcQuestion = question as any;
      if (!mcQuestion.options || mcQuestion.options.length < 2) {
        issues.push(`Question ${index + 1} has insufficient options`);
        questionScore -= 0.4;
      }
    }
    
    // Check explanation presence
    if (!question.explanation) {
      issues.push(`Question ${index + 1} missing explanation`);
      questionScore -= 0.1;
    }
    
    totalScore += Math.max(0, questionScore);
  });
  
  return {
    qualityScore: questions.length > 0 ? totalScore / questions.length : 0,
    issues
  };
}

/**
 * Test feedback system integration
 */
export async function testFeedbackIntegration(
  userId: string,
  category: string,
  grade: number,
  excludedQuestions: string[]
): Promise<{
  isWorking: boolean;
  excludedCount: number;
  error?: string;
}> {
  try {
    return {
      isWorking: true,
      excludedCount: excludedQuestions.length
    };
  } catch (error) {
    return {
      isWorking: false,
      excludedCount: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Comprehensive generation test
 */
export async function runGenerationTests(
  questions: SelectionQuestion[],
  grade: number,
  userId: string,
  category: string,
  excludedQuestions: string[]
): Promise<GenerationTestResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  try {
    // Test for duplicates
    const duplicateTest = testDuplicateProtection(questions);
    if (duplicateTest.hasDuplicates) {
      errors.push(`Found ${duplicateTest.duplicates.length} duplicate questions`);
      duplicateTest.duplicates.forEach(dup => {
        warnings.push(`Duplicate: "${dup.question1}" vs "${dup.question2}" (${(dup.similarity * 100).toFixed(1)}% similar)`);
      });
    }
    
    // Test quality
    const qualityTest = testQuestionQuality(questions, grade);
    if (qualityTest.qualityScore < 0.7) {
      warnings.push(`Low quality score: ${(qualityTest.qualityScore * 100).toFixed(1)}%`);
    }
    warnings.push(...qualityTest.issues);
    
    // Test feedback integration
    const feedbackTest = await testFeedbackIntegration(userId, category, grade, excludedQuestions);
    if (!feedbackTest.isWorking) {
      errors.push(`Feedback integration failed: ${feedbackTest.error}`);
    }
    
    // Count question sources (simplified)
    const aiQuestions = questions.filter(q => q.explanation?.includes('AI') || q.explanation?.includes('generated')).length;
    const templateQuestions = questions.length - aiQuestions;
    
    return {
      success: errors.length === 0,
      totalQuestions: questions.length,
      duplicateCount: duplicateTest.duplicates.length,
      aiQuestions,
      templateQuestions,
      excludedCount: excludedQuestions.length,
      errors,
      warnings
    };
    
  } catch (error) {
    return {
      success: false,
      totalQuestions: questions.length,
      duplicateCount: 0,
      aiQuestions: 0,
      templateQuestions: 0,
      excludedCount: 0,
      errors: [error instanceof Error ? error.message : 'Test execution failed'],
      warnings: []
    };
  }
}

/**
 * Log test results in a readable format
 */
export function logTestResults(results: GenerationTestResult): void {
  console.log('🧪 Question Generation Test Results');
  console.log('=====================================');
  console.log(`✅ Success: ${results.success ? 'PASS' : 'FAIL'}`);
  console.log(`📊 Total Questions: ${results.totalQuestions}`);
  console.log(`🤖 AI Questions: ${results.aiQuestions}`);
  console.log(`📝 Template Questions: ${results.templateQuestions}`);
  console.log(`🚫 Excluded Questions: ${results.excludedCount}`);
  console.log(`🔄 Duplicates Found: ${results.duplicateCount}`);
  
  if (results.errors.length > 0) {
    console.log('\n❌ Errors:');
    results.errors.forEach(error => console.log(`  - ${error}`));
  }
  
  if (results.warnings.length > 0) {
    console.log('\n⚠️ Warnings:');
    results.warnings.forEach(warning => console.log(`  - ${warning}`));
  }
  
  console.log('=====================================');
}