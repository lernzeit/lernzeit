import { assert, assertEquals, assertNotEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import {
  hashEmail,
  normalisiereEmailGoogle,
  normalisiereEmailMeta,
  sha256Hex,
} from './conversion-hash.ts';

Deno.test('Kleinschreibung und Leerraum verschwinden bei beiden Plattformen', () => {
  assertEquals(normalisiereEmailGoogle('  Max.Mustermann@Example.COM '), 'max.mustermann@example.com');
  assertEquals(normalisiereEmailMeta('  Max.Mustermann@Example.COM '), 'max.mustermann@example.com');
});

Deno.test('Punkte bleiben bei fremden Domains stehen', () => {
  // Bei example.com sind das zwei verschiedene Menschen.
  assertEquals(normalisiereEmailGoogle('max.mustermann@example.com'), 'max.mustermann@example.com');
  assertNotEquals(
    normalisiereEmailGoogle('max.mustermann@example.com'),
    normalisiereEmailGoogle('maxmustermann@example.com'),
  );
});

Deno.test('Bei Google-Domains fallen Punkte und Plus-Suffix weg', () => {
  assertEquals(normalisiereEmailGoogle('max.mustermann@gmail.com'), 'maxmustermann@gmail.com');
  assertEquals(normalisiereEmailGoogle('max.mustermann@googlemail.com'), 'maxmustermann@googlemail.com');
  assertEquals(normalisiereEmailGoogle('max+werbung@gmail.com'), 'max@gmail.com');
  assertEquals(normalisiereEmailGoogle('m.a.x+a+b@gmail.com'), 'max@gmail.com');
});

Deno.test('Meta laesst Punkte und Plus auch bei gmail stehen', () => {
  assertEquals(normalisiereEmailMeta('max.mustermann@gmail.com'), 'max.mustermann@gmail.com');
  assertEquals(normalisiereEmailMeta('max+werbung@gmail.com'), 'max+werbung@gmail.com');
});

Deno.test('Die beiden Plattformen bekommen bei gmail verschiedene Hashes', async () => {
  const g = await hashEmail('Max.Mustermann@gmail.com', 'google');
  const m = await hashEmail('Max.Mustermann@gmail.com', 'meta');
  assertNotEquals(g, m, 'sonst waere die Unterscheidung der Normalisierung wirkungslos');
});

Deno.test('SHA-256 stimmt mit dem bekannten Wert ueberein', async () => {
  // Gegenprobe gegen einen Wert, den jede SHA-256-Umsetzung liefern muss.
  assertEquals(
    await sha256Hex('abc'),
    'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
  );
});

Deno.test('Der Hash ist 64 Hex-Zeichen in Kleinschreibung', async () => {
  const h = await hashEmail('jemand@example.com', 'google');
  assert(h !== null);
  assert(/^[0-9a-f]{64}$/.test(h!), `unerwartete Form: ${h}`);
});

Deno.test('Dieselbe Adresse ergibt denselben Hash, eine andere einen anderen', async () => {
  assertEquals(
    await hashEmail('jemand@example.com', 'google'),
    await hashEmail('  JEMAND@Example.com ', 'google'),
  );
  assertNotEquals(
    await hashEmail('jemand@example.com', 'google'),
    await hashEmail('jemanda@example.com', 'google'),
  );
});

Deno.test('Unbrauchbare Eingaben ergeben null statt eines Hashwerts', async () => {
  // Sonst bekaeme jede Zeile ohne E-Mail denselben Hash — eine Person, die es
  // nicht gibt.
  assertEquals(await hashEmail(null, 'google'), null);
  assertEquals(await hashEmail('', 'meta'), null);
  assertEquals(await hashEmail('   ', 'google'), null);
  assertEquals(await hashEmail('ohne-at-zeichen', 'google'), null);
  assertEquals(await hashEmail('@example.com', 'google'), null);
  assertEquals(await hashEmail('jemand@', 'meta'), null);
});
