/**
 * Knöpfe an Mitteilungen für Eltern (29.10.2026), z. B. auf der Apple Watch.
 *
 * Die Mitteilung `screen_time_request_new` trägt „Genehmigen“/„Ablehnen“,
 * `eltern_fragen` trägt „15 Min.“/„30 Min.“. Ein Tipp weckt LernZeit auf dem
 * iPhone im Hintergrund (MitteilungsKnoepfe.swift); das schickt den Schlüssel
 * aus der Mitteilung hierher. Eine Anmeldung gibt es dabei nicht – der
 * Schlüssel gilt nur für diese eine Mitteilung, diesen Elternteil, einmal und
 * befristet (Tabelle `mitteilung_schluessel`, angelegt von send-push).
 * Antwort: `{ ok, text }`; `text` zeigt das iPhone als kurze Bestätigung.
 */
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { anfrageBeantworten } from "../_shared/anfrage-beantworten.ts";
import { extraMinuten, istAntwortAktion, sha256hex } from "../_shared/mitteilung-schluessel.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const BITTE_IN_DER_APP = "Bitte öffne LernZeit und antworte dort.";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, text: "Nur POST" }, 405);

  const sb = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "", {
    auth: { persistSession: false },
  });

  let hash = "";
  try {
    const body = await req.json().catch(() => ({}));
    const schluessel = String(body?.schluessel ?? "");
    const aktion = body?.aktion;
    if (!/^[0-9a-f]{64}$/.test(schluessel) || !istAntwortAktion(aktion)) {
      return json({ ok: false, text: BITTE_IN_DER_APP }, 400);
    }
    hash = await sha256hex(schluessel);

    // Einmalig: Nur wer den Schlüssel als Erster einlöst, kommt weiter.
    const { data: zeile } = await sb
      .from("mitteilung_schluessel")
      .update({ benutzt_am: new Date().toISOString(), aktion })
      .eq("schluessel_hash", hash)
      .is("benutzt_am", null)
      .gt("gueltig_bis", new Date().toISOString())
      .select("parent_id, child_id, art, request_id")
      .maybeSingle();
    if (!zeile) {
      return json({ ok: false, text: `Diese Mitteilung ist schon erledigt oder zu alt. ${BITTE_IN_DER_APP}` }, 410);
    }

    const { data: kind } = await sb.from("profiles").select("name").eq("id", zeile.child_id).maybeSingle();
    const name = kind?.name?.trim() || "dein Kind";

    if (zeile.art === "anfrage") {
      if (aktion !== "genehmigen" && aktion !== "ablehnen") throw new Error("falsche Aktion");
      const r = await anfrageBeantworten(sb, zeile.parent_id, zeile.request_id, aktion === "genehmigen" ? "approved" : "denied");
      if (!r.ok) {
        if (r.status === 404) return json({ ok: true, text: `Die Anfrage von ${name} ist schon beantwortet.` });
        throw new Error(r.error);
      }
      return json({
        ok: true,
        text: aktion === "genehmigen"
          ? `${r.request.requested_minutes} Min. für ${name} genehmigt`
          : `Anfrage von ${name} abgelehnt`,
      });
    }

    // „Eltern fragen“ vom Sperrbildschirm: Extra-Zeit wie Kinder → Regeln → Handysperre
    const minuten = extraMinuten(aktion);
    if (!minuten) throw new Error("falsche Aktion");
    const { data: verknuepft } = await sb.from("parent_child_relationships").select("id")
      .eq("parent_id", zeile.parent_id).eq("child_id", zeile.child_id).maybeSingle();
    if (!verknuepft) throw new Error("nicht verknüpft");
    // Gleiche Grenze wie extrazeit_geben(): höchstens 20 je Tag
    const { count } = await sb.from("handyzeit_extra").select("id", { count: "exact", head: true })
      .eq("child_id", zeile.child_id).gt("created_at", new Date(Date.now() - 86_400_000).toISOString());
    if ((count ?? 0) >= 20) throw new Error("zu viele");
    const { error } = await sb.from("handyzeit_extra")
      .insert({ child_id: zeile.child_id, minuten, gegeben_von: zeile.parent_id });
    if (error) throw error;
    return json({ ok: true, text: `${minuten} Min. extra für ${name}` });
  } catch (e) {
    console.error("mitteilung-antwort:", e);
    // Schlüssel wieder freigeben, damit ein zweiter Tipp klappen kann
    if (hash) await sb.from("mitteilung_schluessel").update({ benutzt_am: null, aktion: null }).eq("schluessel_hash", hash);
    return json({ ok: false, text: `Das hat nicht geklappt. ${BITTE_IN_DER_APP}` }, 500);
  }
});
