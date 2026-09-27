import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { aenderungAus, nutzerId, plusMonate, type RcEreignis } from './revenuecat.ts';

const UID = 'fc7d3be4-3703-4bdb-8cfb-e7eb2fbffece';
const KAUF = Date.UTC(2026, 8, 8, 16, 3); // 08.09.2026 16:03 UTC
const JAHR_SPAETER = Date.UTC(2027, 8, 8, 16, 3);

const ereignis = (teil: Partial<RcEreignis>): RcEreignis => ({
  id: 'e1',
  type: 'INITIAL_PURCHASE',
  app_user_id: UID,
  entitlement_ids: ['premium'],
  period_type: 'NORMAL',
  purchased_at_ms: KAUF,
  expiration_at_ms: JAHR_SPAETER,
  store: 'PLAY_STORE',
  product_id: 'lernzeit_premium:yearly',
  ...teil,
});

Deno.test('Nutzer: Supabase-ID direkt, sonst aus den Aliasen, sonst keiner', () => {
  assertEquals(nutzerId(ereignis({})), UID);
  assertEquals(nutzerId(ereignis({ app_user_id: '$RCAnonymousID:abc', aliases: ['$RCAnonymousID:abc', UID.toUpperCase()] })), UID);
  assertEquals(nutzerId(ereignis({ app_user_id: '$RCAnonymousID:abc', original_app_user_id: null, aliases: [] })), null);
});

Deno.test('Kauf im Play Store: Premium aktiv bis Ablauf, Kauftag gesetzt', () => {
  const a = aenderungAus(ereignis({}), null, 0, 'premium');
  assertEquals(a.art, 'setzen');
  if (a.art !== 'setzen') return;
  assertEquals(a.felder.plan, 'premium');
  assertEquals(a.felder.status, 'active');
  assertEquals(a.felder.quelle, 'revenuecat');
  assertEquals(a.felder.trial_end, new Date(JAHR_SPAETER).toISOString());
  assertEquals(a.felder.current_period_end, a.felder.trial_end);
  assertEquals(a.felder.bezahlt_seit, new Date(KAUF).toISOString());
  assertEquals(a.felder.cancel_at, null);
});

Deno.test('Geschenkte Monate verlängern das Ende — auch bei Kündigung', () => {
  // Der Fall Foltyn: zweites Jahr geschenkt, dann Verlängerung abgeschaltet.
  const a = aenderungAus(ereignis({ type: 'CANCELLATION' }), { bezahlt_seit: '2026-09-08T16:03:00Z' }, 12, 'premium');
  if (a.art !== 'setzen') throw new Error(a.grund);
  const erwartet = new Date(Date.UTC(2028, 8, 8, 16, 3)).toISOString();
  assertEquals(a.felder.trial_end, erwartet);
  assertEquals(a.felder.cancel_at, erwartet);
  assertEquals(a.felder.plan, undefined); // Kündigung stuft nicht selbst herab
});

Deno.test('Ablauf ohne Geschenk: Ende = Ablauf, Herabstufen macht check-subscription', () => {
  const a = aenderungAus(ereignis({ type: 'EXPIRATION' }), null, 0, 'premium');
  if (a.art !== 'setzen') throw new Error(a.grund);
  assertEquals(a.felder.trial_end, new Date(JAHR_SPAETER).toISOString());
  assertEquals(a.felder.status, undefined);
  assertEquals(a.felder.cancel_at, null);
});

Deno.test('Kauftag wird nie überschrieben, Store-Testphase ist kein Kauf', () => {
  const verlaengert = aenderungAus(ereignis({ type: 'RENEWAL' }), { bezahlt_seit: '2026-09-08T16:03:00Z' }, 0, 'premium');
  if (verlaengert.art !== 'setzen') throw new Error();
  assertEquals(verlaengert.felder.bezahlt_seit, undefined);

  const probe = aenderungAus(ereignis({ period_type: 'TRIAL' }), null, 0, 'premium');
  if (probe.art !== 'setzen') throw new Error();
  assertEquals(probe.felder.status, 'trialing');
  assertEquals(probe.felder.bezahlt_seit, undefined);

  // Erste Verlängerung nach der Store-Testphase = erster Kauf.
  const erste = aenderungAus(ereignis({ type: 'RENEWAL' }), { bezahlt_seit: null }, 0, 'premium');
  if (erste.art !== 'setzen') throw new Error();
  assertEquals(erste.felder.bezahlt_seit, new Date(KAUF).toISOString());
});

Deno.test('Wiederaufnahme nach Kündigung hebt cancel_at auf', () => {
  const a = aenderungAus(ereignis({ type: 'UNCANCELLATION' }), null, 0, 'premium');
  if (a.art !== 'setzen') throw new Error();
  assertEquals(a.felder.cancel_at, null);
  assertEquals(a.felder.status, 'active');
});

Deno.test('Ignoriert: anderes Recht, Test, Zahlungsproblem, fehlender Ablauf', () => {
  assertEquals(aenderungAus(ereignis({ entitlement_ids: ['anderes'] }), null, 0, 'premium').art, 'ignorieren');
  assertEquals(aenderungAus(ereignis({ type: 'TEST' }), null, 0, 'premium').art, 'ignorieren');
  assertEquals(aenderungAus(ereignis({ type: 'BILLING_ISSUE' }), null, 0, 'premium').art, 'ignorieren');
  assertEquals(aenderungAus(ereignis({ type: 'TRANSFER' }), null, 0, 'premium').art, 'ignorieren');
  assertEquals(aenderungAus(ereignis({ expiration_at_ms: null }), null, 0, 'premium').art, 'ignorieren');
  // Ohne Angabe zum Recht wird nicht ausgeschlossen.
  assertEquals(aenderungAus(ereignis({ entitlement_ids: null }), null, 0, 'premium').art, 'setzen');
});

Deno.test('Monate addieren kalendergenau', () => {
  assertEquals(new Date(plusMonate(JAHR_SPAETER, 12)).toISOString(), '2028-09-08T16:03:00.000Z');
  assertEquals(plusMonate(JAHR_SPAETER, 0), JAHR_SPAETER);
});

Deno.test('Sandbox-Kauf: Zugang ja, Kauftag nein', () => {
  const a = aenderungAus(ereignis({ environment: 'SANDBOX' }), null, 0, 'premium');
  if (a.art !== 'setzen') throw new Error();
  assertEquals(a.felder.status, 'active');
  assertEquals(a.felder.bezahlt_seit, undefined);
  const echt = aenderungAus(ereignis({ environment: 'PRODUCTION' }), null, 0, 'premium');
  if (echt.art !== 'setzen') throw new Error();
  assertEquals(echt.felder.bezahlt_seit, new Date(KAUF).toISOString());
});
