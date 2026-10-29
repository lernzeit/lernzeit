import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { extraMinuten, istAntwortAktion, neuerSchluessel, sha256hex } from "./mitteilung-schluessel.ts";

Deno.test("Schlüssel: 64 Hex-Zeichen, jedes Mal neu", () => {
  const a = neuerSchluessel();
  assertEquals(/^[0-9a-f]{64}$/.test(a), true);
  assertEquals(a === neuerSchluessel(), false);
});

Deno.test("sha256hex: bekannter Wert", async () => {
  assertEquals(await sha256hex("abc"), "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
});

Deno.test("Aktionen: nur die vier Knöpfe", () => {
  assertEquals(istAntwortAktion("genehmigen"), true);
  assertEquals(istAntwortAktion("extra30"), true);
  assertEquals(istAntwortAktion("loeschen"), false);
  assertEquals(extraMinuten("extra15"), 15);
  assertEquals(extraMinuten("genehmigen"), null);
});
