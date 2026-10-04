import type { RatgeberArtikel } from './types';

/*
 * Entwurf vom 04.10.2026. Alle Quellen sind noch am Original zu prüfen
 * (Hilfeseiten von Apple und Google), siehe docs/ratgeber/quellenpruefung.md,
 * Artikel 4. URLs [1]–[3] dabei auf die offiziellen deutschen Hilfeseiten
 * setzen. Erst danach veroeffentlichen.
 */

export const bildschirmzeitEinstellen: RatgeberArtikel = {
  slug: 'bildschirmzeit-einstellen-iphone-android-kind',
  titel: 'Bildschirmzeit beim Kind einstellen: iPhone und Android',
  beschreibung:
    'Welche Einstellungen Apple mit der Bildschirmzeit und Google mit Family Link für Kinderhandys anbieten, und wie Kinder um mehr Zeit bitten können.',
  veroeffentlicht: false,
  datum: '2026-10-04',
  lesezeitMinuten: 5,
  abschnitte: [
    {
      absaetze: [
        'Hat ein Kind ein eigenes Smartphone oder Tablet, lässt sich die Nutzungszeit direkt am Gerät begrenzen. Apple und Google bringen dafür eigene Werkzeuge mit, die nichts extra kosten: die Bildschirmzeit auf dem iPhone und iPad und Family Link für Android. Eingestellt wird jeweils vom Gerät der Eltern aus.',
      ],
    },
    {
      ueberschrift: 'iPhone und iPad: die Bildschirmzeit',
      absaetze: [
        'Am einfachsten richten Eltern die Bildschirmzeit über die Familienfreigabe ein. Das Kind bekommt dafür einen eigenen Apple Account in der Familiengruppe. Danach verwalten die Eltern die Einstellungen vom eigenen iPhone aus [1].',
        'Mit der Auszeit legen Eltern Zeiten fest, in denen nur ausgewählte Apps und Anrufe möglich sind, zum Beispiel am Abend [1]. Mit App-Limits begrenzen sie, wie lange Apps einer Kategorie wie Spiele oder soziale Netzwerke am Tag genutzt werden können [1]. Unter „Immer erlaubt“ stehen Apps, die auch während der Auszeit gehen, etwa das Telefon [1].',
        'Ein eigener Bildschirmzeit-Code schützt die Einstellungen. Das Kind sollte ihn nicht kennen [1].',
        'Ist ein Limit erreicht, kann das Kind um mehr Zeit bitten. Die Anfrage erscheint auf dem Gerät der Eltern, die sie genehmigen oder ablehnen [2].',
      ],
    },
    {
      ueberschrift: 'Android: Google Family Link',
      absaetze: [
        'Auf Android-Geräten übernimmt die App Family Link diese Aufgabe. Eltern installieren sie auf dem eigenen Handy und verbinden das Google-Konto des Kindes [3].',
        'Family Link kennt ein tägliches Limit für das ganze Gerät und eine Schlafenszeit, in der das Gerät gesperrt ist [3]. Für einzelne Apps lassen sich eigene Limits setzen [3]. Ist die Zeit abgelaufen, können Eltern zusätzliche Zeit geben [3].',
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
      titel: 'Bildschirmzeit auf dem iPhone oder iPad deines Kindes verwenden',
      herausgeber: 'Apple',
      jahr: '',
      url: 'https://support.apple.com/de-de/108806',
      geprueftAm: null,
    },
    {
      nr: 2,
      titel: 'Mehr Bildschirmzeit anfordern und genehmigen',
      herausgeber: 'Apple',
      jahr: '',
      url: 'https://support.apple.com/de-de/',
      geprueftAm: null,
    },
    {
      nr: 3,
      titel: 'Bildschirmzeit Ihres Kindes mit Family Link verwalten',
      herausgeber: 'Google',
      jahr: '',
      url: 'https://support.google.com/families/',
      geprueftAm: null,
    },
  ],
};
