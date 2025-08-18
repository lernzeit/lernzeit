// Knowledge system for template generation - Real curriculum data
export interface KnowledgeCard {
  id: string;
  grade: number;
  quarter: string;
  domain: string;
  subcategory: string;
  skill: string;
  tags: string[];
  text: string;
}

export interface Blueprint {
  domain: string;
  template: string;
  structure: string;
}

// Vollständige Curriculum-Daten aus den benutzerdefinierten Anweisungen
const CURRICULUM_KNOWLEDGE_CARDS: KnowledgeCard[] = [
  // Klasse 1 Q1
  {
    id: "G1-Q1-ZA-ab13a721",
    grade: 1, quarter: "Q1", domain: "Zahlen & Operationen", subcategory: "Zahlvorstellung/Zählen",
    skill: "Zählen bis 10; Anzahlen vergleichen", tags: ["Zählen", "ZR_10"],
    text: "Klasse 1: Zahlen & Operationen – Zahlvorstellung/Zählen | Skill: Zählen bis 10; Anzahlen vergleichen. Tags: Zählen, ZR_10."
  },
  {
    id: "G1-Q1-ZA-23f6f2c9",
    grade: 1, quarter: "Q1", domain: "Zahlen & Operationen", subcategory: "Add/Sub (mental)",
    skill: "Plus/Minus im ZR 10 ohne Übergang", tags: ["Addition", "Subtraktion", "ZR_10"],
    text: "Klasse 1: Zahlen & Operationen – Add/Sub (mental) | Skill: Plus/Minus im ZR 10 ohne Übergang. Tags: Addition, Subtraktion, ZR_10."
  },
  {
    id: "G1-Q1-RA-cd1c87a1",
    grade: 1, quarter: "Q1", domain: "Raum & Form", subcategory: "Formen erkennen",
    skill: "Kreis, Dreieck, Quadrat, Rechteck unterscheiden", tags: ["Formen", "Eigenschaften"],
    text: "Klasse 1: Raum & Form – Formen erkennen | Skill: Kreis, Dreieck, Quadrat, Rechteck unterscheiden. Tags: Formen, Eigenschaften."
  },
  {
    id: "G1-Q1-GR-31ade5b6",
    grade: 1, quarter: "Q1", domain: "Größen & Messen", subcategory: "Messen/Schätzen",
    skill: "Längen schätzen und vergleichen (unstandardisiert)", tags: ["Länge", "Schätzen"],
    text: "Klasse 1: Größen & Messen – Messen/Schätzen | Skill: Längen schätzen und vergleichen (unstandardisiert). Tags: Länge, Schätzen."
  },
  {
    id: "G1-Q1-DA-bea86e75",
    grade: 1, quarter: "Q1", domain: "Daten & Zufall", subcategory: "Daten erfassen",
    skill: "Einfache Strichlisten und Bilddiagramme", tags: ["Diagramm", "Strichliste"],
    text: "Klasse 1: Daten & Zufall – Daten erfassen | Skill: Einfache Strichlisten und Bilddiagramme. Tags: Diagramm, Strichliste."
  },
  
  // Klasse 1 Q2
  {
    id: "G1-Q2-ZA-4acd1a9a",
    grade: 1, quarter: "Q2", domain: "Zahlen & Operationen", subcategory: "Zahlvorstellung/Stellenwert",
    skill: "Zahlen bis 20 darstellen, ordnen", tags: ["Stellenwert", "ZR_20"],
    text: "Klasse 1: Zahlen & Operationen – Zahlvorstellung/Stellenwert | Skill: Zahlen bis 20 darstellen, ordnen. Tags: Stellenwert, ZR_20."
  },
  {
    id: "G1-Q2-ZA-f7ecc910",
    grade: 1, quarter: "Q2", domain: "Zahlen & Operationen", subcategory: "Add/Sub (Strategien)",
    skill: "Plus/Minus im ZR 20 mit Zehnerübergang (strategisch)", tags: ["Zehnerübergang", "ZR_20"],
    text: "Klasse 1: Zahlen & Operationen – Add/Sub (Strategien) | Skill: Plus/Minus im ZR 20 mit Zehnerübergang (strategisch). Tags: Zehnerübergang, ZR_20."
  },
  {
    id: "G1-Q2-RA-1f78e94c",
    grade: 1, quarter: "Q2", domain: "Raum & Form", subcategory: "Lagebeziehungen",
    skill: "rechts/links, oben/unten; Muster fortsetzen", tags: ["Muster", "Lage"],
    text: "Klasse 1: Raum & Form – Lagebeziehungen | Skill: rechts/links, oben/unten; Muster fortsetzen. Tags: Muster, Lage."
  },
  {
    id: "G1-Q2-GR-3407d972",
    grade: 1, quarter: "Q2", domain: "Größen & Messen", subcategory: "Zeit/Geld",
    skill: "Uhr (volle/halbe Stunde), Münzen bis 2 €", tags: ["Zeit", "Geld"],
    text: "Klasse 1: Größen & Messen – Zeit/Geld | Skill: Uhr (volle/halbe Stunde), Münzen bis 2 €. Tags: Zeit, Geld."
  },

  // Klasse 2 Q1
  {
    id: "G2-Q1-ZA-ab12c4ec",
    grade: 2, quarter: "Q1", domain: "Zahlen & Operationen", subcategory: "Add/Sub im ZR 100",
    skill: "Halbschriftlich & schriftnah mit Übergang", tags: ["Addition", "Subtraktion", "ZR_100"],
    text: "Klasse 2: Zahlen & Operationen – Add/Sub im ZR 100 | Skill: Halbschriftlich & schriftnah mit Übergang. Tags: Addition, Subtraktion, ZR_100."
  },
  {
    id: "G2-Q1-ZA-6c3b1af6",
    grade: 2, quarter: "Q1", domain: "Zahlen & Operationen", subcategory: "Einmaleins (Aufbau)",
    skill: "2er/5er/10er Reihen, Tausch-/Verbundaufgaben", tags: ["Einmaleins", "ZR_100"],
    text: "Klasse 2: Zahlen & Operationen – Einmaleins (Aufbau) | Skill: 2er/5er/10er Reihen, Tausch-/Verbundaufgaben. Tags: Einmaleins, ZR_100."
  },
  {
    id: "G2-Q1-GR-7d9cb502",
    grade: 2, quarter: "Q1", domain: "Größen & Messen", subcategory: "Geld/Euro",
    skill: "Einkaufssituationen bis 100 € (ohne Komma)", tags: ["Geld"],
    text: "Klasse 2: Größen & Messen – Geld/Euro | Skill: Einkaufssituationen bis 100 € (ohne Komma). Tags: Geld."
  },
  {
    id: "G2-Q1-RA-672e6501",
    grade: 2, quarter: "Q1", domain: "Raum & Form", subcategory: "Geometrische Grundbegriffe",
    skill: "Ecken, Kanten, Seiten; Rechteck/Quadrat", tags: ["Eigenschaften"],
    text: "Klasse 2: Raum & Form – Geometrische Grundbegriffe | Skill: Ecken, Kanten, Seiten; Rechteck/Quadrat. Tags: Eigenschaften."
  },

  // Klasse 3 Q1
  {
    id: "G3-Q1-ZA-405459f4",
    grade: 3, quarter: "Q1", domain: "Zahlen & Operationen", subcategory: "ZR 1000 sicher",
    skill: "Ordnen, Runden, Zahlstrahl", tags: ["Runden", "ZR_1000"],
    text: "Klasse 3: Zahlen & Operationen – ZR 1000 sicher | Skill: Ordnen, Runden, Zahlstrahl. Tags: Runden, ZR_1000."
  },
  {
    id: "G3-Q1-ZA-d6d8b8f2",
    grade: 3, quarter: "Q1", domain: "Zahlen & Operationen", subcategory: "Schriftliche Addition/Subtraktion",
    skill: "mit Übergang im ZR 1000", tags: ["Schriftlich", "ZR_1000"],
    text: "Klasse 3: Zahlen & Operationen – Schriftliche Addition/Subtraktion | Skill: mit Übergang im ZR 1000. Tags: Schriftlich, ZR_1000."
  },
  {
    id: "G3-Q1-ZA-5b267fd6",
    grade: 3, quarter: "Q1", domain: "Zahlen & Operationen", subcategory: "Multiplikation (mehrstellig)",
    skill: "1×n/ n×1 mit Strategie (ohne Algorithmus)", tags: ["Multiplikation"],
    text: "Klasse 3: Zahlen & Operationen – Multiplikation (mehrstellig) | Skill: 1×n/ n×1 mit Strategie (ohne Algorithmus). Tags: Multiplikation."
  },
  {
    id: "G3-Q1-GR-13d08a8f",
    grade: 3, quarter: "Q1", domain: "Größen & Messen", subcategory: "Fläche/Umfang Rechteck",
    skill: "Formelverständnis U=2(a+b), A=a·b (ganzzahlig)", tags: ["Umfang", "Fläche"],
    text: "Klasse 3: Zahlen & Operationen – Fläche/Umfang Rechteck | Skill: Formelverständnis U=2(a+b), A=a·b (ganzzahlig). Tags: Umfang, Fläche."
  },

  // Klasse 4 Q1
  {
    id: "G4-Q1-ZA-fe318a05",
    grade: 4, quarter: "Q1", domain: "Zahlen & Operationen", subcategory: "ZR 1 Mio",
    skill: "Stellenwert, Runden, Zahlbeziehungen", tags: ["ZR_1000000"],
    text: "Klasse 4: Zahlen & Operationen – ZR 1 Mio | Skill: Stellenwert, Runden, Zahlbeziehungen. Tags: ZR_1000000."
  },
  {
    id: "G4-Q1-ZA-d5f9fc38",
    grade: 4, quarter: "Q1", domain: "Zahlen & Operationen", subcategory: "Schriftliche Multiplikation",
    skill: "mehrstellig × mehrstellig", tags: ["Schriftlich", "Multiplikation"],
    text: "Klasse 4: Zahlen & Operationen – Schriftliche Multiplikation | Skill: mehrstellig × mehrstellig. Tags: Schriftlich, Multiplikation."
  },
  {
    id: "G4-Q4-ZA-ed1f466d",
    grade: 4, quarter: "Q4", domain: "Zahlen & Operationen", subcategory: "Bruchverständnis vertiefen",
    skill: "Erweitern/Kürzen, gleichnamig addieren", tags: ["Brüche"],
    text: "Klasse 4: Zahlen & Operationen – Bruchverständnis vertiefen | Skill: Erweitern/Kürzen, gleichnamig addieren. Tags: Brüche."
  },

  // Klasse 5 Q1
  {
    id: "G5-Q1-ZA-78895d27",
    grade: 5, quarter: "Q1", domain: "Zahlen & Operationen", subcategory: "Negative Zahlen",
    skill: "Zahlengerade, Vergleiche, Addition/Subtraktion", tags: ["Rationale", "Negative"],
    text: "Klasse 5: Zahlen & Operationen – Negative Zahlen | Skill: Zahlengerade, Vergleiche, Addition/Subtraktion. Tags: Rationale, Negative."
  },
  {
    id: "G5-Q1-ZA-2765bbbb",
    grade: 5, quarter: "Q1", domain: "Zahlen & Operationen", subcategory: "Brüche/Dezimalzahlen",
    skill: "Erweitern/Kürzen, Vergleich; Umwandlung", tags: ["Brüche", "Dezimalzahlen"],
    text: "Klasse 5: Zahlen & Operationen – Brüche/Dezimalzahlen | Skill: Erweitern/Kürzen, Vergleich; Umwandlung. Tags: Brüche, Dezimalzahlen."
  },
  {
    id: "G5-Q1-GL-4086937d",
    grade: 5, quarter: "Q1", domain: "Gleichungen & Funktionen", subcategory: "Terme/Variable",
    skill: "Termwert, einfache Umformungen", tags: ["Terme"],
    text: "Klasse 5: Gleichungen & Funktionen – Terme/Variable | Skill: Termwert, einfache Umformungen. Tags: Terme."
  },
  {
    id: "G5-Q1-RA-2b27fcfa",
    grade: 5, quarter: "Q1", domain: "Raum & Form", subcategory: "Dreiecke & Vierecke",
    skill: "Konstruktion, Eigenschaften", tags: ["Konstruktion"],
    text: "Klasse 5: Raum & Form – Dreiecke & Vierecke | Skill: Konstruktion, Eigenschaften. Tags: Konstruktion."
  },
  {
    id: "G5-Q3-ZA-93695826",
    grade: 5, quarter: "Q3", domain: "Zahlen & Operationen", subcategory: "Prozent (Grundideen)",
    skill: "Prozentwert/Grundwert/Prozentsatz (einfach)", tags: ["Prozent"],
    text: "Klasse 5: Zahlen & Operationen – Prozent (Grundideen) | Skill: Prozentwert/Grundwert/Prozentsatz (einfach). Tags: Prozent."
  },
  {
    id: "G5-Q3-RA-fc7b3f45",
    grade: 5, quarter: "Q3", domain: "Raum & Form", subcategory: "Kreis (Grundlagen)",
    skill: "Umfang/Fläche (einfach)", tags: ["Kreis"],
    text: "Klasse 5: Raum & Form – Kreis (Grundlagen) | Skill: Umfang/Fläche (einfach). Tags: Kreis."
  }
];

export async function loadKnowledge(): Promise<{ cards: KnowledgeCard[], blueprints: Blueprint[] }> {
  console.log('📚 Loading real curriculum knowledge cards');
  
  return {
    cards: CURRICULUM_KNOWLEDGE_CARDS,
    blueprints: [
      {
        domain: "Zahlen & Operationen",
        template: "Mathematische Grundoperationen und Zahlverständnis",
        structure: "Aufgaben zu Addition, Subtraktion, Multiplikation, Division, Stellenwert und Zahlbeziehungen"
      },
      {
        domain: "Größen & Messen",
        template: "Größenverständnis und Messverfahren", 
        structure: "Aufgaben zu Längen, Gewichten, Zeit, Geld und Umrechnung zwischen Einheiten"
      },
      {
        domain: "Raum & Form",
        template: "Geometrische Formen und räumliche Beziehungen",
        structure: "Aufgaben zu geometrischen Formen, Symmetrie, Umfang, Fläche und räumlicher Orientierung"
      },
      {
        domain: "Gleichungen & Funktionen",
        template: "Algebraische Strukturen und funktionale Zusammenhänge",
        structure: "Aufgaben zu Termen, Gleichungen, Funktionen und Zuordnungen"
      },
      {
        domain: "Daten & Zufall",
        template: "Statistische Datenanalyse und Wahrscheinlichkeit",
        structure: "Aufgaben zu Diagrammen, Häufigkeiten, Mittelwerten und Wahrscheinlichkeitsrechnung"
      }
    ]
  };
}

export function preselectCards(
  cards: KnowledgeCard[], 
  options: { grade: number; quarter: string; wantDomains: string[] }
): KnowledgeCard[] {
  // TODO: Implement smart card selection logic
  // For now, return filtered cards based on criteria
  return cards.filter(card => 
    card.grade === options.grade &&
    card.quarter === options.quarter &&
    options.wantDomains.includes(card.domain)
  );
}