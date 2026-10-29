// Eine Bildschirmzeit-Anfrage genehmigen oder ablehnen.
// Gemeinsam genutzt von `screen-time-request` (App) und `mitteilung-antwort`
// (Knöpfe an der Mitteilung, z. B. auf der Apple Watch, 29.10.2026).
// Der Aufrufer prüft vorher, wer antwortet; hier zählt nur parentId.

// deno-lint-ignore no-explicit-any
type Sb = any;

export type AntwortErgebnis =
  // deno-lint-ignore no-explicit-any
  | { ok: true; request: any }
  | { ok: false; status: number; error: string };

function utcTag(referenz = new Date()): string {
  const start = new Date(referenz);
  start.setUTCHours(0, 0, 0, 0);
  return start.toISOString().split("T")[0];
}

export async function anfrageBeantworten(
  supabase: Sb,
  parentId: string,
  requestId: string,
  status: "approved" | "denied",
  antwort = "",
): Promise<AntwortErgebnis> {
  const { data: request } = await supabase
    .from("screen_time_requests")
    .select("*")
    .eq("id", requestId)
    .eq("parent_id", parentId)
    .eq("status", "pending")
    .single();

  if (!request) {
    return { ok: false, status: 404, error: "Anfrage nicht gefunden oder bereits bearbeitet" };
  }

  const { data: updatedRequest, error } = await supabase
    .from("screen_time_requests")
    .update({
      status,
      parent_response: antwort,
      responded_at: new Date().toISOString(),
    })
    .eq("id", requestId)
    .eq("status", "pending")
    .select()
    .single();

  if (error || !updatedRequest) {
    console.error("Database update error:", error);
    return { ok: false, status: 400, error: "Anfrage konnte nicht aktualisiert werden" };
  }

  // Abgelehnt: vorgemerkte Minuten wieder freigeben
  if (status === "denied") {
    let minutesToRelease = request.requested_minutes;

    const { data: reservedMinutes } = await supabase
      .from("user_earned_minutes")
      .select("*")
      .eq("user_id", request.child_id)
      .gt("minutes_requested", 0)
      .order("earned_at", { ascending: true });

    for (const earnedRecord of reservedMinutes || []) {
      if (minutesToRelease <= 0) break;
      const minutesToUnreserve = Math.min(minutesToRelease, earnedRecord.minutes_requested);
      await supabase
        .from("user_earned_minutes")
        .update({ minutes_requested: earnedRecord.minutes_requested - minutesToUnreserve })
        .eq("id", earnedRecord.id);
      minutesToRelease -= minutesToUnreserve;
    }
  }

  // Genehmigt: Tagessumme mitziehen
  if (status === "approved") {
    const { data: dailySummary } = await supabase
      .from("daily_request_summary")
      .select("*")
      .eq("user_id", request.child_id)
      .eq("request_date", utcTag())
      .single();

    if (dailySummary) {
      await supabase
        .from("daily_request_summary")
        .update({ total_minutes_approved: dailySummary.total_minutes_approved + request.requested_minutes })
        .eq("id", dailySummary.id);
    }
  }

  return { ok: true, request: updatedRequest };
}
