/**
 * Vorlesen mit KI-Stimme (20.10.2026): Text → MP3.
 *
 * Für Kinder bis Klasse 4 (Aufgabe und Erklärung, `src/hooks/useVorlesen.ts`).
 * Die Stimme der Geräte (Web Speech in der iPhone-App) klang zu schlecht.
 *
 * Ablauf: angemeldeter Nutzer → Text (höchstens 400 Zeichen, die App teilt
 * an Satzgrenzen) → Zwischenspeicher im privaten Bucket `vorlesen`
 * (`JJJJ-MM/<sha256>.mp3`, aktueller und voriger Monat) → sonst Gemini TTS
 * (24 kHz PCM) → MP3 (lamejs) → speichern → zurück als audio/mpeg.
 *
 * Gesendet wird nur der Text der Aufgabe bzw. Erklärung, nichts über das Kind.
 * Kosten: `ai_model_metrics` (use_case 'vorlesen'); je Nutzer und Tag
 * höchstens TAGES_GRENZE neu erzeugte Stücke (Tabelle `vorlesen_tag`).
 * Ältere Monatsordner räumt die Funktion selbst auf (einmal je Tag).
 */
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { Mp3Encoder } from "npm:@breezystack/lamejs@1.2.7";
import { logMetric } from "../_shared/model-config.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Expose-Headers": "x-vorlesen-cache",
};

const BUCKET = "vorlesen";
const MAX_ZEICHEN = 400;
const TAGES_GRENZE = 300;
/** Warm und ruhig; bei Wechsel ändert sich der Schlüssel, alte Dateien laufen aus. */
const STIMME = Deno.env.get("VORLESEN_STIMME") || "Sulafat";
const MODELLE = (Deno.env.get("VORLESEN_MODELLE") || "gemini-3.8-flash-tts,gemini-2.5-flash-preview-tts")
  .split(",").map((m) => m.trim()).filter(Boolean);
/** Grobe Kostenschätzung (USD je Token), siehe Antwort an den Betreiber vom 20.10.2026 */
const PREIS_EIN = 0.5e-6;
const PREIS_AUS = 10e-6;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const monat = (d: Date) => d.toISOString().slice(0, 7);

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function base64ZuBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function pcmZuMp3(pcm: Uint8Array, rate: number): Uint8Array {
  const proben = new Int16Array(pcm.buffer, pcm.byteOffset, Math.floor(pcm.byteLength / 2));
  const enc = new Mp3Encoder(1, rate, 48);
  const teile: Uint8Array[] = [];
  for (let i = 0; i < proben.length; i += 1152) {
    const b = enc.encodeBuffer(proben.subarray(i, i + 1152));
    if (b.length) teile.push(new Uint8Array(b));
  }
  const ende = enc.flush();
  if (ende.length) teile.push(new Uint8Array(ende));
  const out = new Uint8Array(teile.reduce((s, t) => s + t.length, 0));
  let pos = 0;
  for (const t of teile) { out.set(t, pos); pos += t.length; }
  return out;
}

interface Erzeugt { mp3: Uint8Array; modell: string; ein: number | null; aus: number | null }

async function erzeugen(text: string, apiKey: string): Promise<Erzeugt> {
  let letzterFehler = "";
  for (const modell of MODELLE) {
    const start = Date.now();
    try {
      const antwort = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${modell}:generateContent`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
          body: JSON.stringify({
            contents: [{ parts: [{ text }] }],
            generationConfig: {
              responseModalities: ["AUDIO"],
              speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: STIMME } } },
            },
          }),
          signal: AbortSignal.timeout(25_000),
        },
      );
      const daten = await antwort.json().catch(() => null);
      const teil = daten?.candidates?.[0]?.content?.parts?.find((p: { inlineData?: unknown }) => p.inlineData)?.inlineData;
      if (!antwort.ok || !teil?.data) {
        letzterFehler = `${modell}: ${antwort.status} ${JSON.stringify(daten?.error ?? daten)?.slice(0, 300)}`;
        logMetric({ use_case: "vorlesen", provider: "gemini_direct", model: modell, status_code: antwort.status, success: false, latency_ms: Date.now() - start, error_type: "tts" });
        continue;
      }
      const rate = Number(/rate=(\d+)/.exec(String(teil.mimeType ?? ""))?.[1]) || 24000;
      const mp3 = pcmZuMp3(base64ZuBytes(teil.data), rate);
      const ein = daten?.usageMetadata?.promptTokenCount ?? null;
      const aus = daten?.usageMetadata?.candidatesTokenCount ?? null;
      logMetric({
        use_case: "vorlesen", provider: "gemini_direct", model: modell, status_code: 200, success: true,
        latency_ms: Date.now() - start, prompt_tokens: ein, completion_tokens: aus,
        total_tokens: ein !== null && aus !== null ? ein + aus : null,
        estimated_cost_usd: (ein ?? 0) * PREIS_EIN + (aus ?? 0) * PREIS_AUS,
      });
      return { mp3, modell, ein, aus };
    } catch (err) {
      letzterFehler = `${modell}: ${String(err).slice(0, 200)}`;
      logMetric({ use_case: "vorlesen", provider: "gemini_direct", model: modell, status_code: null, success: false, latency_ms: Date.now() - start, error_type: "exception" });
    }
  }
  throw new Error(letzterFehler || "kein Modell");
}

let aufgeraeumtAm = "";
/** Monatsordner vor dem vorigen Monat löschen (einmal je Tag und Instanz). */
async function aufraeumen(sb: ReturnType<typeof createClient>) {
  const heute = new Date().toISOString().slice(0, 10);
  if (aufgeraeumtAm === heute) return;
  aufgeraeumtAm = heute;
  const jetzt = new Date();
  const behalten = new Set([monat(jetzt), monat(new Date(Date.UTC(jetzt.getUTCFullYear(), jetzt.getUTCMonth() - 1, 1)))]);
  const { data: ordner } = await sb.storage.from(BUCKET).list("", { limit: 100 });
  for (const o of ordner ?? []) {
    if (!/^\d{4}-\d{2}$/.test(o.name) || behalten.has(o.name)) continue;
    for (let runde = 0; runde < 20; runde++) {
      const { data: dateien } = await sb.storage.from(BUCKET).list(o.name, { limit: 1000 });
      if (!dateien?.length) break;
      await sb.storage.from(BUCKET).remove(dateien.map((d) => `${o.name}/${d.name}`));
    }
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const apiKey = Deno.env.get("GEMINI_API_KEY") ?? "";
  const sb = createClient(url, serviceKey, { auth: { persistSession: false } });

  try {
    const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
    let nutzer: string | null = null;
    if (token && token === serviceKey) {
      nutzer = "service";
    } else if (token) {
      const { data } = await sb.auth.getUser(token);
      nutzer = data?.user?.id ?? null;
    }
    if (!nutzer) return json({ error: "Nicht autorisiert" }, 401);

    const body = await req.json().catch(() => ({}));

    // Nur Betrieb: welche TTS-Modelle der Schlüssel kennt.
    if (body?.probe && nutzer === "service") {
      const r = await fetch("https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000", { headers: { "x-goog-api-key": apiKey } });
      const d = await r.json().catch(() => null);
      const namen = (d?.models ?? []).map((m: { name: string }) => m.name).filter((n: string) => /tts/i.test(n));
      return json({ status: r.status, modelle: namen, reihenfolge: MODELLE, stimme: STIMME });
    }

    const text = String(body?.text ?? "").replace(/\s+/g, " ").trim();
    if (!text) return json({ error: "Kein Text" }, 400);
    if (text.length > MAX_ZEICHEN) return json({ error: "Text zu lang" }, 413);

    const schluessel = await sha256(`${STIMME}|v1|${text}`);
    const jetzt = new Date();
    const pfade = [`${monat(jetzt)}/${schluessel}.mp3`,
      `${monat(new Date(Date.UTC(jetzt.getUTCFullYear(), jetzt.getUTCMonth() - 1, 1)))}/${schluessel}.mp3`];

    for (const pfad of pfade) {
      const { data } = await sb.storage.from(BUCKET).download(pfad);
      if (data) {
        const mp3 = new Uint8Array(await data.arrayBuffer());
        // Im aktuellen Monat ablegen, damit es beim Aufräumen nicht verschwindet
        if (pfad !== pfade[0]) {
          await sb.storage.from(BUCKET).upload(pfade[0], mp3, { contentType: "audio/mpeg", upsert: true });
        }
        return new Response(mp3, { headers: { ...corsHeaders, "Content-Type": "audio/mpeg", "x-vorlesen-cache": "hit" } });
      }
    }

    // Tagesgrenze je Nutzer (nur neu erzeugte Stücke kosten Geld)
    if (nutzer !== "service") {
      const { data: zaehler, error } = await sb.rpc("vorlesen_zaehlen", { p_user: nutzer, p_grenze: TAGES_GRENZE });
      if (error) console.warn("vorlesen_zaehlen:", error.message);
      if (zaehler === false) return json({ error: "Tagesgrenze erreicht" }, 429);
    }

    const { mp3 } = await erzeugen(text, apiKey);
    const { error: hochladen } = await sb.storage.from(BUCKET).upload(pfade[0], mp3, { contentType: "audio/mpeg", upsert: true });
    if (hochladen) console.warn("vorlesen: nicht gespeichert:", hochladen.message);

    (globalThis as unknown as { EdgeRuntime?: { waitUntil: (p: PromiseLike<unknown>) => void } })
      .EdgeRuntime?.waitUntil(aufraeumen(sb).catch((e) => console.warn("vorlesen aufräumen:", e)));

    return new Response(mp3, { headers: { ...corsHeaders, "Content-Type": "audio/mpeg", "x-vorlesen-cache": "neu" } });
  } catch (err) {
    console.error("vorlesen:", err);
    return json({ error: "Vorlesen fehlgeschlagen" }, 502);
  }
});
