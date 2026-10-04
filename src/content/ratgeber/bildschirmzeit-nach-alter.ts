import type { RatgeberArtikel } from './types';

/*
 * Quellen am 04.10.2026 am Original geprüft, Befunde in
 * docs/ratgeber/quellenpruefung.md.
 */

export const bildschirmzeitNachAlter: RatgeberArtikel = {
  slug: 'bildschirmzeit-kinder-empfehlungen-nach-alter',
  titel: 'Wie viel Bildschirmzeit ist für Kinder in Ordnung?',
  beschreibung:
    'Wie viele Minuten am Bildschirm Kinderärzte und die WHO je nach Alter für vertretbar halten, und worauf es neben der Dauer ankommt.',
  veroeffentlicht: true,
  datum: '2026-10-04',
  lesezeitMinuten: 4,
  abschnitte: [
    {
      absaetze: [
        'Eine Zahl, die für jedes Kind passt, gibt es nicht. Es gibt aber Empfehlungen, an denen sich Eltern festhalten können. Die wichtigste in Deutschland ist eine Leitlinie, die zehn Fachgesellschaften, Verbände und Behörden gemeinsam mit einer Patientenvertretung 2023 herausgegeben haben. Federführend war die Deutsche Gesellschaft für Kinder- und Jugendmedizin [1].',
      ],
    },
    {
      ueberschrift: 'Die Empfehlungen nach Alter',
      absaetze: [
        'Die Leitlinie unterscheidet nach Altersstufen. Die Zeitangaben gelten für die Freizeit. Für die Gesundheit zählt nach der Leitlinie aber die Summe aus Schule und Freizeit [1].',
        'Unter 3 Jahren sollen Kinder Bildschirmmedien gar nicht nutzen. Das gilt auch für passive Nutzung, also wenn sie zuschauen, während Eltern oder ältere Geschwister am Bildschirm sind [1].',
        'Zwischen 3 und 6 Jahren gelten höchstens 30 Minuten an einzelnen Tagen. Die Eltern sollen dabei sein [1].',
        'Zwischen 6 und 9 Jahren sind es höchstens 30 bis 45 Minuten an einzelnen Tagen [1].',
        'Zwischen 9 und 12 Jahren empfiehlt die Leitlinie höchstens 45 bis 60 Minuten täglich. Ins Internet sollen Kinder in diesem Alter nur unter Aufsicht [1].',
        'Zwischen 12 und 16 Jahren sind es höchstens ein bis zwei Stunden am Tag, und nach 21 Uhr nicht mehr [1].',
        'Bei den Jüngeren lohnt ein zweiter Blick auf die Worte „an einzelnen Tagen“. Für Kinder unter 9 Jahren steht das so in der Leitlinie, erst ab 9 Jahren ist von „täglich“ die Rede [1].',
      ],
    },
    {
      ueberschrift: 'Was die WHO für die Kleinsten sagt',
      absaetze: [
        'Die Weltgesundheitsorganisation hat 2019 Empfehlungen für Kinder unter fünf Jahren veröffentlicht. Unter zwei Jahren rät sie ganz vom Bildschirm ab. Für Zwei- bis Vierjährige nennt sie höchstens eine Stunde am Tag und setzt hinzu, dass weniger besser ist [2].',
        'Für das Kindergartenalter ist die deutsche Leitlinie mit 30 Minuten also strenger als die WHO.',
      ],
    },
    {
      ueberschrift: 'Warum die Minuten allein nicht alles sind',
      absaetze: [
        'Die Minuten sind als Obergrenze gedacht. Ob eine halbe Stunde gut verbracht ist, hängt davon ab, was auf dem Bildschirm passiert und was dafür ausfällt. Die WHO begründet ihre Empfehlung mit Bewegung und Schlaf: Zeit, die kleine Kinder sitzend vor dem Bildschirm verbringen, soll durch aktives Spielen ersetzt werden, und sie sollen genug guten Schlaf bekommen [2].',
        'Im Alltag helfen feste Zeiten mehr als spontane Verhandlungen. Wenn vorher klar ist, wann der Bildschirm an ist, muss nicht jeden Nachmittag neu darüber gestritten werden.',
      ],
    },
    {
      ueberschrift: 'Und wenn das Kind mehr will?',
      absaetze: [
        'Spätestens in der Grundschule wollen die meisten Kinder mehr, als die Empfehlungen vorsehen. Manche Familien machen daraus eine Abmachung: Wer etwas für die Schule tut, bekommt dafür Bildschirmzeit. Auf dieser Idee beruht LernZeit.',
        'Eine Obergrenze sollte trotzdem bleiben, egal wie fleißig gelernt wurde. In LernZeit ist sie deshalb von Anfang an eingestellt, auf 30 Minuten an Werktagen und 60 am Wochenende. Mit Premium lässt sie sich an das Alter des Kindes anpassen.',
      ],
    },
  ],
  quellen: [
    {
      nr: 1,
      titel: 'S2k-Leitlinie zur Prävention dysregulierten Bildschirmmediengebrauchs in Kindheit und Jugend (AWMF-Register 027-075)',
      herausgeber: 'Deutsche Gesellschaft für Kinder- und Jugendmedizin u. a.',
      jahr: '2023',
      url: 'https://register.awmf.org/de/leitlinien/detail/027-075',
      geprueftAm: '2026-10-04',
    },
    {
      nr: 2,
      titel: 'To grow up healthy, children need to sit less and play more',
      herausgeber: 'Weltgesundheitsorganisation (WHO)',
      jahr: '2019',
      url: 'https://www.who.int/news/item/24-04-2019-to-grow-up-healthy-children-need-to-sit-less-and-play-more',
      geprueftAm: '2026-10-04',
    },
  ],
};
