/**
 * Tests der Missbrauchsbremse.
 *
 * Die Grenzfaelle sind sicherheitsrelevant: Wird zu frueh abgewiesen, sperrt
 * man Kinder aus; wird zu spaet abgewiesen, ist die Bremse wirkungslos.
 *
 * Ausfuehren: deno test supabase/functions/_shared/signup-limit_test.ts
 */

import { assertEquals, assertNotEquals } from 'https://deno.land/std@0.208.0/assert/mod.ts';
import { SIGNUP_LIMIT_PER_HOUR, enforceSignupLimit, originHash } from './signup-limit.ts';

const cors = { 'Access-Control-Allow-Origin': '*' };

const reqMit = (ip: string) =>
  new Request('https://example.test', { headers: { 'x-forwarded-for': ip } });

/** Zaehler-Attrappe: liefert `count`, merkt sich Einfuegungen. */
function fakeDb(count: number, opts: { error?: string } = {}) {
  const inserts: unknown[] = [];
  return {
    inserts,
    from() {
      return {
        select: () => ({
          eq: () => ({
            gte: () =>
              Promise.resolve(
                opts.error ? { count: null, error: { message: opts.error } } : { count, error: null },
              ),
          }),
        }),
        insert: (row: unknown) => {
          inserts.push(row);
          return Promise.resolve({ error: null });
        },
        delete: () => ({ lt: () => Promise.resolve({ error: null }) }),
      };
    },
  };
}

Deno.test('unter dem Kontingent: durchlassen und vermerken', async () => {
  const db = fakeDb(SIGNUP_LIMIT_PER_HOUR - 1);
  const res = await enforceSignupLimit(db, reqMit('203.0.113.7'), cors);
  assertEquals(res, null);
  assertEquals(db.inserts.length, 1);
});

Deno.test('genau am Kontingent: abweisen mit 429', async () => {
  const db = fakeDb(SIGNUP_LIMIT_PER_HOUR);
  const res = await enforceSignupLimit(db, reqMit('203.0.113.7'), cors);
  assertEquals(res?.status, 429);
  assertEquals(db.inserts.length, 0);
});

Deno.test('darueber: ebenfalls abweisen', async () => {
  const db = fakeDb(SIGNUP_LIMIT_PER_HOUR + 50);
  const res = await enforceSignupLimit(db, reqMit('203.0.113.7'), cors);
  assertEquals(res?.status, 429);
});

Deno.test('Zaehler nicht lesbar: durchlassen statt aussperren', async () => {
  const db = fakeDb(0, { error: 'connection lost' });
  const res = await enforceSignupLimit(db, reqMit('203.0.113.7'), cors);
  assertEquals(res, null);
});

Deno.test('Adresse wird nie im Klartext vermerkt', async () => {
  const db = fakeDb(0);
  await enforceSignupLimit(db, reqMit('203.0.113.7'), cors);
  const row = JSON.stringify(db.inserts[0]);
  assertEquals(row.includes('203.0.113.7'), false);
});

Deno.test('originHash: gleich fuer dieselbe Adresse, verschieden fuer andere', async () => {
  const a1 = await originHash(reqMit('203.0.113.7'));
  const a2 = await originHash(reqMit('203.0.113.7'));
  const b = await originHash(reqMit('198.51.100.9'));
  assertEquals(a1, a2);
  assertNotEquals(a1, b);
});

Deno.test('originHash: nimmt den ersten Eintrag der Weiterleitungskette', async () => {
  const direkt = await originHash(reqMit('203.0.113.7'));
  const kette = await originHash(reqMit('203.0.113.7, 70.41.3.18, 150.172.238.178'));
  assertEquals(direkt, kette);
});

Deno.test('ohne Adresse: gemeinsamer Zaehler statt gar keiner', async () => {
  const ohne = await originHash(new Request('https://example.test'));
  assertEquals(ohne, 'unbekannt');
});
