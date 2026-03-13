import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals, assertExists } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;

Deno.test("analyze-feedback: rejects unauthenticated requests", async () => {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/analyze-feedback`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": ANON_KEY,
    },
    body: JSON.stringify({}),
  });

  const body = await response.text();
  console.log("No-auth response:", response.status, body);
  assertEquals(response.status, 401);
});

Deno.test("analyze-feedback: rejects non-admin users", async () => {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/analyze-feedback`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${ANON_KEY}`,
      "apikey": ANON_KEY,
    },
    body: JSON.stringify({}),
  });

  const body = await response.text();
  console.log("Anon-key response:", response.status, body);
  // Should be 401 (not a valid user JWT) or 403
  assertEquals(response.status >= 400, true);
});
