import { useState, useCallback, useRef, useEffect } from 'react';
import { SelectionQuestion } from '@/types/questionTypes';
import { supabase } from '@/integrations/supabase/client';

// Phase 3: Adaptive Difficulty System
interface DifficultyProfile {
  user_id: string;
  category: string;
  grade: number;
  current_level: number; // 0.0 to 1.0
  mastery_score: number;
  learning_velocity: number;
  strengths: string[];
  weaknesses: string[];
  last_updated: Date;
}

interface PerformanceMetrics {
  accuracy: number;
  response_time: number;
  confidence_level: number;
  help_requests: number;
  streak_count: number;
}

interface DifficultyAdjustment {
  previous_level: number;
  new_level: number;
  adjustment_reason: string;
  confidence: number;
  recommended_topics: string[];
}

interface AdaptiveBehaviorPattern {
  pattern_type: 'struggling' | 'thriving' | 'plateauing' | 'improving';
  confidence: number;
  recommended_action: string;
  indicators: string[];
}

export function useAdaptiveDifficultySystem(
  category: string,
  grade: number,
  userId: string
) {
  const [difficultyProfile, setDifficultyProfile] = useState<DifficultyProfile | null>(null);
  const [currentPerformance, setCurrentPerformance] = useState<PerformanceMetrics>({
    accuracy: 0,
    response_time: 0,
    confidence_level: 0,
    help_requests: 0,
    streak_count: 0
  });
  const [lastAdjustment, setLastAdjustment] = useState<DifficultyAdjustment | null>(null);
  const [behaviorPattern, setBehaviorPattern] = useState<AdaptiveBehaviorPattern | null>(null);
  const [isAdapting, setIsAdapting] = useState(false);
  const [performanceHistory, setPerformanceHistory] = useState<PerformanceMetrics[]>([]);

  const sessionDataRef = useRef<{
    startTime: Date;
    questionCount: number;
    correctAnswers: number;
    totalResponseTime: number;
    helpRequests: number;
    currentStreak: number;
  }>({
    startTime: new Date(),
    questionCount: 0,
    correctAnswers: 0,
    totalResponseTime: 0,
    helpRequests: 0,
    currentStreak: 0
  });

  // Load user's difficulty profile from database
  const loadDifficultyProfile = useCallback(async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('user_difficulty_profiles')
        .select('*')
        .eq('user_id', userId)
        .eq('category', category)
        .eq('grade', grade)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Failed to load difficulty profile:', error);
        return;
      }

      if (data) {
        setDifficultyProfile({
          ...data,
          last_updated: new Date(data.last_updated)
        });
      } else {
        // Create new profile
        const newProfile: DifficultyProfile = {
          user_id: userId,
          category,
          grade,
          current_level: 0.5, // Start at medium difficulty
          mastery_score: 0,
          learning_velocity: 0,
          strengths: [],
          weaknesses: [],
          last_updated: new Date()
        };
        setDifficultyProfile(newProfile);
      }
    } catch (error) {
      console.error('Failed to load difficulty profile:', error);
    }
  }, [userId, category, grade]);

  // Analyze learning behavior patterns
  const analyzeBehaviorPattern = useCallback((recentPerformance: PerformanceMetrics[]): AdaptiveBehaviorPattern => {
    if (recentPerformance.length < 3) {
      return {
        pattern_type: 'improving',
        confidence: 0.3,
        recommended_action: 'Mehr Daten sammeln',
        indicators: ['Zu wenige Datenpunkte für Analyse']
      };
    }

    const avgAccuracy = recentPerformance.reduce((sum, p) => sum + p.accuracy, 0) / recentPerformance.length;
    const avgResponseTime = recentPerformance.reduce((sum, p) => sum + p.response_time, 0) / recentPerformance.length;
    const recentAccuracy = recentPerformance.slice(-2).reduce((sum, p) => sum + p.accuracy, 0) / 2;
    const earlierAccuracy = recentPerformance.slice(0, -2).reduce((sum, p) => sum + p.accuracy, 0) / (recentPerformance.length - 2);
    
    const accuracyTrend = recentAccuracy - earlierAccuracy;
    const hasHighStreak = recentPerformance.some(p => p.streak_count >= 3);
    const hasLowAccuracy = avgAccuracy < 0.6;
    const hasSlowResponses = avgResponseTime > 30000; // 30 seconds
    const needsHelp = recentPerformance.some(p => p.help_requests > 2);

    let pattern_type: AdaptiveBehaviorPattern['pattern_type'];
    let confidence: number;
    let recommended_action: string;
    let indicators: string[] = [];

    if (hasLowAccuracy && hasSlowResponses) {
      pattern_type = 'struggling';
      confidence = 0.8;
      recommended_action = 'Schwierigkeit reduzieren und Unterstützung anbieten';
      indicators = ['Niedrige Genauigkeit', 'Langsame Antwortzeit'];
      if (needsHelp) indicators.push('Häufige Hilfeanfragen');
    } else if (avgAccuracy >= 0.85 && hasHighStreak) {
      pattern_type = 'thriving';
      confidence = 0.9;
      recommended_action = 'Schwierigkeit erhöhen für weitere Herausforderung';
      indicators = ['Hohe Genauigkeit', 'Lange Erfolgssträhne'];
    } else if (Math.abs(accuracyTrend) < 0.1 && avgAccuracy > 0.5 && avgAccuracy < 0.8) {
      pattern_type = 'plateauing';
      confidence = 0.7;
      recommended_action = 'Andere Lernansätze oder Themen einführen';
      indicators = ['Gleichbleibende Leistung', 'Mittlere Genauigkeit'];
    } else if (accuracyTrend > 0.1) {
      pattern_type = 'improving';
      confidence = 0.8;
      recommended_action = 'Aktuellen Ansatz beibehalten';
      indicators = ['Steigende Genauigkeit', 'Positive Entwicklung'];
    } else {
      pattern_type = 'plateauing';
      confidence = 0.5;
      recommended_action = 'Lernstrategie überprüfen';
      indicators = ['Unklare Entwicklung'];
    }

    return {
      pattern_type,
      confidence,
      recommended_action,
      indicators
    };
  }, []);

  // Calculate adaptive difficulty adjustment
  const calculateDifficultyAdjustment = useCallback((
    currentProfile: DifficultyProfile,
    performance: PerformanceMetrics,
    pattern: AdaptiveBehaviorPattern
  ): DifficultyAdjustment => {
    let adjustment = 0;
    let reason = '';
    const reasons: string[] = [];

    // Performance-based adjustments
    if (performance.accuracy >= 0.9 && performance.streak_count >= 3) {
      adjustment += 0.1;
      reasons.push('Hervorragende Leistung');
    } else if (performance.accuracy <= 0.4) {
      adjustment -= 0.15;
      reasons.push('Niedrige Genauigkeit');
    }

    // Response time considerations
    if (performance.response_time < 10000 && performance.accuracy >= 0.8) {
      adjustment += 0.05;
      reasons.push('Schnelle korrekte Antworten');
    } else if (performance.response_time > 45000) {
      adjustment -= 0.1;
      reasons.push('Lange Bearbeitungszeit');
    }

    // Behavior pattern adjustments
    switch (pattern.pattern_type) {
      case 'struggling':
        adjustment -= 0.2;
        reasons.push('Schwierigkeiten erkannt');
        break;
      case 'thriving':
        adjustment += 0.15;
        reasons.push('Exzellente Fortschritte');
        break;
      case 'plateauing':
        adjustment += Math.random() > 0.5 ? 0.05 : -0.05; // Small random change
        reasons.push('Abwechslung für Motivation');
        break;
      case 'improving':
        adjustment += 0.05;
        reasons.push('Positive Entwicklung');
        break;
    }

    // Help requests consideration
    if (performance.help_requests > 3) {
      adjustment -= 0.1;
      reasons.push('Häufige Hilfeanfragen');
    }

    // Clamp adjustment and calculate new level
    adjustment = Math.max(-0.3, Math.min(0.3, adjustment));
    const newLevel = Math.max(0.1, Math.min(1.0, currentProfile.current_level + adjustment));

    return {
      previous_level: currentProfile.current_level,
      new_level: newLevel,
      adjustment_reason: reasons.join(', '),
      confidence: pattern.confidence,
      recommended_topics: [] // Could be expanded based on analysis
    };
  }, []);

  // Update performance metrics
  const updatePerformance = useCallback((
    isCorrect: boolean,
    responseTime: number,
    usedHelp: boolean = false
  ) => {
    const session = sessionDataRef.current;
    session.questionCount++;
    session.totalResponseTime += responseTime;
    
    if (isCorrect) {
      session.correctAnswers++;
      session.currentStreak++;
    } else {
      session.currentStreak = 0;
    }
    
    if (usedHelp) {
      session.helpRequests++;
    }

    const newMetrics: PerformanceMetrics = {
      accuracy: session.correctAnswers / session.questionCount,
      response_time: session.totalResponseTime / session.questionCount,
      confidence_level: isCorrect ? Math.min(1.0, session.currentStreak * 0.2) : 0,
      help_requests: session.helpRequests,
      streak_count: session.currentStreak
    };

    setCurrentPerformance(newMetrics);
    setPerformanceHistory(prev => [...prev.slice(-9), newMetrics]); // Keep last 10 records
  }, []);

  // Apply user emoji feedback to adjust difficulty immediately
  const applyUserFeedback = useCallback(async (
    feedbackType: 'too_hard' | 'too_easy' | 'thumbs_up' | 'thumbs_down'
  ) => {
    if (!difficultyProfile) return;

    let adjustment = 0;
    let reason = '';
    
    switch (feedbackType) {
      case 'too_hard':
        adjustment = -0.15;
        reason = 'User feedback: Question too difficult';
        console.log('📉 Too hard - reducing difficulty significantly');
        break;
      case 'too_easy':
        adjustment = 0.15;
        reason = 'User feedback: Question too easy';
        console.log('📈 Too easy - increasing difficulty significantly');
        break;
      case 'thumbs_down':
        adjustment = -0.05;
        reason = 'User feedback: Negative experience';
        console.log('👎 Thumbs down - slight difficulty reduction');
        break;
      case 'thumbs_up':
        adjustment = 0.05;
        reason = 'User feedback: Positive experience';
        console.log('👍 Thumbs up - slight difficulty increase');
        break;
    }

    const newLevel = Math.max(0.1, Math.min(0.9, difficultyProfile.current_level + adjustment));
    
    const updatedProfile: DifficultyProfile = {
      ...difficultyProfile,
      current_level: newLevel,
      last_updated: new Date()
    };

    setDifficultyProfile(updatedProfile);

    // Save to database
    try {
      const { error } = await supabase
        .from('user_difficulty_profiles')
        .upsert({
          user_id: userId,
          category: category,
          grade: grade,
          current_level: newLevel,
          mastery_score: difficultyProfile.mastery_score,
          learning_velocity: difficultyProfile.learning_velocity,
          strengths: difficultyProfile.strengths,
          weaknesses: difficultyProfile.weaknesses,
          last_updated: new Date().toISOString()
        });

      if (error) throw error;

      setLastAdjustment({
        previous_level: difficultyProfile.current_level,
        new_level: newLevel,
        adjustment_reason: reason,
        confidence: 0.9,
        recommended_topics: []
      });

      console.log(`✅ Difficulty adjusted from ${difficultyProfile.current_level.toFixed(2)} to ${newLevel.toFixed(2)}`);
    } catch (error) {
      console.error('Failed to save feedback adjustment:', error);
    }
  }, [difficultyProfile, userId, category, grade]);

  // Perform adaptive difficulty adjustment
  const performAdaptiveAdjustment = useCallback(async (): Promise<DifficultyAdjustment | null> => {
    if (!difficultyProfile || isAdapting) return null;

    setIsAdapting(true);
    try {
      console.log('🧠 Performing adaptive difficulty adjustment');

      // Analyze behavior pattern
      const pattern = analyzeBehaviorPattern(performanceHistory);
      setBehaviorPattern(pattern);

      // Calculate adjustment
      const adjustment = calculateDifficultyAdjustment(
        difficultyProfile, 
        currentPerformance, 
        pattern
      );

      // Update difficulty profile
      const updatedProfile: DifficultyProfile = {
        ...difficultyProfile,
        current_level: adjustment.new_level,
        mastery_score: currentPerformance.accuracy,
        learning_velocity: performanceHistory.length >= 2 ? 
          performanceHistory[performanceHistory.length - 1].accuracy - performanceHistory[0].accuracy : 0,
        last_updated: new Date()
      };

      // Identify strengths and weaknesses based on recent performance
      const strengths: string[] = [];
      const weaknesses: string[] = [];

      if (currentPerformance.accuracy >= 0.8) strengths.push('Hohe Genauigkeit');
      if (currentPerformance.response_time <= 15000) strengths.push('Schnelle Bearbeitung');
      if (currentPerformance.streak_count >= 3) strengths.push('Konstante Leistung');

      if (currentPerformance.accuracy <= 0.5) weaknesses.push('Niedrige Genauigkeit');
      if (currentPerformance.response_time >= 30000) weaknesses.push('Langsame Bearbeitung');
      if (currentPerformance.help_requests >= 3) weaknesses.push('Viel Unterstützung nötig');

      updatedProfile.strengths = strengths;
      updatedProfile.weaknesses = weaknesses;

      setDifficultyProfile(updatedProfile);
      setLastAdjustment(adjustment);

      // Store updated profile in database
      await (supabase as any)
        .from('user_difficulty_profiles')
        .upsert({
          user_id: userId,
          category,
          grade,
          current_level: updatedProfile.current_level,
          mastery_score: updatedProfile.mastery_score,
          learning_velocity: updatedProfile.learning_velocity,
          strengths: updatedProfile.strengths,
          weaknesses: updatedProfile.weaknesses,
          last_updated: updatedProfile.last_updated.toISOString()
        });

      console.log(`✅ Difficulty adjusted from ${adjustment.previous_level.toFixed(2)} to ${adjustment.new_level.toFixed(2)}`);
      return adjustment;

    } catch (error) {
      console.error('❌ Adaptive adjustment failed:', error);
      return null;
    } finally {
      setIsAdapting(false);
    }
  }, [
    difficultyProfile, 
    isAdapting, 
    analyzeBehaviorPattern, 
    calculateDifficultyAdjustment,
    performanceHistory,
    currentPerformance,
    userId,
    category,
    grade
  ]);

  // Get recommended difficulty for next questions
  const getRecommendedDifficulty = useCallback((): number => {
    if (!difficultyProfile) return 0.5;
    return difficultyProfile.current_level;
  }, [difficultyProfile]);

  // Reset session data
  const resetSession = useCallback(() => {
    sessionDataRef.current = {
      startTime: new Date(),
      questionCount: 0,
      correctAnswers: 0,
      totalResponseTime: 0,
      helpRequests: 0,
      currentStreak: 0
    };
    setCurrentPerformance({
      accuracy: 0,
      response_time: 0,
      confidence_level: 0,
      help_requests: 0,
      streak_count: 0
    });
  }, []);

  // Initialize profile on mount
  useEffect(() => {
    loadDifficultyProfile();
  }, [loadDifficultyProfile]);

  return {
    // Profile & Metrics
    difficultyProfile,
    currentPerformance,
    performanceHistory,
    lastAdjustment,
    behaviorPattern,
    isAdapting,

    // Actions
    updatePerformance,
    performAdaptiveAdjustment,
    resetSession,
    getRecommendedDifficulty,
    applyUserFeedback,

    // Computed Properties
    shouldAdjust: performanceHistory.length >= 3 && !isAdapting,
    difficultyLevel: difficultyProfile?.current_level || 0.5,
    masteryLevel: difficultyProfile?.mastery_score || 0,
    learningTrend: difficultyProfile?.learning_velocity || 0,
    
    // Session Statistics
    sessionStats: {
      questionsAnswered: sessionDataRef.current.questionCount,
      currentAccuracy: sessionDataRef.current.questionCount > 0 ? 
        sessionDataRef.current.correctAnswers / sessionDataRef.current.questionCount : 0,
      currentStreak: sessionDataRef.current.currentStreak,
      sessionDuration: Date.now() - sessionDataRef.current.startTime.getTime()
    }
  };
}