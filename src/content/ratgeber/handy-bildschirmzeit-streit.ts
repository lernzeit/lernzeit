import type { RatgeberArtikel } from './types';

/*
 * ENTWURF (17.11.2026), nicht veröffentlicht. Offen vor der Veröffentlichung:
 * 1. Quellen [1] und [3] konnten in der Arbeitsumgebung nicht am Original gelesen werden (Netzsperre, awmf.org und
 *    bitkom.org nicht erreichbar). Prüfliste: docs/ratgeber/quellenpruefung.md, Artikel 7.
 * 2. Im Abschnitt „Weniger wäre gut“ fehlen Name und Link der Initiative für smartphonefreie Grundschulen
 *    (Betreiber nennt sie). Dann als Quelle [4] eintragen und prüfen.
 * [2] ist dieselbe KIM-Studie wie im Artikel „Ab wann ein eigenes Smartphone?“ (am 04.10.2026 geprüft, Zeile 2.3).
 */

export const handyBildschirmzeitStreit: RatgeberArtikel = {
  slug: 'handy-bildschirmzeit-streit-familie',
  titel: 'Handy und Bildschirmzeit: Weniger wäre gut, Streit ist Alltag',
  beschreibung:
    'Wie viele Kinder ein Handy haben, wie oft es darüber Streit gibt und was Familien tun können, wenn Verzicht keine Option ist.',
  veroeffentlicht: false,
  datum: '2026-11-17',
  lesezeitMinuten: 5,
  abschnitte: [
    {
      absaetze: [
        'Die meisten Eltern wünschen sich, dass ihr Kind weniger am Handy ist. Gleichzeitig gehört das Smartphone für viele Kinder längst zum Alltag, und über die Zeit am Gerät wird zu Hause gestritten. Dieser Artikel ordnet beides ein: was empfohlen wird, wie die Lage in den Familien aussieht und was sich daraus ableiten lässt.',
      ],
    },
    {
      ueberschrift: 'Weniger wäre gut',
      absaetze: [
        'Fachleute und Initiativen sprechen sich dafür aus, den Einstieg in die eigenständige Smartphone-Nutzung möglichst weit hinauszuschieben. Mehrere Initiativen setzen sich außerdem für smartphonefreie Grundschulen und für weiterführende Schulen ohne private Endgeräte ein.',
        'Auch die ärztliche Leitlinie zur Prävention dysregulierten Bildschirmmediengebrauchs, die 2023 unter Federführung der Deutschen Gesellschaft für Kinder- und Jugendmedizin erschienen ist, rät zu klaren Grenzen. Für Kinder zwischen 9 und 12 Jahren nennt sie in der Freizeit höchstens 45 bis 60 Minuten täglich und Internet nur unter Aufsicht [1]. Die Zeiten für alle Altersstufen stehen im Artikel „Wie viel Bildschirmzeit ist für Kinder in Ordnung?“ hier im Ratgeber.',
      ],
    },
    {
      ueberschrift: 'Die Realität: Das Handy ist da, und es gibt Streit',
      absaetze: [
        'Nach der KIM-Studie 2024 hatten 63 Prozent der 10- und 11-Jährigen und 79 Prozent der 12- und 13-Jährigen ein eigenes Smartphone [2]. Zwischen 8 und 9 Jahren sind es noch 33 Prozent, zwischen 10 und 11 Jahren fast doppelt so viele [2]. Ein eigenes Smartphone zu haben ist damit ab dem Wechsel auf die weiterführende Schule eher die Regel als die Ausnahme.',
        'Dazu passen die Zahlen der Bitkom-Elternstudie 2025. Von den Eltern 10- bis 12-jähriger Kinder streiten 88 Prozent mit ihrem Kind über die Smartphone-Nutzung, und 58 Prozent nehmen das Smartphone als Strafe weg [3].',
        'Für viele Familien ist die Frage also nicht, ob das Kind ein Handy nutzt, sondern wie. Die Zeit am Gerät wird oft von Fall zu Fall ausgehandelt, im Streit und mit Strafen als letztem Mittel. Das ist anstrengend für Eltern und Kinder, und es führt selten zu verlässlichen Regeln.',
      ],
    },
    {
      ueberschrift: 'Was Fachleute zur Belohnung raten',
      absaetze: [
        'Die Leitlinie rät außerdem davon ab, Bildschirmmedien als Belohnung, als Bestrafung oder zur Beruhigung einzusetzen [1]. Der Gedanke dahinter: Bildschirmzeit wird dadurch zusätzlich aufgewertet, und Kinder lernen, dass sie etwas „verdienen“ müssen, was sie eigentlich begehren. Beim Lernen kommt hinzu, dass es zum Mittel für etwas anderes werden kann. Kinder sollen aber erfahren, dass Lernen und eigene Fortschritte für sich einen Wert haben.',
      ],
    },
    {
      ueberschrift: 'Was Familien in dieser Lage tun können',
      absaetze: [
        'Feste Regeln sind besser als Einzelfallentscheidungen. Was vorher aufgeschrieben und gemeinsam vereinbart ist, muss nicht jeden Tag neu verhandelt werden. Eine Hilfe dafür ist ein Mediennutzungsvertrag, wie er im Artikel „Regeln für Bildschirmzeit: So hilft ein Mediennutzungsvertrag“ beschrieben ist.',
        'Die Grundzeit und eine zusätzliche, begrenzte Zeit lassen sich trennen. Die Grundzeit legen die Eltern fest und hängt nicht von Leistungen ab. Wer möchte, kann darüber hinaus zusätzliche Zeit an etwas koppeln, zum Beispiel an Üben. Das steht im Widerspruch zur Leitlinie. Es ist eine Abwägung, die jede Familie selbst trifft: Eine klare, immer gleiche Regel kann Streit verringern, aber sie macht Bildschirmzeit auch zu einer Gegenleistung.',
        'Lernerfolge lassen sich auch ohne Medienzeit sichtbar machen: ein Wort der Anerkennung, ein gemeinsamer Blick auf den Fortschritt oder ein Ausflug. Das sind Hinweise der Redaktion, keine Aussagen aus den Quellen.',
      ],
    },
    {
      ueberschrift: 'Wie LernZeit dazu steht',
      absaetze: [
        'LernZeit verbindet Aufgaben mit zusätzlicher Bildschirmzeit: 30 Sekunden für jede richtig gelöste Aufgabe, ab Werk höchstens 30 Minuten an Werktagen und 60 am Wochenende. Die Eltern genehmigen jede Freigabe von Hand. Die Grundzeit bleibt Sache der Eltern, auf dem iPhone sind das die Freiminuten in LernZeit, auf Android die Einstellungen in Family Link.',
        'Sticker, Figuren und Lerntage in Folge lassen sich nicht in Bildschirmzeit umtauschen. Sie sollen das Lernen selbst belohnen.',
        'Wir halten die Leitlinie hier für eine ernst zu nehmende Gegenposition. LernZeit richtet sich an Familien, in denen das Handy schon da ist und Bildschirmzeit ohnehin ausgehandelt wird. Die Aufgaben decken die Klassen 1 bis 10 ab, aber wir werben nicht für einen früheren Einstieg ins eigene Smartphone. Wer Bildschirmzeit grundsätzlich nicht als Gegenleistung einsetzen möchte, für den passt der Kern der App nicht.',
      ],
    },
    {
      ueberschrift: 'Was wir nicht wissen',
      absaetze: [
        'Ob die Verknüpfung von Lernen und Bildschirmzeit die Lernmotivation langfristig stützt oder schwächt, ist offen. Dazu haben wir keine Daten, und die Erfahrung einzelner Familien ersetzt sie nicht. Weniger Diskussionen oder mehr Bereitschaft, Aufgaben zu bearbeiten, beantworten diese Frage noch nicht.',
      ],
    },
    {
      ueberschrift: 'Ein gemeinsames Ziel',
      absaetze: [
        'Bei allen Unterschieden im Weg ist das Ziel dasselbe: Kinder sollen Bildschirmzeit geordnet und begrenzt nutzen, und es soll ihnen dabei gut gehen.',
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
