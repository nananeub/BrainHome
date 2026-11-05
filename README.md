# BrainHome v2.8 — Studienbibliothek & Uni-Wiederholung

## Installation

1. **Zuerst** in der aktuellen BrainHome-Version ein JSON-Backup exportieren. Zusätzlich die funktionierende v2.7-ZIP aufbewahren.
2. Diese **vier App-Dateien** ins Stammverzeichnis deines bisherigen GitHub-Repositorys hochladen bzw. ersetzen:
   - `index.html` (ersetzen)
   - `app.js` (ersetzen)
   - `study.js` (**neu hinzufügen**)
   - `sw.js` (ersetzen)
3. **Unbedingt beibehalten:** die bereits funktionierenden `cloud.js`, `firebase-config.js`, `firestore.rules`, `manifest.webmanifest` und die beiden Icons. Nicht überschreiben und keine Browserdaten löschen.
4. Nach dem GitHub-Pages-Deployment BrainHome schließen, neu öffnen und den Wissensbaum antippen. Bei veralteter Oberfläche gegebenenfalls die PWA einmal ganz schließen und neu starten.

## Neu

### Wissensbibliothek
- Oberste Wissensbereiche erscheinen als **getrennte, farbige Karten**. Die Gesamtübersicht zeigt nur Bereichsnamen und Dokumentanzahl, **keinen Vorschautext**.
- Bereich öffnen → Unterbereiche (Ordner) öffnen → übersichtliche Dokumenttitel öffnen → Volltext mit klickbarem Inhaltsverzeichnis.
- Eigenen Bereich hinzufügen, umbenennen und Farbe ändern; Unterbereiche beliebig verschachteln; Kategorien per Langdruck umsortieren.
- Alte `knowledgeNodes` werden nicht gelöscht. Bisherige Wissensnotizen bleiben als lesbare Dokumente in ihren vorhandenen Unterbereichen sichtbar.
- Navigation innerhalb der Bibliothek (geöffneter Bereich und geöffnetes Dokument) bleibt nach einem Neuladen erhalten.

### Universität
- Unter **Uni** werden die Fächer Innere Medizin, Pharmakologie, Mikrobiologie, Anatomie, Biochemie und Physiologie ergänzt, soweit sie nicht schon vorhanden sind.
- Dokument direkt schreiben oder `.md`, `.markdown`, `.txt`, `.docx` hochladen. Word-DOCX wird lokal im Browser **in Text mit Überschriften umgewandelt**; das originale DOCX wird nicht separat gespeichert. Ein Word-Dokument kann Formatierungen verlieren.
- Markdown-Überschriften wie `## Diagnostik` ergeben Leser-Abschnitte und Lernkarten. Ohne Überschriften entsteht eine einzelne Lernkarte für das gesamte Dokument.
- **Nur unter Uni**: verdeckte Lernkarten, Antwort anzeigen und selbst bewerten mit **Nochmal / Schwer / Gut / Einfach**. Die nächsten Wiederholungstermine werden nach einem vereinfachten Spaced-Repetition-Verfahren berechnet. Maximal fünf bislang neue Abschnitte pro Tag plus fällige Wiederholungen.
- Wissen aus anderen Bereichen wird **nicht** für die Wiederholung verwendet. Eine spätere Ausdehnung auf „Sprachen“ ist noch nicht eingebaut.

### Datei-Workflow
1. Vorlesungsnotizen schreiben.
2. ChatGPT aus den Notizen (und auf expliziten Wunsch mit externer Recherche) eine gut strukturierte Zusammenfassung erstellen lassen; Überschriften in Markdown mit `##` nutzen.
3. Den fertigen Text als `.md`, `.txt` oder `.docx` speichern.
4. BrainHome → Wissensbaum → Uni → Fach → **⇧ Datei hochladen**.
5. Den Text in BrainHome lesen und über **Uni → Lernen** wiederholen.

## Speichern und Einschränkungen
- `knowledgeDocuments` ist ein **zusätzliches** Feld im bestehenden JSON-Export, in der lokalen Speicherung und im bestehenden Cloud-Payload. Alte Sicherungen bleiben lesbar; die Cloud-Dateien wurden nicht verändert.
- Deine derzeitige Cloud-Synchronisierung hat weiterhin die technische **Grenze von 850.000 Byte für alle BrainHome-Daten zusammen**. BrainHome v2.8 begrenzt einzelne Textdokumente auf ca. 160 KB und warnt vor Erreichen der Gesamtgrenze (~760 KB). Für eine wirklich große Vorlesungsbibliothek braucht es als nächsten Schritt eine **separate Firestore-Dokumentspeicherung**. Bis dahin bitte regelmäßig JSON-Backups exportieren.
- **PDF-Dateien werden noch nicht importiert.** Bitte den Text vorerst als Markdown, TXT oder DOCX exportieren. Bilder, eingebettete Diagramme und Original-DOCX-Dateien werden nicht gespeichert.
- Die ChatGPT-Zusammenfassung wird nicht automatisch direkt in BrainHome erzeugt; du lädst sie selbst hoch.
- Dies ist ein Anki-ähnliches, vereinfachtes Wiederholungssystem, **keine Kompatibilität mit der Anki-App und keine exakte FSRS-Implementierung**.
- Der persönliche Firebase-Livebetrieb und die Installation über GitHub Pages konnten hier nicht mit deinem echten Konto getestet werden.

## Technische Tests
- `node --check app.js`, `node --check study.js`: erfolgreich.
- Chromium-Test mit eingebetteter, lokal bereitgestellter App (kein Live-Firebase): Wissensübersicht, sechs Uni-Fächer, Dokument erstellen, Markdown-Inhaltsverzeichnis, dokumentierte Wiederholung, Wiederholungstermin speichern, Route bei Neuinitialisierung wiederherstellen.
- Dateiimport `.md` und `.docx` (Testdatei), Legacy-Wissenseinträge, Wissensbaum-Umordnung via langem Mausdruck und mobile Darstellung in Chromium: erfolgreich.
