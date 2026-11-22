# BrainHome v3.7 – Lebenshaltung, Rückblicke und Kalender

## Installation

1. **Zuerst in der bisherigen BrainHome-Version ein vollständiges JSON-Backup exportieren.** Auch ein aktuelles Cloud-Backup prüfen.
2. Auf GitHub im Ordner deiner BrainHome-PWA **nur `index.html`, `app.js` und `sw.js` ersetzen**.
3. `firebase-config.js`, `cloud.js`, `firestore.rules`, `study.js`, `manifest.webmanifest` und die Icons **unverändert behalten**.
4. Die App neu öffnen und prüfen: bestehende Lebensbereiche, Listen, Rituale, Erledigt-Statistik und Wissensbaum. Gegebenenfalls die Seite nach dem Service-Worker-Update erneut laden.
5. Erst wenn alles geprüft ist, auf einem zweiten Gerät verwenden. Im Zweifel im Backup eine Wiederherstellungsmöglichkeit behalten.

## Änderungen

- **Keine Priorität:** Der Lebensbereich-Aufgabenzähler zeigt nur *offene, als Aufgabe markierte Einträge mit einer vergebenen Priorität* an. Einträge ohne Priorität bleiben erhalten, sichtbar und abhakbar; die Statistik bleibt unabhängig davon.
- **Lebenshaltung:** Bestehender Bereich „Sport und Essen“ wird mit unveränderter ID zu „Lebenshaltung“. Der Aufgabenbaum bleibt ausgeblendet, und auf der Startseite steht bei diesem Bereich keine Aufgabenanzahl.
- **Rituale:** Die bestehende Routinenliste inklusive Untergruppen und Verlauf wird unter Lebenshaltung angezeigt und unter Privat nicht mehr. Die eigentlichen Routinedaten werden **nicht neu angelegt oder gelöscht**.
- **Lager:** Die bisher als „Notizen“ bezeichneten Bereichsnotiz-Funktionen in den Lebensbereichen und der Studienstiftung heißen jetzt „Lager“. Der gespeicherte Inhalt bleibt identisch.
- **Klimmzüge:** Für Trainingsarten mit Namen wie „Klimmzüge“ oder „Klimmzugmaschine“ gilt das niedrigste Gewicht als beste Unterstützungsstufe. In den Geräte- und Verlaufstabellen wird der Bestwert entsprechend invertiert. Das Gesamt-Maximum bleibt die maximale gehobene/angezeigte Kilogrammzahl über alle Trainingsarten.
- **Rückblicke:** Nach abgeschlossenem Wochenende, Monat und Jahr erscheint beim nächsten App-Öffnen mit vorhandenen Aufgabenereignissen ein zusammenfassender Dialog mit Konfetti, Abschluss-/Eingangszahlen, Quote und abgeschlossenen Aufgaben nach Lebensbereichen. Geprüft wird die letzte vollständig abgeschlossene Woche, der letzte vollständig abgeschlossene Monat und das letzte abgeschlossene Jahr. Jede Periode erscheint pro Browser nur einmal. Browser mit deaktivierten Animationen zeigen den Bericht ohne Konfetti. Ältere Ereignisse vor der Einführung der Ereignisstatistik lassen sich nicht nachträglich rekonstruieren.
- **Pastellfarben:** Die individuelle Lebensbereichsfarbe färbt die Startseitenkarte und die Kategorie-Knoten, nicht den gesamten Baumhintergrund oder Aufgabenfelder.
- **Studienstiftung:** Unter „Projekte“ gibt es jetzt ein **×** zum Entfernen von Projekten und Untergruppen. Nach Bestätigung bleiben direkte Unterpunkte erhalten und werden eine Ebene höher einsortiert. Der entfernte Projektknoten wird im BrainHome-Papierkorb gesichert (und kann über den bestehenden Backup-/Undo-Mechanismus wiederhergestellt werden).
- **Kalender:** Neuer Tab direkt hinter „Erledigt“. Er zeigt alle Aufgaben mit Fälligkeitsdatum und gespeicherten Termine, ohne die ursprünglichen Datumswerte zu ändern. Monat wechseln, Tag auswählen, Einträge bearbeiten. Der Kalender enthält außerdem einen **`.ics`-Export aller datierten Einträge** zur manuellen Übernahme in Google Kalender.

## Google Kalender

Der `.ics`-Export ist **keine Live-Synchronisierung**. Google Kalender im Browser → Einstellungen → *Importieren & Exportieren* → die heruntergeladene `.ics`-Datei importieren. Ein weiterer Export mit erneutem Import kann Duplikate erzeugen; deshalb nicht ungeprüft wiederholt importieren. Für eine echte bidirektionale Verbindung mit Google Calendar API braucht BrainHome später eigene OAuth-Clientkonfiguration, von dir erteilte Zugriffsrechte und eine Strategie zur Konfliktbehandlung.

## Datensicherheit / technische Grenzen

- `data.nodes`, `data.routines`, `data.routineGroups`, `data.taskEvents`, `data.completionLog` und Trainingsdaten bleiben im bisherigen Backup-/Cloud-Format; keine neuen zusätzlichen persönlichen Cloud-Dateien.
- Kalenderdaten sind aus den vorhandenen Datensätzen abgeleitet, sodass keine redundanten Termine entstehen.
- Abschlussstatistiken können historische Ereignisse nur berücksichtigen, soweit sie tatsächlich gespeichert wurden.
- Die Rückblicke können nur erscheinen, wenn BrainHome geöffnet ist; beim ersten Öffnen danach werden sie nachgeholt. Keine Push-Nachricht bei geschlossener PWA.
- Die lokale JS-Syntax und die genannten Kernabläufe sind in Chromium mit Testdaten geprüft. **Google-Kalender-Livezugriff, Firebase-Cloudabgleich auf deinem Konto, Service-Worker-Update auf Android und das Konfetti auf realen Endgeräten wurden nicht live getestet.**
