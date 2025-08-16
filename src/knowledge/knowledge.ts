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

// Real curriculum data from user's custom instructions
const CURRICULUM_KNOWLEDGE_CARDS: KnowledgeCard[] = [
  // Grade 1 Q1
  {
    id: "G1-Q1-ZA-ab13a721",
    grade: 1,
    quarter: "Q1",
    domain: "Zahlen & Operationen",
    subcategory: "Zahlvorstellung/Zählen",
    skill: "Zählen bis 10; Anzahlen vergleichen",
    tags: ["Zählen", "ZR_10"],
    text: "Klasse 1: Zahlen & Operationen – Zahlvorstellung/Zählen | Skill: Zählen bis 10; Anzahlen vergleichen. Tags: Zählen, ZR_10."
  },
  {
    id: "G1-Q1-ZA-23f6f2c9",
    grade: 1,
    quarter: "Q1",
    domain: "Zahlen & Operationen",
    subcategory: "Add/Sub (mental)",
    skill: "Plus/Minus im ZR 10 ohne Übergang",
    tags: ["Addition", "Subtraktion", "ZR_10"],
    text: "Klasse 1: Zahlen & Operationen – Add/Sub (mental) | Skill: Plus/Minus im ZR 10 ohne Übergang. Tags: Addition, Subtraktion, ZR_10."
  },
  {
    id: "G1-Q1-RA-cd1c87a1",
    grade: 1,
    quarter: "Q1",
    domain: "Raum & Form",
    subcategory: "Formen erkennen",
    skill: "Kreis, Dreieck, Quadrat, Rechteck unterscheiden",
    tags: ["Formen", "Eigenschaften"],
    text: "Klasse 1: Raum & Form – Formen erkennen | Skill: Kreis, Dreieck, Quadrat, Rechteck unterscheiden. Tags: Formen, Eigenschaften."
  },
  {
    id: "G1-Q1-GR-31ade5b6",
    grade: 1,
    quarter: "Q1",
    domain: "Größen & Messen",
    subcategory: "Messen/Schätzen",
    skill: "Längen schätzen und vergleichen (unstandardisiert)",
    tags: ["Länge", "Schätzen"],
    text: "Klasse 1: Größen & Messen – Messen/Schätzen | Skill: Längen schätzen und vergleichen (unstandardisiert). Tags: Länge, Schätzen."
  },
  // Grade 2 Q1
  {
    id: "G2-Q1-ZA-ab12c4ec",
    grade: 2,
    quarter: "Q1",
    domain: "Zahlen & Operationen",
    subcategory: "Add/Sub im ZR 100",
    skill: "Halbschriftlich & schriftnah mit Übergang",
    tags: ["Addition", "Subtraktion", "ZR_100"],
    text: "Klasse 2: Zahlen & Operationen – Add/Sub im ZR 100 | Skill: Halbschriftlich & schriftnah mit Übergang. Tags: Addition, Subtraktion, ZR_100."
  },
  {
    id: "G2-Q1-ZA-6c3b1af6",
    grade: 2,
    quarter: "Q1",
    domain: "Zahlen & Operationen",
    subcategory: "Einmaleins (Aufbau)",
    skill: "2er/5er/10er Reihen, Tausch-/Verbundaufgaben",
    tags: ["Einmaleins", "ZR_100"],
    text: "Klasse 2: Zahlen & Operationen – Einmaleins (Aufbau) | Skill: 2er/5er/10er Reihen, Tausch-/Verbundaufgaben. Tags: Einmaleins, ZR_100."
  },
  // Grade 3 Q1
  {
    id: "G3-Q1-ZA-405459f4",
    grade: 3,
    quarter: "Q1",
    domain: "Zahlen & Operationen",
    subcategory: "ZR 1000 sicher",
    skill: "Ordnen, Runden, Zahlstrahl",
    tags: ["Runden", "ZR_1000"],
    text: "Klasse 3: Zahlen & Operationen – ZR 1000 sicher | Skill: Ordnen, Runden, Zahlstrahl. Tags: Runden, ZR_1000."
  },
  {
    id: "G3-Q1-ZA-d6d8b8f2",
    grade: 3,
    quarter: "Q1",
    domain: "Zahlen & Operationen",
    subcategory: "Schriftliche Addition/Subtraktion",
    skill: "mit Übergang im ZR 1000",
    tags: ["Schriftlich", "ZR_1000"],
    text: "Klasse 3: Zahlen & Operationen – Schriftliche Addition/Subtraktion | Skill: mit Übergang im ZR 1000. Tags: Schriftlich, ZR_1000."
  },
  // Grade 4 Q1
  {
    id: "G4-Q1-ZA-fe318a05",
    grade: 4,
    quarter: "Q1",
    domain: "Zahlen & Operationen",
    subcategory: "ZR 1 Mio",
    skill: "Stellenwert, Runden, Zahlbeziehungen",
    tags: ["ZR_1000000"],
    text: "Klasse 4: Zahlen & Operationen – ZR 1 Mio | Skill: Stellenwert, Runden, Zahlbeziehungen. Tags: ZR_1000000."
  },
  {
    id: "G4-Q1-ZA-d5f9fc38",
    grade: 4,
    quarter: "Q1",
    domain: "Zahlen & Operationen",
    subcategory: "Schriftliche Multiplikation",
    skill: "mehrstellig × mehrstellig",
    tags: ["Schriftlich", "Multiplikation"],
    text: "Klasse 4: Zahlen & Operationen – Schriftliche Multiplikation | Skill: mehrstellig × mehrstellig. Tags: Schriftlich, Multiplikation."
  },
  // Grade 5 Q1
  {
    id: "G5-Q1-ZA-78895d27",
    grade: 5,
    quarter: "Q1",
    domain: "Zahlen & Operationen",
    subcategory: "Negative Zahlen",
    skill: "Zahlengerade, Vergleiche, Addition/Subtraktion",
    tags: ["Rationale", "Negative"],
    text: "Klasse 5: Zahlen & Operationen – Negative Zahlen | Skill: Zahlengerade, Vergleiche, Addition/Subtraktion. Tags: Rationale, Negative."
  },
  {
    id: "G5-Q1-ZA-2765bbbb",
    grade: 5,
    quarter: "Q1",
    domain: "Zahlen & Operationen",
    subcategory: "Brüche/Dezimalzahlen",
    skill: "Erweitern/Kürzen, Vergleich; Umwandlung",
    tags: ["Brüche", "Dezimalzahlen"],
    text: "Klasse 5: Zahlen & Operationen – Brüche/Dezimalzahlen | Skill: Erweitern/Kürzen, Vergleich; Umwandlung. Tags: Brüche, Dezimalzahlen."
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