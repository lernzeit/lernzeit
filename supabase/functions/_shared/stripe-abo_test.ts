import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { aboZeiten, zugangsAbo } from './stripe-abo.ts';

const T0 = 1790000000; // 2026-09-21T13:33:20Z
const MONAT = 30 * 24 * 3600;
const iso = (s: number) => new Date(s * 1000).toISOString();

Deno.test('basil: Laufzeit steht am Posten, nicht am Abo', () => {
  // So liefert Stripe 2025-08-27.basil ein Monatsabo — am Abo selbst
  // keine Periodenfelder mehr. Genau daran scheiterte check-subscription.
  const z = aboZeiten({
    status: 'active',
    items: { data: [{ current_period_start: T0, current_period_end: T0 + MONAT }] },
  });
  assertEquals(z.periodeStart, iso(T0));
  assertEquals(z.periodeEnde, iso(T0 + MONAT));
  assertEquals(z.kuendigungZum, null);
});

Deno.test('alte API-Version: Laufzeit am Abo wird weiter gelesen', () => {
  const z = aboZeiten({
    status: 'active',
    current_period_start: T0,
    current_period_end: T0 + MONAT,
    items: { data: [{}] },
  });
  assertEquals(z.periodeEnde, iso(T0 + MONAT));
});

Deno.test('Kuendigung zum Laufzeitende: Status bleibt active, Ende ist das Periodenende', () => {
  const z = aboZeiten({
    status: 'active',
    cancel_at_period_end: true,
    items: { data: [{ current_period_start: T0, current_period_end: T0 + MONAT }] },
  });
  assertEquals(z.kuendigungZum, iso(T0 + MONAT));
});

Deno.test('Kuendigung mit festem Datum: cancel_at gewinnt', () => {
  const z = aboZeiten({
    status: 'active',
    cancel_at: T0 + 10 * 24 * 3600,
    cancel_at_period_end: false,
    items: { data: [{ current_period_start: T0, current_period_end: T0 + MONAT }] },
  });
  assertEquals(z.kuendigungZum, iso(T0 + 10 * 24 * 3600));
});

Deno.test('mehrere Posten: das frueheste Ende zaehlt', () => {
  const z = aboZeiten({
    status: 'active',
    items: { data: [
      { current_period_start: T0, current_period_end: T0 + 12 * MONAT },
      { current_period_start: T0, current_period_end: T0 + MONAT },
    ] },
  });
  assertEquals(z.periodeEnde, iso(T0 + MONAT));
});

Deno.test('leere oder unsinnige Werte ergeben null statt 1970', () => {
  const z = aboZeiten({
    status: 'active',
    cancel_at: 0,
    current_period_end: null,
    items: { data: [{ current_period_end: 0 }] },
  });
  assertEquals(z, { periodeStart: null, periodeEnde: null, kuendigungZum: null, bezahltSeit: null });
});

Deno.test('Zugangsabo: active vor trialing, gekuendigte zaehlen nicht', () => {
  const a = { id: 'a', status: 'canceled' };
  const b = { id: 'b', status: 'trialing' };
  const c = { id: 'c', status: 'active' };
  assertEquals(zugangsAbo([a, b, c])?.id, 'c');
  assertEquals(zugangsAbo([a, b])?.id, 'b');
  assertEquals(zugangsAbo([a, { id: 'd', status: 'past_due' }]), null);
  assertEquals(zugangsAbo([]), null);
});

Deno.test('Kauftag: Anlage bei Stripe, wenn ohne Stripe-Testphase gekauft', () => {
  // Der Fall von LernZeit: Die 4 Wochen laufen lokal, der Checkout bucht
  // sofort ab. Die Zeile in `subscriptions` stammt aber von der
  // Registrierung — ihr created_at ist NICHT der Kauftag.
  const z = aboZeiten({
    status: 'active',
    start_date: T0,
    items: { data: [{ current_period_start: T0, current_period_end: T0 + MONAT }] },
  });
  assertEquals(z.bezahltSeit, iso(T0));
});

Deno.test('Kauftag: nach einer Stripe-Testphase zaehlt deren Ende', () => {
  const z = aboZeiten({
    status: 'active',
    start_date: T0,
    trial_end: T0 + 7 * 24 * 3600,
    items: { data: [{ current_period_start: T0 + 7 * 24 * 3600, current_period_end: T0 + MONAT }] },
  });
  assertEquals(z.bezahltSeit, iso(T0 + 7 * 24 * 3600));
});

Deno.test('Kauftag: in einer Stripe-Testphase ist noch nichts gekauft', () => {
  const z = aboZeiten({
    status: 'trialing',
    start_date: T0,
    trial_end: T0 + 7 * 24 * 3600,
    items: { data: [{}] },
  });
  assertEquals(z.bezahltSeit, null);
});

Deno.test('Kauftag bleibt bei gekuendigtem, noch laufendem Abo erhalten', () => {
  const z = aboZeiten({
    status: 'active',
    start_date: T0,
    cancel_at_period_end: true,
    items: { data: [{ current_period_start: T0, current_period_end: T0 + MONAT }] },
  });
  assertEquals(z.bezahltSeit, iso(T0));
  assertEquals(z.kuendigungZum, iso(T0 + MONAT));
});
