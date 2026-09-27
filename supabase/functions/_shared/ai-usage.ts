/**
 * Token-Zählung für `ai_model_metrics`.
 *
 * Befund vom 27.09.2026: Die Auswertung zeigte für 30 Tage rund $1,10, echt
 * waren es rund $10. Zwei Ursachen, beide hier behoben:
 *
 *  1. Denk-Tokens fehlten. Googles OpenAI-kompatibler Endpunkt zählt sie
 *     nicht in `completion_tokens`, rechnet sie aber als Ausgabe ab; sie
 *     stecken nur in `total_tokens`. Bei der Qualitätsprüfung waren das ~124
 *     von ~142 Ausgabe-Tokens, beim Fragen-Generator ~1.160 von ~1.330.
 *     OpenRouter zählt sie in `completion_tokens` mit — daher das Maximum.
 *  2. Gestreamte Antworten (ai-tutor) wurden ganz ohne Tokens erfasst.
 *     `StreamUsage` liest die SSE-Zeilen mit und merkt sich die letzte
 *     Angabe zu `usage`.
 */

export interface Usage {
  prompt_tokens?: number | null;
  completion_tokens?: number | null;
  total_tokens?: number | null;
}

const zahl = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);

/** Abgerechnete Ausgabe-Tokens, Denk-Tokens eingeschlossen. */
export function billedOutputTokens(usage: Usage | null | undefined): number | null {
  if (!usage) return null;
  const aus = zahl(usage.completion_tokens);
  const ein = zahl(usage.prompt_tokens);
  const gesamt = zahl(usage.total_tokens);
  if (gesamt !== null && ein !== null) return Math.max(aus ?? 0, gesamt - ein);
  return aus;
}

/**
 * Liest einen SSE-Strom mit (`push` je Block, `end` am Schluss) und behält
 * die letzte `usage`-Angabe. Manche Anbieter schicken sie in jedem Block
 * fortlaufend, andere nur im letzten — die letzte ist in beiden Fällen die
 * endgültige.
 */
export class StreamUsage {
  usage: Usage | null = null;
  private rest = '';
  private readonly decoder = new TextDecoder();

  push(chunk: Uint8Array): void {
    this.zeilen(this.rest + this.decoder.decode(chunk, { stream: true }));
  }

  end(): void {
    this.zeilen(this.rest + this.decoder.decode() + '\n');
  }

  private zeilen(text: string): void {
    const teile = text.split('\n');
    this.rest = teile.pop() ?? '';
    for (const zeile of teile) {
      if (!zeile.startsWith('data:') || !zeile.includes('"usage"')) continue;
      try {
        const u = JSON.parse(zeile.slice(5).trim())?.usage;
        if (u && typeof u === 'object') this.usage = u;
      } catch { /* unvollständige oder fremde Zeile */ }
    }
  }
}
