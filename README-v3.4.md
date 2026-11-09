# BrainHome v3.4 – Sport und Essen

Dieses Update baut auf **v3.3** auf und fügt den vorhandenen Lebensbereich **Sport und Essen** um zwei Bereiche unterhalb des Aufgabenbaums hinzu.

## Installation

1. **Vorher unbedingt** in der bestehenden App ein vollständiges **JSON-Backup** exportieren und sicher außerhalb von BrainHome ablegen.
2. Auf GitHub im Stammverzeichnis `index.html`, `app.js` und `sw.js` durch die Dateien aus dieser ZIP ersetzen. Lade die Dateien nicht in einen neuen Unterordner hoch.
3. **Unverändert lassen:** `study.js`, `cloud.js`, `firebase-config.js`, `firestore.rules`, `manifest.webmanifest`, Icons und alle persönlichen Backups.
4. Die App nach dem GitHub-Pages-Update neu laden und zunächst unter **Sport und Essen** einen Testeintrag speichern, danach JSON-Export und Cloud-Status überprüfen.
5. Falls die App noch die alte Version anzeigt, einmal wirklich neu laden; der Service-Worker-Cache wurde auf `brainhome-static-v34` erhöht. **Keine Browserdaten löschen.**

## Funktionen

### Lebensbereichsfarbe

Im Lebensbereich erscheint neben seinem Titel ein kleines **🎨**. Damit lassen sich Name, Emoji und eine eigene Farbe auswählen. Die Farbe wird am Lebensbereich und seinen Aufgaben/Kategorien verwendet; bestehende Farben bleiben unverändert, solange keine neue gewählt wird.

### Sport

- Training über **Gerät / Trainingsart**, optionales Gewicht (kg), **Sätze** und **Wiederholungen pro Satz** erfassen.
- Nach dem Speichern erscheinen die Daten sofort im Trainingstagebuch, und **alle vier Eingabefelder sind wieder leer**.
- Eine neue Trainingsart lässt sich ohne Trainingseintrag über `＋ Trainingsart` anlegen.
- Statistik für **alle Trainingsarten** oder eine einzelne Auswahl: Zahl der erfassten Trainingseinträge, unterschiedliche Trainingstage, durchschnittliches Gewicht und höchstes Gewicht.
- Ø-Gewicht ist über die Zahl der Sätze gewichtet. Übungen ohne externes Gewicht beeinflussen die Gewichtskennzahlen nicht.
- Einträge können nach Bestätigung gelöscht werden.
- Jede gespeicherte Zeile ist eine Trainingseinheit für *eine bestimmte Trainingsart*, mit erfassten Sätzen/Reps, nicht automatisch ein kompletter Trainingstag.

### Essen

- BrainHome sucht Rezept-Einträge unter **Privat → Rezepte / Rezeptbuch / Kochbuch / Gerichte**. Der bisherige Rezeptbestand wird **nicht verschoben oder umgeschrieben**.
- Beim ersten Öffnen des Essensbereichs am Tag wird ein Vorschlag ausgelost und bis zum Neu-Würfeln gespeichert.
- `Neu würfeln` wechselt den heutigen Vorschlag; `7 Tage würfeln` erstellt eine Planung für sieben Tage ab heute.
- Wiederholungen werden möglichst vermieden. Bei weniger als sieben Rezepten können sich Gerichte im Wochenplan natürlich wiederholen.
- Einzelne Tage lassen sich über `⟳` erneut würfeln.
- Ohne passende Rezepte zeigt BrainHome eine Erklärung und einen Link zu Privat, erfindet aber keine Gerichte.

## Datensicherheit

**Neue Datenfelder:** `trainingTypes`, `trainingLog`, `mealSchedule`. Alle drei Arrays sind Bestandteil der bisherigen JSON-Export-/Importfunktion (`BH10`) und der bestehenden Cloud-Nutzdaten. Bisherige `nodes`, Rezepte, Aufgaben, Notizen und Routinen werden nicht migriert oder gelöscht. Die bestehende Firebase-Implementierung wird nicht verändert.

**Grenzen:** Die aktuelle Cloud speichert den Gesamtzustand weiterhin in einem Firestore-Dokument und prüft eine Größenbegrenzung von ca. 850 KB. Bei wachsender Datenmenge können weitere Trainingsprotokolle den Cloud-Upload an diese Grenze führen. Deshalb regelmäßig JSON sichern. Die Berechnungen unterscheiden nicht, ob eine Maschine mit Eigengewicht, Gegengewicht oder Zusatzlast arbeitet; bei unterstützten Klimmzügen z. B. das tatsächlich verwendete Maschinengewicht eintragen und innerhalb dieser Übung konsistent bleiben.

## Tests

JavaScript-Syntax mit Node überprüft. Lokale synthetische Chromium-Tests durchgeführt: Eingabe/Speicherung/Reset der Trainingswerte, Filter-Statistik, Rezeptauswahl und Wochenwürfel, Exportdaten, Farbänderung, unveränderte bestehende Datensätze und mobile Layoutdarstellung. Diese Tests liefen mit einer **simulierten lokalen Speicherumgebung**; GitHub Pages, Firebase mit persönlichem Konto und die reale Android-PWA konnten hier nicht live getestet werden.
