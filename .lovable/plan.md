# Fokussierter Einstieg für Eltern

- Nach dem ersten abgeschlossenen Laden der Familiendaten sehen Eltern ohne verknüpftes Kind nur die bestehende Kopfzeile und den fokussierten Einstieg.
- Überschrift: „Lege jetzt das Profil deines Kindes an“. Drei kurze Punkte erklären Anmeldung auf dem Kindergerät, Aufgaben und Freigabe angefragter Bildschirmzeit.
- Den vorhandenen Einladungsbereich unverändert funktional wiederverwenden: Einwilligung, Code erstellen, bestehende Einladungen teilen, kopieren und zurückziehen. Der vorhandene Ablauf legt auf Elternseite zunächst einen Einladungscode an, kein Profil mit Namens- oder Klassenfeldern.
- „Später“ zeigt das normale Dashboard und merkt diese Entscheidung kontobezogen für 24 Stunden; Speicherzugriffe mit try/catch.
- Mit verknüpftem Kind erscheint automatisch das normale Dashboard. Die bestehende OnboardingNextStepCard bleibt unverändert.
- Konto-Einstellungen und Abmelden bleiben erreichbar. Prüfung bei 375 px, einschließlich Eingabeschrift und seitlichem Scrollen.

## Technische Umsetzung
- Einladungsbereich innerhalb von ParentDashboard einmal definieren und in beiden Ansichten verwenden.
- Abschluss des ersten Familienladens separat im Dashboard verfolgen, da der vorhandene Hook initial loading=false liefert.
- Nur Frontend und notwendige Projektdokumentation ändern; geschützte Dateien, Datenbank und Analytics-Ereignisse bleiben unangetastet.
