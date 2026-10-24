import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { cleanHint, hatAuszeichnung, hatCodeReste, parseChoiceOptions } from './choice-options.ts';

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

// Befund 24.10.2026 (Screenshots aus der App).

Deno.test('Optionen komplett in Anfuehrungszeichen verlieren sie', () => {
  assertEquals(
    parseChoiceOptions(['"I go to the bakery."', '"I go to the library."', '"I go to the zoo."']),
    ['I go to the bakery.', 'I go to the library.', 'I go to the zoo.'],
  );
  // Zitat als Teil des Inhalts bleibt.
  assertEquals(
    parseChoiceOptions(['Paul fragte: "Kommt ihr mit?"', 'Paul fragte, "Kommt ihr mit?".', 'Paul fragte: Kommt ihr mit?']),
    ['Paul fragte: "Kommt ihr mit?"', 'Paul fragte, "Kommt ihr mit?".', 'Paul fragte: Kommt ihr mit?'],
  );
});

Deno.test('Auszeichnungen, die die App nicht darstellen kann', () => {
  assertEquals(hatAuszeichnung('<u>Gestern</u> hat es stark geregnet.'), true);
  assertEquals(hatAuszeichnung('Die Schüler freuen sich auf **den anstehenden Ausflug**.'), true);
  assertEquals(hatAuszeichnung('Das Kind spielt _draußen_ im Garten.'), true);
  assertEquals(hatAuszeichnung('In welchem Satz ist das unterstrichene Wort ein Adverb?'), true);
  assertEquals(hatAuszeichnung('Welche Funktion hat das fett gedruckte Satzglied?'), true);
  assertEquals(hatAuszeichnung('Bestimme das markierte Satzglied.'), true);
  // Kein Fehler
  assertEquals(hatAuszeichnung('Der ___ verläuft durch Greenwich.'), false);
  assertEquals(hatAuszeichnung('Welches Ereignis markiert den Übergang zur Neuzeit?'), false);
  assertEquals(hatAuszeichnung('Ist 3 < 5 und 7 > 2?'), false);
  assertEquals(hatAuszeichnung('Berechne 2 * 3 * 4.'), false);
});

Deno.test('„hervorgehoben“ als Verb ist keine Auszeichnung', () => {
  assertEquals(hatAuszeichnung('damit der Garten als Ort besonders hervorgehoben wird'), false);
  assertEquals(hatAuszeichnung('Bestimme das hervorgehobene Wort.'), true);
  assertEquals(hatAuszeichnung('der fettgedruckten Wörter'), true);
});
