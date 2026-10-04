# Startseite mit Motion-Videos

- Hero zweispaltig auf Desktop, mit unveränderten Texten und CTAs links sowie schwebendem Kind-Video rechts. Mobil stehen beide CTAs vor dem maximal 320 px breiten Video.
- „So funktioniert’s“ zeigt die bestehenden drei Schritte mit Kind-Video bei Aufgaben/Zeit und Eltern-Video bei der Freigabe; höchstens zwei Videos im Abschnitt.
- Alle Abschnitte erhalten einheitliches, gestaffeltes Einblenden. Dezente Parallaxe am Hero-Video, ohne zusätzliche Hintergrund-Orbs.
- Texte, Tracking, Navigation, Store-Links, Einladungslogik und Abschnittsmessung bleiben erhalten. Geschützte Dateien bleiben unverändert.

## Technische Umsetzung
- Wiederverwendbares LoopVideo: vorhandene Videos/Poster über Projekt-Assets, feste Seitenverhältnisse, Sichtbarkeitssteuerung mit IntersectionObserver, pausiert außerhalb des Bildschirms.
- Gemeinsamer Motion-Hook mit passivem Scroll-Listener und requestAnimationFrame; ohne Bewegung bei reduzierter Bewegung. Inhalte sind ohne JavaScript sichtbar und vollständig im DOM.
- Prüfung bei 375 px und Desktop: CTAs, Videos, Scroll-Effekte, FAQ, Links und fehlender seitlicher Überlauf.
