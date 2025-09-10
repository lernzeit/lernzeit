import { useState, useCallback, useRef } from 'react';

// PHASE 4: Session-based Duplicate Prevention Hook
interface UsedTemplate {
  id: string;
  question: string;
  timestamp: number;
  similarity?: number;
}

interface DuplicatePreventionOptions {
  maxSessionSize?: number;
  similarityThreshold?: number;
  cooldownMinutes?: number;
}

export function useSessionDuplicatePrevention(options: DuplicatePreventionOptions = {}) {
  const {
    maxSessionSize = 50,
    similarityThreshold = 0.8,
    cooldownMinutes = 30
  } = options;

  const [usedTemplates, setUsedTemplates] = useState<UsedTemplate[]>([]);
  const sessionId = useRef<string>(generateSessionId());

  const addUsedTemplate = useCallback((template: { id?: string; question: string }) => {
    const newUsed: UsedTemplate = {
      id: template.id || generateTemplateId(template.question),
      question: template.question,
      timestamp: Date.now()
    };

    setUsedTemplates(prev => {
      const updated = [...prev, newUsed];
      
      // Keep only the most recent templates within session limit
      if (updated.length > maxSessionSize) {
        return updated.slice(-maxSessionSize);
      }
      
      return updated;
    });
  }, [maxSessionSize]);

  const isTemplateDuplicate = useCallback((template: { id?: string; question: string }): boolean => {
    const now = Date.now();
    const cooldownMs = cooldownMinutes * 60 * 1000;

    // Check exact ID match
    if (template.id) {
      const exactMatch = usedTemplates.find(used => 
        used.id === template.id && 
        (now - used.timestamp) < cooldownMs
      );
      if (exactMatch) {
        console.log(`🚫 Duplicate by ID: ${template.id}`);
        return true;
      }
    }

    // Check similarity by question text
    for (const used of usedTemplates) {
      if ((now - used.timestamp) < cooldownMs) {
        const similarity = calculateTextSimilarity(template.question, used.question);
        if (similarity >= similarityThreshold) {
          console.log(`🚫 Duplicate by similarity: ${similarity.toFixed(2)} >= ${similarityThreshold}`);
          return true;
        }
      }
    }

    return false;
  }, [usedTemplates, cooldownMinutes, similarityThreshold]);

  const filterDuplicates = useCallback(<T extends { id?: string; question: string }>
    (templates: T[]
  ): T[] => {
    const filtered: T[] = [];
    
    for (const template of templates) {
      if (!isTemplateDuplicate(template)) {
        filtered.push(template);
        // Automatically add to used list
        addUsedTemplate(template);
      } else {
        console.log(`🚫 Filtered duplicate: ${template.question.substring(0, 50)}...`);
      }
    }
    
    console.log(`📊 Duplicate Prevention: ${templates.length} → ${filtered.length} (removed ${templates.length - filtered.length})`);
    return filtered;
  }, [isTemplateDuplicate, addUsedTemplate]);

  const clearSession = useCallback(() => {
    setUsedTemplates([]);
    sessionId.current = generateSessionId();
    console.log(`🔄 Session cleared, new ID: ${sessionId.current}`);
  }, []);

  const getSessionStats = useCallback(() => {
    const now = Date.now();
    const cooldownMs = cooldownMinutes * 60 * 1000;
    const activeTemplates = usedTemplates.filter(used => (now - used.timestamp) < cooldownMs);
    
    return {
      sessionId: sessionId.current,
      totalUsed: usedTemplates.length,
      activeInCooldown: activeTemplates.length,
      oldestTimestamp: usedTemplates.length > 0 ? Math.min(...usedTemplates.map(t => t.timestamp)) : null,
      newestTimestamp: usedTemplates.length > 0 ? Math.max(...usedTemplates.map(t => t.timestamp)) : null
    };
  }, [usedTemplates, cooldownMinutes]);

  return {
    sessionId: sessionId.current,
    usedTemplates,
    addUsedTemplate,
    isTemplateDuplicate,
    filterDuplicates,
    clearSession,
    getSessionStats
  };
}

// Helper functions
function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function generateTemplateId(question: string): string {
  // Simple hash of question text
  let hash = 0;
  for (let i = 0; i < question.length; i++) {
    const char = question.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return `tpl_${Math.abs(hash).toString(36)}`;
}

function calculateTextSimilarity(text1: string, text2: string): number {
  // Normalize texts
  const normalize = (text: string) => text.toLowerCase()
    .replace(/[^\\w\\s]/g, '')
    .replace(/\\s+/g, ' ')
    .trim();
    
  const norm1 = normalize(text1);
  const norm2 = normalize(text2);
  
  // Exact match
  if (norm1 === norm2) return 1.0;
  
  // Levenshtein distance-based similarity
  const maxLength = Math.max(norm1.length, norm2.length);
  if (maxLength === 0) return 1.0;
  
  const distance = levenshteinDistance(norm1, norm2);
  return 1 - (distance / maxLength);
}

function levenshteinDistance(str1: string, str2: string): number {
  const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
  
  for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
  
  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      const substitutionCost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1, // deletion
        matrix[j - 1][i] + 1, // insertion
        matrix[j - 1][i - 1] + substitutionCost // substitution
      );
    }
  }
  
  return matrix[str2.length][str1.length];
}
