# BrainHome v3.6 — Pastellfarben & Statistikansichten

## Installation

1. **Vorher JSON-Backup exportieren** und außerhalb der App behalten.
2. Im bestehenden GitHub-Repository nur **`app.js`** und **`sw.js`** aus diesem Paket ersetzen. `index.html` ist unverändert und deshalb nicht enthalten.
3. **Unverändert lassen:** `cloud.js`, die funktionierende `firebase-config.js`, `firestore.rules`, `study.js`, Icons und das Manifest.
4. Nach dem Veröffentlichen neu laden. Der Offline-Cache heißt jetzt `brainhome-static-v36`.

## Neu

- **36 Pastellfarben** in sechs Gruppen: Grün & Natur, Blau & Türkis, Lila & Flieder, Rosa & Koralle, Sonne & Erde, Sanfte Neutraltöne. Die acht bisherigen Farben sind weiterhin vorhanden. Bereits eingestellte Farben werden **nicht verändert**; eigene bisherige Hex-Farben bleiben auswählbar.
- Farbpalette mit scrollbarer Auswahl für kleinere Displays.
- Training-Statistik mit **drei Buttons**: `Übersicht`, `Gerät`, `Verlauf`.
  - **Übersicht** zeigt eine klassische Tabelle, mit einer Zeile pro Trainingsart: Trainings-Einträge, Tage, durchschnittliches Gewicht, Maximum. `Gesamt` fasst alle Trainingsarten zusammen. Antippen des Namens öffnet die Einzelansicht.
  - **Gerät** zeigt für die gewählte Trainingsart einzelne Trainingseinheiten nach Datum mit Satzanzahl, Wiederholungen je Satz, durchschnittlichem und höchstem Satzgewicht.
  - **Verlauf** zeigt die letzten zehn Trainingstage mit einem **vertikalen** Säulendiagramm und darunter einer Tabelle mit Tageswerten. Ohne Gewichtsdaten werden Wiederholungen statt kg dargestellt.
- Die eingestellte Statistikansicht wird auf dem Gerät gespeichert. Bestehende Trainingseinträge einschließlich v3.4-Daten werden unverändert angezeigt.

### Berechnung

Der Gewichts-Durchschnitt basiert weiterhin auf den erfassten Satzgewichten (ungewichtet nach Wiederholungszahl). Ein leer gelassenes Gewicht wird nicht als 0 kg mitgerechnet. `Trainingstage` meint unterschiedliche Kalendertage; der Gesamtwert zählt Tage nicht doppelt, wenn du mehrere Geräte am selben Tag benutzt.

## Sicherheit

Dieses Update verändert **keine** Trainings-, Essens- oder Aufgaben-Datenstruktur und verändert auch die Cloud-Synchronisierung nicht. Es tauscht ausschließlich Darstellung, Auswahl der Farbpalette und den Service-Worker-Cache-Namen aus. Bewahre deine alten Backups auf.
