import type { RatgeberArtikel } from './types';

/*
 * Quellen am 04.10.2026 am Original geprüft, Befunde in
 * docs/ratgeber/quellenpruefung.md.
 */

export const eigenesSmartphone: RatgeberArtikel = {
  slug: 'eigenes-smartphone-kinder-alter-kim-studie',
  titel: 'Ab wann ein eigenes Smartphone? Was die KIM-Studie zeigt',
  beschreibung:
    'Wie viele Kinder in welchem Alter ein eigenes Handy haben, laut KIM-Studie 2024, und was Kinderärzte zur Bildschirmzeit in diesem Alter raten.',
  veroeffentlicht: true,
  datum: '2026-10-04',
  lesezeitMinuten: 3,
  abschnitte: [
    {
      absaetze: [
        'Irgendwann kommt in fast jeder Familie die Frage, wann das Kind ein eigenes Handy bekommt. Eine allgemeingültige Antwort darauf gibt es nicht. Wie andere Familien entscheiden, lässt sich aber recht genau sagen: Der Medienpädagogische Forschungsverbund Südwest befragt dazu regelmäßig Kinder zwischen 6 und 13 Jahren und ihre Eltern, zuletzt für die KIM-Studie 2024 [1].',
      ],
    },
    {
      ueberschrift: 'Die Zahlen nach Alter',
      absaetze: [
        '46 Prozent der 6- bis 13-Jährigen hatten ein eigenes Smartphone [1]. Hinter dem Durchschnitt stecken große Unterschiede. Bei den 6- und 7-Jährigen waren es 11 Prozent, bei den 8- und 9-Jährigen 33 Prozent. Von den 10- und 11-Jährigen hatten schon 63 Prozent ein eigenes Gerät, von den 12- und 13-Jährigen 79 Prozent [1].',
        'Der größte Sprung liegt zwischen den 8- und 9-Jährigen und den 10- und 11-Jährigen. In diesem Alter wechseln die meisten Kinder auf die weiterführende Schule [1].',
        'Auch Kinder ohne eigenes Gerät kommen an ein Handy: 13 Prozent von ihnen dürfen sich bei Bedarf eines ausleihen [1].',
      ],
    },
    {
      ueberschrift: 'Mehr Kinder sind online als vor zwei Jahren',
      absaetze: [
        '2024 nutzten 72 Prozent der 6- bis 13-Jährigen das Internet, 2022 waren es 70 Prozent. Mehr als die Hälfte der Kinder, die online sind, ist es jeden Tag [1].',
      ],
    },
    {
      ueberschrift: 'Das Handy in der Schule',
      absaetze: [
        'Mehr als drei Viertel der Schulkinder mit eigenem Handy dürfen es mit in die Schule nehmen. Benutzen dürfen sie es dort meistens nur in den Pausen [1].',
      ],
    },
    {
      ueberschrift: 'Was die Zahlen nicht beantworten',
      absaetze: [
        'Die Studie beschreibt, was andere Familien tun. Ob das für das eigene Kind richtig ist, sagt sie nicht. Wer sich an Fachleuten orientieren möchte: Die Leitlinie der Kinder- und Jugendmedizin empfiehlt für 9- bis 12-Jährige höchstens 45 bis 60 Minuten Bildschirmzeit in der Freizeit und Internet nur unter Aufsicht [2].',
        'Ein eigenes Smartphone ändert an diesen Empfehlungen nichts. Es macht es nur schwerer, sie einzuhalten, wenn vorher nichts abgesprochen wurde. Sinnvoll ist es deshalb, die Regeln festzulegen, bevor das Gerät im Haus ist.',
      ],
    },
  ],
  quellen: [
    {
      nr: 1,
      titel: 'KIM-Studie 2024. Kindheit, Internet, Medien',
      herausgeber: 'Medienpädagogischer Forschungsverbund Südwest (mpfs)',
      jahr: '2025',
      url: 'https://mpfs.de/studie/kim-studie-2024/',
      geprueftAm: '2026-10-04',
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
