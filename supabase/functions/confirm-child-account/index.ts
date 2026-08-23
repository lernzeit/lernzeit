import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { enforceSignupLimit } from "../_shared/signup-limit.ts";

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

    // ── Wer darf hier Konten anlegen? ────────────────────────────────────────
    //
    // Zwei Aufrufer sind vorgesehen:
    //
    //   1. Ein angemeldeter Elternteil legt ein Kinderkonto an.
    //   2. Ein Kind registriert sich selbst — ohne E-Mail-Adresse und seit
    //      08/2026 ausdruecklich auch ohne Einladungscode.
    //
    // Fall 2 hat damit KEINE Berechtigung mehr, die sich pruefen liesse. Das ist
    // so gewollt, hat aber eine Folge: Diese Funktion legt Konten ueber die
    // Admin-API mit email_confirm=true an und umgeht damit die Ratenbegrenzung
    // von Supabase Auth. Ohne eigene Bremse erzeugt sie Konten fuer jeden, der
    // den oeffentlichen anon-Schluessel kennt — und der steckt in jedem
    // ausgelieferten App-Bundle.
    //
    // Deshalb: Ein angemeldeter Elternteil kommt unbegrenzt durch, alle anderen
    // gegen ein Kontingent je Herkunft und Stunde. Ein mitgeschickter Code muss
    // weiterhin stimmen — er ist jetzt ein Nachweis, keine Voraussetzung.
    const authHeader = req.headers.get("Authorization");
    let isParent = false;

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
          // Angemeldet, aber kein Elternteil: bewusst abweisen.
          return new Response(
            JSON.stringify({ error: "Forbidden" }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        isParent = true;
      }
    }

    // Ein Code ist optional. Wird einer mitgeschickt, muss er stimmen — sonst
    // scheitert das Kind spaeter beim Verknuepfen und versteht nicht, warum.
    const code = typeof invitationCode === "string" ? invitationCode.trim() : "";

    if (code) {
      if (!/^\d{6}$/.test(code)) {
        return new Response(
          JSON.stringify({ error: "Der Einladungscode besteht aus 6 Ziffern." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Missbrauchsbremse — greift nur bei anonymen Aufrufen.
    if (!isParent) {
      const blocked = await enforceSignupLimit(supabaseAdmin, req, corsHeaders);
      if (blocked) return blocked;
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
