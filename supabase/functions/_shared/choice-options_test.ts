import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { cleanHint, hatCodeReste, parseChoiceOptions } from './choice-options.ts';

// Alle Eingaben stammen aus ai_question_cache (Befund 29.09.2026).

Deno.test('Python-Liste mit einfachen Anfuehrungszeichen, zerschnitten', () => {
  assertEquals(parseChoiceOptions(["['my'", "'mine'", "'his'", "'her']"]), ['my', 'mine', 'his', 'her']);
});

Deno.test('options = [...] als Text, zerschnitten', () => {
  assertEquals(parseChoiceOptions(['options = ["2"', '"3"', '"4"', '"5"]']), ['2', '3', '4', '5']);
  assertEquals(parseChoiceOptions(['options=[ "Katze"', '"schläft"', '"Sofa"', '"auf" ]']), ['Katze', 'schläft', 'Sofa', 'auf']);
});

Deno.test('Deutsche Anfuehrungszeichen mit Klammer im ersten und letzten Eintrag', () => {
  assertEquals(parseChoiceOptions(['[„Taiga“', '„Steppe“', '„Mangrovenwald“', '„Macchie“]']), ['Taiga', 'Steppe', 'Mangrovenwald', 'Macchie']);
  assertEquals(
    parseChoiceOptions(['[„Ich werde das Buch lesen.“', '„Ich lese das Buch.“', '„Ich würde das Buch lesen.“', '„Ich habe das Buch gelesen.“]']),
    ['Ich werde das Buch lesen.', 'Ich lese das Buch.', 'Ich würde das Buch lesen.', 'Ich habe das Buch gelesen.'],
  );
});

Deno.test('Einleitungssatz vor der Liste', () => {
  assertEquals(
    parseChoiceOptions(['Die Optionen für diese Frage sind: ["Die Einführung einer einheitlichen Währung in allen Provinzen."', '"Der Mangel an neuen Sklaven nach dem Ende der Eroberungskriege."', '"Die Erfindung neuer landwirtschaftlicher Werkzeuge."', '"Der Ausbau des römischen Straßennetzes."]']),
    [
      'Die Einführung einer einheitlichen Währung in allen Provinzen.',
      'Der Mangel an neuen Sklaven nach dem Ende der Eroberungskriege.',
      'Die Erfindung neuer landwirtschaftlicher Werkzeuge.',
      'Der Ausbau des römischen Straßennetzes.',
    ],
  );
});

Deno.test('Reste eines zerschnittenen JSON-Objekts', () => {
  assertEquals(
    parseChoiceOptions(['[', '"Skandinavisches Gebirge"', '"Ural"', '"Alpen"', '"Pyrenäen"', ']', 'question_text:']),
    ['Skandinavisches Gebirge', 'Ural', 'Alpen', 'Pyrenäen'],
  );
});

Deno.test('Komma im Satz bleibt erhalten', () => {
  assertEquals(
    parseChoiceOptions(['options = ["Viel fressen', 'um Fettreserven aufzubauen."', '"Einen geschützten Schlafplatz suchen."', '"Nahrung unter dem gefrorenen Boden finden."', '"Eine lange Zeit schlafen (Winterschlaf)."]']),
    ['Viel fressen, um Fettreserven aufzubauen.', 'Einen geschützten Schlafplatz suchen.', 'Nahrung unter dem gefrorenen Boden finden.', 'Eine lange Zeit schlafen (Winterschlaf).'],
  );
});

Deno.test('Text statt Liste, direkt vom Modell', () => {
  assertEquals(parseChoiceOptions("['Does he play football every Saturday?', 'He plays football every Saturday?']"),
    ['Does he play football every Saturday?', 'He plays football every Saturday?']);
  assertEquals(parseChoiceOptions('["32", "24", "96", "64"]'), ['32', '24', '96', '64']);
  assertEquals(parseChoiceOptions('A) Hund\nB) Katze\nC) Maus'), ['Hund', 'Katze', 'Maus']);
});

Deno.test('Saubere Listen bleiben unveraendert', () => {
  assertEquals(parseChoiceOptions(['Ja', 'Nein', 'Vielleicht']), ['Ja', 'Nein', 'Vielleicht']);
  assertEquals(parseChoiceOptions(['„Hallo“, sagte er.', 'Kids\'', '3,5']), ['„Hallo“, sagte er.', 'Kids\'', '3,5']);
  assertEquals(parseChoiceOptions([1, 2, 3, 4]), ['1', '2', '3', '4']);
});

Deno.test('Codereste werden erkannt', () => {
  assertEquals(hatCodeReste(["['my'", 'mine']), true);
  assertEquals(hatCodeReste(['Ja', 'Nein']), false);
});

Deno.test('Hinweis: Platzhalter und Listen fallen weg', () => {
  assertEquals(cleanHint('null'), null);
  assertEquals(cleanHint(' '), null);
  assertEquals(cleanHint(null), null);
  assertEquals(cleanHint('["Die Erfindung des Rades", "Die Entwicklung der Landwirtschaft"]'), null);
  assertEquals(cleanHint('Denke an eine Landkarte (Norden oben).'), 'Denke an eine Landkarte (Norden oben).');
});
