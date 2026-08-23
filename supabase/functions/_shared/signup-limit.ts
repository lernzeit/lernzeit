/**
 * Missbrauchsbremse fuer die code-lose Kinder-Registrierung.
 *
 * Kinder duerfen sich ohne E-Mail-Adresse und ohne Einladungscode anmelden.
 * Damit entfaellt jede Berechtigung, die `confirm-child-account` pruefen
 * koennte — und die Funktion legt Konten ueber die Admin-API an, umgeht also
 * auch die Ratenbegrenzung von Supabase Auth. Diese Bremse ist das, was
 * stattdessen verhindert, dass jemand mit dem oeffentlichen anon-Schluessel
 * beliebig viele Konten erzeugt.
 *
 * Bewusst als eigenes Modul: Die Grenzfaelle (Kontingent erreicht, Zaehler
 * nicht lesbar, keine Adresse ermittelbar) sind sicherheitsrelevant und
 * gehoeren getestet, nicht nur gelesen.
 */

/**
 * Hoechstzahl anonym angelegter Kinderkonten je Herkunft und Stunde.
 *
 * 10 ist grosszuegig genug fuer eine Familie hinter einem Anschluss oder eine
 * Schulklasse, die nacheinander Konten anlegt, und eng genug, dass die
 * massenhafte Anlage auffaellt, bevor sie etwas kostet.
 */
export const SIGNUP_LIMIT_PER_HOUR = 10;

/**
 * Pseudonymisiert die Herkunftsadresse.
 *
 * Gespeichert wird ausschliesslich ein HMAC, nie die Adresse selbst: Gezaehlt
 * werden muss, wiedererkannt nicht. Ein reiner SHA-256 waere hier zu wenig — der
 * IPv4-Raum ist klein genug, um ihn vollstaendig durchzurechnen. Der Schluessel
 * bleibt serverseitig.
 *
 * Laesst sich keine Adresse ermitteln, teilen sich alle solchen Aufrufe EINEN
 * Zaehler. Das ist Absicht: lieber ein gemeinsames Kontingent als gar keins.
 */
export async function originHash(req: Request): Promise<string> {
  const raw =
    req.headers.get("x-forwarded-for") ??
    req.headers.get("x-real-ip") ??
    "";
  const ip = raw.split(",")[0].trim();
  if (!ip) return "unbekannt";

  const secret =
    Deno.env.get("SIGNUP_RATELIMIT_SALT") ??
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ??
    "";
  if (!secret) return "unbekannt";

  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(ip));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Prueft und vermerkt einen Registrierungsversuch.
 *
 * Gibt eine Antwort zurueck, wenn abgewiesen werden soll — sonst null.
 *
 * Verhalten im Fehlerfall ist bewusst durchlaessig: Laesst sich der Zaehler
 * nicht lesen, wird die Registrierung zugelassen. Eine Datenbankstoerung darf
 * kein Kind aussperren; die Bremse richtet sich gegen Massenanlage, nicht gegen
 * einzelne Nutzer.
 */
export async function enforceSignupLimit(
  // deno-lint-ignore no-explicit-any
  supabaseAdmin: any,
  req: Request,
  corsHeaders: Record<string, string>,
): Promise<Response | null> {
  try {
    const hash = await originHash(req);
    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    const { count, error } = await supabaseAdmin
      .from("signup_attempts")
      .select("id", { count: "exact", head: true })
      .eq("origin_hash", hash)
      .gte("created_at", since);

    if (error) {
      console.warn("[confirm-child-account] Zaehler nicht lesbar:", error.message);
      return null;
    }

    if ((count ?? 0) >= SIGNUP_LIMIT_PER_HOUR) {
      console.warn(`[confirm-child-account] Kontingent erschoepft (${count})`);
      return new Response(
        JSON.stringify({
          error:
            "Es wurden gerade sehr viele Konten angelegt. Bitte versuche es in einer Stunde noch einmal.",
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    await supabaseAdmin.from("signup_attempts").insert({ origin_hash: hash });

    // Aufraeumen nebenher — die Tabelle ist ein Zaehlwerk, kein Archiv.
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const cleanup = supabaseAdmin
      .from("signup_attempts")
      .delete()
      .lt("created_at", cutoff);
    (globalThis as unknown as { EdgeRuntime?: { waitUntil: (p: PromiseLike<unknown>) => void } })
      .EdgeRuntime?.waitUntil(cleanup);

    return null;
  } catch (err) {
    console.warn("[confirm-child-account] Bremse uebersprungen:", err);
    return null;
  }
}
