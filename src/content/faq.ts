// Gemeinsame FAQ-Daten für den Abschnitt auf /start und die Seite /faq.
// Texte vorgegeben (04.10.2026), nur stilistisch überarbeitet.
export interface FaqEintrag {
  f: string;
  a: string;
}

export const FAQ: FaqEintrag[] = [
  { f: 'Was kostet LernZeit?', a: 'Die ersten 4 Wochen kannst du alles ausprobieren, ohne Zahlungsdaten anzugeben. Danach bleibt das Wichtigste kostenlos: Dein Kind löst Aufgaben in allen Fächern seiner Klassenstufe und verdient damit Bildschirmzeit. Kinderprofile kannst du so viele anlegen, wie du brauchst. Premium kostet 2,99 € im Monat oder 29,99 € im Jahr. Dazu gehören der KI-Lernplan für eine anstehende Klassenarbeit, eine eigene Tagesobergrenze pro Kind und die erweiterte Lernanalyse.' },
  { f: 'Wird nach der Testphase automatisch etwas abgebucht?', a: 'Nein. Für die Testphase hinterlegst du keine Zahlungsdaten, also kann auch nichts abgebucht werden. Ein Abo gibt es nur, wenn du es selbst in der App abschließt.' },
  { f: 'Wie viel Bildschirmzeit verdient mein Kind?', a: 'Für jede richtig gelöste Aufgabe gibt es 30 Sekunden. Damit es nicht ausufert, gilt eine Obergrenze: werktags 30 Minuten, am Wochenende 60. Mit Premium stellst du beides selbst ein.' },
  { f: 'Wird die verdiente Zeit automatisch freigegeben?', a: 'Nein. Möchte dein Kind Zeit einlösen, schickt es dir eine Anfrage. Du entscheidest, ob es die Zeit bekommt.' },
  { f: 'Für welche Klassen und Fächer ist LernZeit gedacht?', a: 'Für die Klassen 1 bis 10. Mathematik und Deutsch gibt es ab Klasse 1, Sachkunde in den Klassen 1 bis 4 und Englisch ab Klasse 3. Ab Klasse 5 kommen Erdkunde, Geschichte, Physik, Biologie und Latein dazu, ab Klasse 7 Chemie.' },
  { f: 'Wie verbinde ich mein Kind mit meinem Konto?', a: 'Tippe im Eltern-Bereich auf „Kind einladen“, bestätige die Einwilligung und tippe auf „Code erstellen“. Den Link schickst du deinem Kind mit „Link teilen“. Es öffnet ihn auf seinem eigenen Handy oder gibt den sechsstelligen Code in der App ein. Der Code gilt 7 Tage.' },
  { f: 'Braucht mein Kind eine eigene E-Mail-Adresse?', a: 'Nein. Kinder können sich auch mit einem Benutzernamen anmelden.' },
  { f: 'Wo werden die Daten gespeichert?', a: 'Auf Servern in der EU, in Frankfurt am Main.' },
  { f: 'Kann ich mein Konto wieder löschen?', a: 'Ja, jederzeit selbst: in der App unter „Konto-Einstellungen“ und dann „Account löschen“. Dabei werden alle Daten deines Kontos und der verbundenen Kinder entfernt.' },
];

export const FAQ_JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: FAQ.map(({ f, a }) => ({
    '@type': 'Question',
    name: f,
    acceptedAnswer: { '@type': 'Answer', text: a },
  })),
};
