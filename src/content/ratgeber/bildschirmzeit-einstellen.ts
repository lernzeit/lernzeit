import type { RatgeberArtikel } from './types';

/*
 * Quellen am 04.10.2026 am Original geprüft, Befunde in
 * docs/ratgeber/quellenpruefung.md, Artikel 4. Apple hat die Bezeichnungen
 * mit iOS 27 geändert; die Funktionen sind nach dem iPhone-Handbuch für
 * iOS 26 beschrieben, die neuen Namen nach der aktuellen Hilfeseite [1].
 * Bei der nächsten iOS-Version Namen erneut prüfen.
 */

export const bildschirmzeitEinstellen: RatgeberArtikel = {
  slug: 'bildschirmzeit-einstellen-iphone-android-kind',
  titel: 'Bildschirmzeit beim Kind einstellen: iPhone und Android',
  beschreibung:
    'Welche Einstellungen Apple mit der Bildschirmzeit und Google mit Family Link für Kinderhandys anbieten, und wie Kinder zu mehr Zeit kommen.',
  veroeffentlicht: true,
  datum: '2026-10-04',
  lesezeitMinuten: 5,
  abschnitte: [
    {
      absaetze: [
        'Hat ein Kind ein eigenes Smartphone oder Tablet, lässt sich die Nutzungszeit direkt am Gerät begrenzen. Bei Apple ist die Kindersicherung in iPhone, iPad und Mac eingebaut [1]. Für Android gibt es von Google die App Family Link [5]. In beiden Fällen stellen die Eltern die Grenzen vom eigenen Gerät aus ein.',
      ],
    },
    {
      ueberschrift: 'iPhone und iPad: die Bildschirmzeit',
      absaetze: [
        'Voraussetzung ist die Familienfreigabe, in der jedes Familienmitglied einen eigenen Apple Account hat. Dann lassen sich die Bildschirmzeit und die Kindersicherung des Kindes vom eigenen iPhone, iPad oder Mac aus einrichten und verwalten [1].',
        'Mit Zeitplänen legen Eltern Zeiten fest, etwa am Abend, in denen nur Anrufe, Nachrichten und erlaubte Apps verfügbar sind [2]. Unter iOS 26 heißt das „Auszeit“ [2], unter iOS 27 „Bildschirmzeitpläne“ [1].',
        'Daneben gibt es tägliche Zeitlimits für eine Kategorie von Apps, zum Beispiel Spiele oder soziale Netzwerke, und für einzelne Apps [2]. In iOS 27 heißen sie „Nutzungszeiten“ [1].',
        'Eltern wählen außerdem Apps und Kontakte aus, die während der Zeitpläne und nach dem Erreichen eines Limits verfügbar bleiben [2].',
        'Damit das Kind die Einstellungen nicht selbst ändert, lässt sich ein eigener Code anlegen. Er muss eingegeben werden, bevor etwas an der Bildschirmzeit geändert werden kann [3].',
        'Fordert das Kind mehr Bildschirmzeit an, genehmigen die Eltern die Anfrage in den Einstellungen unter „Bildschirmzeit“ oder in der App „Nachrichten“ [4].',
      ],
    },
    {
      ueberschrift: 'Android: Google Family Link',
      absaetze: [
        'Die Eltern laden die App Family Link auf ihr eigenes Gerät. Das kann ein Android-Gerät ab Version 6.0 oder ein iPhone ab iOS 16 sein. Mit der App erstellen sie ein Google-Konto für ein Kind unter 13 Jahren oder richten die Elternaufsicht für ein bestehendes Konto ein [5].',
        'Family Link kennt ein Tageslimit für das ganze Gerät und Ruhezeiten, in denen das Gerät gesperrt ist [6]. Für einzelne Apps lassen sich Limits festlegen, nicht aber für System-Apps [6].',
        'Mit der Bonuszeit können Eltern dem Kind für den laufenden Tag mehr Zeit geben, ohne Tageslimit oder Ruhezeiten zu ändern. Das geht während oder kurz vor der Sperrung [6].',
      ],
    },
    {
      ueberschrift: 'Was die Technik nicht kann',
      absaetze: [
        'Die Einstellungen setzen eine Grenze. Wofür die Zeit gedacht ist und wann es Ausnahmen gibt, regeln sie nicht. Das muss in der Familie besprochen werden, am besten bevor der erste Streit kommt. Wie das gehen kann, steht im Artikel über den Mediennutzungsvertrag hier im Ratgeber.',
      ],
    },
    {
      ueberschrift: 'Und wo LernZeit dazukommt',
      absaetze: [
        'LernZeit dreht die Frage um: Statt Zeit nur zu begrenzen, kann das Kind sich Zeit verdienen. Für jede richtig gelöste Aufgabe gibt es 30 Sekunden, bis zu einer Obergrenze von 30 Minuten an Werktagen und 60 am Wochenende.',
        'Möchte das Kind die Zeit einlösen, schickt es eine Anfrage, und die Eltern entscheiden. Die verdiente Zeit gibst du heute noch selbst in Family Link beziehungsweise in der Bildschirmzeit frei.',
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
