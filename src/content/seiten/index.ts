// Inhaltsseiten der Website (Stand 26.10.2026).
//
// Quelle für jede Aussage zu Sperre und Freigabe: docs/funktionsstand.md und vom
// Betreiber vorgegebene Formulierungen (docs/projektanweisungen-aenderungen-2026-10-24.md).
// Regeln für alle Texte: Du-Ansprache, keine Floskeln, Einschränkungen offen nennen,
// keine Zahlen ohne Beleg, nie „unumgehbar“ und nie „Sperre immer aktiv“.
import { FAQ } from '../faq';
import type { Inhaltsseite } from './types';

const faq = (frage: string) => {
  const treffer = FAQ.find((e) => e.f === frage);
  if (!treffer) throw new Error(`FAQ-Eintrag fehlt: ${frage}`);
  return treffer;
};

const GRENZEN_FRAGE = {
  f: 'Kann mein Kind die Sperre umgehen?',
  a: 'Das können wir nicht ausschließen, und wir versprechen es nicht. Änderungen an der Sperre in LernZeit sind nur mit deiner Freigabe oder dem Elterncode möglich. Nicht geprüft haben wir, ob Löschen und Neuinstallieren der App, eine geänderte Uhrzeit, ein zweites Gerät oder das Beenden der Familienfreigabe die Sperre aushebeln. Geht die Sperre aus, meldet LernZeit es dir: Unter „Heute“ steht „Handysperre ist aus“, und du bekommst eine Mitteilung.',
};

const IPHONE_FRAGE = faq('Funktioniert das auf dem iPhone?');
const AUTOMATISCH_FRAGE = faq('Wird die Zeit automatisch freigegeben?');

export const seiten: Inhaltsseite[] = [
  /* ------------------------------------------------------------------ */
  {
    pfad: '/bildschirmzeit-kind',
    titel: 'Bildschirmzeit fürs Kind verdienen lassen – LernZeit',
    beschreibung:
      'Dein Kind löst Aufgaben und verdient Bildschirmzeit, du genehmigst jede Anfrage. iPhone: LernZeit sperrt selbst. Android: mit Family Link.',
    h1: 'Bildschirmzeit fürs Kind: erst Aufgaben, dann Handyzeit',
    einleitung:
      'Mit LernZeit löst dein Kind Aufgaben aus seinem Schulstoff und verdient damit Bildschirmzeit. Möchte es die Zeit nutzen, fragt es bei dir an, und du entscheidest. Hier steht, wie das abläuft, was LernZeit auf iPhone und Android jeweils übernimmt und was nicht.',
    aktualisiert: '2026-10-26',
    brotkrumen: [{ text: 'Bildschirmzeit fürs Kind' }],
    position: 'zielseite_bildschirmzeit',
    knopf: 'Kostenlos registrieren',
    abschnitte: [
      {
        h2: 'So läuft es ab',
        schritte: [
          'Dein Kind löst Aufgaben in der LernZeit-App, Klasse 1 bis 10. Für jede richtige Antwort gibt es 30 Sekunden Bildschirmzeit. Mit Premium legst du die Zeit je Fach selbst fest.',
          'Eine Obergrenze hält die Zeit im Rahmen: werktags 30 Minuten, am Wochenende 60. Mit Premium stellst du beides selbst ein.',
          'Ab 5 verdienten Minuten kann dein Kind Zeit anfragen. Es tippt auf „… Min. anfragen“ und kann eine Nachricht an dich schreiben.',
          'Die Anfrage kommt bei dir an, als Mitteilung und im Bereich „Heute“ unter „Anfragen“. Du tippst auf „Genehmigen“ oder „Ablehnen“. Genehmigt wird nie von allein.',
          'Auf dem iPhone öffnet sich das Handy danach von selbst, sobald dein Kind LernZeit öffnet. Auf Android gibst du die Minuten in Family Link frei.',
        ],
      },
      {
        h2: 'iPhone und iPad: LernZeit sperrt und entsperrt selbst',
        absaetze: [
          'Auf dem iPhone nutzt LernZeit Apples Bildschirmzeit-Schnittstelle. Es sperrt alle Apps außer Telefon und LernZeit. Genehmigst du eine Anfrage, gibt LernZeit die Zeit frei. Sind die Minuten des Tages in den gezählten Apps verbraucht, sperrt das Handy wieder, auch wenn LernZeit geschlossen ist.',
          'Dazu kommen Freiminuten jeden Tag ohne Aufgaben (Voreinstellung 30 Minuten, ihre Höhe ändern ist Premium), eine Ruhezeit am Abend, Mitteilungen an dein Kind bei 15, 10, 5, 3 und 1 Minute Rest und ein Elterncode für den Notfall.',
        ],
        liste: [
          'iOS 16 oder neuer.',
          'Ein Apple-Kinderkonto in deiner Familienfreigabe. Ohne das lehnt Apple die Sperre ab.',
          'Die LernZeit-App auf dem Handy des Kindes. Im Browser gibt es keine Sperre.',
          'Einmal einrichten, auf dem Handy des Kindes: Einstellungen → Bildschirmzeit → „Handy sperren“ → „Sperre einrichten“. Apple fragt dabei nach der Bildschirmzeit-Kennung.',
        ],
        nachher: [
          'Nach dem Genehmigen muss dein Kind LernZeit einmal öffnen. Apple erlaubt keinen Zugriff aus der Ferne, deshalb holt das Kinder-Handy die Genehmigung selbst ab. Die genaue Anleitung steht unter „Hilfe: Einrichtung“.',
        ],
      },
      {
        h2: 'Android: Family Link bleibt dein Werkzeug',
        absaetze: [
          'Auf Android sperrt LernZeit nicht. Google bietet Apps wie LernZeit dafür keine Schnittstelle. Du richtest Tageslimit und Ruhezeiten in Google Family Link ein. LernZeit kümmert sich um Aufgaben, Verdienen und Genehmigen.',
          'Hast du eine Anfrage genehmigt, gibst du die Minuten danach in Family Link frei: Kind wählen, „Bonuszeit“ antippen, Minuten für heute eintragen. LernZeit öffnet auf Wunsch Family Link („Genehmigen & Family Link öffnen“) und nennt dir die Minuten, trägt sie aber nicht ein.',
        ],
      },
      {
        h2: 'Browser und andere Geräte',
        absaetze: [
          'Aufgaben löst dein Kind auch im Browser auf lernzeit.app. Dort sperrt LernZeit nichts, und die verdiente Zeit gibst du von Hand frei.',
        ],
      },
      {
        h2: 'Was LernZeit nicht verspricht',
        liste: [
          'Die Sperre ist kein Schloss ohne Schlupfloch. Ob Löschen der App, eine geänderte Uhrzeit, ein zweites Gerät oder das Beenden der Familienfreigabe sie aushebeln, haben wir nicht geprüft.',
          'Die Sperre kann ausgehen. Auf dem iPhone eines Kindes war sie einmal einige Stunden aus, ohne dass jemand sie aufgehoben hatte. Seitdem meldet LernZeit dir das: Unter „Heute“ steht „Handysperre ist aus“, und du bekommst eine Mitteilung.',
          'Gezählt wird die Nutzung der Apps, die du bei der Einrichtung wählst. Apples gesamte Bildschirmzeit ist deshalb höher als die Zahl in LernZeit.',
          'Die Aufgaben entstehen mit KI und werden automatisch geprüft. Einzelne Fehler sind möglich. Dein Kind kann eine Aufgabe melden.',
        ],
      },
      {
        h2: 'Kosten',
        absaetze: [
          'Die ersten 4 Wochen sind alle Funktionen kostenlos, ohne Zahlungsdaten. Danach bleibt das Wichtigste kostenlos. Premium kostet 2,99 € im Monat oder 29,99 € im Jahr. Alle Preise stehen unter „Preise“.',
        ],
      },
    ],
    faq: [AUTOMATISCH_FRAGE, IPHONE_FRAGE, GRENZEN_FRAGE, faq('Was kostet LernZeit?')],
    weiterfuehrend: [
      { text: 'Einrichtung Schritt für Schritt', zu: '/hilfe/einrichtung' },
      { text: 'LernZeit, Bildschirmzeit und Family Link im Vergleich', zu: '/vergleich' },
      { text: 'Preise', zu: '/preise' },
      { text: 'Ratgeber: Bildschirmzeit auf dem iPhone des Kindes', zu: '/ratgeber/bildschirmzeit-iphone-kind' },
    ],
  },

  /* ------------------------------------------------------------------ */
  {
    pfad: '/kindersicherung-ergaenzen',
    titel: 'Kindersicherung ergänzen: Zeit verdienen – LernZeit',
    beschreibung:
      'LernZeit ersetzt Apple Bildschirmzeit oder Family Link nicht. Es ergänzt sie: Dein Kind verdient Zeit mit Aufgaben, du genehmigst die Anfrage.',
    h1: 'Kindersicherung ergänzen: Zeit verdienen statt nur begrenzen',
    einleitung:
      'Du hast Limits eingestellt, und trotzdem gibt es Streit um „nur noch fünf Minuten“? Eine Kindersicherung setzt eine Grenze. Wofür die Zeit da ist, sagt sie nicht. LernZeit fügt die Gegenleistung hinzu: Dein Kind löst Aufgaben, bekommt dafür Zeit, und du gibst sie frei.',
    aktualisiert: '2026-10-26',
    brotkrumen: [{ text: 'Kindersicherung ergänzen' }],
    position: 'zielseite_kindersicherung',
    knopf: 'Kostenlos registrieren',
    abschnitte: [
      {
        h2: 'Was deine Kindersicherung schon kann',
        absaetze: [
          'Apple Bildschirmzeit kennt Zeitpläne, tägliche Limits für Kategorien und einzelne Apps, erlaubte Apps und Kontakte und einen Code gegen Änderungen. Google Family Link kennt ein Tageslimit für das ganze Gerät, Ruhezeiten, Limits für einzelne Apps (nicht für System-Apps) und die Bonuszeit für heute.',
          'Beide begrenzen. Beide lassen offen, wie sich ein Kind mehr Zeit verdient. Eine ausführliche Übersicht findest du im Vergleich und im Ratgeber.',
        ],
      },
      {
        h2: 'Was LernZeit dazugibt',
        liste: [
          'Aufgaben als Gegenleistung: Für jede richtige Antwort gibt es 30 Sekunden Bildschirmzeit, bis zu einer Obergrenze (werktags 30 Minuten, am Wochenende 60).',
          'Eine Anfrage statt einer Diskussion: Dein Kind fragt an, du antwortest mit „Genehmigen“ oder „Ablehnen“.',
          'Einen Überblick: Unter „Heute“ siehst du, was dein Kind gelernt hat, in welchen Fächern und wie viel Zeit es verdient hat.',
          'Mit Premium einen KI-Lernplan für die nächste Klassenarbeit.',
        ],
      },
      {
        h2: 'Android: LernZeit läuft neben Family Link',
        absaetze: [
          'Family Link bleibt deine Kindersicherung. LernZeit ändert nichts an deinen Limits. Hast du eine Anfrage genehmigt, gibst du die Minuten in Family Link als Bonuszeit frei. Google bietet dafür keine Schnittstelle, deshalb geht das nicht automatisch.',
        ],
      },
      {
        h2: 'iPhone: LernZeit übernimmt die Sperre',
        absaetze: [
          'Auf dem iPhone sperrt und entsperrt LernZeit selbst, über Apples Bildschirmzeit-Schnittstelle. Du genehmigst weiterhin jede Anfrage von Hand. Danach öffnet sich das Handy von allein, sobald dein Kind LernZeit öffnet.',
          'Voraussetzung sind iOS 16 oder neuer und ein Apple-Kinderkonto in der Familienfreigabe. Apple lässt nur eine App zugleich die Bildschirmzeit eines Geräts verwalten. Eine andere Verwaltungs-App kann die Einrichtung deshalb blockieren.',
          'Wie sich LernZeit mit deinen eigenen Einstellungen in Apples Bildschirmzeit verträgt, haben wir nicht für jede Kombination getestet. Bist du unsicher, schreib an info@lernzeit.app, bevor du etwas umstellst.',
        ],
      },
      {
        h2: 'Was gleich bleibt',
        absaetze: [
          'Du entscheidest. LernZeit gibt nie von sich aus Zeit frei, und es filtert keine Webseiten oder Inhalte. Bildschirmzeit, die dein Kind nicht über LernZeit verdient, regelst du weiter dort, wo du sie heute einstellst.',
        ],
      },
    ],
    faq: [AUTOMATISCH_FRAGE, IPHONE_FRAGE, faq('Wie verbinde ich mein Kind mit meinem Konto?')],
    weiterfuehrend: [
      { text: 'Vergleich: LernZeit, Bildschirmzeit, Family Link', zu: '/vergleich' },
      { text: 'Ratgeber: Family Link oder Bildschirmzeit?', zu: '/ratgeber/family-link-oder-bildschirmzeit' },
      { text: 'Einrichtung Schritt für Schritt', zu: '/hilfe/einrichtung' },
    ],
  },

  /* ------------------------------------------------------------------ */
  {
    pfad: '/lern-app-klasse-1-10',
    titel: 'Lern-App für Klasse 1 bis 10 – LernZeit',
    beschreibung:
      'Aufgaben in Mathe, Deutsch, Englisch und weiteren Fächern für Klasse 1 bis 10. Dein Kind verdient damit Bildschirmzeit. 4 Wochen alle Funktionen kostenlos.',
    h1: 'Lern-App für Klasse 1 bis 10',
    einleitung:
      'LernZeit bietet Aufgaben für die Klassen 1 bis 10, orientiert am Lehrplan. Dein Kind wählt ein Fach, löst fünf Aufgaben pro Runde und verdient für jede richtige Antwort Bildschirmzeit. Du genehmigst, wann es sie nutzen darf.',
    aktualisiert: '2026-10-26',
    brotkrumen: [{ text: 'Lern-App Klasse 1–10' }],
    position: 'zielseite_lernapp',
    knopf: 'Kostenlos registrieren',
    abschnitte: [
      {
        h2: 'Fächer nach Klassenstufe',
        tabelle: {
          kopf: ['Fach', 'Klassen'],
          zeilen: [
            ['Mathematik', '1 bis 10'],
            ['Deutsch', '1 bis 10'],
            ['Sachkunde', '1 bis 4'],
            ['Englisch', '3 bis 10'],
            ['Erdkunde, Geschichte, Physik, Biologie, Latein', '5 bis 10'],
            ['Chemie', '7 bis 10'],
          ],
        },
      },
      {
        h2: 'Wie eine Runde abläuft',
        absaetze: [
          'Eine Runde hat fünf Aufgaben. Es gibt Auswahlfragen, Zahlen- und Texteingaben, Lückentexte, Zuordnungen und Sortieraufgaben. Zu jeder Aufgabe gibt es auf Wunsch einen Tipp, nach der Antwort eine Erklärung. Bis Klasse 4 liest eine KI-Stimme Aufgaben und Erklärungen vor.',
          'Falsch beantwortete Aufgaben landen in der Berichtigung: Dein Kind löst sie später noch einmal. Für jede richtige Antwort gibt es 30 Sekunden Bildschirmzeit. Wer während einer offenen Aufgabe länger als 5 Sekunden aus LernZeit wechselt, bekommt für diese Aufgabe keine Zeit, damit Nachschlagen sich nicht lohnt.',
        ],
      },
      {
        h2: 'Klassenarbeit vorbereiten (Premium)',
        absaetze: [
          'Mit Premium erstellt LernZeit einen Lernplan für eine anstehende Klassenarbeit: so viele Tage, wie bis zum Test bleiben, höchstens fünf. Du kannst bis zu 10 Fotos aus Heft, Buch oder Arbeitsblatt hochladen. LernZeit liest den Stoff aus, daraus entstehen die Aufgaben. Die Fotos selbst bleiben nicht gespeichert.',
        ],
      },
      {
        h2: 'Woher die Aufgaben kommen und wo ihre Grenzen liegen',
        liste: [
          'Die Aufgaben entstehen mit KI und werden automatisch geprüft. Trotzdem kann eine Aufgabe fehlerhaft sein. Dein Kind kann sie in der App melden („Fehler in der Frage melden“).',
          'LernZeit ersetzt keinen Unterricht und keine Nachhilfe. Es übt Stoff, den dein Kind schon kennt.',
          '„Lehrplanorientiert“ heißt: Die Aufgaben orientieren sich an den Inhalten der Klassenstufe. Sie sind nicht auf den Lehrplan eines einzelnen Bundeslands zugeschnitten.',
        ],
      },
      {
        h2: 'Datenschutz',
        absaetze: [
          'Die Daten liegen auf Servern in der EU, in Frankfurt am Main. Dein Kind braucht keine eigene E-Mail-Adresse, es kann sich mit einem Benutzernamen anmelden. In der App gibt es keine Werbung.',
        ],
      },
    ],
    faq: [
      faq('Für welche Klassen und Fächer ist LernZeit gedacht?'),
      faq('Braucht mein Kind eine eigene E-Mail-Adresse?'),
      faq('Wo werden die Daten gespeichert?'),
      faq('Was kostet LernZeit?'),
    ],
    weiterfuehrend: [
      { text: 'Bildschirmzeit fürs Kind: so läuft es ab', zu: '/bildschirmzeit-kind' },
      { text: 'Preise', zu: '/preise' },
      { text: 'Einrichtung Schritt für Schritt', zu: '/hilfe/einrichtung' },
    ],
  },

  /* ------------------------------------------------------------------ */
  {
    pfad: '/vergleich',
    titel: 'LernZeit, Bildschirmzeit und Family Link im Vergleich',
    beschreibung:
      'Was Apple Bildschirmzeit, Google Family Link und LernZeit können: Sperren, Zeitpläne, Limits, Zeit verdienen. Auch, was LernZeit nicht kann.',
    h1: 'LernZeit, Apple Bildschirmzeit und Google Family Link im Vergleich',
    einleitung:
      'Die drei lösen verschiedene Aufgaben. Apple Bildschirmzeit und Google Family Link begrenzen die Nutzung des Geräts. LernZeit lässt Kinder Zeit durch Lernen verdienen und gibt sie nach deiner Genehmigung frei, auf dem iPhone mit eigener Sperre. Die Tabelle zeigt, was jeweils geht, auch dort, wo LernZeit weniger kann.',
    aktualisiert: '2026-10-26',
    brotkrumen: [{ text: 'Vergleich' }],
    position: 'vergleich',
    knopf: 'Kostenlos registrieren',
    abschnitte: [
      {
        h2: 'Die drei im Überblick',
        tabelle: {
          kopf: ['Funktion', 'Apple Bildschirmzeit', 'Google Family Link', 'LernZeit'],
          zeilen: [
            ['Wo richtest du es ein?', 'Einstellungen → Bildschirmzeit, mit Familienfreigabe', 'App Family Link auf deinem Android-Gerät oder iPhone', 'App auf dem Kinder-Handy, Eltern-Bereich auf jedem Gerät'],
            ['Sperrt das Kinder-Handy', 'Ja', 'Ja', 'iPhone: ja. Android: nein'],
            ['Zeitpläne, z. B. abends', 'Ja', 'Ja (Ruhezeiten)', 'iPhone: eine tägliche Ruhezeit'],
            ['Tageslimit', 'Limits je Kategorie und App', 'Tageslimit fürs Gerät, Limits für einzelne Apps', 'iPhone: Freiminuten plus verdiente und genehmigte Zeit'],
            ['Limits je App', 'Ja', 'Ja (nicht für System-Apps)', 'Nein'],
            ['Mehr Zeit für heute', 'Anfrage genehmigen', 'Bonuszeit', 'Anfrage genehmigen, „+15 Min.“, „+30 Min.“, „Heute ohne Limit“ (iPhone)'],
            ['Zeit durch Aufgaben verdienen', 'Nein', 'Nein', 'Ja: 30 Sekunden je richtige Antwort'],
            ['Aufgaben für Klasse 1 bis 10', 'Nein', 'Nein', 'Ja'],
          ],
        },
        nachher: [
          'Die Angaben zu Apple und Google folgen deren Hilfeseiten (Stand 4. Oktober 2026), die zu LernZeit dem heutigen Stand der App. Bezeichnungen ändern sich mit neuen Versionen von iOS und Android.',
        ],
      },
      {
        h2: 'Wann Bildschirmzeit oder Family Link reicht',
        absaetze: [
          'Wenn du vor allem Grenzen setzen willst: Zeiten, in denen das Handy ruht, und Limits für einzelne Apps. Dafür sind beide gebaut, sie sind in iOS eingebaut bzw. kommen als App von Google.',
        ],
      },
      {
        h2: 'Wann LernZeit dazupasst',
        absaetze: [
          'Wenn Zeit am Handy eine Gegenleistung haben soll: erst Aufgaben, dann Handyzeit. LernZeit hält fest, wie viel dein Kind verdient hat, und lässt es anfragen. Du genehmigst. Auf dem iPhone öffnet und schließt LernZeit die Sperre danach selbst. Auf Android läuft die Sperre weiter über Family Link, und du gibst die Minuten als Bonuszeit frei.',
        ],
      },
      {
        h2: 'Wo LernZeit weniger kann',
        liste: [
          'Auf Android sperrt LernZeit nicht.',
          'Es gibt keine Limits je App, nur „Immer erlaubt“ für Apps, die trotz Sperre offen bleiben.',
          'Die iPhone-Sperre braucht die LernZeit-App und ein Apple-Kinderkonto in der Familienfreigabe. Im Browser gibt es sie nicht.',
          'LernZeit filtert keine Webseiten und Inhalte.',
          'Die Sperre kann ausgehen. LernZeit meldet es dir („Handysperre ist aus“), versprechen kann es nicht, dass sie immer aktiv bleibt.',
        ],
      },
    ],
    faq: [AUTOMATISCH_FRAGE, IPHONE_FRAGE],
    weiterfuehrend: [
      { text: 'Ratgeber: Family Link oder Bildschirmzeit?', zu: '/ratgeber/family-link-oder-bildschirmzeit' },
      { text: 'Ratgeber: Bildschirmzeit auf dem iPhone des Kindes', zu: '/ratgeber/bildschirmzeit-iphone-kind' },
      { text: 'Kindersicherung ergänzen', zu: '/kindersicherung-ergaenzen' },
    ],
  },

  /* ------------------------------------------------------------------ */
  {
    pfad: '/preise',
    titel: 'Preise: 4 Wochen kostenlos, Premium ab 2,99 € – LernZeit',
    beschreibung:
      '4 Wochen alle Funktionen kostenlos, ohne Zahlungsdaten. Danach bleibt das Wichtigste kostenlos. Premium kostet 2,99 € im Monat oder 29,99 € im Jahr.',
    h1: 'Preise',
    einleitung:
      'Du testest LernZeit 4 Wochen mit allen Funktionen, ohne Zahlungsdaten. Danach bleibt die Grundfunktion kostenlos. Wer mehr Steuerung möchte, nimmt Premium.',
    aktualisiert: '2026-10-26',
    brotkrumen: [{ text: 'Preise' }],
    position: 'preise_seite',
    knopf: 'Kostenlos registrieren',
    abschnitte: [
      {
        h2: 'Kostenlos, ohne zeitliche Grenze',
        liste: [
          'Aufgaben in allen Fächern der Klassenstufe, Klasse 1 bis 10.',
          'Bildschirmzeit verdienen und Anfragen an dich schicken.',
          'So viele Kinderprofile, wie du brauchst.',
          'Auf dem iPhone die Handysperre mit Freiminuten (Voreinstellung 30 Minuten pro Tag).',
        ],
      },
      {
        h2: 'Premium: 2,99 € im Monat oder 29,99 € im Jahr',
        tabelle: {
          kopf: ['Funktion', 'Kostenlos', 'Premium'],
          zeilen: [
            ['Alle Fächer Klasse 1 bis 10', 'ja', 'ja'],
            ['Bildschirmzeit verdienen', 'ja', 'ja'],
            ['KI-Lernplan für Klassenarbeiten, auch aus Fotos', 'nein', 'ja'],
            ['Schwerpunktfächer festlegen', 'nein', 'ja'],
            ['Belohnung je Fach anpassen', 'nein', 'ja'],
            ['Eigene Zeitlimits und Tagesobergrenze je Kind', 'nein', 'ja'],
            ['Höhe der Freiminuten ändern', 'nein', 'ja'],
            ['Erweiterte Lernanalyse', 'nein', 'ja'],
          ],
        },
        nachher: [
          'Das Jahresabo kostet rund 16 % weniger als zwölf Monatsabos.',
        ],
      },
      {
        h2: 'Die Testphase',
        absaetze: [
          'Die ersten 4 Wochen kannst du alle Premium-Funktionen nutzen. Du gibst dafür keine Zahlungsdaten an, also wird nach der Testphase auch nichts abgebucht. Ein Abo gibt es nur, wenn du es selbst abschließt.',
        ],
      },
      {
        h2: 'Kündigen und widerrufen',
        absaetze: [
          'Ein Abo von der Website kannst du jederzeit kündigen: auf der Seite „Verträge hier kündigen“, im Eltern-Bereich unter „Abo“ → „Abo kündigen“ oder per E-Mail an info@lernzeit.app. Das Monatsabo läuft bis zum Ende des laufenden Monats, beim Jahresabo gilt nach dem ersten Jahr eine Frist von einem Monat. Die Einzelheiten stehen in den Nutzungsbedingungen, das Widerrufsrecht unter „Vertrag widerrufen“.',
          'In der iPhone- und Android-App läuft der Kauf über App Store bzw. Google Play. Dort gilt der im Store angezeigte Preis, und du beendest das Abo auch dort.',
        ],
      },
    ],
    faq: [
      faq('Was kostet LernZeit?'),
      faq('Wird nach der Testphase automatisch etwas abgebucht?'),
      faq('Wie viel Bildschirmzeit verdient mein Kind?'),
    ],
    weiterfuehrend: [
      { text: 'Verträge hier kündigen', zu: '/kuendigen' },
      { text: 'Vertrag widerrufen', zu: '/widerruf' },
      { text: 'Bildschirmzeit fürs Kind: so läuft es ab', zu: '/bildschirmzeit-kind' },
    ],
  },

  /* ------------------------------------------------------------------ */
  {
    pfad: '/hilfe/einrichtung',
    titel: 'LernZeit einrichten: Konto, Kind, Sperre – Anleitung',
    beschreibung:
      'Schritt für Schritt: Eltern-Konto anlegen, Kind einladen, auf dem iPhone die Sperre einrichten, auf Android Family Link nutzen, Anfragen genehmigen.',
    h1: 'LernZeit einrichten',
    einleitung:
      'Diese Anleitung führt dich von der Anmeldung bis zur ersten Freigabe. Die Schaltflächen heißen so, wie sie in der App stehen. Die Sperre gibt es nur auf dem iPhone und iPad, auf Android läuft sie über Family Link.',
    aktualisiert: '2026-10-26',
    brotkrumen: [{ text: 'Hilfe: Einrichtung' }],
    position: 'hilfe_einrichtung',
    knopf: 'Kostenlos registrieren',
    abschnitte: [
      {
        h2: '1. Eltern-Konto anlegen',
        schritte: [
          'LernZeit als App öffnen (App Store, Google Play) oder lernzeit.app im Browser.',
          'Auf „Registrieren“ tippen und „Ich bin Elternteil“ wählen.',
          '„Konto erstellen“ tippen und die E-Mail-Adresse bestätigen.',
        ],
      },
      {
        h2: '2. Kind einladen und verbinden',
        schritte: [
          'Im Eltern-Bereich unter „Kinder“ auf „Kind einladen“ tippen. Bestätige die Einwilligung und tippe auf „Code erstellen“.',
          'Schick den Link mit „Link teilen“ an dein Kind. Es öffnet ihn auf seinem eigenen Handy oder gibt den sechsstelligen Code in der App ein. Der Code gilt 7 Tage.',
          'Dein Kind wählt bei der Registrierung „Ich bin ein Kind“. Eine eigene E-Mail-Adresse braucht es nicht, ein Benutzername genügt. Hat es sich schon ohne Code registriert, gibt es den Code später unter Einstellungen → „Eltern-Verknüpfung“ ein.',
        ],
      },
      {
        h2: '3a. iPhone und iPad: die Sperre einrichten',
        absaetze: [
          'Du brauchst iOS 16 oder neuer auf dem Handy des Kindes und ein Apple-Kinderkonto in deiner Familienfreigabe (Einstellungen → Familie). Die Sperre richtest du auf dem Handy des Kindes ein, weil Apple die Auswahl nur dort zulässt.',
        ],
        schritte: [
          'LernZeit auf dem Kinder-iPhone öffnen und mit dem Konto des Kindes anmelden.',
          'Zahnrad (Einstellungen) → „Bildschirmzeit“ → Karte „Handy sperren“ → „Sperre einrichten“.',
          'Apple fragt nach der Bildschirmzeit-Kennung. Gib sie ein (das machst du als Elternteil).',
          '„Was zählt als Handyzeit?“: „Alle Apps & Kategorien“ wählen und LernZeit abwählen. Ohne diese Auswahl zählt LernZeit nichts.',
          'LernZeit sperrt jetzt alles außer Telefon und LernZeit. Auf deinem eigenen Handy erlaubst du einmal die Einrichtung des Elterncodes („Erlauben“, Mitteilung bzw. Karte unter „Heute“).',
          'Optional auf deinem Handy: Kinder → Kind wählen → „Regeln“ für Freiminuten, Ruhezeit und Extra-Zeit.',
        ],
        nachher: [
          'Ob die Sperre läuft, siehst du unter „Heute“. Steht dort „Handysperre ist aus“, richte sie auf dem Kinder-iPhone noch einmal ein.',
        ],
      },
      {
        h2: '3b. Android: Family Link',
        schritte: [
          'Family Link auf deinem Handy installieren und das Handy des Kindes verbinden.',
          'In Family Link Tageslimit und Schlafenszeit einstellen.',
          'Genehmigte Zeit gibst du später dort frei: Kind wählen, „Bonuszeit“ antippen, Minuten eintragen.',
        ],
      },
      {
        h2: '4. Die erste Anfrage',
        schritte: [
          'Dein Kind löst Aufgaben. Ab 5 verdienten Minuten erscheint „… Min. anfragen“.',
          'Es tippt darauf, schreibt auf Wunsch eine Nachricht und tippt noch einmal auf „… Min. anfragen“.',
          'Bei dir kommt eine Mitteilung an. Unter „Heute“ → „Anfragen“ tippst du auf „Genehmigen“ oder „Ablehnen“.',
          'iPhone: Dein Kind öffnet LernZeit, und das Handy öffnet sich für die genehmigte Zeit. Android: Du gibst die Minuten in Family Link als Bonuszeit frei („Genehmigen & Family Link öffnen“ führt dich dorthin).',
        ],
      },
      {
        h2: 'Wenn etwas nicht klappt',
        liste: [
          'Apple lehnt die Sperre ab: Das Kind braucht ein Kinderkonto in der Familienfreigabe. Lege es unter Einstellungen → Familie an und melde das Handy des Kindes damit an.',
          '„Eine andere App verwaltet die Bildschirmzeit“: Beende die Verwaltung dort oder lösche die andere App, und versuch es noch einmal.',
          'Ein Verwaltungsprofil schränkt die Bildschirmzeit ein: Entferne es unter Einstellungen → Allgemein → VPN & Geräteverwaltung.',
          'Der Gerätecode fehlt: Richte unter Einstellungen → Face ID & Code einen Code ein.',
          'Die Genehmigung kommt nicht an: Dein Kind muss LernZeit öffnen und Internet haben. Apple erlaubt keinen Zugriff aus der Ferne.',
          'Hilft das alles nicht, schreib an info@lernzeit.app und nenne den Text, den Apple unter der Meldung anzeigt.',
        ],
      },
    ],
    faq: [
      faq('Wie verbinde ich mein Kind mit meinem Konto?'),
      AUTOMATISCH_FRAGE,
      IPHONE_FRAGE,
      faq('Kann ich mein Konto wieder löschen?'),
    ],
    weiterfuehrend: [
      { text: 'Bildschirmzeit fürs Kind: so läuft es ab', zu: '/bildschirmzeit-kind' },
      { text: 'Support', zu: '/support' },
      { text: 'Alle häufigen Fragen', zu: '/faq' },
    ],
  },
];

export const findeSeite = (pfad: string): Inhaltsseite | undefined => seiten.find((s) => s.pfad === pfad);
