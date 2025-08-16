// Prompt factory for knowledge-based template generation
import type { Blueprint, KnowledgeCard } from '@/knowledge/knowledge';

export const SYSTEM_PROMPT = `Sie sind ein Experte für die Erstellung von Mathematikaufgaben für deutsche Grundschulen und weiterführende Schulen.

Ihre Aufgabe ist es, qualitativ hochwertige, lehrplangerechte Aufgaben zu erstellen, die:
- Dem deutschen Bildungsstandard entsprechen
- Altersgerecht und verständlich formuliert sind
- Verschiedene Schwierigkeitsgrade (AFB I, AFB II, AFB III) abdecken
- Vielfältige Aufgabentypen nutzen (Multiple Choice, Freitext, Zuordnung, etc.)
- Realitätsbezogen und motivierend sind

Antworten Sie immer im JSON-Format mit einem Array von Aufgaben-Objekten.`;

interface PromptOptions {
  blueprint: Blueprint;
  difficulty: "AFB I" | "AFB II" | "AFB III";
  n: number;
  knowledge: KnowledgeCard[];
}

export function buildUserPrompt(options: PromptOptions): string {
  const { blueprint, difficulty, n, knowledge } = options;
  
  const knowledgeContext = knowledge.map(card => 
    `- ${card.domain}: ${card.skill} (${card.subcategory})`
  ).join('\n');

  return `Erstellen Sie ${n} Mathematikaufgaben mit folgenden Vorgaben:

**Vorlage/Blueprint:**
- Domain: ${blueprint.domain}
- Template: ${blueprint.template}
- Struktur: ${blueprint.structure}

**Schwierigkeitsgrad:** ${difficulty}

**Relevantes Wissen:**
${knowledgeContext}

**Ausgabeformat:** JSON-Array mit Objekten, die folgende Felder enthalten:
- grade_suggestion: number
- quarter_app: string
- subcategory: string
- difficulty: string
- question_type: string
- student_prompt: string
- variables: object
- solution: string
- unit: string
- distractors: string[]
- explanation_teacher: string
- source_skill_id: string
- tags: string[]
- seed: string

Bitte erstellen Sie abwechslungsreiche, lehrplangerechte Aufgaben.`;
}