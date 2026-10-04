import type { RatgeberArtikel } from './types';

/*
 * Entwurf vom 04.10.2026. Erscheint erst, wenn veroeffentlicht = true und jede
 * Quelle geprueftAm hat. Pruefliste: docs/ratgeber/quellenpruefung.md
 */

export const bildschirmzeitNachAlter: RatgeberArtikel = {
  slug: 'bildschirmzeit-kinder-empfehlungen-nach-alter',
  titel: 'Wie viel Bildschirmzeit ist für Kinder in Ordnung?',
  beschreibung:
    'Wie viele Minuten am Bildschirm Kinderärzte und die WHO je nach Alter für vertretbar halten, und worauf es neben der Dauer ankommt.',
  veroeffentlicht: false,
  datum: '2026-10-04',
  lesezeitMinuten: 4,
  abschnitte: [
    {
      absaetze: [
        'Eine Zahl, die für jedes Kind passt, gibt es nicht. Es gibt aber Empfehlungen, an denen sich Eltern festhalten können. Die wichtigste in Deutschland ist eine Leitlinie, die elf medizinische und psychologische Fachgesellschaften 2023 gemeinsam herausgegeben haben, unter Federführung der Deutschen Gesellschaft für Kinder- und Jugendmedizin [1].',
      ],
    },
    {
      ueberschrift: 'Die Empfehlungen nach Alter',
      absaetze: [
        'Die Leitlinie unterscheidet nach Altersstufen. Gemeint ist immer die Freizeit, Bildschirmarbeit für die Schule zählt nicht mit [1].',
        'Unter 3 Jahren sollen Kinder Bildschirmmedien gar nicht nutzen, auch nicht nebenbei, wenn etwa im selben Raum der Fernseher läuft [1].',
        'Zwischen 3 und 6 Jahren gelten höchstens 30 Minuten an einzelnen Tagen. Das Kind soll dabei nicht allein vor dem Bildschirm sitzen [1].',
        'Zwischen 6 und 9 Jahren sind es höchstens 30 bis 45 Minuten an einzelnen Tagen [1].',
        'Zwischen 9 und 12 Jahren empfiehlt die Leitlinie höchstens 45 bis 60 Minuten. Ins Internet sollen Kinder in diesem Alter nur unter Aufsicht [1].',
        'Zwischen 12 und 16 Jahren sind es höchstens ein bis zwei Stunden am Tag, und nach 21 Uhr nicht mehr [1].',
        'Bei den Jüngeren lohnt ein zweiter Blick auf die Worte „an einzelnen Tagen“. Ein Kontingent, das jeden Tag ausgeschöpft werden soll, ist damit nicht gemeint. Das Bundesinstitut für Öffentliche Gesundheit rät, Bildschirmmedien möglichst nicht jeden Tag zu nutzen und an den übrigen Tagen unter den genannten Zeiten zu bleiben [3].',
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
        'Die Minuten sind als Obergrenze gedacht. Ob eine halbe Stunde gut verbracht ist, hängt davon ab, was auf dem Bildschirm passiert und was dafür ausfällt. Die WHO begründet ihre Empfehlung genau so: Kleine Kinder brauchen viel Bewegung und genug Schlaf, und beides leidet, wenn sie lange sitzen [2].',
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
      geprueftAm: null,
    },
    {
      nr: 2,
      titel: 'To grow up healthy, children need to sit less and play more',
      herausgeber: 'Weltgesundheitsorganisation (WHO)',
      jahr: '2019',
      url: 'https://www.who.int/news/item/24-04-2019-to-grow-up-healthy-children-need-to-sit-less-and-play-more',
      geprueftAm: null,
    },
    {
      nr: 3,
      titel: 'Kinder und Medien: Wie viel Bildschirmzeit ist okay?',
      herausgeber: 'Bundesinstitut für Öffentliche Gesundheit (kindergesundheit-info.de)',
      jahr: '',
      url: 'https://www.kindergesundheit-info.de/infomaterial-service/nachrichten/artikel/artikel/kinder-und-medien-wie-viel-bildschirmzeit-ist-okay/',
      geprueftAm: null,
    },
  ],
};
