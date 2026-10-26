import type { RatgeberArtikel } from './types';

/*
 * Aussagen zu Apple und Google stammen aus denselben Seiten wie der Artikel
 * „Bildschirmzeit beim Kind einstellen“ (am 04.10.2026 am Original geprüft,
 * docs/ratgeber/quellenpruefung.md, Artikel 4). Die Aussagen zu LernZeit stehen
 * in docs/funktionsstand.md.
 */
export const familyLinkOderBildschirmzeit: RatgeberArtikel = {
  slug: 'family-link-oder-bildschirmzeit',
  titel: 'Family Link oder Bildschirmzeit: Was passt?',
  beschreibung:
    'Apple Bildschirmzeit oder Google Family Link? Die Wahl hängt vom Handy deines Kindes ab. Was beide können, was sie voraussetzen, wie sie sich unterscheiden.',
  veroeffentlicht: true,
  datum: '2026-10-26',
  lesezeitMinuten: 4,
  abschnitte: [
    {
      absaetze: [
        'Die Frage „Family Link oder Bildschirmzeit?“ beantwortet in der Regel das Handy deines Kindes. Hat es ein iPhone, nutzt du die Bildschirmzeit von Apple. Hat es ein Android-Gerät, nutzt du Google Family Link. Dieser Artikel zeigt, was beide können und worauf du achten musst.',
      ],
    },
    {
      ueberschrift: 'Die Voraussetzungen im Vergleich',
      absaetze: [
        'Bei Apple ist die Kindersicherung in iPhone, iPad und Mac eingebaut. Voraussetzung ist die Familienfreigabe mit einem eigenen Apple Account für jedes Familienmitglied; die Einrichtung läuft vom eigenen iPhone, iPad oder Mac aus [1].',
        'Bei Google brauchst du die App Family Link auf deinem eigenen Gerät. Das kann ein Android-Gerät ab Version 6.0 oder ein iPhone ab iOS 16 sein. Mit der App erstellst du ein Google-Konto für ein Kind unter 13 Jahren oder richtest die Elternaufsicht für ein bestehendes Konto ein [5].',
        'Das heißt für gemischte Familien: Mit einem iPhone in der Hand kannst du Family Link für das Android-Handy deines Kindes nutzen. Für Apples Bildschirmzeit beschreibt Apple die Einrichtung vom eigenen iPhone, iPad oder Mac aus. Hast du keines davon, klär zuerst, ob du sie einrichten kannst.',
      ],
    },
    {
      ueberschrift: 'Was beide können',
      tabelle: {
        kopf: ['Funktion', 'Apple Bildschirmzeit', 'Google Family Link'],
        zeilen: [
          ['Zeitpläne', 'Ja: „Auszeit“ (iOS 26), „Bildschirmzeitpläne“ (iOS 27) [1][2]', 'Ja: Ruhezeiten, in denen das Gerät gesperrt ist [6]'],
          ['Limits', 'Täglich für eine Kategorie von Apps und für einzelne Apps [2]', 'Tageslimit für das Gerät, Limits für einzelne Apps, nicht für System-Apps [6]'],
          ['Mehr Zeit für heute', 'Anfrage des Kindes genehmigen [4]', 'Bonuszeit für den laufenden Tag [6]'],
        ],
      },
      absaetze: [],
    },
    {
      ueberschrift: 'Wo beide aufhören',
      absaetze: [
        'Beide setzen eine Grenze und lassen offen, wofür die Zeit gedacht ist. Ob ein Kind sich mehr Zeit verdienen kann, etwa durch Lernen, sehen sie nicht vor. Das ist eine Frage für die Familie, am besten vorab geklärt, zum Beispiel in einem Mediennutzungsvertrag.',
      ],
    },
    {
      ueberschrift: 'Und LernZeit?',
      absaetze: [
        'LernZeit ersetzt weder das eine noch das andere. Dein Kind löst Aufgaben, verdient pro richtiger Antwort 30 Sekunden Bildschirmzeit und fragt bei dir an. Du genehmigst.',
        'Auf dem iPhone sperrt LernZeit das Handy dann selbst über Apples Bildschirmzeit-Schnittstelle und gibt die genehmigte Zeit frei, sobald dein Kind LernZeit öffnet. Voraussetzung sind iOS 16 oder neuer und ein Apple-Kinderkonto in der Familienfreigabe.',
        'Auf Android sperrt LernZeit nicht. Google bietet dafür keine Schnittstelle. Family Link bleibt deine Kindersicherung, und du gibst die Minuten nach der Genehmigung dort als Bonuszeit frei.',
      ],
    },
  ],
  quellen: [
    {
      nr: 1,
      titel: 'Mit „Bildschirmzeit“ das iPhone oder iPad deines Kindes verwalten',
      herausgeber: 'Apple',
      jahr: '2026',
      url: 'https://support.apple.com/de-de/108806',
      geprueftAm: '2026-10-04',
    },
    {
      nr: 2,
      titel: 'iPhone-Handbuch (iOS 26): Zeitpläne mit „Bildschirmzeit“ auf dem iPhone festlegen',
      herausgeber: 'Apple',
      jahr: '',
      url: 'https://support.apple.com/de-de/guide/iphone/iphb0c7313c9/26/ios/26',
      geprueftAm: '2026-10-04',
    },
    {
      nr: 3,
      titel: 'iPhone-Handbuch (iOS 26): „Bildschirmzeit“ für ein Kind auf dem iPhone einrichten',
      herausgeber: 'Apple',
      jahr: '',
      url: 'https://support.apple.com/de-de/guide/iphone/ipha200da319/26/ios/26',
      geprueftAm: '2026-10-04',
    },
    {
      nr: 4,
      titel: 'iPhone-Handbuch (iOS 26): Kindersicherung mit der Familienfreigabe auf dem iPhone einrichten',
      herausgeber: 'Apple',
      jahr: '',
      url: 'https://support.apple.com/de-de/guide/iphone/iph00ba7d632/26/ios/26',
      geprueftAm: '2026-10-04',
    },
    {
      nr: 5,
      titel: 'Erste Schritte mit Family Link',
      herausgeber: 'Google',
      jahr: '',
      url: 'https://support.google.com/families/answer/7101025?hl=de',
      geprueftAm: '2026-10-04',
    },
    {
      nr: 6,
      titel: 'Bildschirmzeit für das Gerät Ihres Kindes verwalten',
      herausgeber: 'Google',
      jahr: '',
      url: 'https://support.google.com/families/answer/7103340?hl=de',
      geprueftAm: '2026-10-04',
    },
  ],
};
