# BrainHome v3.0 · Baum & Wissensnavigation

## Änderungen
- Aufgabenbaum **wieder als farbiger, verzweigter Baum**. Nur Kategorien bilden Äste. Alle Aufgaben stehen als **schmale, farbig nach Priorität markierte Karten** direkt unter ihrer Kategorie.
- Aufgaben sortiert: offene vor erledigten, innerhalb dessen Sofort → Wichtig → Später → Warten → ohne Priorität. Drag & Drop mit langem Drücken zwischen Kategorien (auch im großen Baum). Die Position innerhalb einer Kategorie wird automatisch durch die Priorität bestimmt.
- Kategorie antippen → Aufgabe direkt dort hinzufügen; eigener Button für Unterkategorie. Die v2.9-Schrittlisten und ihre Statistik bleiben erhalten.
- Studienbibliothek: „← Zurück“ führt **eine Ebene nach oben** (Dokument → Fach → Uni → Wissensübersicht). Browser-/Android-Zurück navigiert durch vorherige Bibliotheksseiten; der Startpunkt führt zur BrainHome-Startseite.
- Auf den Tab **Wissensbaum** tippen, während man darin ist: zurück zur farbigen Wissensübersicht.
- Kein neues Datenformat, keine Änderung an cloud.js oder firebase-config.js.

## Installation
1. Vorher BrainHome-JSON-Backup herunterladen und alte funktionierende ZIP behalten.
2. In GitHub `index.html`, `app.js`, `study.js` und `sw.js` aktualisieren.
3. `cloud.js`, `firebase-config.js`, `firestore.rules`, Icons und Manifest **nicht** überschreiben oder löschen.
4. Nach dem Deployment die PWA vollständig schließen/erneut öffnen. Der Service-Worker hat eine neue Cache-Version.

## Hinweis
Der Baum ist im graphischen Modus bei vielen Kategorien breit und horizontal scrollbar/zoombar. Für Aufgaben ist kein manuelles Reihensortieren vorgesehen, da die Priorität die Reihenfolge automatisch festlegt. Es gibt weiterhin eine Cloud-Obergrenze für große Uni-Dokumente.
