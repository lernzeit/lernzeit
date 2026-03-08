

## Plan: ScreenTimeWidget durch sinnvolle Eltern-Karte ersetzen

### Problem
Die `ScreenTimeWidget`-Komponente auf dem Eltern-Dashboard ist ein Dummy. Sie prüft `Capacitor.isNativePlatform()`, das in der PWA/Web-Ansicht immer `false` zurückgibt, und zeigt dann "Familienkontrollen sind auf diesem Gerät nicht verfügbar". Selbst auf nativen Geräten liefert der `FamilyLinkService` nur Mock-Daten.

Die eigentliche Bildschirmzeit-Verwaltung (Anfragen genehmigen, Zeitlimits setzen) läuft bereits vollständig über das `ParentDashboard` und die `ParentScreenTimeRequestsDashboard`-Komponente. Die ScreenTimeWidget ist also redundant und verwirrend.

### Lösung

**Die `ScreenTimeWidget` im Eltern-Dashboard durch eine kompakte "Kindersicherung"-Karte ersetzen**, die:

1. **Erkennt, ob ein natives Gerät vorliegt** (via `parentalControlsService.isNativePlatform()`)
2. **Auf nativen Geräten**: Einen Button zeigt, der direkt Family Link (Android) oder Bildschirmzeit-Einstellungen (iOS) öffnet – über die bereits implementierten Deep-Links in `parentalControlsService`
3. **Im Web/PWA**: Statt "nicht verfügbar" eine kurze Anleitung zeigt, wie man Family Link oder Bildschirmzeit auf dem Gerät einrichtet, mit Links zu den App-Stores
4. **Immer**: Einen Hinweis zeigt, dass Bildschirmzeit-Anfragen der Kinder im Tab "Anfragen" im Dashboard unten verwaltet werden

### Technische Änderungen

**`src/components/ScreenTimeWidget.tsx`** – Komplett umschreiben:
- Entferne Abhängigkeit von `useScreenTime` und `familyLinkService` (die Mock-Daten liefern)
- Nutze stattdessen `parentalControlsService` (bereits implementiert mit echten Deep-Links)
- Zeige plattformspezifische UI: nativer Button vs. Web-Anleitung
- Entferne den ganzen "Permission"-Flow (war ohnehin Mock)

**`src/hooks/useScreenTime.ts`** und **`src/services/familyLink.ts`** – Können entfernt werden, da sie nur Mock-Daten liefern und von keiner anderen Komponente genutzt werden.

### Dateiänderungen

| Datei | Aktion |
|---|---|
| `src/components/ScreenTimeWidget.tsx` | Umschreiben (nutzt `parentalControlsService`) |
| `src/hooks/useScreenTime.ts` | Entfernen (nur Mock-Daten) |
| `src/services/familyLink.ts` | Entfernen (nur Mock-Daten) |

