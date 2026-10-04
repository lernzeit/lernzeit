import type { RatgeberArtikel } from './types';

/*
 * Entwurf vom 04.10.2026. Quelle [2] ist dieselbe Leitlinie wie im Artikel
 * zur Bildschirmzeit nach Alter (dort am 04.10.2026 geprüft, Zeilen 1.5–1.7).
 * Quelle [1] ist noch am Original zu prüfen, siehe
 * docs/ratgeber/quellenpruefung.md, Artikel 3. Erst danach veroeffentlichen.
 */

export const mediennutzungsvertrag: RatgeberArtikel = {
  slug: 'mediennutzungsvertrag-regeln-bildschirmzeit-familie',
  titel: 'Regeln für Bildschirmzeit: So hilft ein Mediennutzungsvertrag',
  beschreibung:
    'Wie Familien Regeln für Handy, Internet und Spiele gemeinsam festhalten, welche Zeiten Kinderärzte empfehlen und wie die Abmachung im Alltag hält.',
  veroeffentlicht: false,
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
        'Ein Mediennutzungsvertrag ist eine schriftliche Vereinbarung zwischen Eltern und Kind. Darin steht, welche Medien das Kind wie lange und wofür nutzen darf. Die Initiativen klicksafe und Internet-ABC bieten dafür ein kostenloses Online-Werkzeug an [1].',
        'Es gibt zwei Fassungen, eine für Kinder von 6 bis 12 Jahren und eine für ältere Kinder ab 12 [1]. Für Bereiche wie Nutzungszeiten, Handy und Smartphone, Internet, Fernsehen und Computerspiele stehen Regeln zur Auswahl, die sich ändern und durch eigene ergänzen lassen [1]. Am Ende wird der Vertrag ausgedruckt und von allen unterschrieben [1].',
        'Der Vertrag enthält auch Regeln für die Eltern [1]. Das ist kein Detail: Wer selbst beim Essen aufs Handy schaut, kann es dem Kind schlecht verbieten.',
      ],
    },
    {
      ueberschrift: 'Wie viel Zeit hineingehört',
      absaetze: [
        'Für die Zeiten können sich Eltern an der Leitlinie der Kinder- und Jugendmedizin von 2023 orientieren. Sie nennt für die Freizeit Obergrenzen [2].',
        'Zwischen 6 und 9 Jahren sind es höchstens 30 bis 45 Minuten an einzelnen Tagen [2].',
        'Zwischen 9 und 12 Jahren höchstens 45 bis 60 Minuten täglich, ins Internet nur unter Aufsicht [2].',
        'Zwischen 12 und 16 Jahren höchstens ein bis zwei Stunden am Tag und nicht nach 21 Uhr [2].',
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
      herausgeber: 'klicksafe und Internet-ABC',
      jahr: '',
      url: 'https://www.mediennutzungsvertrag.de/',
      geprueftAm: null,
    },
    {
      nr: 2,
      titel: 'S2k-Leitlinie zur Prävention dysregulierten Bildschirmmediengebrauchs in Kindheit und Jugend (AWMF-Register 027-075)',
      herausgeber: 'Deutsche Gesellschaft für Kinder- und Jugendmedizin u. a.',
      jahr: '2023',
      url: 'https://register.awmf.org/de/leitlinien/detail/027-075',
      geprueftAm: '2026-10-04',
    },
  ],
};
