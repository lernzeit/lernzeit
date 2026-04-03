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
    const { child_id, new_password } = await req.json();

    if (!child_id || !new_password) {
      return new Response(
        JSON.stringify({ error: "child_id and new_password are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (new_password.length < 6) {
      return new Response(
        JSON.stringify({ error: "Passwort muss mindestens 6 Zeichen lang sein" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Decode JWT to get parent user ID
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Not authenticated" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    let parentId: string;
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      parentId = payload.sub;
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify parent-child relationship
    const { data: relationship, error: relError } = await supabaseAdmin
      .from("parent_child_relationships")
      .select("id")
      .eq("parent_id", parentId)
      .eq("child_id", child_id)
      .limit(1);

    if (relError || !relationship || relationship.length === 0) {
      return new Response(
        JSON.stringify({ error: "Keine Berechtigung: Kind nicht mit diesem Elternkonto verknüpft" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify child has an internal email (username-based account)
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(child_id);

    if (userError || !userData?.user) {
      return new Response(
        JSON.stringify({ error: "Kind-Konto nicht gefunden" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update password via admin API
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(child_id, {
      password: new_password,
    });

    if (updateError) {
      return new Response(
        JSON.stringify({ error: updateError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
