/**
 * „Eltern fragen“ direkt vom Sperrbildschirm (20.10.2026).
 *
 * Die ShieldAction-Erweiterung auf dem Kinder-iPhone hat keine Anmeldung.
 * Sie schickt den geheimen Schlüssel des Kindes (`sperre_anfrage_schluessel`,
 * von LernZeit in der App Group abgelegt) und den Zeitpunkt des Drückens.
 * Die Zeile in `shield_attempts` löst über den Trigger
 * `shield_attempts_eltern_fragen` die Push-Mitteilung an die Eltern aus.
 * Derselbe Zeitpunkt kommt später noch einmal von LernZeit
 * (`useSyncShieldAttempts`) — der eindeutige Index verhindert eine Dublette.
 */
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Nur POST" }, 405);

  try {
    const body = await req.json().catch(() => ({}));
    const schluessel = String(body?.schluessel ?? "");
    if (!/^[0-9a-f]{64}$/.test(schluessel)) return json({ error: "Ungültig" }, 400);

    const sb = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "", {
      auth: { persistSession: false },
    });
    const { data: zeile } = await sb.from("sperre_anfrage_schluessel").select("child_id").eq("schluessel", schluessel).maybeSingle();
    if (!zeile?.child_id) return json({ error: "Unbekannt" }, 404);

    // Zeitpunkt vom Gerät, aber nur plausibel (sonst jetzt)
    const jetzt = Date.now();
    const gemeldet = Date.parse(String(body?.zeitpunkt ?? ""));
    const zeitpunkt = Number.isFinite(gemeldet) && Math.abs(gemeldet - jetzt) < 6 * 3600_000 ? new Date(gemeldet) : new Date(jetzt);

    // Bremse: höchstens 30 Drücke je Kind und Stunde
    const { count } = await sb.from("shield_attempts").select("id", { count: "exact", head: true })
      .eq("child_id", zeile.child_id).gte("created_at", new Date(jetzt - 3600_000).toISOString());
    if ((count ?? 0) >= 30) return json({ ok: true, gebremst: true });

    const { error } = await sb.from("shield_attempts").upsert(
      [{ child_id: zeile.child_id, attempted_at: zeitpunkt.toISOString().replace(/\.\d{3}Z$/, "Z") }],
      { onConflict: "child_id,attempted_at", ignoreDuplicates: true },
    );
    if (error) {
      console.error("eltern-fragen:", error.message);
      return json({ error: "Nicht gespeichert" }, 500);
    }
    return json({ ok: true });
  } catch (err) {
    console.error("eltern-fragen:", err);
    return json({ error: "Fehler" }, 500);
  }
});
