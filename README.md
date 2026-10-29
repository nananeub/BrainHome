# BrainHome v2.7 – Studienstiftung, Gutscheine, Baumgesten & Statistik

## Installation

1. **Zuerst in BrainHome ein JSON-Backup exportieren.** Die bisherige v2.6-ZIP ebenfalls aufbewahren.
2. In deinem GitHub-Repository nur diese drei Dateien ersetzen:
   - `index.html`
   - `app.js`
   - `sw.js`
3. **Nicht ersetzen oder löschen:** `cloud.js`, `firebase-config.js`, `firestore.rules`, `manifest.webmanifest` sowie die App-Icons. Diese Dateien sind deshalb nicht im Update-Paket.
4. Nach dem Upload BrainHome neu laden (gegebenenfalls PWA komplett schließen und neu öffnen).

## Geänderte Funktionen

### Studienstiftung
- Die Kategorien „Projekte“ und „Termine“ aus v2.6 werden **nicht mehr im Aufgabenbaum angezeigt**. Sie bleiben intern als Datencontainer erhalten, damit alte Projekte und Termine ohne Verlust weiterverwendet werden.
- Unter dem Baum erscheinen in dieser Reihenfolge: Notizen, Projekte, Termine.
- Notizen im neuen Textfeld lassen sich direkt speichern.
- Projekte lassen sich als eigenständige Liste unter dem Baum anlegen und als Unterprojekte verschachteln. Vorhandene Unterpunkte aus dem früheren „Projekte“-Ordner bleiben sichtbar.
- Termine sind weiterhin mit Datum, optional Uhrzeit und Notizen bearbeitbar und werden nicht als normale Aufgaben gezählt.

### Finanzen
- Im vorhandenen Finanz-Bereich unter Privat gibt es „Offene Gutscheine“.
- Je Gutschein: Name, optionaler Geldwert, Gültigkeitsdatum, Code und Notizen; einlösbar bzw. als eingelöst markierbar.
- Gutscheine zählen nicht zu laufenden Einnahmen oder Ausgaben.
- Die neue `vouchers`-Liste ist in JSON-Export, Import, Undo-Verlauf und Cloud-Nutzdaten integriert.

### Aufgabenbaum
- **Lange drücken und ziehen** auf dem Namen eines Baumknotens: über einem anderen Knoten ablegen.
- Über einer Kategorie: in diese Kategorie verschieben. Über einer Aufgabe: unmittelbar vor ihr einsortieren. Zwei Kategorien derselben Ebene lassen sich ebenfalls umordnen.
- Funktioniert in der kleinen und der Vollbild-Baumansicht sowie per Touch/Maus. Klicks auf die kleinen Bearbeiten-/Abhaken-Buttons werden davon nicht beeinflusst.
- Die alte konkurrierende Langdruck-Geste wurde abgeschaltet. Alte Baumknoten-IDs und Unterpunkte bleiben erhalten.
- Manuell sortierte Geschwister verwenden die selbst gewählte Reihenfolge; andere Baumzweige behalten ihre bisherige automatische Prioritätssortierung.

### Statistik
- Zeiträume: **Woche, Monat, Jahr** (statt Tag/Stunden).
- Nur erledigte Aufgaben sind zunächst sichtbar; hinzugefügte Aufgaben lassen sich als **schwarze** Balken zuschalten.
- Kein Farbwähler mehr.

## Datenschutz und Kompatibilität
Die vorhandene Firebase-Synchronisierung wird nicht verändert. Die Datenstruktur wird nur um das optionale `vouchers`-Feld und um manuelle Sortiernummern bei aktiv verschobenen Knoten erweitert. Keine Datenbank wird beim Installieren automatisch geleert.

## Prüfung
- `node --check app.js`: erfolgreich.
- Lokale Chromium-Tests mit eingebettetem App-Skript: Studienstiftungsnotizen, Projektanlage, Terminanlage, Statistik (12 Monate), Gutscheinanlage und JSON-Export: erfolgreich.
- Drag-and-drop im normalen und im großen Baum mit Maus: erfolgreich; Touch-Geste in einer simulierten mobilen Chromium-Umgebung: erfolgreich.
- Live-Synchronisierung mit deinem persönlichen Firebase-Konto und Installation über GitHub Pages sind hier nicht getestet worden.
