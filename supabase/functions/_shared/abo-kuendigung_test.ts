import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { einenMonatSpaeter, kuendigungsplan } from './abo-kuendigung.ts';

const s = (iso: string) => Math.floor(Date.parse(iso) / 1000);

Deno.test('Monatsabo endet zum Ende des laufenden Monats, ohne Erstattung', () => {
  const p = kuendigungsplan(
    { intervall: 'month', start: s('2026-05-10T10:00:00Z'), periodeStart: s('2026-10-10T10:00:00Z'), periodeEnde: s('2026-11-10T10:00:00Z'), bezahltCent: 299 },
    s('2026-10-20T08:00:00Z'),
  );
  assertEquals(p, { ende: s('2026-11-10T10:00:00Z'), zumPeriodenende: true, erstattungCent: 0, regel: 'monat' });
});

Deno.test('Jahresabo im ersten Jahr endet zum Ende des ersten Jahres', () => {
  const p = kuendigungsplan(
    { intervall: 'year', start: s('2026-03-01T10:00:00Z'), periodeStart: s('2026-03-01T10:00:00Z'), periodeEnde: s('2027-03-01T10:00:00Z'), bezahltCent: 2999 },
    s('2026-10-04T12:00:00Z'),
  );
  assertEquals(p.regel, 'erstes_jahr');
  assertEquals(p.ende, s('2027-03-01T10:00:00Z'));
  assertEquals(p.erstattungCent, 0);
});

Deno.test('Jahresabo im Folgejahr: ein Monat Frist, Rest anteilig zurück', () => {
  const start = s('2025-03-01T10:00:00Z');
  const periodeStart = s('2026-03-01T10:00:00Z');
  const periodeEnde = s('2027-03-01T10:00:00Z');
  const jetzt = s('2026-10-04T12:00:00Z');
  const p = kuendigungsplan({ intervall: 'year', start, periodeStart, periodeEnde, bezahltCent: 2999 }, jetzt);
  assertEquals(p.regel, 'folgejahr');
  assertEquals(p.zumPeriodenende, false);
  assertEquals(p.ende, s('2026-11-04T12:00:00Z'));
  // 116,9 von 365 Tagen bleiben ungenutzt → 2999 × 116,92/365 = 960,6 → 961 Cent (gerundet)
  assertEquals(p.erstattungCent, 961);
});

Deno.test('Folgejahr, weniger als ein Monat übrig: zum Ende des Zeitraums', () => {
  const p = kuendigungsplan(
    { intervall: 'year', start: s('2025-03-01T10:00:00Z'), periodeStart: s('2026-03-01T10:00:00Z'), periodeEnde: s('2027-03-01T10:00:00Z'), bezahltCent: 2999 },
    s('2027-02-10T10:00:00Z'),
  );
  assertEquals(p, { ende: s('2027-03-01T10:00:00Z'), zumPeriodenende: true, erstattungCent: 0, regel: 'folgejahr' });
});

Deno.test('Monatsende: 31.01. plus ein Monat ist der 28.02.', () => {
  assertEquals(einenMonatSpaeter(s('2027-01-31T09:00:00Z')), s('2027-02-28T09:00:00Z'));
  assertEquals(einenMonatSpaeter(s('2028-01-31T09:00:00Z')), s('2028-02-29T09:00:00Z'));
  assertEquals(einenMonatSpaeter(s('2026-12-15T09:00:00Z')), s('2027-01-15T09:00:00Z'));
});
