/**
 * Erzeugt Entwuerfe fuer Werbemotive — und prueft jeden, bevor er
 * zurueckgeht.
 *
 * ── Was diese Funktion tut ───────────────────────────────────────────────
 *
 * Ein Sprachmodell schreibt neue Varianten. Es bekommt dafuer GENAU drei
 * Dinge: die belegten Versprechen V1 bis V9 als einzige Faktenquelle, die
 * Verbote aus positionierung.md Abschnitt 6, und die bereits freigegebenen
 * Motive als Beispiel fuer den Ton. Jeder Vorschlag laeuft danach durch
 * `pruefeMotiv` — dieselbe Pruefung wie `npm run motive:pruefen`.
 *
 * ── Was diese Funktion NICHT tut ─────────────────────────────────────────
 *
 * Sie schreibt nichts in die Datenbank und veroeffentlicht nichts. Sie
 * liefert Entwuerfe. Freigeben kann nur der Betreiber — das ist seine Regel
 * („Keine Werbetexte veroeffentlichen, die ich nicht freigegeben habe"), und
 * sie gilt fuer generierte Texte erst recht.
 *
 * ── Warum eigenstaendig und nicht ueber `_shared/ai-client.ts` ───────────
 *
 * Edge Functions werden in diesem Projekt nicht beim Merge ausgeliefert,
 * sondern einzeln hochgeladen, samt aller eingebundenen Dateien. Der
 * gemeinsame KI-Zugang zieht Modellkatalog, Konfiguration und Messung nach
 * sich. Fuer ein Werkzeug, das ein paar Mal im Monat laeuft, lohnt das nicht:
 * Diese Funktion besteht aus sich selbst und `_shared/ad-rules.ts`, sonst
 * nichts. Dieselben Schluessel (GEMINI_API_KEY, OPENROUTER_API_KEY), dieselbe
 * Reihenfolge — Gemini direkt, OpenRouter als Rueckfall.
 *
 * ── Zugang ───────────────────────────────────────────────────────────────
 *
 * Nur zwei Wege: ein angemeldetes Admin-Konto (`user_roles.role = 'admin'`)
 * oder der Service-Schluessel (fuer `npm run motive:erzeugen`). Jeder Aufruf
 * kostet Geld beim Modellanbieter.
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { BELEGTE_VERSPRECHEN, VERBOTE, pruefeMotiv, type Befund, type Motiv } from '../_shared/ad-rules.ts';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const antwort = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

const MAX_ANZAHL = 10;
const TIMEOUT_MS = 45_000;

/** Gemini zuerst, OpenRouter als Rueckfall — wie im Rest des Projekts. */
const ANBIETER = [
  {
    name: 'gemini_direct',
    url: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
    modell: 'gemini-3.5-flash',
    schluessel: () => Deno.env.get('GEMINI_API_KEY'),
  },
  {
    name: 'openrouter',
    url: 'https://openrouter.ai/api/v1/chat/completions',
    modell: 'google/gemini-3.5-flash',
    schluessel: () => Deno.env.get('OPENROUTER_API_KEY'),
  },
] as const;

/** Vergleich in konstanter Zeit, damit die Antwortdauer den Schluessel nicht verraet. */
function gleich(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let unterschied = 0;
  for (let i = 0; i < a.length; i++) unterschied |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return unterschied === 0;
}

async function istBerechtigt(req: Request): Promise<boolean> {
  const kopf = req.headers.get('Authorization') ?? '';
  if (!kopf.startsWith('Bearer ')) return false;
  const token = kopf.slice('Bearer '.length);

  const serviceSchluessel = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  if (serviceSchluessel && gleich(token, serviceSchluessel)) return true;

  const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', serviceSchluessel);
  const { data } = await supabase.auth.getUser(token);
  if (!data?.user) return false;
  const { data: rolle } = await supabase
    .from('user_roles').select('role')
    .eq('user_id', data.user.id).eq('role', 'admin')
    .maybeSingle();
  return Boolean(rolle);
}

/**
 * Der Auftrag an das Modell.
 *
 * Die Stilregeln stehen hier in derselben Form, in der sie ein Mensch lesen
 * wuerde — nicht als Liste verbotener Woerter. Ein Modell, das nur Woerter
 * vermeidet, schreibt Synonyme. Eines, das den Grund kennt, schreibt anders.
 */
function baueAuftrag(beispiele: Motiv[], anzahl: number, thema: string | null): string {
  const versprechen = BELEGTE_VERSPRECHEN
    .map((v) => `${v.id}: ${v.text}${v.wortlaut ? ` — ${v.wortlaut}` : ''}`)
    .join('\n');
  const verbote = VERBOTE.map((v) => `- ${v}`).join('\n');
  const vorlagen = beispiele
    .map((b, i) => `Beispiel ${i + 1}\nÜberschrift: ${b.ueberschrift}\nText: ${b.text}`)
    .join('\n\n');

  return `Du schreibst Anzeigentexte für LernZeit, eine App, mit der Kinder sich Handyzeit verdienen, indem sie Schulaufgaben richtig lösen. Die Anzeigen laufen auf Instagram und Facebook. Sie richten sich an Eltern in Deutschland mit Kindern zwischen 6 und 16.

EINZIGE ZULÄSSIGE FAKTEN. Nichts darüber hinaus behaupten, keine Zahl erfinden:
${versprechen}

VERBOTEN, ohne Ausnahme:
${verbote}

TON: ruhig, konkret, elterlich. Wir kennen den Streit ums Handy, wir dramatisieren ihn nicht. Keine Angst, kein Schuldgefühl. Kein Ausrufezeichen. Eltern werden gesiezt.

DAMIT ES NICHT NACH KI KLINGT:
Jedes Motiv beginnt mit einem konkreten Moment: einer Uhrzeit, einem Ort, oder einem Satz, den ein Kind oder ein Elternteil wirklich so sagt. Keine Produktkategorie, keine Eigenschaftsliste. Ein Motiv ist eine Situation plus höchstens ein Fakt aus der Liste oben. Manche Motive brauchen gar keinen weiteren Fakt außer dem Grundprinzip V1.
Kurze Sätze, ein Gedanke pro Satz. Keine Aufzählung von drei Eigenschaften. Kein „nicht nur … sondern auch". Keine Gedankenstriche. Keine Emojis. Keine Wörter wie revolutionär, mühelos, intelligent, smart, nahtlos, entdecken. Schreib so, wie eine Mutter oder ein Vater es einer Freundin erzählen würde.
„4 Wochen kostenlos" darf in höchstens jedem dritten Motiv vorkommen. Wiederholt sich eine Schlussformel, klingt die ganze Reihe nach Maschine.

ERFINDE NICHTS DAZU, auch nichts Harmloses. Die App hat nur die Eigenschaften aus der Liste oben. Nicht „schnell eingerichtet", nicht „einfach zu bedienen", nicht „dauert nur einen Moment", nicht „kinderleicht". Solche Sätze klingen selbstverständlich und sind trotzdem unbelegt.

FREIGEGEBENE BEISPIELE — sie treffen den Ton. Nicht wiederholen, nicht umformulieren:

${vorlagen}

AUFGABE: Schreibe ${anzahl} neue Motive mit unterschiedlichen Blickwinkeln.${thema ? ` Schwerpunkt: ${thema}.` : ''}
Jedes Motiv hat:
- "ueberschrift": der Satz auf der Bildkarte, höchstens 60 Zeichen
- "text": der Anzeigentext, höchstens 125 Zeichen
- "gedeckt_durch": Liste der V-Nummern, auf die sich der Text stützt
- "idee": ein kurzer Satz, welcher Blickwinkel probiert wird

Antworte ausschließlich mit einem JSON-Array dieser Objekte. Kein Text davor oder danach.`;
}

async function frageModell(auftrag: string): Promise<{ inhalt: string; anbieter: string; modell: string }> {
  const fehler: string[] = [];
  for (const a of ANBIETER) {
    const schluessel = a.schluessel();
    if (!schluessel) { fehler.push(`${a.name}: kein Schluessel`); continue; }

    const abbruch = new AbortController();
    const uhr = setTimeout(() => abbruch.abort(), TIMEOUT_MS);
    try {
      const r = await fetch(a.url, {
        method: 'POST',
        signal: abbruch.signal,
        headers: { Authorization: `Bearer ${schluessel}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: a.modell,
          messages: [{ role: 'user', content: auftrag }],
          // Hoch, weil Vielfalt der Zweck ist. Die Pruefung danach faengt ab,
          // was dabei zu weit geht.
          temperature: 0.9,
        }),
      });
      if (!r.ok) { fehler.push(`${a.name}: HTTP ${r.status}`); continue; }
      const json = await r.json();
      const inhalt = json?.choices?.[0]?.message?.content;
      if (typeof inhalt !== 'string' || !inhalt.trim()) { fehler.push(`${a.name}: leere Antwort`); continue; }
      return { inhalt, anbieter: a.name, modell: a.modell };
    } catch (e) {
      fehler.push(`${a.name}: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      clearTimeout(uhr);
    }
  }
  throw new Error(`Kein Anbieter erreichbar (${fehler.join('; ')})`);
}

interface Vorschlag extends Motiv {
  gedeckt_durch: string[];
  idee: string;
}

/**
 * Liest die Antwort des Modells. Tolerant beim Rahmen (Codeblock-Zaeune,
 * Text drumherum), streng beim Inhalt: Was nicht die erwartete Form hat,
 * faellt weg, statt halb uebernommen zu werden.
 */
function liesVorschlaege(inhalt: string): Vorschlag[] {
  const start = inhalt.indexOf('[');
  const ende = inhalt.lastIndexOf(']');
  if (start < 0 || ende <= start) return [];
  let roh: unknown;
  try { roh = JSON.parse(inhalt.slice(start, ende + 1)); } catch { return []; }
  if (!Array.isArray(roh)) return [];

  const bekannt = new Set(BELEGTE_VERSPRECHEN.map((v) => v.id));
  const ergebnis: Vorschlag[] = [];
  for (const e of roh) {
    if (!e || typeof e !== 'object') continue;
    const o = e as Record<string, unknown>;
    if (typeof o.ueberschrift !== 'string' || typeof o.text !== 'string') continue;
    const ueberschrift = o.ueberschrift.trim().slice(0, 200);
    const text = o.text.trim().slice(0, 400);
    if (!ueberschrift || !text) continue;
    const gedeckt = Array.isArray(o.gedeckt_durch)
      ? o.gedeckt_durch.filter((v): v is string => typeof v === 'string' && bekannt.has(v))
      : [];
    ergebnis.push({
      ueberschrift, text,
      gedeckt_durch: [...new Set(gedeckt)],
      idee: typeof o.idee === 'string' ? o.idee.trim().slice(0, 200) : '',
    });
  }
  return ergebnis;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  if (req.method !== 'POST') return antwort(405, { error: 'Nur POST' });

  try {
    if (!(await istBerechtigt(req))) return antwort(403, { error: 'Nur fuer Admins' });

    let body: Record<string, unknown>;
    try { body = await req.json(); } catch { return antwort(400, { error: 'Ungueltiges JSON' }); }

    const anzahl = Number(body.anzahl ?? 5);
    if (!Number.isInteger(anzahl) || anzahl < 1 || anzahl > MAX_ANZAHL) {
      return antwort(400, { error: `anzahl muss zwischen 1 und ${MAX_ANZAHL} liegen` });
    }
    const beispiele: Motiv[] = Array.isArray(body.beispiele)
      ? body.beispiele
          .filter((b): b is Motiv =>
            !!b && typeof (b as Motiv).ueberschrift === 'string' && typeof (b as Motiv).text === 'string')
          .slice(0, 10)
          .map((b) => ({ ueberschrift: b.ueberschrift.slice(0, 300), text: b.text.slice(0, 300) }))
      : [];
    if (beispiele.length === 0) {
      return antwort(400, { error: 'beispiele fehlen — ohne freigegebene Motive kennt das Modell den Ton nicht' });
    }
    const thema = typeof body.thema === 'string' && body.thema.trim() ? body.thema.trim().slice(0, 200) : null;

    const { inhalt, anbieter, modell } = await frageModell(baueAuftrag(beispiele, anzahl, thema));
    const vorschlaege = liesVorschlaege(inhalt);

    // Wiederholungen der Vorlagen aussortieren. Das Modell ist ausdruecklich
    // angewiesen, es nicht zu tun — tut es aber gelegentlich trotzdem.
    const vorhanden = new Set(beispiele.map((b) => b.ueberschrift.toLowerCase()));

    const entwuerfe: Array<Vorschlag & { befunde: Befund[] }> = [];
    const verworfen: Array<Vorschlag & { befunde: Befund[]; grund: string }> = [];

    for (const v of vorschlaege) {
      const befunde = pruefeMotiv(v);
      if (vorhanden.has(v.ueberschrift.toLowerCase())) {
        verworfen.push({ ...v, befunde, grund: 'wiederholt ein freigegebenes Motiv' });
      } else if (v.gedeckt_durch.length === 0) {
        verworfen.push({ ...v, befunde, grund: 'nennt kein belegtes Versprechen' });
      } else if (befunde.some((b) => b.schwere === 'verstoss')) {
        verworfen.push({ ...v, befunde, grund: 'Regelverstoss' });
      } else {
        entwuerfe.push({ ...v, befunde });
      }
    }

    return antwort(200, {
      anbieter, modell,
      angefragt: anzahl,
      geliefert: vorschlaege.length,
      entwuerfe,
      verworfen,
    });
  } catch (e) {
    console.error('generate-ad-motifs:', e);
    return antwort(500, { error: e instanceof Error ? e.message : 'Unbekannter Fehler' });
  }
});
