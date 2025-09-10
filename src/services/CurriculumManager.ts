/**
 * Curriculum Manager for Math Template Generation
 * Handles curriculum mapping, gap analysis, and systematic template coverage
 */

export interface CurriculumItem {
  domain: string;
  subcategory: string;
  skills: string[];
  grade: number;
  quarter: string;
}

export interface TemplateGap {
  grade: number;
  quarter: string;
  domain: string;
  subcategory: string;
  difficulty: string;
  questionType: string;
  currentCount: number;
  targetCount: number;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface CurriculumCoverage {
  totalCombinations: number;
  coveredCombinations: number;
  coveragePercentage: number;
  gaps: TemplateGap[];
  recommendations: string[];
}

class CurriculumManager {
  private mathCurriculum: Record<number, Record<string, Record<string, string[]>>> = {
    1: {
      Q1: {
        'Zahlen & Operationen': [
          'Zählen bis 10',
          'Anzahlen vergleichen',
          'Plus/Minus im ZR 10 ohne Übergang'
        ],
        'Raum & Form': [
          'Kreis, Dreieck, Quadrat, Rechteck unterscheiden',
          'Formen erkennen und benennen'
        ],
        'Größen & Messen': [
          'Längen schätzen und vergleichen (unstandardisiert)',
          'Größer/kleiner/gleich bei Längen'
        ],
        'Daten & Zufall': [
          'Einfache Strichlisten',
          'Bilddiagramme lesen'
        ]
      },
      Q2: {
        'Zahlen & Operationen': [
          'Zählen bis 20',
          'Zahlen bis 20 darstellen und ordnen',
          'Plus/Minus im ZR 20 mit Zehnerübergang (strategisch)'
        ],
        'Raum & Form': [
          'rechts/links, oben/unten',
          'Muster fortsetzen'
        ],
        'Größen & Messen': [
          'Uhr (volle/halbe Stunde)',
          'Münzen bis 2 €'
        ],
        'Daten & Zufall': [
          'möglich – sicher – unmöglich',
          'Zufallssprache'
        ]
      },
      Q3: {
        'Zahlen & Operationen': [
          'Zahlen bis 100 erkunden',
          'Zehner/Einheiten verstehen',
          'Halbschriftliche Verfahren im ZR 100 (ohne Übergang)'
        ],
        'Raum & Form': [
          'Einfache Achsensymmetrien erkennen',
          'Symmetrische Figuren'
        ],
        'Größen & Messen': [
          'Messen mit Lineal',
          'Einheiten cm/m'
        ]
      },
      Q4: {
        'Zahlen & Operationen': [
          'Plus/Minus im ZR 100 mit Übergang',
          'Wiederholtes Addieren/Teilen in gleich große Gruppen'
        ],
        'Größen & Messen': [
          'Kalender, Wochentage/Monate',
          'einfache Zeitspannen'
        ],
        'Raum & Form': [
          'Flächen legen',
          'einfache Netze (Würfelbilder)'
        ]
      }
    },
    2: {
      Q1: {
        'Zahlen & Operationen': [
          'Halbschriftlich & schriftnah mit Übergang',
          '2er/5er/10er Reihen, Tausch-/Verbundaufgaben'
        ],
        'Größen & Messen': [
          'Einkaufssituationen bis 100 € (ohne Komma)',
          'Geld rechnen'
        ],
        'Raum & Form': [
          'Ecken, Kanten, Seiten',
          'Rechteck/Quadrat unterscheiden'
        ]
      },
      Q2: {
        'Zahlen & Operationen': [
          '1–10er Reihen (Netz), Umkehraufgaben',
          'Teilen als Aufteilen/Verteilen'
        ],
        'Größen & Messen': [
          'cm–m; min–h; €–Cent (ganzzahlig)',
          'Einheiten umrechnen'
        ],
        'Daten & Zufall': [
          'Säulen-/Bilddiagramme interpretieren',
          'Diagramme lesen'
        ]
      },
      Q3: {
        'Zahlen & Operationen': [
          'Standardverfahren (ZR 1000 vorbereiten)',
          'Kleines Einmaleins sicher anwenden'
        ],
        'Raum & Form': [
          'Umfang Rechteck/Quadrat (ganzzahlige Längen)',
          'Flächenberechnung einfach'
        ],
        'Größen & Messen': [
          'Addieren/Subtrahieren von Zeiten (ohne Datum)',
          'Zeitspannen berechnen'
        ]
      },
      Q4: {
        'Zahlen & Operationen': [
          'Stellenwert bis 1000',
          'Addition/Subtraktion im ZR 1000'
        ],
        'Daten & Zufall': [
          'einfache Experimente; Häufigkeiten',
          'Zufallsversuche'
        ]
      }
    },
    // ... Continue for grades 3-10
    3: {
      Q1: {
        'Zahlen & Operationen': [
          'Ordnen, Runden, Zahlstrahl',
          'mit Übergang im ZR 1000',
          '1×n/ n×1 mit Strategie (ohne Algorithmus)'
        ],
        'Größen & Messen': [
          'Formelverständnis U=2(a+b), A=a·b (ganzzahlig)',
          'Umfang und Fläche Rechteck'
        ]
      },
      Q2: {
        'Zahlen & Operationen': [
          'Teilen mit Rest; Beziehungen × ÷',
          'Einstelliger Faktor × mehrstellig'
        ],
        'Raum & Form': [
          'Recht-, Spitz-, Stumpfwinkel erkennen',
          'Winkel messen'
        ],
        'Daten & Zufall': [
          'Mittelwert (einfach), Modus; Säulen-/Liniendiagramm',
          'Statistische Auswertung'
        ]
      },
      Q3: {
        'Zahlen & Operationen': [
          'Einführung; einfache gleichnamige Vergleiche',
          'Brüche als Teile vom Ganzen'
        ],
        'Größen & Messen': [
          'Zeitspannen über Tagesgrenzen; Kalender',
          'Zeit und Termine'
        ],
        'Raum & Form': [
          'Achsensymmetrie & Parkettierungen',
          'Symmetrie und Muster'
        ]
      },
      Q4: {
        'Zahlen & Operationen': [
          'Einstelliger Divisor',
          'Komma bei Geld/Messwerten verstehen'
        ],
        'Daten & Zufall': [
          'relative Häufigkeit (intuitiv)',
          'Zufallsexperimente'
        ]
      }
    },
    4: {
      Q1: {
        'Zahlen & Operationen': [
          'Stellenwert, Runden, Zahlbeziehungen bis 1 Million',
          'mehrstellig × mehrstellig'
        ],
        'Größen & Messen': [
          'mm–cm–m–km; g–kg; ml–l; € mit Komma',
          'Einheiten & Umrechnungen'
        ],
        'Raum & Form': [
          'Vierecke, Dreiecke klassifizieren',
          'Geometrische Figuren'
        ]
      },
      Q2: {
        'Zahlen & Operationen': [
          'mehrstelliger Divisor (standard)',
          'Brüche als Dezimalzahlen (endliche)'
        ],
        'Größen & Messen': [
          'Netze, Oberflächen, Volumen (ganzzahlig)',
          'Volumen/Quader'
        ],
        'Daten & Zufall': [
          'Mittelwert/Median (einfach), Diagrammwahl',
          'Daten/Diagramme'
        ]
      },
      Q3: {
        'Zahlen & Operationen': [
          '+ − × ÷ (einfach, sachbezogen)',
          'Rechnen mit Dezimalzahlen'
        ],
        'Gleichungen & Funktionen': [
          'Muster/Regeln; Variable als Platzhalter',
          'Einfache Terme'
        ],
        'Raum & Form': [
          'Punkte lesen/setzen, einfache Wege',
          'Koordinatensystem (1. Quadrant)'
        ]
      },
      Q4: {
        'Zahlen & Operationen': [
          'Erweitern/Kürzen, gleichnamig addieren',
          'Bruchverständnis vertiefen'
        ],
        'Größen & Messen': [
          'Vergrößern/Verkleinern',
          'Skalen/Maßstab (einfach)'
        ],
        'Daten & Zufall': [
          'Baumdiagramm (1 Stufe) vorbereiten',
          'Zufall/Experimente'
        ]
      }
    }
    // Add grades 5-10 following the same pattern...
  };

  private questionTypes: string[] = ['multiple-choice', 'text-input', 'sort', 'match'];
  private difficulties: string[] = ['AFB I', 'AFB II', 'AFB III'];
  private targetTemplatesPerCombination = 8; // Target: 8 templates per unique combination

  /**
   * Analyze template coverage gaps in the database
   */
  async analyzeCoverage(existingTemplates?: any[]): Promise<CurriculumCoverage> {
    console.log('📊 Analyzing curriculum coverage...');
    
    // Get existing templates from database if not provided
    if (!existingTemplates) {
      const { supabase } = await import('@/lib/supabase');
      const { data } = await supabase
        .from('templates')
        .select('grade, quarter_app, domain, difficulty, question_type')
        .eq('status', 'ACTIVE');
      existingTemplates = data || [];
    }

    const gaps: TemplateGap[] = [];
    const totalCombinations = this.calculateTotalCombinations();
    let coveredCombinations = 0;

    // Group existing templates by key combination
    const existingMap = new Map<string, number>();
    existingTemplates.forEach(template => {
      const key = `${template.grade}-${template.quarter_app}-${template.domain}-${template.difficulty}-${template.question_type}`;
      existingMap.set(key, (existingMap.get(key) || 0) + 1);
    });

    // Check each possible combination
    for (const grade of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) {
      const gradeData = this.mathCurriculum[grade] || {};
      
      for (const quarter of ['Q1', 'Q2', 'Q3', 'Q4']) {
        const quarterData = gradeData[quarter] || {};
        
        for (const domain of Object.keys(quarterData)) {
          for (const subcategory of quarterData[domain] || []) {
            for (const difficulty of this.difficulties) {
              for (const questionType of this.questionTypes) {
                const key = `${grade}-${quarter}-${domain}-${difficulty}-${questionType}`;
                const currentCount = existingMap.get(key) || 0;
                
                if (currentCount >= this.targetTemplatesPerCombination) {
                  coveredCombinations++;
                } else {
                  gaps.push({
                    grade,
                    quarter,
                    domain,
                    subcategory,
                    difficulty,
                    questionType,
                    currentCount,
                    targetCount: this.targetTemplatesPerCombination,
                    priority: this.calculatePriority(grade, quarter, domain, currentCount)
                  });
                }
              }
            }
          }
        }
      }
    }

    const coveragePercentage = (coveredCombinations / totalCombinations) * 100;
    const recommendations = this.generateRecommendations(gaps);

    console.log(`📊 Coverage Analysis: ${coveredCombinations}/${totalCombinations} combinations (${coveragePercentage.toFixed(1)}%)`);
    
    return {
      totalCombinations,
      coveredCombinations,
      coveragePercentage,
      gaps: gaps.sort((a, b) => {
        const priorityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }),
      recommendations
    };
  }

  /**
   * Get prioritized list of templates to generate
   */
  getPriorityGenerationQueue(gaps: TemplateGap[], batchSize: number = 100): TemplateGap[] {
    return gaps
      .filter(gap => gap.priority === 'HIGH')
      .slice(0, batchSize)
      .concat(
        gaps
          .filter(gap => gap.priority === 'MEDIUM')
          .slice(0, Math.max(0, batchSize - gaps.filter(g => g.priority === 'HIGH').length))
      );
  }

  /**
   * Get curriculum context for a specific domain and grade
   */
  getCurriculumContext(grade: number, quarter: string, domain: string): string[] {
    const gradeData = this.mathCurriculum[grade];
    if (!gradeData) return [];
    
    const quarterData = gradeData[quarter];
    if (!quarterData) return [];
    
    return quarterData[domain] || [];
  }

  /**
   * Validate if a template matches curriculum requirements
   */
  validateCurriculumCompliance(template: any): { isCompliant: boolean; issues: string[] } {
    const issues: string[] = [];
    
    // Check grade appropriateness
    if (template.grade < 1 || template.grade > 10) {
      issues.push(`Invalid grade: ${template.grade}`);
    }
    
    // Check domain exists for grade/quarter
    const context = this.getCurriculumContext(template.grade, template.quarter_app, template.domain);
    if (context.length === 0) {
      issues.push(`Domain "${template.domain}" not found for Grade ${template.grade} ${template.quarter_app}`);
    }
    
    // Check for visual elements (forbidden except Grade 1 emojis)
    if (template.student_prompt) {
      const hasVisual = this.containsVisualElements(template.student_prompt, template.grade);
      if (hasVisual) {
        issues.push('Contains forbidden visual elements');
      }
    }
    
    // Check complexity for grade level
    if (!this.isAgeAppropriate(template.student_prompt, template.grade)) {
      issues.push('Content too complex for grade level');
    }
    
    return {
      isCompliant: issues.length === 0,
      issues
    };
  }

  private calculateTotalCombinations(): number {
    // 10 grades × 4 quarters × 4 domains × 3 difficulties × 4 question types
    // Actually count based on curriculum structure
    let total = 0;
    
    for (const grade of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) {
      const gradeData = this.mathCurriculum[grade] || {};
      
      for (const quarter of ['Q1', 'Q2', 'Q3', 'Q4']) {
        const quarterData = gradeData[quarter] || {};
        const domainCount = Object.keys(quarterData).length;
        
        // Each domain × difficulties × question types
        total += domainCount * this.difficulties.length * this.questionTypes.length;
      }
    }
    
    return total;
  }

  private calculatePriority(grade: number, quarter: string, domain: string, currentCount: number): 'HIGH' | 'MEDIUM' | 'LOW' {
    // High priority for core math domains with no templates
    if (currentCount === 0 && ['Zahlen & Operationen', 'Größen & Messen'].includes(domain)) {
      return 'HIGH';
    }
    
    // High priority for primary grades (1-4)
    if (grade <= 4 && currentCount < 2) {
      return 'HIGH';
    }
    
    // Medium priority for partial coverage
    if (currentCount > 0 && currentCount < 4) {
      return 'MEDIUM';
    }
    
    return 'LOW';
  }

  private generateRecommendations(gaps: TemplateGap[]): string[] {
    const recommendations: string[] = [];
    
    const highPriorityCount = gaps.filter(g => g.priority === 'HIGH').length;
    if (highPriorityCount > 0) {
      recommendations.push(`🚨 ${highPriorityCount} high-priority gaps need immediate attention`);
    }
    
    // Grade-specific recommendations
    const gradeGaps = new Map<number, number>();
    gaps.forEach(gap => {
      gradeGaps.set(gap.grade, (gradeGaps.get(gap.grade) || 0) + 1);
    });
    
    for (const [grade, count] of gradeGaps.entries()) {
      if (count > 50) {
        recommendations.push(`📚 Klasse ${grade}: ${count} gaps - prioritize full grade coverage`);
      }
    }
    
    // Domain recommendations
    const domainGaps = new Map<string, number>();
    gaps.forEach(gap => {
      domainGaps.set(gap.domain, (domainGaps.get(gap.domain) || 0) + 1);
    });
    
    for (const [domain, count] of domainGaps.entries()) {
      if (count > 100) {
        recommendations.push(`🔢 ${domain}: ${count} gaps - needs systematic generation`);
      }
    }
    
    return recommendations;
  }

  private containsVisualElements(question: string, grade: number): boolean {
    const visualWords = [
      'zeichne', 'male', 'konstruiere', 'skizziere', 'bild', 'diagramm',
      'grafik', 'welches bild', 'netz', 'ordne zu', 'verbinde'
    ];
    
    // Allow emojis for grade 1
    if (grade === 1 && /[🍎🍌⭐🔢]/.test(question)) {
      return false;
    }
    
    return visualWords.some(word => 
      question.toLowerCase().includes(word)
    );
  }

  private isAgeAppropriate(question: string, grade: number): boolean {
    const complexWords = {
      1: [],
      2: [],
      3: ['bruch', 'dezimal'],
      4: ['prozent', 'dezimal', 'variable'],
      5: ['funktion', 'gleichung', 'term'],
      6: ['potenz', 'wurzel'],
      7: ['sinus', 'kosinus', 'tangens'],
      8: ['logarithmus', 'exponential'],
      9: ['integral', 'ableitung'],
      10: ['grenzwert', 'konvergenz']
    };
    
    const allowedWords = new Set<string>();
    for (let g = 1; g <= grade; g++) {
      complexWords[g]?.forEach(word => allowedWords.add(word));
    }
    
    const questionWords = question.toLowerCase().split(/\s+/);
    return !questionWords.some(word => 
      Object.values(complexWords).flat().includes(word) && !allowedWords.has(word)
    );
  }

  /**
   * Get complete curriculum structure for grades 1-10
   */
  getFullCurriculumStructure() {
    return this.mathCurriculum;
  }

  /**
   * Get statistics about curriculum coverage
   */
  getCurriculumStats() {
    const stats = {
      grades: Object.keys(this.mathCurriculum).length,
      totalDomains: new Set<string>(),
      totalQuarters: new Set<string>(),
      totalSkills: 0
    };

    Object.values(this.mathCurriculum).forEach(gradeData => {
      Object.entries(gradeData).forEach(([quarter, domains]) => {
        stats.totalQuarters.add(quarter);
        Object.entries(domains).forEach(([domain, skills]) => {
          stats.totalDomains.add(domain);
          stats.totalSkills += skills.length;
        });
      });
    });

    return {
      ...stats,
      totalDomains: stats.totalDomains.size,
      totalQuarters: stats.totalQuarters.size
    };
  }
}

export const curriculumManager = new CurriculumManager();