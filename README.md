# BrainHome v3.1 – Kompakter Wissensbaum

## Änderungen
- Die Wissensübersicht hat kompaktere, farbige Kacheln ohne Dokumentanzahl und Einleitungstext.
- In jedem Bereich gibt es eine kleine Überschrift und eine Zurück-Schaltfläche; die lange Pfadleiste und der Text „Lernwiederholungen nur für Uni“ wurden entfernt.
- Das kleine `+` rechts über den Fächern/Untergruppen erstellt neue Untergruppen.
- Über `⋯` an einer Kategorie bzw. im Seitenkopf lassen sich Name, Farbe und Emoji ändern oder die Kategorie löschen.
- Ein Emoji kann aus einer Palette gewählt oder direkt über die Handy-Emoji-Tastatur eingegeben werden.
- Beim Löschen einer **gefüllten** Kategorie werden ihre Unterkategorien und Dokumente in die übergeordnete Ebene verschoben; vorhandene Bereichsnotizen werden als Dokument übernommen. Bei einem gelöschten obersten Bereich landen direkte Dokumente im neuen Bereich „Ablage“. Inhalte werden nicht absichtlich gelöscht.
- PDF-Dateien können über „Importieren“ ausgewählt werden. Die PDF.js-Bibliothek extrahiert den vorhandenen Text und legt ein bearbeitbares BrainHome-Dokument an. Die Seiten werden zunächst mit „## Seite 1“, „## Seite 2“ usw. überschrieben. Später können eigene Markdown-Überschriften ergänzt werden, um spezifische Lernkarten zu erhalten.

## PDF: Einschränkungen
- **Internet erforderlich**, um den PDF-Textleser von einem externen Bibliotheks-Server zu laden (PDF.js 5.5.207). Der Inhalt deiner PDF wird lokal im Browser ausgelesen; die ursprüngliche PDF-Datei selbst wird nicht gespeichert oder als Datei hochgeladen.
- Bilder, Formeln, Tabellenlayout und Grafiken aus PDFs werden nicht zuverlässig übernommen; PDF-Scans ohne Text benötigen OCR und werden mit einer Fehlermeldung abgelehnt.
- Maximal 3 MB Eingabedatei, 160 PDF-Seiten, 160 KB extrahierter Text pro BrainHome-Dokument. Die bestehende Cloud-Grenze von 850 KB für den gesamten Bestand bleibt bestehen (interner Sicherheitsabstand ab 760 KB).
- Browser-Test: Dateiauswahl und Verarbeitung wurden mit einem **PDF.js-Test-Adapter** simuliert; die externe PDF.js-Datei konnte in dieser Ausführungsumgebung nicht live geladen werden. Bitte einen echten PDF-Import in der veröffentlichten App testen.

## Installation
1. **Vor dem Update das BrainHome-JSON-Backup exportieren.** Außerdem die zuletzt funktionierende ZIP behalten.
2. Nur `index.html`, `study.js` und `sw.js` im GitHub-Repository ersetzen.
3. `app.js`, `cloud.js`, `firebase-config.js`, `firestore.rules`, Icons und Manifest **unverändert behalten**.
4. Die App nach dem GitHub-Pages-Update vollständig schließen und neu öffnen. Der Service-Worker-Cache wurde auf `brainhome-static-v31` erhöht.

## Tests
- JavaScript-Syntax geprüft.
- In Chromium getestet: Wissensübersicht, Uni-Fächer, Kategorie anlegen, Emoji wählen, Untergruppe hinzufügen, Dokument erstellen/öffnen, Kategorie mit Inhalt entfernen und Inhalte erhalten, Zurück-Navigation.
- PDF-Import nur mit simulierter PDF.js-Bibliothek getestet, nicht mit echtem PDF.js-Netzwerkdownload oder Firebase-Livekonto.
