import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { email, password, name, grade, username, invitationCode } = await req.json();

    // ── Berechtigung ─────────────────────────────────────────────────────────
    //
    // Es gibt zwei legitime Aufrufer, und bis 08/2026 war nur einer davon
    // vorgesehen:
    //
    //   1. Ein angemeldeter Elternteil legt ein Kinderkonto an.
    //   2. Ein Kind registriert sich selbst mit dem Einladungscode der Eltern
    //      ("Ohne E-Mail registrieren"). Dabei ist NIEMAND angemeldet.
    //
    // Fall 2 scheiterte zwangslaeufig: functions.invoke schickt ohne Sitzung den
    // anonymen Projektschluessel als Bearer, getUser() findet dazu keinen Nutzer,
    // und die Funktion antwortete "Unauthorized". Der gesamte Registrierungsweg
    // ohne E-Mail war damit unbenutzbar - fuer das Kind sah es aus, als sei es
    // selbst schuld.
    //
    // Der Einladungscode ist die Berechtigung fuer Fall 2: Er stammt vom
    // Elternteil, ist einmalig verwendbar und laeuft ab. Dieselbe Annahme trifft
    // die bestehende RPC claim_invitation_code bereits.
    let authorized = false;

    const authHeader = req.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const sbAnon = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!
      );
      const { data: authData } = await sbAnon.auth.getUser(
        authHeader.replace("Bearer ", "")
      );
      if (authData?.user) {
        const { data: callerProfile } = await supabaseAdmin
          .from("profiles")
          .select("role")
          .eq("id", authData.user.id)
          .maybeSingle();
        if (!callerProfile || callerProfile.role !== "parent") {
          // Angemeldet, aber kein Elternteil: bewusst abweisen statt auf den
          // Code-Weg zurueckzufallen.
          return new Response(
            JSON.stringify({ error: "Forbidden" }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        authorized = true;
      }
    }

    // Der Einladungscode ist seit 2026 optional: Ein Kind darf sich auch ohne
    // Eltern registrieren und ueben. Die Verknuepfung erfolgt spaeter ueber
    // claim_invitation_code. Wird ein Code mitgeschickt, muss er gueltig sein.
    const code =
      typeof invitationCode === "string" ? invitationCode.trim() : "";

    if (!authorized && code) {
      if (!/^\d{6}$/.test(code)) {
        return new Response(
          JSON.stringify({ error: "Der Einladungscode besteht aus 6 Ziffern." }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: codeRow } = await supabaseAdmin
        .from("invitation_codes")
        .select("id, expires_at, is_used")
        .eq("code", code)
        .maybeSingle();

      const codeValid =
        !!codeRow &&
        codeRow.is_used !== true &&
        !!codeRow.expires_at &&
        new Date(codeRow.expires_at).getTime() > Date.now();

      if (!codeValid) {
        console.warn("[confirm-child-account] Einladungscode abgelehnt");
        return new Response(
          JSON.stringify({
            error: "Dieser Einladungscode ist ungültig oder abgelaufen. Bitte lass dir von deinen Eltern einen neuen geben.",
          }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      authorized = true;
    }

    // Validate required fields
    if (!email || !password || !username) {
      return new Response(
        JSON.stringify({ error: "email, password, and username are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Only allow @lernzeit.internal emails
    if (!email.endsWith("@lernzeit.internal")) {
      return new Response(
        JSON.stringify({ error: "Only internal child accounts can be created this way" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Server-side username uniqueness check (authoritative)
    const { data: existing } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .ilike("username", username)
      .limit(1);

    if (existing && existing.length > 0) {
      return new Response(
        JSON.stringify({ error: "Dieser Benutzername ist bereits vergeben." }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create user with admin API - auto-confirmed, no email sent
    const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        name: name || username,
        role: "child", // hardcoded — never trust client
        grade: grade || 1,
        username: username.toLowerCase(),
      },
    });

    if (createError) {
      console.error("[confirm-child-account] createUser error:", createError);
      return new Response(
        JSON.stringify({ error: "Konto konnte nicht erstellt werden." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, user_id: userData.user.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[confirm-child-account] error:", err);
    return new Response(
      JSON.stringify({ error: "Ein unerwarteter Fehler ist aufgetreten." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
