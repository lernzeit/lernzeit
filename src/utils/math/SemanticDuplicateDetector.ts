/**
 * Semantische Duplikaterkennung für Mathematik-Aufgaben
 * Phase 1: Verhindert doppelte Fragen durch intelligente Erkennung
 */

import { SelectionQuestion } from '@/types/questionTypes';
import { supabase } from '@/lib/supabase';

export interface MathExpression {
  numbers: number[];
  operators: string[];
  type: 'simple' | 'complex' | 'word_problem' | 'geometry';
}

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  similarity: number;
  fingerprint: string;
  matchedFingerprint?: string;
}

export class SemanticDuplicateDetector {
  private sessionHistory: Set<string> = new Set();
  private userHistory: Map<string, Set<string>> = new Map();
  
  /**
   * Initialisiert den Detector mit Benutzer-Historie
   */
  async initialize(userId: string, grade: number): Promise<void> {
    try {
      // Lade die letzten 1000 Fragen des Benutzers
      const { data, error } = await supabase
        .from('question_history')
        .select('question_fingerprint, created_at')
        .eq('user_id', userId)
        .eq('grade', grade)
        .order('created_at', { ascending: false })
        .limit(1000);
      
      if (error) {
        console.error('Fehler beim Laden der Historie:', error);
        return;
      }
      
      // Explizite Typ-Behandlung
      const questions = data as Array<{ question_fingerprint: string; created_at: string }> | null;
      const userFingerprints = new Set<string>(questions?.map(h => h.question_fingerprint) || []);
      this.userHistory.set(`${userId}_${grade}`, userFingerprints);
      
      console.log(`📚 Loaded ${userFingerprints.size} historical questions for user ${userId}, grade ${grade}`);
    } catch (error) {
      console.error('Error initializing duplicate detector:', error);
    }
  }
  
  /**
   * Prüft ob eine Frage ein Duplikat ist
   */
  checkDuplicate(
    question: string, 
    userId: string, 
    grade: number,
    existingQuestions: string[] = []
  ): DuplicateCheckResult {
    const fingerprint = this.generateFingerprint(question);
    
    // Prüfe Session-Historie
    if (this.sessionHistory.has(fingerprint)) {
      return {
        isDuplicate: true,
        similarity: 1.0,
        fingerprint,
        matchedFingerprint: fingerprint
      };
    }
    
    // Prüfe Benutzer-Historie
    const userKey = `${userId}_${grade}`;
    const userFingerprints = this.userHistory.get(userKey) || new Set();
    
    if (userFingerprints.has(fingerprint)) {
      return {
        isDuplicate: true,
        similarity: 1.0,
        fingerprint,
        matchedFingerprint: fingerprint
      };
    }
    
    // Prüfe gegen übergebene existierende Fragen
    for (const existing of existingQuestions) {
      const existingFingerprint = this.generateFingerprint(existing);
      if (fingerprint === existingFingerprint) {
        return {
          isDuplicate: true,
          similarity: 1.0,
          fingerprint,
          matchedFingerprint: existingFingerprint
        };
      }
      
      // Prüfe auch semantische Ähnlichkeit
      const similarity = this.calculateSimilarity(question, existing);
      if (similarity > 0.85) {
        return {
          isDuplicate: true,
          similarity,
          fingerprint,
          matchedFingerprint: existingFingerprint
        };
      }
    }
    
    return {
      isDuplicate: false,
      similarity: 0,
      fingerprint
    };
  }
  
  /**
   * Generiert einen eindeutigen Fingerprint für eine Frage
   */
  generateFingerprint(question: string): string {
    const parsed = this.parseQuestion(question);
    
    if (parsed.type === 'simple' || parsed.type === 'complex') {
      // Sortiere Zahlen für kommutative Operationen
      const sortedNumbers = [...parsed.numbers].sort((a, b) => a - b);
      const operatorString = parsed.operators.sort().join('');
      
      // Berücksichtige Kommutativität
      if (this.isCommutative(parsed.operators)) {
        return `math_${parsed.type}_${sortedNumbers.join('_')}_${operatorString}`;
      } else {
        // Bei nicht-kommutativen Operationen behalte die Reihenfolge
        return `math_${parsed.type}_${parsed.numbers.join('_')}_${parsed.operators.join('_')}`;
      }
    }
    
    if (parsed.type === 'geometry') {
      const dimensions = parsed.numbers.sort((a, b) => a - b);
      const geoType = this.detectGeometryType(question);
      return `geo_${geoType}_${dimensions.join('_')}`;
    }
    
    if (parsed.type === 'word_problem') {
      const numbers = parsed.numbers.sort((a, b) => a - b);
      const problemType = this.detectWordProblemType(question);
      return `word_${problemType}_${numbers.join('_')}`;
    }
    
    // Fallback: Hash der normalisierten Frage
    return `generic_${this.hashString(this.normalizeQuestion(question))}`;
  }
  
  /**
   * Parst eine Frage in ihre Bestandteile
   */
  private parseQuestion(question: string): MathExpression {
    const normalized = this.normalizeQuestion(question);
    
    // Extrahiere alle Zahlen
    const numbers = (normalized.match(/\d+(\.\d+)?/g) || [])
      .map(n => parseFloat(n));
    
    // Extrahiere Operatoren
    const operators = (normalized.match(/[+\-×*÷/:]/g) || []);
    
    // Bestimme den Typ
    let type: MathExpression['type'] = 'simple';
    
    if (normalized.includes('umfang') || normalized.includes('fläche') || 
        normalized.includes('rechteck') || normalized.includes('quadrat')) {
      type = 'geometry';
    } else if (normalized.includes('hat') || normalized.includes('bekommt') || 
               normalized.includes('kauft') || normalized.includes('verteilt')) {
      type = 'word_problem';
    } else if (operators.length > 1) {
      type = 'complex';
    }
    
    return { numbers, operators, type };
  }
  
  /**
   * Normalisiert eine Frage für besseren Vergleich
   */
  private normalizeQuestion(question: string): string {
    return question
      .toLowerCase()
      .replace(/[,\.]/g, '.') // Normalisiere Dezimalzeichen
      .replace(/\s+/g, ' ')   // Normalisiere Leerzeichen
      .replace(/\?/g, '')     // Entferne Fragezeichen
      .replace(/×/g, '*')     // Normalisiere Multiplikationszeichen
      .replace(/÷/g, '/')     // Normalisiere Divisionszeichen
      .replace(/:/g, '/')     // Normalisiere Divisionszeichen
      .trim();
  }
  
  /**
   * Berechnet die semantische Ähnlichkeit zweier Fragen
   */
  calculateSimilarity(q1: string, q2: string): number {
    const parsed1 = this.parseQuestion(q1);
    const parsed2 = this.parseQuestion(q2);
    
    // Verschiedene Typen sind nicht ähnlich
    if (parsed1.type !== parsed2.type) {
      return 0;
    }
    
    // Vergleiche Zahlen
    const numbers1 = new Set(parsed1.numbers);
    const numbers2 = new Set(parsed2.numbers);
    const numberOverlap = this.setOverlap(numbers1, numbers2);
    
    // Vergleiche Operatoren
    const ops1 = new Set(parsed1.operators);
    const ops2 = new Set(parsed2.operators);
    const opOverlap = this.setOverlap(ops1, ops2);
    
    // Gewichtete Ähnlichkeit
    const similarity = (numberOverlap * 0.7) + (opOverlap * 0.3);
    
    // Bonus für exakt gleiche Struktur
    if (parsed1.numbers.length === parsed2.numbers.length &&
        parsed1.operators.length === parsed2.operators.length) {
      return Math.min(1.0, similarity + 0.1);
    }
    
    return similarity;
  }
  
  /**
   * Berechnet die Überlappung zweier Sets
   */
  private setOverlap<T>(set1: Set<T>, set2: Set<T>): number {
    if (set1.size === 0 || set2.size === 0) return 0;
    
    let overlap = 0;
    for (const item of set1) {
      if (set2.has(item)) overlap++;
    }
    
    return overlap / Math.max(set1.size, set2.size);
  }
  
  /**
   * Prüft ob Operatoren kommutativ sind
   */
  private isCommutative(operators: string[]): boolean {
    const nonCommutative = ['-', '/', '÷', ':'];
    return !operators.some(op => nonCommutative.includes(op));
  }
  
  /**
   * Erkennt den Geometrie-Typ
   */
  private detectGeometryType(question: string): string {
    const normalized = question.toLowerCase();
    
    if (normalized.includes('umfang')) return 'perimeter';
    if (normalized.includes('fläche')) return 'area';
    if (normalized.includes('volumen')) return 'volume';
    
    return 'unknown';
  }
  
  /**
   * Erkennt den Textaufgaben-Typ
   */
  private detectWordProblemType(question: string): string {
    const normalized = question.toLowerCase();
    
    if (normalized.includes('bekommt') || normalized.includes('dazu')) return 'addition';
    if (normalized.includes('gibt ab') || normalized.includes('verliert')) return 'subtraction';
    if (normalized.includes('mal') || normalized.includes('jeweils')) return 'multiplication';
    if (normalized.includes('verteilt') || normalized.includes('aufgeteilt')) return 'division';
    
    return 'mixed';
  }
  
  /**
   * Einfacher String-Hash für Fallback
   */
  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  }
  
  /**
   * Speichert eine neue Frage in der Historie
   */
  async saveQuestion(
    question: string, 
    userId: string, 
    grade: number
  ): Promise<void> {
    const fingerprint = this.generateFingerprint(question);
    
    // Füge zur Session-Historie hinzu
    this.sessionHistory.add(fingerprint);
    
    // Füge zur Benutzer-Historie hinzu
    const userKey = `${userId}_${grade}`;
    if (!this.userHistory.has(userKey)) {
      this.userHistory.set(userKey, new Set());
    }
    this.userHistory.get(userKey)!.add(fingerprint);
    
    // Speichere in Datenbank
    try {
      await supabase
        .from('question_history')
        .insert({
          user_id: userId,
          question_fingerprint: fingerprint,
          grade: grade,
          question_text: question,
          created_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('Error saving question to history:', error);
    }
  }
  
  /**
   * Gibt Statistiken über die aktuelle Session zurück
   */
  getSessionStats(): {
    totalQuestions: number;
    uniqueFingerprints: number;
    duplicateRate: number;
  } {
    const total = this.sessionHistory.size;
    return {
      totalQuestions: total,
      uniqueFingerprints: total,
      duplicateRate: 0 // In der Session gibt es keine Duplikate durch das Set
    };
  }
}
