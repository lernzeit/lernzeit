# Änderungen an den Projektanweisungen (Vorgabe vom 24.10.2026)

Wörtlich vom Betreiber übernommen. Die vollständigen Projektanweisungen (Abschnitte 1 bis 11) liegen **nicht** in diesem Repo,
sondern im Projekt, in dem der Betreiber Anzeigen, Skripte und Landingpage schreibt. Dieses Blatt ist die Vorgabe für alle Texte,
die in diesem Repo entstehen (Zielseiten, Ratgeber, FAQ, JSON-LD, `llms.txt`). Belege: `docs/funktionsstand.md`.

## Abschnitt 7, Verfügbarkeit (ersetzen)

- iOS: native App im App Store verfügbar.
- Android: native App verfügbar.
- Jedes andere Gerät: im Browser nutzbar.

## Abschnitt 7, „Was heute noch nicht geht“, erster Punkt (ersetzen)

- iPhone/iPad: Die Sperre und das Entsperren auf dem Kinder-Handy laufen automatisch über Apples Bildschirmzeit-Schnittstelle. Die Eltern genehmigen die Anfrage immer von Hand. Das gilt nur in der iOS-App, nicht im Browser. Voraussetzung sind iOS 16 oder neuer und ein Apple-Kinderkonto in der Familienfreigabe. Nach dem Genehmigen muss das Kind LernZeit einmal öffnen.
- Android: Es gibt keine Sperre durch LernZeit. Die Eltern genehmigen in LernZeit und geben die Minuten danach in Family Link als Bonuszeit frei. Google bietet dafür keine Schnittstelle.
- Nicht versprechen: „unumgehbar“ und „Sperre immer aktiv“. LernZeit meldet den Eltern, wenn die Sperre aus ist.

## Abschnitt 5, erste Zeile der Tabelle (ersetzen)

„Android: Wir ergänzen Family Link. iPhone: LernZeit übernimmt die Sperre über Apples Schnittstelle, beides mit Genehmigung der Eltern.“

## Abschnitt 11, zwei Antworten (ersetzen)

- „Funktioniert das auf dem iPhone?“ → „Ja. Die App ist im App Store. Sie sperrt das Kinder-iPhone über Apples Bildschirmzeit und gibt die verdiente Zeit nach deiner Genehmigung frei. Voraussetzung ist ein Apple-Kinderkonto in der Familienfreigabe.“
- „Wird die Zeit automatisch freigegeben?“ → „Du genehmigst immer selbst. Auf dem iPhone entsperrt sich das Handy danach von allein, sobald das Kind LernZeit öffnet. Auf Android gibst du die Minuten in Family Link frei, dafür gibt es keine Schnittstelle.“

## Prüfung gegen den Code (24.10.2026)

Alle Aussagen stimmen mit `docs/funktionsstand.md` überein. Zwei Ergänzungen für Texte, die das Blatt nicht widerlegen, aber genauer machen:

- „Auf dem iPhone entsperrt sich das Handy von allein“ gilt nur in der LernZeit-App und erst ab der Fassung mit Handysperre (2.1.1); ältere Fassungen sperren nur einzelne Kinder.
- Auf Android gibt LernZeit die Minuten nicht in Family Link ein, sie nennt sie nur („Genehmigen & Family Link öffnen“).
