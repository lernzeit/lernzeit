import type { RatgeberArtikel } from './types';

/*
 * Aussagen zu Apple stammen aus denselben Seiten wie der Artikel „Bildschirmzeit
 * beim Kind einstellen“ (am 04.10.2026 am Original geprüft, docs/ratgeber/
 * quellenpruefung.md, Artikel 4). Apple hat die Bezeichnungen mit iOS 27
 * geändert; bei der nächsten iOS-Version Namen erneut prüfen. Die Aussagen zu
 * LernZeit stehen in docs/funktionsstand.md.
 */
export const bildschirmzeitIphoneKind: RatgeberArtikel = {
  slug: 'bildschirmzeit-iphone-kind',
  titel: 'Bildschirmzeit auf dem iPhone des Kindes',
  beschreibung:
    'Was die Bildschirmzeit von Apple für das Kinder-iPhone kann, was du vorher brauchst und wo sie aufhört. Dazu: Was LernZeit auf dem iPhone ergänzt.',
  veroeffentlicht: true,
  datum: '2026-10-26',
  lesezeitMinuten: 4,
  abschnitte: [
    {
      absaetze: [
        'Hat dein Kind ein eigenes iPhone, kannst du die Nutzungszeit direkt am Gerät begrenzen. Die Kindersicherung ist in iOS eingebaut [1]. Dieser Artikel nennt, was du dafür brauchst, was sie kann und wo sie aufhört.',
      ],
    },
    {
      ueberschrift: 'Voraussetzung: die Familienfreigabe',
      absaetze: [
        'Jedes Familienmitglied hat in der Familienfreigabe einen eigenen Apple Account. Dann lassen sich die Bildschirmzeit und die Kindersicherung des Kindes vom eigenen iPhone, iPad oder Mac aus einrichten und verwalten [1]. Ohne Familienfreigabe fehlt dir dieser Weg.',
      ],
    },
    {
      ueberschrift: 'Was du einstellen kannst',
      absaetze: [
        'Mit Zeitplänen legst du Zeiten fest, etwa am Abend, in denen nur Anrufe, Nachrichten und erlaubte Apps verfügbar sind [2]. Unter iOS 26 heißt das „Auszeit“ [2], unter iOS 27 „Bildschirmzeitpläne“ [1].',
        'Dazu kommen tägliche Zeitlimits für eine Kategorie von Apps, zum Beispiel Spiele oder soziale Netzwerke, und für einzelne Apps [2]. In iOS 27 heißen sie „Nutzungszeiten“ [1].',
        'Du wählst außerdem Apps und Kontakte aus, die während der Zeitpläne und nach dem Erreichen eines Limits verfügbar bleiben [2].',
        'Damit dein Kind die Einstellungen nicht selbst ändert, legst du einen eigenen Code an. Er muss eingegeben werden, bevor etwas an der Bildschirmzeit geändert werden kann [3].',
      ],
    },
    {
      ueberschrift: 'Wenn dein Kind mehr Zeit möchte',
      absaetze: [
        'Fordert dein Kind mehr Bildschirmzeit an, genehmigst du die Anfrage in den Einstellungen unter „Bildschirmzeit“ oder in der App „Nachrichten“ [4]. Ob die Antwort ja oder nein lautet, entscheidet ihr. Die Technik gibt dafür keine Regel vor.',
      ],
    },
    {
      ueberschrift: 'Wo die Bildschirmzeit aufhört',
      absaetze: [
        'Die Einstellungen setzen eine Grenze. Wofür die Zeit gedacht ist und wann es Ausnahmen gibt, regeln sie nicht. Das müsst ihr besprechen, am besten bevor der erste Streit kommt. Wie das gehen kann, steht im Artikel über den Mediennutzungsvertrag in diesem Ratgeber.',
      ],
    },
    {
      ueberschrift: 'Was LernZeit auf dem iPhone ergänzt',
      absaetze: [
        'LernZeit dreht die Frage um: Dein Kind kann sich Zeit verdienen, für jede richtig gelöste Aufgabe 30 Sekunden. Es fragt an, du genehmigst. Auf dem iPhone sperrt LernZeit das Handy dafür selbst, über Apples Bildschirmzeit-Schnittstelle, und gibt die genehmigte Zeit frei, sobald dein Kind LernZeit öffnet.',
        'Voraussetzung sind iOS 16 oder neuer, ein Apple-Kinderkonto in der Familienfreigabe und die LernZeit-App; im Browser gibt es keine Sperre. Wie sich LernZeit mit allen Einstellungen in Apples eigener Bildschirmzeit verträgt, haben wir nicht für jede Kombination geprüft. Eine Sperre, die ausgeht, meldet LernZeit dir. Dass sie immer aktiv bleibt, können wir nicht versprechen.',
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
  ],
};
