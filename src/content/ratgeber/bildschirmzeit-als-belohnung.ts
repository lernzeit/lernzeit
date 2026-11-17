import type { RatgeberArtikel } from './types';

/*
 * ENTWURF (17.11.2026), nicht veröffentlicht. Quellen [1] und [3] konnten in der Arbeitsumgebung nicht am
 * Original gelesen werden (Netzsperre, awmf.org und bitkom.org nicht erreichbar). Prüfliste mit offenen
 * Punkten: docs/ratgeber/quellenpruefung.md, Artikel 7. Erst nach der Prüfung geprueftAm setzen und
 * veroeffentlicht auf true stellen. [2] ist dieselbe KIM-Studie wie im Artikel „Ab wann ein eigenes Smartphone?“
 * (am 04.10.2026 geprüft, dort Zeile 2.3).
 * Hintergrund: Rückmeldung einer Initiative für smartphonefreie Schulen. Sie wird hier ohne Namen und
 * sinngemäß wiedergegeben.
 */

export const bildschirmzeitAlsBelohnung: RatgeberArtikel = {
  slug: 'bildschirmzeit-als-belohnung-lernen',
  titel: 'Bildschirmzeit als Belohnung fürs Lernen: Kritik, Zahlen und unsere Antwort',
  beschreibung:
    'Kinderärzte raten davon ab, Bildschirmzeit als Belohnung zu nutzen. Warum LernZeit es trotzdem tut, welche Grenzen gelten und was wir nicht wissen.',
  veroeffentlicht: false,
  datum: '2026-11-17',
  lesezeitMinuten: 5,
  abschnitte: [
    {
      absaetze: [
        'LernZeit verbindet Lernen mit Bildschirmzeit: Für jede richtig gelöste Aufgabe verdient ein Kind Zeit am Handy. Genau das sehen manche Fachleute und Initiativen kritisch. Uns hat eine solche Rückmeldung erreicht, von einer Initiative, die sich für smartphonefreie Grundschulen einsetzt. Sie war deutlich, sachlich und begründet. Deshalb stellen wir die Kritik hier offen dar, zusammen mit den Zahlen, auf die wir uns stützen, und mit dem, was wir nicht wissen.',
      ],
    },
    {
      ueberschrift: 'Was die ärztliche Leitlinie sagt',
      absaetze: [
        'Die Kinder- und Jugendmedizin hat 2023 eine Leitlinie zur Prävention dysregulierten Bildschirmmediengebrauchs veröffentlicht, federführend durch die Deutsche Gesellschaft für Kinder- und Jugendmedizin. Sie rät davon ab, Bildschirmmedien als Belohnung, als Bestrafung oder zur Beruhigung einzusetzen [1].',
        'Daraus folgt der Einwand, der uns erreicht hat: Wenn richtige Antworten mit Medienzeit belohnt werden, wird die Bildschirmzeit zusätzlich aufgewertet. Lernen wird zum Mittel, um an die eigentlich gewünschte Belohnung zu kommen. Kinder sollen aber erleben, dass Lernen, Verstehen und eigene Fortschritte für sich einen Wert haben, unabhängig davon, wie viele Minuten am Smartphone dabei herausspringen. Die Anregung der Initiative lautet deshalb, Lernangebote und Bildschirmzeit vollständig zu trennen.',
        'Wir nehmen diese Einschätzung ernst und reden sie nicht klein. Die Leitlinie ist hier eindeutig.',
      ],
    },
    {
      ueberschrift: 'Warum wir trotzdem von der Realität in den Familien ausgehen',
      absaetze: [
        'Unser Ausgangspunkt sind Familien, in denen das Smartphone bereits da ist. Nach der KIM-Studie 2024 hatten 63 Prozent der 10- und 11-Jährigen und 79 Prozent der 12- und 13-Jährigen ein eigenes Smartphone [2].',
        'In diesen Familien ist Bildschirmzeit nach den Zahlen der Bitkom-Elternstudie 2025 häufig schon ein Erziehungsmittel. Von den Eltern 10- bis 12-jähriger Kinder streiten 88 Prozent mit ihrem Kind über die Smartphone-Nutzung, und 58 Prozent nehmen das Smartphone als Strafe weg [3].',
        'Daraus ziehen wir einen Schluss, keinen Beleg für unseren Ansatz: Bildschirmzeit wird in vielen Familien ohnehin als Mittel eingesetzt, nur von Fall zu Fall und oft im Streit. LernZeit ersetzt diese Einzelfallentscheidung durch eine feste Regel, die an jedem Tag gleich gilt. Ob das besser ist als ein Verzicht auf jede Verknüpfung, sagen diese Zahlen nicht.',
      ],
    },
    {
      ueberschrift: 'Wie wir die Verknüpfung begrenzen',
      absaetze: [
        'Die Sorge, dass Bildschirmzeit aufgewertet wird, lässt sich durch Gestaltung abschwächen, aber nicht wegnehmen. Das tun wir:',
        'Die Grundzeit bleibt Sache der Eltern. Auf dem iPhone sind das die Freiminuten in LernZeit, auf Android die Einstellungen in Family Link. Verdient wird nur zusätzliche Zeit.',
        'Diese Zeit ist begrenzt: 30 Sekunden je richtiger Aufgabe, ab Werk höchstens 30 Minuten an Werktagen und 60 am Wochenende. Wer will, stellt die Grenzen anders ein.',
        'Die Eltern genehmigen jede Freigabe von Hand. Das Kind stellt eine Anfrage, die Eltern entscheiden.',
        'Sticker, Figuren und Lerntage in Folge lassen sich nicht in Bildschirmzeit umtauschen. Sie sollen das Lernen selbst belohnen, nicht die Zeit am Handy.',
      ],
    },
    {
      ueberschrift: 'Für welche Kinder LernZeit gedacht ist',
      absaetze: [
        'Die Aufgaben decken die Klassen 1 bis 10 ab. Wir werben aber nicht für einen früheren Einstieg ins eigene Smartphone. Der Tausch gegen Bildschirmzeit setzt voraus, dass sich die Eltern bereits für ein Gerät entschieden haben. Nach der KIM-Studie ist das in der Praxis vor allem ab etwa zehn Jahren der Fall [2].',
      ],
    },
    {
      ueberschrift: 'Was wir nicht wissen',
      absaetze: [
        'Die wichtigste Frage ist offen: ob der Ansatz die Lernmotivation langfristig stützt oder schwächt. Dazu haben wir keine Daten. Die Erfahrung einzelner Familien, auch unserer eigenen, ersetzt sie nicht. Weniger Diskussionen oder mehr Bereitschaft, Aufgaben zu bearbeiten, beantworten diese Frage noch nicht.',
        'Die Anregung, Lernen und Bildschirmzeit zu entkoppeln, behandeln wir deshalb als Prüfauftrag. Sobald wir belastbare Erkenntnisse haben, ergänzen wir diesen Artikel.',
      ],
    },
    {
      ueberschrift: 'Was Familien daraus mitnehmen können',
      absaetze: [
        'Wer Bildschirmzeit grundsätzlich nicht als Gegenleistung einsetzen möchte, für den passt der Kern von LernZeit nicht. Das ist eine nachvollziehbare Entscheidung und deckt sich mit der ärztlichen Leitlinie.',
        'Wer Bildschirmzeit ohnehin verhandelt, kann feste Regeln aufschreiben, die für alle Tage gelten und nicht vom Moment abhängen. Wie das geht, steht im Artikel „Regeln für Bildschirmzeit: So hilft ein Mediennutzungsvertrag“ hier im Ratgeber.',
        'Unabhängig vom Weg lohnt es sich, Lernerfolge auch ohne Medienzeit sichtbar zu machen: ein Wort der Anerkennung, ein gemeinsamer Blick auf den Fortschritt oder ein Ausflug. Das sind Hinweise der Redaktion, keine Aussagen aus den Quellen.',
      ],
    },
    {
      ueberschrift: 'Ein gemeinsames Ziel',
      absaetze: [
        'Bei aller Verschiedenheit im Weg sehen wir ein gemeinsames Ziel: Kinder sollen Bildschirmzeit geordnet und begrenzt nutzen, und es soll ihnen dabei gut gehen. Dafür ist der Einsatz für smartphonefreie Grundschulen wichtig, und wir lernen aus den Einwänden mehr als aus jedem Lob.',
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
      titel: 'KIM-Studie 2024. Kindheit, Internet, Medien',
      herausgeber: 'Medienpädagogischer Forschungsverbund Südwest (mpfs)',
      jahr: '2025',
      url: 'https://mpfs.de/studie/kim-studie-2024/',
      geprueftAm: '2026-10-04',
    },
    {
      nr: 3,
      titel: 'Eltern in der digitalen Welt. Studienbericht 2025',
      herausgeber: 'Bitkom e. V.',
      jahr: '2026',
      url: 'https://www.bitkom.org/sites/main/files/2026-01/bitkom-studienbericht-eltern-2025.pdf',
      geprueftAm: null,
    },
  ],
};
