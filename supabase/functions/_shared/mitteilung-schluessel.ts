// Schlüssel für Knöpfe an Mitteilungen (29.10.2026, Tabelle mitteilung_schluessel).
// Die Mitteilung trägt den Schlüssel selbst, die Datenbank nur seinen SHA-256.

export const ANTWORT_AKTIONEN = ["genehmigen", "ablehnen", "extra15", "extra30"] as const;
export type AntwortAktion = typeof ANTWORT_AKTIONEN[number];

export function istAntwortAktion(x: unknown): x is AntwortAktion {
  return typeof x === "string" && (ANTWORT_AKTIONEN as readonly string[]).includes(x);
}

export async function sha256hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** 32 Zufallsbytes als Hex (64 Zeichen). */
export function neuerSchluessel(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Minuten für die Extra-Knöpfe an „Eltern fragen“. */
export function extraMinuten(aktion: AntwortAktion): number | null {
  return aktion === "extra15" ? 15 : aktion === "extra30" ? 30 : null;
}
