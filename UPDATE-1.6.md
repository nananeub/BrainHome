# BrainHome 1.6 – Update-Anleitung

## Vor dem Update: vorhandene Daten sichern

Öffne BrainHome auf deinem bisherigen Handy und exportiere im Bereich **Backup** eine JSON-Datei. Bewahre sie an einem sicheren Ort außerhalb der App auf. Wenn du die Cloud nutzt, prüfe außerdem, ob die letzte Sicherung aktuell ist.

## Diese fünf Dateien auf GitHub aktualisieren

Entpacke `BrainHome-v1.6.zip` und lade **nur** folgende Dateien in das Stammverzeichnis deines bestehenden GitHub-Repositories hoch:

| Datei | Aktion |
| --- | --- |
| `index.html` | ersetzen |
| `brainhome-v1.js` | ersetzen – Startseite und Sicherungsschema |
| `brainhome-v13.js` | ersetzen – Statistik mit Routinen, Geschenken und Zubereitungen |
| `brainhome-v16.js` | **neu hinzufügen** – neue Eintragseinstellungen und Erledigungsprotokoll |
| `sw.js` | ersetzen – aktualisierter Offline-Cache |

**Alle anderen Dateien behalten.** Vor allem die persönlich eingerichtete `firebase-config.js`, `cloud.js`, `brainhome-v11.js`, `brainhome-v12.js`, `brainhome-v14.js`, `brainhome-v15.js`, `manifest.webmanifest` und die Icons weder löschen noch überschreiben. Die Firebase-Einrichtung bleibt unverändert.

Danach die installierte App vollständig schließen und erneut öffnen; bei Bedarf einmal die Seite neu laden. **Nicht die Website-Daten löschen.**

## Was neu ist

1. **Essen → In Zubereitung:** Ein Lebensmittel kann mit „Auch als Aufgabe in Alle Aufgaben anzeigen“ zusätzlich zur offenen Aufgabe werden. Auf Wunsch erhält diese eine Priorität. Sie bleibt derselbe Eintrag in der Essensliste, wird nicht doppelt gespeichert. Abhaken entfernt sie aus den offenen Aufgaben und vermerkt den Abschluss in Erledigt.
2. **Routinen:** Jede tatsächlich durchgeführte Routine wird mit einem Zeitstempel in Erledigt gespeichert und im Wochen-, Monats- und Jahresdiagramm mitgezählt. Wiederholte Durchführungen zählen jeweils einzeln.
3. **Geschenke:** „✓ Geschenk fertig“ zählt eine Erledigung; wenn du ein Geschenk später wieder öffnest, bleiben frühere Abschlüsse historisch erhalten. Versehentliche Änderungen lassen sich wie gewohnt mit ↶ rückgängig machen.
4. **Sofort nur auf eigenen Wunsch:** Neben jeder Routine und jedem Geschenk gibt es ein kleines `○ Sofort`, das sich an- und ausschalten lässt. Standardmäßig sind diese Einträge **nicht** als Sofort gekennzeichnet. Ein so markiertes Geschenk erscheint nur offen und eine so markierte Routine nur fällig auf der Startseite unter Sofort. Sonst bleibt die Sofort-Karte verborgen.
5. **Projektkopf:** Der Zurück-Pfeil erhält etwas mehr Abstand zum unterstrichenen Projektnamen. Die Baumdarstellung selbst ist unverändert.

## Daten und Tests

Die App nutzt weiterhin `brainhome-v02` im lokalen Speicher und die bestehenden IDs sowie die Cloud-Verbindung. Das neue Array `completionLog` wird in JSON-Backups, Rückgängig-Verlauf und Cloud-Sicherungen übernommen. Bereits vor diesem Update erledigte Routinen/Geschenke können nicht nachträglich mit Datum in die Statistik übernommen werden.

Die JavaScript-Syntax sowie die neuen Funktionen wurden mit Testdaten im Chromium-Browser geprüft (Sofort-Schalter, Startseite, Erledigen aller drei Arten, Statistik, Geschenkeditor). Ein Test mit deinem echten Firebase-Konto und deinem Android-Handy war nicht möglich.
