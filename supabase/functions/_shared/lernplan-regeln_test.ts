import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { fachAusText, heuteInDeutschland, planTage } from './lernplan-regeln.ts';

Deno.test('Plantage: ohne Datum 5, sonst Tage bis zum Test, hoechstens 5', () => {
  const heute = '2026-10-04';
  assertEquals(planTage(null, heute), 5);
  assertEquals(planTage('2026-10-04', heute), 1); // Test heute: kurz wiederholen
  assertEquals(planTage('2026-10-05', heute), 1); // morgen
  assertEquals(planTage('2026-10-07', heute), 3);
  assertEquals(planTage('2026-10-09', heute), 5);
  assertEquals(planTage('2026-11-30', heute), 5);
  assertEquals(planTage('2026-10-03', heute), null); // vorbei
  assertEquals(planTage('irgendwann', heute), null);
});

Deno.test('Monatswechsel und Schaltjahr', () => {
  assertEquals(planTage('2028-03-01', '2028-02-27'), 3);
  assertEquals(planTage('2026-11-02', '2026-10-31'), 2);
});

Deno.test('Heute in deutscher Zeit: 23:30 UTC ist schon der naechste Tag', () => {
  assertEquals(heuteInDeutschland(new Date('2026-10-04T23:30:00Z')), '2026-10-05');
  assertEquals(heuteInDeutschland(new Date('2026-10-04T12:00:00Z')), '2026-10-04');
});

Deno.test('Fach aus dem Thema: eindeutig und zur Klasse passend', () => {
  assertEquals(fachAusText('Mathe-Test über Bruchrechnung', 6), 'math');
  assertEquals(fachAusText('Deutscharbeit: Erörterung schreiben', 9), 'german');
  assertEquals(fachAusText('English test simple past', 6), 'english');
  assertEquals(fachAusText('HSU Probe Wasserkreislauf', 3), 'science');
  assertEquals(fachAusText('Arbeit am Mittwoch', 5), null); // unklar
  assertEquals(fachAusText('Vokabeltest Unit 3', 6), null); // Englisch oder Latein
  assertEquals(fachAusText('Chemie Säuren und Basen', 5), null); // Chemie erst ab Klasse 7
  assertEquals(fachAusText('Mathe und Physik', 8), null); // zwei Fächer
});
