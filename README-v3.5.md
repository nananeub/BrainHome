# BrainHome v3.5 — Sport & Essen

Dieses Update setzt auf v3.4 auf. Es ändert ausschließlich die Oberfläche und die Erweiterung „Sport und Essen“; die bestehenden Firebase-Dateien und die Studienbibliothek werden nicht ersetzt.

## Update

1. **Zuerst ein vollständiges JSON-Backup in der funktionierenden App herunterladen** und außerhalb der App aufbewahren.
2. Im Stammverzeichnis des bestehenden GitHub-Repositories nur `index.html`, `app.js` und `sw.js` durch die drei Dateien aus dem ZIP ersetzen.
3. **Unverändert lassen:** `cloud.js`, deine funktionierende `firebase-config.js`, `firestore.rules`, `study.js`, `manifest.webmanifest`, Icons und bestehende Daten.
4. Nach dem Veröffentlichen BrainHome neu laden. Der Service-Worker-Cache heißt jetzt `brainhome-static-v35`.
5. „Sport und Essen“ öffnen, zunächst einen kleinen Trainings-Testeintrag vornehmen und prüfen, ob er nach einem Neuladen und im JSON-Export erhalten bleibt. Cloud-Status separat kontrollieren.

**Wichtig:** Keine Browserdaten, keine Firestore-Daten und keine alten Backups löschen.

## Änderungen

### Lebensbereiche — Pastellfarben

- Name, Emoji und **acht Pastellfarben** über 🎨 ändern. Die Palette orientiert sich an den vorhandenen Farben der Lebensbereiche: Salbei, Flieder, Himmelblau, Sand, Altrosa, Mint, Apricot und Lavendelblau.
- Falls ein Lebensbereich bereits eine andere Hex-Farbe hat, ist diese als „Bisherige Farbe“ weiterhin auswählbar. Es werden keine Farben ungefragt überschrieben.

### Sport und Essen — ohne Aufgabenbaum

- Im Lebensbereich „Sport und Essen“ erscheinen die Reiter **Sport** und **Essen** direkt unter dem Titel; der zuvor angezeigte Aufgabenbaum wird **nur in dieser Ansicht ausgeblendet**.
- Eventuell vorhandene Aufgaben/Kategorien werden **nicht gelöscht oder geändert**. Die Aufgabenbäume anderer Lebensbereiche bleiben vollständig erhalten.

### Training — verschiedene Sätze

- Trainingsart und Anzahl der Sätze eingeben; danach erscheint **für jeden Satz** eine eigene Zeile für **Gewicht in kg (optional)** und **Wiederholungen**.
- Beispiel: Beinpresse, drei Sätze: 50 kg × 10 / 60 kg × 8 / 55 kg × 6.
- Nach „Eintragen“ wird der vollständige Eintrag gespeichert, und alle Eingabefelder sind wieder leer.
- Vorhandene v3.4-Trainingsdaten bleiben kompatibel. Neue Datensätze enthalten zusätzlich das Feld `setDetails` mit vollständigen Einzelwerten. Die alten Zusammenfassungsfelder `weight`, `sets` und `reps` bleiben aus Kompatibilitätsgründen erhalten.
- **Visualisierung oben:** In „Alle Geräte & Trainingsarten“ zeigt ein Balkendiagramm die Anzahl der erfassten Trainingseinträge je Trainingsart; bei einem ausgewählten Gerät die maximalen Gewichte je Trainingstag (ohne Gewichte: die maximale Wiederholungszahl).
- Ø-Gewicht ist der Durchschnitt **über alle Sätze mit eingegebenem Gewicht**, nicht über alle einzelnen Wiederholungen. Das Maximum ist das höchste erfasste Satzgewicht. Eigengewichts-Sätze mit leerem Gewicht zählen nicht zur Gewichtsberechnung.
- Das **Trainingstagebuch ist einklappbar** (zu Beginn geschlossen); nach dem Öffnen erscheinen die Einträge mit den Einzelwerten und der Löschfunktion.

### Essen — 🍙 Rezeptbuch

- Erkennt jetzt auch die vorhandene Kategorie **„🍙 Rezeptbuch“ unter Privat**, obwohl vor „Rezeptbuch“ ein Emoji steht.
- Einträge im Rezeptbuch und in typischen Unterteilungen wie „Frühstück“, „Mittagessen“ oder „Dessert“ werden für den Würfel verwendet.
- Ein Rezept, das selbst eine Kategorie mit Zutaten-Unterpunkten ist, wird nur **einmal** als Rezept berücksichtigt; Zutaten werden nicht als eigene Gerichte ausgewürfelt.
- Tageswürfel, 7-Tage-Würfel, einzelne Tages-Neuwürfelung und gespeicherte Essenspläne bleiben erhalten.

## Datensicherheit und Tests

- Es gibt **keine Migration und keine automatische Löschung** von Aufgaben, Rezepten oder Trainingseinträgen.
- Bestehendes JSON- und Cloud-Datenformat wird weiterverwendet (`trainingTypes`, `trainingLog`, `mealSchedule`).
- Local-Storage- und v3.4-Cloud-Grenzen bestehen weiter; bei wachsenden Datenmengen regelmäßig JSON sichern.
- JavaScript-Syntaxprüfung und lokale Chromium-Tests mit synthetischen Daten: alte und neue Trainingseinträge, drei Sätze mit verschiedenen Gewichten/Wiederholungen, Statistik und Filter, Formular-Reset, einklappbares Tagebuch, das Rezeptbuch mit Emoji, Wochenplanung, Pastellfarbauswahl und JSON-Export. Die Original-Daten aus dem Test blieben im Export vorhanden.
- Firebase-Liveabgleich mit deinem eigenen Konto und echtes Android-PWA-Verhalten wurden **nicht** getestet.
