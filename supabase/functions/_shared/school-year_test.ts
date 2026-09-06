import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import {
  effectiveGrade,
  previousGradeShare,
  schoolYearHint,
  schoolYearMonth,
} from './school-year.ts';

const am = (jahr: number, monat1bis12: number, tag = 15) => new Date(jahr, monat1bis12 - 1, tag);

Deno.test('Schuljahr beginnt im August', () => {
  assertEquals(schoolYearMonth(am(2026, 8)), 0);
  assertEquals(schoolYearMonth(am(2026, 9)), 1);
  assertEquals(schoolYearMonth(am(2026, 12)), 4);
  assertEquals(schoolYearMonth(am(2027, 1)), 5);
  assertEquals(schoolYearMonth(am(2027, 7)), 11);
});

Deno.test('Anteil der Vorklasse faellt im Jahresverlauf', () => {
  assertEquals(previousGradeShare(am(2026, 8)), 0.7);
  assertEquals(previousGradeShare(am(2026, 9)), 0.7);
  assertEquals(previousGradeShare(am(2026, 10)), 0.5);
  assertEquals(previousGradeShare(am(2026, 12)), 0.3);
  assertEquals(previousGradeShare(am(2027, 2)), 0.15);
  assertEquals(previousGradeShare(am(2027, 7)), 0.15);
});

Deno.test('Anteil sinkt monoton — nie wird es im Jahresverlauf wieder leichter', () => {
  let vorher = 1;
  for (let m = 8; m < 8 + 12; m++) {
    const datum = am(2026 + (m > 12 ? 1 : 0), ((m - 1) % 12) + 1);
    const anteil = previousGradeShare(datum);
    assert(anteil <= vorher, `Monat ${m}: ${anteil} > ${vorher}`);
    vorher = anteil;
  }
});

Deno.test('Im September ueberwiegt die vorige Klassenstufe', () => {
  // Wuerfel unter dem Anteil -> Vorklasse, darueber -> eigene Klasse.
  assertEquals(effectiveGrade(7, am(2026, 9), 0.0), 6);
  assertEquals(effectiveGrade(7, am(2026, 9), 0.69), 6);
  assertEquals(effectiveGrade(7, am(2026, 9), 0.7), 7);
  assertEquals(effectiveGrade(7, am(2026, 9), 0.99), 7);
});

Deno.test('Im Fruehjahr ueberwiegt die eigene Klassenstufe', () => {
  assertEquals(effectiveGrade(7, am(2027, 3), 0.14), 6);
  assertEquals(effectiveGrade(7, am(2027, 3), 0.15), 7);
  assertEquals(effectiveGrade(7, am(2027, 3), 0.9), 7);
});

Deno.test('Klasse 1 hat keine Vorstufe', () => {
  assertEquals(effectiveGrade(1, am(2026, 9), 0.0), 1);
  assertEquals(effectiveGrade(1, am(2026, 9), 0.99), 1);
});

Deno.test('Die Klassenstufe faellt nie unter 1 und nie ueber die eigene', () => {
  for (let grade = 1; grade <= 10; grade++) {
    for (const roll of [0, 0.3, 0.5, 0.71, 0.99]) {
      for (const monat of [8, 10, 12, 3, 7]) {
        const g = effectiveGrade(grade, am(2026, monat), roll);
        assert(g >= 1, `unter 1 bei Klasse ${grade}`);
        assert(g <= grade, `ueber die eigene Klasse ${grade}: ${g}`);
        assert(g >= grade - 1, `mehr als eine Stufe herunter bei ${grade}: ${g}`);
      }
    }
  }
});

Deno.test('Unsinnige Eingaben ergeben trotzdem eine gueltige Klassenstufe', () => {
  assertEquals(effectiveGrade(0, am(2026, 9), 0), 1);
  assertEquals(effectiveGrade(Number.NaN, am(2026, 9), 0), 1);
});

Deno.test('Lernstands-Hinweis nur im ersten Halbjahr', () => {
  assert(schoolYearHint(7, am(2026, 9)).includes('gerade erst begonnen'));
  assert(schoolYearHint(7, am(2026, 11)).includes('Viertel'));
  assert(schoolYearHint(7, am(2026, 12)).includes('Haelfte'));
  // Ab Februar ist der Jahresstoff weitgehend behandelt — dann kein Hinweis.
  assertEquals(schoolYearHint(7, am(2027, 2)), '');
  assertEquals(schoolYearHint(7, am(2027, 6)), '');
});

Deno.test('Der Hinweis nennt die Klassenstufe und warnt vor spaeten Themen', () => {
  const hinweis = schoolYearHint(7, am(2026, 9));
  assert(hinweis.includes('Klasse 7'));
  assert(hinweis.includes('zweiten Halbjahr'));
});
