import type { RatgeberArtikel } from './types';

/*
 * Quellen am 04.10.2026 am Original geprüft, Befunde in
 * docs/ratgeber/quellenpruefung.md, Artikel 3. [3] ist dieselbe Leitlinie wie
 * im Artikel zur Bildschirmzeit nach Alter (Zeilen 1.5–1.7).
 */

export const mediennutzungsvertrag: RatgeberArtikel = {
  slug: 'mediennutzungsvertrag-regeln-bildschirmzeit-familie',
  titel: 'Regeln für Bildschirmzeit: So hilft ein Mediennutzungsvertrag',
  beschreibung:
    'Wie Familien Regeln für Handy, Internet und Spiele gemeinsam festhalten, welche Zeiten Kinderärzte empfehlen und wie die Abmachung im Alltag hält.',
  veroeffentlicht: true,
  datum: '2026-10-04',
  lesezeitMinuten: 4,
  abschnitte: [
    {
      absaetze: [
        'Über Bildschirmzeit wird in vielen Familien jeden Tag neu verhandelt. Das kostet Nerven auf beiden Seiten. Was hilft, ist eine Abmachung, die vorher feststeht und nicht vom Moment abhängt. Am verlässlichsten ist sie, wenn sie aufgeschrieben ist.',
      ],
    },
    {
      ueberschrift: 'Was ein Mediennutzungsvertrag ist',
      absaetze: [
        'Ein Mediennutzungsvertrag ist eine schriftliche Vereinbarung zwischen Eltern und Kind. Darin steht, welche Medien das Kind wie lange und wofür nutzen darf. Die Initiativen klicksafe und Internet-ABC haben dafür ein Online-Werkzeug entwickelt [1].',
        'Es gibt Regelvorlagen für Kinder bis zwölf und für Kinder über zwölf Jahren [1]. Sie sind nach Bereichen geordnet: allgemeine Regeln, zeitliche Regelung, Handy und Smartphone, Internet, Fernsehen und Online-Videos, digitale Spiele und sonstige Verabredungen [2]. Jede Vorlage lässt sich anpassen, und eigene Regeln können dazukommen [1].',
        'Am Ende lässt sich der Vertrag drucken oder als PDF speichern. Unten ist Platz für die Unterschriften der Erwachsenen und des Kindes [2].',
        'Der Vertrag enthält auch Regeln für die Eltern, ausdrücklich wegen ihrer Vorbildfunktion [1]. Das ist kein Detail: Wer selbst beim Essen aufs Handy schaut, kann es dem Kind schlecht verbieten.',
      ],
    },
    {
      ueberschrift: 'Wie viel Zeit hineingehört',
      absaetze: [
        'Für die Zeiten können sich Eltern an der Leitlinie der Kinder- und Jugendmedizin von 2023 orientieren. Sie nennt für die Freizeit Obergrenzen [3].',
        'Zwischen 6 und 9 Jahren sind es höchstens 30 bis 45 Minuten an einzelnen Tagen [3].',
        'Zwischen 9 und 12 Jahren höchstens 45 bis 60 Minuten täglich, ins Internet nur unter Aufsicht [3].',
        'Zwischen 12 und 16 Jahren höchstens ein bis zwei Stunden am Tag und nicht nach 21 Uhr [3].',
        'Mehr zu den Empfehlungen, auch für jüngere Kinder, steht im Artikel „Wie viel Bildschirmzeit ist für Kinder in Ordnung?“ hier im Ratgeber.',
      ],
    },
    {
      ueberschrift: 'Damit die Abmachung im Alltag hält',
      absaetze: [
        'Das Kind redet mit. Regeln, die es selbst mit ausgehandelt hat, verteidigt es eher, als Regeln, die ihm vorgesetzt werden.',
        'Wenige Regeln sind besser als viele. Was nicht auf eine Seite passt, merkt sich niemand.',
        'Was passiert, wenn eine Regel gebrochen wird, steht vorher fest. Dann muss im Streit nicht erst eine Strafe erfunden werden.',
        'Nach ein paar Wochen wird nachgesehen, ob die Regeln passen. Kinder werden älter, der Stundenplan ändert sich, und ein Vertrag darf mitwachsen.',
      ],
    },
    {
      ueberschrift: 'Eine Regel, die sich selbst erklärt',
      absaetze: [
        'Manche Familien schreiben in den Vertrag, dass es Bildschirmzeit für Lernen gibt. Darauf beruht LernZeit: Für jede richtig gelöste Aufgabe gibt es 30 Sekunden. Eine Obergrenze bleibt trotzdem, werktags 30 Minuten und am Wochenende 60.',
        'Die verdiente Zeit wird nicht automatisch freigegeben. Möchte das Kind sie einlösen, schickt es eine Anfrage, und die Eltern entscheiden.',
      ],
    },
  ],
  quellen: [
    {
      nr: 1,
      titel: 'Mediennutzungsvertrag',
      herausgeber: 'Internet-ABC',
      jahr: '',
      url: 'https://www.internet-abc.de/eltern/familie-medien/mediennutzungsvertrag/',
      geprueftAm: '2026-10-04',
    },
    {
      nr: 2,
      titel: 'Mediennutzungsvertrag (Online-Werkzeug)',
      herausgeber: 'klicksafe und Internet-ABC',
      jahr: '',
      url: 'https://www.mediennutzungsvertrag.de/',
      geprueftAm: '2026-10-04',
    },
    {
      nr: 3,
      titel: 'S2k-Leitlinie zur Prävention dysregulierten Bildschirmmediengebrauchs in Kindheit und Jugend (AWMF-Register 027-075)',
      herausgeber: 'Deutsche Gesellschaft für Kinder- und Jugendmedizin u. a.',
      jahr: '2023',
      url: 'https://register.awmf.org/de/leitlinien/detail/027-075',
      geprueftAm: '2026-10-04',
    },
  ],
};
