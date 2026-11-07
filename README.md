# BrainHome v3.2 – Sammeldokumente und Original-PDFs

Diese Version aktualisiert **nur** `index.html`, `study.js` und `sw.js` aus BrainHome v3.1. Die bestehende `app.js`, `cloud.js`, `firebase-config.js`, `firestore.rules` sowie die Icons und das Manifest bleiben unverändert.

## Installation
1. In der laufenden App über **Backup → Exportieren** ein JSON-Backup sichern.
2. Im GitHub-Repository die drei Dateien `index.html`, `study.js` und `sw.js` ersetzen. Andere Dateien nicht löschen.
3. GitHub Pages neu laden. Bei hartnäckig altem Design die Seite einmal neu laden. Der Service-Worker-Cache trägt jetzt v32.

## Änderungen
- Hauptbereiche des Wissensbaums: **eine farbige Karte pro Zeile**, auch am Handy.
- **Jede Nicht-Uni-Kategorie** (auch Untergruppen) zeigt oben ein großes, direkt editierbares Sammeldokument. Der Text liegt weiterhin im bisherigen `knowledgeNodes[].body` und wird nach kurzer Eingabepause automatisch gesichert. Bereits bestehende Bereichsnotizen bleiben erhalten.
- Untergruppen und weitere Dokumente lassen sich weiterhin separat hinzufügen; die Dokumentenliste bleibt leer, wenn nichts angelegt wurde.
- **Uni** bleibt die bestehende Bibliothek mit Fächern, Zusammenfassungen und Lernkarten. Dort erscheint kein Sammeldokument.
- **Original-PDFs** (bis 25 MB) lassen sich importieren und auf demselben Gerät wieder öffnen bzw. herunterladen – auch Bildscans ohne erkennbaren Text. Bereits in v3.1 als reiner Text importierte PDFs kann man in der Dokumentansicht über „Original zuordnen“ mit der PDF verknüpfen.
- „Text für Anki auslesen“ versucht bei Bedarf, den Text einer lokal gespeicherten PDF mit PDF.js auszulesen. Dafür muss PDF.js über das Internet erreichbar sein; Scans ohne Textebene benötigen weiterhin OCR. Schlägt die Textextraktion fehl, bleibt die Original-PDF erhalten.

## WICHTIG: PDF-Dateien und Cloud-Backup

Original-PDFs sind **zunächst nur lokal in IndexedDB auf dem Gerät**, auf dem sie importiert wurden. Dadurch bleibt die bisherige Firestore-Cloud-Synchronisierung unangetastet und die 850-KB-Grenze des bisherigen Cloud-Dokuments wird nicht durch PDF-Binärdateien überschritten. Titel, Zuordnung und ggf. ausgelesener Text gehören zur bisherigen BrainHome-Datenbank und können darüber synchronisiert werden.

**Original-PDFs sind NICHT im JSON-Backup und werden NICHT geräteübergreifend synchronisiert.** Auf einem zweiten Gerät zeigt BrainHome den Eintrag und bietet „Original zuordnen“ an. Daher Original-PDFs unbedingt außerhalb von BrainHome aufbewahren bzw. über „PDF speichern“ selbst sichern. Das Löschen von Browserdaten oder die Bereinigung des Gerätespeichers kann die lokalen Original-PDFs entfernen. Eine echte geräteübergreifende Dateiablage über Firebase Storage braucht eine separate Einrichtung, Sicherheitsregeln und Tests.

## Technische Prüfungen
- JavaScript-Syntax mit Node geprüft.
- Die Logik für Bereichsnotizen, Uni-Abgrenzung, PDF-Dateivalidierung und Speicherung mit einem simulierten IndexedDB-Datenspeicher geprüft, einschließlich einer PDF ohne Textebene.
- Kein vollständiger Browsertest möglich: Die Browsertestruntime dieser Umgebung blockiert Seitenaufrufe administrativ. Auch eine persönliche Firebase-Cloud-Synchronisierung wurde nicht live getestet.
